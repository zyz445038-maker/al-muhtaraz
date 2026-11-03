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
  sessionStoragePathIsAbsolute: boolean;
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
  private isRequestingPairingCode: boolean = false;
  private sessionStoragePathIsAbsolute: boolean;
  private initializationPromise: Promise<WASocket> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;

  constructor() {
    const baseDir = process.env.SESSION_DIR?.trim() || './sessions';
    this.sessionStoragePathIsAbsolute = path.isAbsolute(baseDir);
    this.sessionDir = path.resolve(baseDir, this.instanceId);

    if (process.env.NODE_ENV === 'production' && !this.sessionStoragePathIsAbsolute) {
      console.warn('[Session Manager] SESSION_DIR is relative. Configure it to use the hosting provider’s persistent disk.');
    }

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
      isConnecting: this.isConnecting || this.reconnectTimer !== null,
      qrCodeBase64: this.qrCodeBase64,
      qrCodeRaw: this.qrCodeRaw,
      userJid: this.userJid,
      phoneNumber: this.userJid ? this.userJid.split('@')[0].split(':')[0] : null,
      lastError: this.lastError,
      sessionStoragePathIsAbsolute: this.sessionStoragePathIsAbsolute
    };
  }

  public getSocket(): WASocket | null {
    return this.socket;
  }

  public async initSession(force = false): Promise<WASocket> {
    if (this.socket && this.status !== 'disconnected' && !force) {
      return this.socket;
    }

    if (this.initializationPromise) return this.initializationPromise;

    const previousSocket = force ? this.socket : null;
    if (previousSocket) this.socket = null;
    if (force && this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const initialization = this.createSession(previousSocket);
    this.initializationPromise = initialization;
    try {
      return await initialization;
    } finally {
      if (this.initializationPromise === initialization) {
        this.initializationPromise = null;
      }
    }
  }

  private async createSession(previousSocket: WASocket | null): Promise<WASocket> {
    this.isConnectingLock = true;
    this.isConnecting = true;
    this.status = 'connecting';
    this.lastError = null;

    try {
      if (previousSocket) await previousSocket.end(undefined);

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
      sock.ev.on('creds.update', () => {
        void saveCreds().catch((error: unknown) => {
          this.lastError = 'تعذر حفظ بيانات جلسة الواتساب على الخادم.';
          console.error('❌ [Session Manager] Could not persist WhatsApp credentials:', error);
        });
      });

      // Handle connection updates
      sock.ev.on('connection.update', async (update) => {
        if (this.socket !== sock) return;
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
            if (this.socket !== sock) return;
            this.lastError = null;
          } catch (qrErr) {
            console.error('Error rendering QR base64:', qrErr);
            this.lastError = qrErr instanceof Error ? qrErr.message : 'تعذر إنشاء صورة رمز QR.';
          }
          if (this.socket !== sock) return;
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
          this.reconnectAttempts = 0;
          console.log(`✅ [Session Manager] WhatsApp connected successfully for: ${this.userJid}`);
        } else if (connection === 'close') {
          this.status = 'disconnected';
          this.isConnecting = false;
          this.qrCodeRaw = null;
          this.qrCodeBase64 = null;

          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const disconnectError = lastDisconnect?.error;
          this.lastError = disconnectError instanceof Error
            ? `انقطع الاتصال (رمز ${statusCode ?? 'غير معروف'}): ${disconnectError.message}`
            : `انقطع اتصال الواتساب (رمز ${statusCode ?? 'غير معروف'}).`;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          this.socket = null;

          console.log(`⚠️ [Session Manager] Connection closed (code: ${statusCode}). Reconnecting: ${shouldReconnect}`);

          if (shouldReconnect) {
            this.status = 'connecting';
            this.scheduleReconnect();
          } else {
            console.log(`🔴 [Session Manager] Logged out from instance: ${this.instanceId}`);
            this.userJid = null;
            this.qrCodeRaw = null;
            this.qrCodeBase64 = null;
            this.reconnectAttempts = 0;
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
      this.scheduleReconnect();
      this.status = 'connecting';
      throw err;
    } finally {
      this.isConnectingLock = false;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    const delayMs = Math.min(3000 * (2 ** this.reconnectAttempts), 30_000);
    this.reconnectAttempts = Math.min(this.reconnectAttempts + 1, 4);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.initSession().catch((error: unknown) => {
        console.error('❌ [Session Manager] Reconnection attempt failed:', error);
      });
    }, delayMs);
  }

  public async requestPairingCode(phone: string): Promise<string> {
    if (this.isRequestingPairingCode) {
      throw new Error('يجري إنشاء رمز ربط بالفعل. انتظر قليلًا قبل طلب رمز آخر.');
    }

    this.isRequestingPairingCode = true;
    try {
      let cleaned = phone.replace(/[^0-9]/g, '');
      if (cleaned.startsWith('00966')) {
        cleaned = cleaned.substring(5);
      } else if (cleaned.startsWith('966')) {
        cleaned = cleaned.substring(3);
      }

      if (/^5\d{8}$/.test(cleaned)) {
        cleaned = `0${cleaned}`;
      }
      if (!/^05\d{8}$/.test(cleaned)) {
        throw new Error('أدخل رقم جوال سعودي صحيحًا يبدأ بـ 05 ويتكون من 10 أرقام.');
      }
      const internationalPhone = `966${cleaned.substring(1)}`;

      if (this.status === 'connected') {
        throw new Error('الواتساب متصل بالفعل. افصل الجهاز الحالي أولاً قبل ربط رقم جديد.');
      }

      if (!this.socket && !this.isConnectingLock) {
        await this.initSession();
      }

      const initializationDeadline = Date.now() + 30_000;
      while (!this.socket && this.isConnectingLock && Date.now() < initializationDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (!this.socket || !this.socket.requestPairingCode) {
        throw new Error('تعذر تهيئة جلسة الواتساب. أعد تشغيل خادم الربط ثم حاول مجددًا.');
      }

      const socket = this.socket;
      const readyDeadline = Date.now() + 30_000;
      while (this.status !== 'qr_ready' && Date.now() < readyDeadline) {
        if (this.socket !== socket || socket.ws.isClosed) {
          throw new Error('انقطع اتصال خادم الواتساب أثناء تهيئة الربط. حاول مجددًا.');
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (this.status !== 'qr_ready' || !socket.ws.isOpen) {
        throw new Error('لم تكتمل تهيئة جلسة واتساب لطلب رمز الربط. انتظر ظهور رمز QR ثم حاول مجددًا.');
      }

      return await socket.requestPairingCode(internationalPhone);
    } finally {
      this.isRequestingPairingCode = false;
    }
  }

  public async logout(): Promise<void> {
    try {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      const socket = this.socket;
      this.socket = null;
      this.status = 'disconnected';
      this.isConnecting = false;
      this.userJid = null;
      this.qrCodeRaw = null;
      this.qrCodeBase64 = null;
      this.lastError = null;
      this.reconnectAttempts = 0;
      if (socket) {
        await socket.logout().catch((error: unknown) => {
          console.warn('Could not close the WhatsApp socket cleanly:', error);
        });
      }
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
