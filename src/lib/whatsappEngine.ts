import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Global singleton reference in Node.js runtime to persist across hot-reloads
declare global {
  var __baileys_socket: any;
  var __baileys_qr: string | null | undefined;
  var __baileys_qr_image: string | null | undefined;
  var __baileys_is_connected: boolean | undefined;
  var __baileys_is_connecting: boolean | undefined;
  var __baileys_error: string | null | undefined;
}

// Path for storing auth credentials - uses writable temporary directory across both local OS and Vercel serverless
const AUTH_DIR = path.join(os.tmpdir(), 'baileys_auth_muhtaraz');

// Ensure directory exists safely
try {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create auth dir:', e);
}

/**
 * Normalizes any phone number format (050xxxxxxx, +96650xxxxxxx, 96650xxxxxxx) 
 * to standard WhatsApp JID (96650xxxxxxx@s.whatsapp.net)
 */
export function formatToWhatsAppJid(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('05')) {
    cleaned = '966' + cleaned.substring(1);
  } else if (cleaned.startsWith('5') && cleaned.length === 9) {
    cleaned = '966' + cleaned;
  }
  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Get current live status of the embedded WhatsApp engine
 */
export function getWhatsAppStatus() {
  return {
    isConnected: !!globalThis.__baileys_is_connected,
    isConnecting: !!globalThis.__baileys_is_connecting,
    qrCodeBase64: globalThis.__baileys_qr_image || null,
    qrCodeRaw: globalThis.__baileys_qr || null,
    error: globalThis.__baileys_error || null
  };
}

/**
 * Initialize or get the WhatsApp socket singleton
 */
export async function initWhatsAppEngine(forceRestart = false): Promise<any> {
  if (globalThis.__baileys_socket && !forceRestart) {
    return globalThis.__baileys_socket;
  }

  globalThis.__baileys_is_connecting = true;
  globalThis.__baileys_error = null;

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] as [number, number, number] }));

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Al-Muhtaraz ERP', 'Chrome', '1.0.0'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000
  });

  globalThis.__baileys_socket = sock;

  // Listen for credential updates to save state
  sock.ev.on('creds.update', saveCreds);

  // Listen for connection events and QR codes
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      globalThis.__baileys_qr = qr;
      try {
        globalThis.__baileys_qr_image = await QRCode.toDataURL(qr, {
          margin: 2,
          scale: 8,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
      } catch (err) {
        console.warn('Error generating QR image:', err);
      }
      globalThis.__baileys_is_connecting = false;
    }

    if (connection === 'open') {
      globalThis.__baileys_is_connected = true;
      globalThis.__baileys_is_connecting = false;
      globalThis.__baileys_qr = null;
      globalThis.__baileys_qr_image = null;
      globalThis.__baileys_error = null;
      console.log('✅ [WhatsApp Engine] Embedded WhatsApp connected successfully!');
    } else if (connection === 'close') {
      globalThis.__baileys_is_connected = false;
      globalThis.__baileys_is_connecting = false;

      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`⚠️ [WhatsApp Engine] Connection closed (code: ${statusCode}), reconnecting: ${shouldReconnect}`);

      if (shouldReconnect) {
        setTimeout(() => {
          initWhatsAppEngine(true).catch(console.error);
        }, 3000);
      } else {
        // Logged out
        globalThis.__baileys_socket = null;
        globalThis.__baileys_qr = null;
        globalThis.__baileys_qr_image = null;
        try {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        } catch (e) {
          console.warn('Error clearing auth dir:', e);
        }
      }
    }
  });

  return sock;
}

/**
 * Request an 8-character Pairing Code for phone-number linking (Link with phone number instead)
 */
