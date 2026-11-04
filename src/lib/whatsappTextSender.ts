import { sendWhatsAppMessage } from '@/lib/whatsappEngine';
import { getWhatsAppAddonConfig } from '@/lib/whatsappAddonConfig';

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
  message: string
): Promise<{ success: boolean; error?: string }> {
  const cleanPhone = normalizeWhatsAppPhone(phone);
  if (cleanPhone.length < 8 || cleanPhone.length > 15) {
    return { success: false, error: 'رقم واتساب غير صالح.' };
  }

  if (!message.trim()) {
    return { success: false, error: 'نص رسالة واتساب فارغ.' };
  }

  const addon = await getWhatsAppAddonConfig();
  const deliveryErrors: string[] = [];

  if (addon) {
    try {
      const cleanServer = addon.baseUrl;
      const addonApiKey = addon.apiKey;
      const response = await fetch(`${cleanServer}/api/messages/send-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${addonApiKey}`
        },
        body: JSON.stringify({ phone: cleanPhone, message }),
        signal: AbortSignal.timeout(15_000)
      });

      const responseBody = await response.text();
      let result: { success?: boolean; error?: string } = {};
      if (responseBody) {
        try {
          result = JSON.parse(responseBody) as typeof result;
        } catch {
          deliveryErrors.push(`خادم واتساب أعاد استجابة غير مفهومة (${response.status}).`);
        }
      }

      if (response.ok && result.success) return { success: true };
      if (!deliveryErrors.length) {
        deliveryErrors.push(result.error || `فشل خادم واتساب (HTTP ${response.status}).`);
      }
    } catch (error) {
      deliveryErrors.push(error instanceof Error ? error.message : 'تعذر الاتصال بخادم واتساب.');
    }
  }

  const fallback = await sendWhatsAppMessage(cleanPhone, { text: message });
  if (fallback.success) return { success: true };
  if (fallback.error) deliveryErrors.push(fallback.error);

  return {
    success: false,
    error: deliveryErrors.join(' | ') || 'فشل إرسال رسالة واتساب.'
  };
}
