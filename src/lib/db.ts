import { supabase } from '@/lib/supabase';
import { logError, logEvent } from '@/lib/eventLogger';

export type DbQueryResponse<T> = {
  data: T | null;
  error: unknown;
};

export type NotificationLogInput = {
  contract_id?: string | null;
  customer_id?: string | null;
  recipient_role: 'customer' | 'employee' | 'admin';
  recipient_phone: string;
  recipient_name?: string | null;
  notification_type: 'debris_pickup_4h' | 'commercial_7d_before' | 'commercial_2d_before' | 'contract_created' | 'custom_alert';
  message_body: string;
  scheduled_for?: string;
  status?: 'pending' | 'sent' | 'failed' | 'cancelled';
  error_message?: string | null;
};

export async function runDbQuery<T>(
  label: string,
  operation: () => PromiseLike<DbQueryResponse<T>>,
  fallback: T | null = null
) {
  try {
    const result = await operation();
    if (result.error) {
      const error = getDbErrorMessage(result.error);
      logError(label, result.error);
      return { ok: false, data: fallback, error } as const;
    }

    logEvent('db.query.success', { label });
    return { ok: true, data: result.data, error: undefined } as const;
  } catch (error) {
    logError(label, error);
    return { ok: false, data: fallback, error: getDbErrorMessage(error) } as const;
  }
}

export async function insertNotificationLog(label: string, input: NotificationLogInput) {
  return runDbQuery(label, () => supabase
    .from('notification_logs')
    .insert([{
      ...input,
      scheduled_for: input.scheduled_for || new Date().toISOString(),
      status: input.status || 'pending'
    }])
    .select()
    .maybeSingle()
  );
}

export function getDbErrorMessage(error: unknown, fallback = 'Database operation failed') {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === 'string') return error || fallback;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  if (error && typeof error === 'object') {
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== '{}') return serialized;
    } catch {
      // Keep the generic fallback for non-serializable errors.
    }
  }
  return fallback;
}
