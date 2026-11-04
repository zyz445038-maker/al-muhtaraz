export type PendingNotification = {
  id: string;
  recipient_phone: string;
  recipient_name: string | null;
  recipient_role: 'customer' | 'employee' | 'admin';
  contract_id: string | null;
  message_body: string;
};

export type NotificationLogUpdate = {
  status: 'sent' | 'failed' | 'pending';
  sent_at?: string;
  error_message?: string;
};

type NotificationDeliveryResult = {
  success: boolean;
  outcome?: 'sent' | 'failed' | 'retryable' | 'unknown';
  error?: string;
};

export async function processPendingNotifications(
  notifications: PendingNotification[],
  autoSendEnabled: boolean,
  send: (notification: PendingNotification) => Promise<NotificationDeliveryResult>,
  update: (id: string, values: NotificationLogUpdate) => Promise<{ error?: string }>,
  concurrency = 5
) {
  const result = {
    sent_count: 0,
    failed_count: 0,
    pending_count: 0,
    errors: [] as string[]
  };

  if (!autoSendEnabled) {
    return { ...result, skipped_count: notifications.length };
  }

  const processOne = async (notification: PendingNotification) => {
    let delivery: NotificationDeliveryResult;
    if (!notification.recipient_phone.trim() || !notification.message_body.trim()) {
      delivery = { success: false, error: 'رقم المستلم أو نص الرسالة فارغ.' };
    } else {
      try {
        delivery = await send(notification);
      } catch (error) {
        delivery = {
          success: false,
          outcome: 'unknown',
          error: error instanceof Error ? error.message : 'تعذر إرسال الرسالة.'
        };
      }
    }

    const sentAt = delivery.success ? new Date().toISOString() : undefined;
    const needsReview = !delivery.success && delivery.outcome === 'unknown';
    const canRetry = !delivery.success && delivery.outcome === 'retryable';
    const updateValues: NotificationLogUpdate = delivery.success
      ? { status: 'sent', sent_at: sentAt }
      : {
          status: needsReview || canRetry ? 'pending' : 'failed',
          error_message: delivery.error || 'فشل الإرسال دون سبب محدد.'
        };

    try {
      const updateResult = await update(notification.id, updateValues);
      if (updateResult.error) throw new Error(updateResult.error);
      if (delivery.success) {
        result.sent_count += 1;
      } else if (needsReview || canRetry) {
        result.pending_count += 1;
        const statusMessage = needsReview
          ? 'نتيجة الإرسال غير مؤكدة؛ لن تتم إعادة المحاولة تلقائيًا.'
          : 'تأكد أن الإرسال لم يبدأ؛ ستتم إعادة المحاولة المجدولة بالمفتاح نفسه.';
        result.errors.push(`${notification.id}: ${statusMessage}`);
      } else {
        result.failed_count += 1;
        result.errors.push(`${notification.id}: ${updateValues.error_message}`);
      }
    } catch (error) {
      result.errors.push(
        `${notification.id}: تعذر تحديث سجل الإرسال: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
      );
      if (!delivery.success && !needsReview && !canRetry) result.failed_count += 1;
    }
  };

  const safeConcurrency = Math.max(1, Math.floor(concurrency));
  for (let index = 0; index < notifications.length; index += safeConcurrency) {
    await Promise.all(notifications.slice(index, index + safeConcurrency).map(processOne));
  }

  return { ...result, skipped_count: 0 };
}
