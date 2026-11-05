'use client';

import { supabaseBrowser } from '@/lib/supabaseBrowser';

export type WhatsAppDeliveryOutcome = 'sent' | 'failed' | 'retryable' | 'unknown';

export interface WhatsAppSendResult {
  success: boolean;
  outcome: WhatsAppDeliveryOutcome;
  error?: string;
  messageId?: string;
  idempotencyKey: string;
  requestPayload: Record<string, unknown>;
  logPersisted?: boolean;
  logError?: string;
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
  let requestStarted = false;
  try {
    const headers = await getWhatsAppApiHeaders(true);
    headers['Idempotency-Key'] = idempotencyKey;

    requestStarted = true;
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
      const outcome = data && typeof data === 'object'
        && 'outcome' in data && isWhatsAppDeliveryOutcome(data.outcome)
        ? data.outcome
        : response.status >= 500 ? 'unknown' : 'failed';
      return {
        success: false,
        outcome,
        error,
        idempotencyKey,
        requestPayload: payload,
        logPersisted: data && typeof data === 'object'
          && 'logPersisted' in data && typeof data.logPersisted === 'boolean'
          ? data.logPersisted
          : undefined,
        logError: data && typeof data === 'object'
          && 'logError' in data && typeof data.logError === 'string' ? data.logError : undefined
      };
    }

    return {
      success: true,
      outcome: 'outcome' in data && isWhatsAppDeliveryOutcome(data.outcome) ? data.outcome : 'sent',
      idempotencyKey,
      requestPayload: payload,
      messageId: 'messageId' in data && typeof data.messageId === 'string' ? data.messageId : undefined,
      logPersisted: 'logPersisted' in data && typeof data.logPersisted === 'boolean'
        ? data.logPersisted
        : undefined,
      logError: 'logError' in data && typeof data.logError === 'string' ? data.logError : undefined
    };
  } catch (error) {
    return {
      success: false,
      outcome: requestStarted ? 'unknown' : 'failed',
      error: error instanceof Error ? error.message : 'تعذر الاتصال بخدمة واتساب المركزية.',
      idempotencyKey,
      requestPayload: payload
    };
  }
}

function isWhatsAppDeliveryOutcome(value: unknown): value is WhatsAppDeliveryOutcome {
  return value === 'sent' || value === 'failed' || value === 'retryable' || value === 'unknown';
}
