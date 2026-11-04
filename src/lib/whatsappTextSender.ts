import { sendWhatsAppViaAddon } from '@/lib/whatsappAddonClient';

export function normalizeWhatsAppPhone(phone: string): string {
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('00966')) {
    cleanPhone = cleanPhone.substring(2);
  }
  if (cleanPhone.startsWith('96605')) {
    cleanPhone = `966${cleanPhone.substring(4)}`;
  } else if (cleanPhone.startsWith('05')) {
    cleanPhone = `966${cleanPhone.substring(1)}`;
  } else if (cleanPhone.startsWith('5') && cleanPhone.length === 9) {
    cleanPhone = `966${cleanPhone}`;
  }
  return cleanPhone;
}

export async function sendWhatsAppText(
  phone: string,
  message: string,
  idempotencyKey: string
): Promise<{ success: boolean; error?: string; outcome?: 'sent' | 'failed' | 'unknown' }> {
  const cleanPhone = normalizeWhatsAppPhone(phone);
  if (cleanPhone.length < 8 || cleanPhone.length > 15) {
    return { success: false, error: 'رقم واتساب غير صالح.' };
  }

  if (!message.trim()) {
    return { success: false, error: 'نص رسالة واتساب فارغ.' };
  }

  return sendWhatsAppViaAddon({ phone: cleanPhone, message }, idempotencyKey);
}
