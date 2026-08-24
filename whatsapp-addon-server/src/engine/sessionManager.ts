import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion,
  WASocket
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import fs from 'fs';

export interface SessionStatus {
  instanceId: string;
  status: 'connected' | 'connecting' | 'qr_ready' | 'disconnected';
  isConnected: boolean;
  isConnecting: boolean;
  qrCodeBase64: string | null;
  qrCodeRaw: string | null;
  phoneNumber?: string | null;
  userJid?: string | null;
  lastError?: string | null;
}

class SessionManager {
  private socket: WASocket | null = null;
  private instanceId: string = 'instance_default';
  private sessionDir: string;
  private status: 'connected' | 'connecting' | 'qr_ready' | 'disconnected' = 'disconnected';
  private isConnecting: boolean = false;
  private qrCodeRaw: string | null = null;
  private qrCodeBase64: string | null = null;
  private userJid: string | null = null;
  private lastError: string | null = null;
  private isConnectingLock: boolean = false;

  constructor() {
    const baseDir = process.env.SESSION_DIR || './sessions';
    this.sessionDir = path.resolve(baseDir, this.instanceId);

    // Ensure session directory exists
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  public getStatus(): SessionStatus {
    return {
      instanceId: this.instanceId,
      status: this.status,
      isConnected: this.status === 'connected',
      isConnecting: this.isConnecting,
      qrCodeBase64: this.qrCodeBase64,
      qrCodeRaw: this.qrCodeRaw,
      userJid: this.userJid,
      phoneNumber: this.userJid ? this.userJid.split('@')[0].split(':')[0] : null,
      lastError: this.lastError
    };
  }

  public getSocket(): WASocket | null {
    return this.socket;
  }

  public async initSession(force = false): Promise<WASocket> {
    if (this.socket && this.status === 'connected' && !force) {
      return this.socket;
    }

    if (this.isConnectingLock && !force) {
      return this.socket!;
    }

    this.isConnectingLock = true;
    this.isConnecting = true;
    this.lastError = null;

    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);
      const { version } = await fetchLatestBaileysVersion().catch(() => ({ 
        version: [2, 3000, 1015901307] as [number, number, number] 
      }));

      console.log(`📡 [Session Manager] Initializing Baileys for instance: ${this.instanceId}...`);

      const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true, // Also print to terminal for quick local viewing
        browser: ['Al-Muhtaraz ERP Add-on', 'Chrome', '1.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000
      });

      this.socket = sock;

      // Save credentials whenever updated
      sock.ev.on('creds.update', saveCreds);

      // Handle connection updates
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrCodeRaw = qr;
          try {
            this.qrCodeBase64 = await QRCode.toDataURL(qr, {
              margin: 2,
              scale: 8,
              errorCorrectionLevel: 'M',
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });
          } catch (qrErr) {
            console.error('Error rendering QR base64:', qrErr);
          }
          this.status = 'qr_ready';
          this.isConnecting = false;
          console.log(`📱 [Session Manager] New QR Code generated for ${this.instanceId}. Scan now.`);
        }

        if (connection === 'open') {
          this.status = 'connected';
          this.isConnecting = false;
          this.qrCodeRaw = null;
          this.qrCodeBase64 = null;
          this.lastError = null;
          this.userJid = sock.user?.id || null;
          console.log(`✅ [Session Manager] WhatsApp connected successfully for: ${this.userJid}`);
        } else if (connection === 'close') {
          this.status = 'disconnected';
          this.isConnecting = false;

          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`⚠️ [Session Manager] Connection closed (code: ${statusCode}). Reconnecting: ${shouldReconnect}`);

          if (shouldReconnect) {
            this.status = 'connecting';
            setTimeout(() => {
              this.isConnectingLock = false;
              this.initSession(true).catch(console.error);
            }, 3000);
          } else {
            console.log(`🔴 [Session Manager] Logged out from instance: ${this.instanceId}`);
            this.socket = null;
            this.userJid = null;
            this.qrCodeRaw = null;
            this.qrCodeBase64 = null;
            this.clearSessionFiles();
          }
        }
      });

      return sock;
    } catch (err: any) {
      this.status = 'disconnected';
      this.isConnecting = false;
      this.lastError = err?.message || 'Failed to initialize session';
      console.error('❌ [Session Manager] Initialization error:', err);
      throw err;
    } finally {
      this.isConnectingLock = false;
    }
  }

  public async requestPairingCode(phone: string): Promise<string> {
    if (!this.socket) {
      await this.initSession(true);
    }

    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('05')) {
      cleaned = '966' + cleaned.substring(1);
    } else if (cleaned.startsWith('5') && cleaned.length === 9) {
      cleaned = '966' + cleaned;
    }

    await new Promise((r) => setTimeout(r, 1000));

    if (!this.socket || !this.socket.requestPairingCode) {
      throw new Error('محرك الواتساب غير مهيأ لاستخراج كود الاقتران حالياً');
    }

    const code = await this.socket.requestPairingCode(cleaned);
    return code?.match(/.{1,4}/g)?.join('-') || code;
  }

  public async logout(): Promise<void> {
    try {
      if (this.socket) {
        await this.socket.logout().catch(() => {});
        this.socket = null;
      }
      this.status = 'disconnected';
      this.isConnecting = false;
      this.userJid = null;
      this.qrCodeRaw = null;
      this.qrCodeBase64 = null;
      this.clearSessionFiles();
      console.log(`🧹 [Session Manager] Successfully logged out and cleared session data for ${this.instanceId}`);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  private clearSessionFiles(): void {
    if (fs.existsSync(this.sessionDir)) {
      try {
        fs.rmSync(this.sessionDir, { recursive: true, force: true });
        fs.mkdirSync(this.sessionDir, { recursive: true });
      } catch (err) {
        console.warn('Could not reset session directory:', err);
      }
    }
  }
}

export const sessionManager = new SessionManager();