export async function requestWhatsAppPairingCode(phone: string): Promise<{ success: boolean; code?: string; error?: string }> {
  try {
    let sock = globalThis.__baileys_socket;
    if (!sock) {
      sock = await initWhatsAppEngine(true);
    }

    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('05')) {
      cleaned = '966' + cleaned.substring(1);
    } else if (cleaned.startsWith('5') && cleaned.length === 9) {
      cleaned = '966' + cleaned;
    }

    // Wait a brief moment for socket registration if just started
    await new Promise((r) => setTimeout(r, 1000));

    if (!sock.requestPairingCode) {
      return { success: false, error: 'محرك الواتساب لا يدعم كود الاقتران حالياً' };
    }

    const rawCode = await sock.requestPairingCode(cleaned);
    // Format code with dash e.g. ABCD-EFGH
    const formattedCode = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;

    return {
      success: true,
      code: formattedCode
    };
  } catch (error: any) {
    console.error('Error requesting pairing code:', error);
    return {
      success: false,
      error: error?.message || 'تعذر استخراج كود الاقتران. تأكد من صحة رقم الهاتف.'
    };
  }
}

export interface SendWhatsAppOptions {
  text?: string;
  mediaUrl?: string;
  mediaBase64?: string;
  mediaType?: 'document' | 'image' | 'video' | 'audio' | 'location';
  fileName?: string;
  mimetype?: string;
  caption?: string;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}

/**
 * Send a WhatsApp message (Text, PDF Document, Image, Video, Location) via the embedded engine
 */
export async function sendWhatsAppMessage(
  phone: string, 
  content: string | SendWhatsAppOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const status = getWhatsAppStatus();
    if (!status.isConnected) {
      await initWhatsAppEngine();
      if (!globalThis.__baileys_is_connected) {
        return {
          success: false,
          error: 'الواتساب غير متصل. يرجى إتمام الاقتران برقم الجوال أولاً.'
        };
      }
    }

    const sock = globalThis.__baileys_socket;
    if (!sock) {
      return {
        success: false,
        error: 'محرك الواتساب غير متاح حالياً'
      };
    }

    const jid = formatToWhatsAppJid(phone);
    let payload: any = {};

    if (typeof content === 'string') {
      payload = { text: content };
    } else {
      const { text, mediaUrl, mediaBase64, mediaType, fileName, mimetype, caption, location } = content;

      if (mediaType === 'location' && location) {
        payload = {
          location: {
            degreesLatitude: location.latitude,
            degreesLongitude: location.longitude,
            name: location.name || 'موقع الحاوية',
            address: location.address || ''
          }
        };
      } else if (mediaType === 'document' || fileName?.endsWith('.pdf')) {
        const docBuffer = mediaBase64 ? Buffer.from(mediaBase64.replace(/^data:application\/pdf;base64,/, ''), 'base64') : undefined;
        payload = {
          document: docBuffer || { url: mediaUrl },
          mimetype: mimetype || 'application/pdf',
          fileName: fileName || 'مستند_مؤسسة_المخترز.pdf',
          caption: caption || text || ''
        };
      } else if (mediaType === 'image') {
        const imgBuffer = mediaBase64 ? Buffer.from(mediaBase64.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64') : undefined;
        payload = {
          image: imgBuffer || { url: mediaUrl },
          caption: caption || text || ''
        };
      } else if (mediaType === 'audio') {
        const audioBuffer = mediaBase64 ? Buffer.from(mediaBase64.replace(/^data:audio\/[a-z]+;base64,/, ''), 'base64') : undefined;
        payload = {
          audio: audioBuffer || { url: mediaUrl },
          mimetype: mimetype || 'audio/mp4',
          ptt: true
        };
      } else {
        payload = { text: text || caption || '' };
      }
    }

    const sent = await sock.sendMessage(jid, payload);

    return {
      success: true,
      messageId: sent?.key?.id || undefined
    };
  } catch (error: any) {
    console.error('❌ [WhatsApp Engine] Failed to send message/media:', error);
    return {
      success: false,
      error: error?.message || 'فشل إرسال الرسالة أو المستند عبر الواتساب'
    };
  }
}

/**
 * Disconnect and clear credentials
 */
export async function logoutWhatsApp(): Promise<boolean> {
  try {
    if (globalThis.__baileys_socket) {
      await globalThis.__baileys_socket.logout().catch(() => {});
      globalThis.__baileys_socket = null;
    }
    globalThis.__baileys_is_connected = false;
    globalThis.__baileys_is_connecting = false;
    globalThis.__baileys_qr = null;
    globalThis.__baileys_qr_image = null;

    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
    return true;
  } catch (error) {
    console.error('Error logging out WhatsApp:', error);
    return false;
  }
}
