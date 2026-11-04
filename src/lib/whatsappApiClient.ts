'use client';

import { supabaseBrowser } from '@/lib/supabaseBrowser';

export interface WhatsAppSendResult {
  success: boolean;
  error?: string;
  messageId?: string;
  idempotencyKey: string;
}

export async function getWhatsAppApiHeaders(json = false): Promise<Record<string, string>> {
  const { data: { session }, error } = await supabaseBrowser.auth.getSession();
  if (error || !session?.access_token) {
    throw new Error('انتهت جلسة الدخول. سجّل الدخول مجدداً ثم أعد المحاولة.');
  }

  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${session.access_token}`
  };
}

export async function sendWhatsAppAutomatically(
  payload: Record<string, unknown>,
  idempotencyKey = crypto.randomUUID()
): Promise<WhatsAppSendResult> {
  try {
    const headers = await getWhatsAppApiHeaders(true);
    headers['Idempotency-Key'] = idempotencyKey;

    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok || !data || typeof data !== 'object'
      || !('success' in data) || data.success !== true) {
      const error = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `تعذر إرسال الرسالة عبر خدمة واتساب المركزية (HTTP ${response.status}).`;
      return { success: false, error, idempotencyKey };
    }

    return {
      success: true,
      idempotencyKey,
      messageId: 'messageId' in data && typeof data.messageId === 'string' ? data.messageId : undefined
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'تعذر الاتصال بخدمة واتساب المركزية.',
      idempotencyKey
    };
  }
}
