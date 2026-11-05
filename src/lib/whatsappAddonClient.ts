import { getWhatsAppAddonConfig } from '@/lib/whatsappAddonConfig';

export interface WhatsAppAddonSendResult {
  success: boolean;
  outcome: 'sent' | 'failed' | 'retryable' | 'unknown';
  error?: string;
  messageId?: string;
}

export async function sendWhatsAppViaAddon(
  payload: Record<string, unknown>,
  idempotencyKey: string
): Promise<WhatsAppAddonSendResult> {
  const addon = await getWhatsAppAddonConfig();
  if (!addon) {
    return { success: false, outcome: 'failed', error: 'خدمة واتساب المركزية غير مهيأة.' };
  }

  const phone = payload.phone;
  if (typeof phone !== 'string' || !phone.trim()) {
    return { success: false, outcome: 'failed', error: 'رقم واتساب غير صالح.' };
  }

  const isMedia = Boolean(
    payload.mediaUrl || payload.mediaBase64 || payload.location || payload.mediaType
  );
  const endpoint = isMedia ? '/api/messages/send-media' : '/api/messages/send-text';

  try {
    const response = await fetch(`${addon.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${addon.apiKey}`,
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(55_000)
    });

    const responseBody: unknown = await response.json().catch(() => null);
    if (!response.ok || !responseBody || typeof responseBody !== 'object'
      || !('success' in responseBody) || responseBody.success !== true) {
      const error = responseBody && typeof responseBody === 'object'
        && 'error' in responseBody && typeof responseBody.error === 'string'
        ? responseBody.error
        : `تعذر الإرسال عبر خدمة واتساب المركزية (HTTP ${response.status}).`;
      const responseOutcome = responseBody && typeof responseBody === 'object'
        && 'outcome' in responseBody && typeof responseBody.outcome === 'string'
        ? responseBody.outcome
        : undefined;
      const outcome = responseBody && typeof responseBody === 'object'
        && 'code' in responseBody && responseBody.code === 'IDEMPOTENCY_PENDING'
        ? 'unknown'
        : responseOutcome === 'retryable'
          ? 'retryable'
          : responseOutcome === 'failed'
            ? 'failed'
            : response.status >= 500 ? 'unknown' : 'failed';
      return { success: false, outcome, error };
    }

    return {
      success: true,
      outcome: 'sent',
      messageId: 'messageId' in responseBody && typeof responseBody.messageId === 'string'
        ? responseBody.messageId
        : undefined
    };
  } catch (error) {
    return {
      success: false,
      outcome: 'unknown',
      error: error instanceof Error
        ? `تعذر تأكيد نتيجة الإرسال إلى خدمة واتساب المركزية: ${error.message}`
        : 'تعذر تأكيد نتيجة الإرسال إلى خدمة واتساب المركزية.'
    };
  }
}
