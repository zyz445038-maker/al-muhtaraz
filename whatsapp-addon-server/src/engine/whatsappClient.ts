import { sessionManager } from './sessionManager';

export interface SendMessageOptions {
  phone: string;
  message?: string;
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

export function formatToWhatsAppJid(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('05')) {
    cleaned = '966' + cleaned.substring(1);
  } else if (cleaned.startsWith('5') && cleaned.length === 9) {
    cleaned = '966' + cleaned;
  }
  return `${cleaned}@s.whatsapp.net`;
}

export async function sendWhatsAppMessage(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const status = sessionManager.getStatus();
    if (!status.isConnected) {
      return {
        success: false,
        error: 'الواتساب غير متصل. يرجى مسح كود QR أو إدخال كود الاقتران أولاً.'
      };
    }

    const sock = sessionManager.getSocket();
    if (!sock) {
      return {
        success: false,
        error: 'مقبس الواتساب غير متاح حالياً'
      };
    }

    const { phone, message, mediaUrl, mediaBase64, mediaType, fileName, mimetype, caption, location } = options;
    const jid = formatToWhatsAppJid(phone);
    let payload: any = {};

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
        fileName: fileName || 'مستند_المخترز.pdf',
        caption: caption || message || ''
      };
    } else if (mediaType === 'image') {
      const imgBuffer = mediaBase64 ? Buffer.from(mediaBase64.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64') : undefined;
      payload = {
        image: imgBuffer || { url: mediaUrl },
        caption: caption || message || ''
      };
    } else if (mediaType === 'audio') {
      const audioBuffer = mediaBase64 ? Buffer.from(mediaBase64.replace(/^data:audio\/[a-z]+;base64,/, ''), 'base64') : undefined;
      payload = {
        audio: audioBuffer || { url: mediaUrl },
        mimetype: mimetype || 'audio/mp4',
        ptt: true
      };
    } else {
      payload = { text: message || caption || '' };
    }

    const sent = await sock.sendMessage(jid, payload);

    return {
      success: true,
      messageId: sent?.key?.id || undefined
    };
  } catch (error: any) {
    console.error('❌ [WhatsApp Client] Send error:', error);
    return {
      success: false,
      error: error?.message || 'فشل إرسال الرسالة عبر الواتساب'
    };
  }
}
