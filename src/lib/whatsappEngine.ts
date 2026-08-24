import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import fs from 'fs';

// Global singleton reference in Node.js runtime to persist across hot-reloads
declare global {
  var __baileys_socket: any;
  var __baileys_qr: string | null | undefined;
  var __baileys_qr_image: string | null | undefined;
  var __baileys_is_connected: boolean | undefined;
  var __baileys_is_connecting: boolean | undefined;
  var __baileys_error: string | null | undefined;
}

const AUTH_DIR = path.join(process.cwd(), '.baileys_auth');

// Ensure directory exists
if (!fs.existsSync(AUTH_DIR)) {
  try {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  } catch (e) {
    console.warn('Could not create auth dir:', e);
  }
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
 * Send a WhatsApp text message directly via the embedded engine
 */
export async function sendWhatsAppMessage(phone: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const status = getWhatsAppStatus();
    if (!status.isConnected) {
      await initWhatsAppEngine();
      if (!globalThis.__baileys_is_connected) {
        return {
          success: false,
          error: 'الواتساب غير متصل. يرجى مسح كود QR من إعدادات الواتساب أولاً.'
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
    const sent = await sock.sendMessage(jid, { text });

    return {
      success: true,
      messageId: sent?.key?.id || undefined
    };
  } catch (error: any) {
    console.error('❌ [WhatsApp Engine] Failed to send message:', error);
    return {
      success: false,
      error: error?.message || 'فشل إرسال الرسالة عبر الواتساب'
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
