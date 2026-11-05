import assert from 'node:assert/strict';
import test from 'node:test';
import {
  processPendingNotifications,
  type PendingNotification,
  type NotificationLogUpdate
} from './processPendingNotifications';

const notification: PendingNotification = {
  id: 'notice-1',
  recipient_phone: '+966500000000',
  recipient_name: 'عميل',
  recipient_role: 'customer',
  contract_id: 'contract-1',
  message_body: 'تذكير بانتهاء العقد'
};

test('sends pending notifications and marks delivered rows as sent', async () => {
  const updates: Array<{ id: string; values: NotificationLogUpdate }> = [];
  const result = await processPendingNotifications(
    [notification],
    true,
    async () => ({ success: true }),
    async (id, values) => {
      updates.push({ id, values });
      return {};
    }
  );

  assert.equal(result.sent_count, 1);
  assert.equal(result.failed_count, 0);
  assert.equal(updates[0].id, notification.id);
  assert.equal(updates[0].values.status, 'sent');
  assert.ok(updates[0].values.sent_at);
});

test('marks failed sends as failed and preserves their error', async () => {
  const updates: Array<{ id: string; values: NotificationLogUpdate }> = [];
  const result = await processPendingNotifications(
    [notification],
    true,
    async () => ({ success: false, error: 'واتساب غير متصل' }),
    async (id, values) => {
      updates.push({ id, values });
      return {};
    }
  );

  assert.equal(result.sent_count, 0);
  assert.equal(result.failed_count, 1);
  assert.equal(updates[0].values.status, 'failed');
  assert.equal(updates[0].values.error_message, 'واتساب غير متصل');
});

test('keeps notifications pending when provider errors leave the send outcome unknown', async () => {
  const updates: Array<{ id: string; values: NotificationLogUpdate }> = [];
  const result = await processPendingNotifications(
    [notification],
    true,
    async () => {
      throw new Error('provider timeout');
    },
    async (id, values) => {
      updates.push({ id, values });
      return {};
    }
  );

  assert.equal(result.failed_count, 0);
  assert.equal(result.pending_count, 1);
  assert.equal(updates[0].values.status, 'pending');
  assert.equal(updates[0].values.error_message, 'provider timeout');
});

test('keeps notifications pending when the provider explicitly reports an unknown outcome', async () => {
  const updates: Array<{ id: string; values: NotificationLogUpdate }> = [];
  const result = await processPendingNotifications(
    [notification],
    true,
    async () => ({ success: false, outcome: 'unknown', error: 'send confirmation unavailable' }),
    async (id, values) => {
      updates.push({ id, values });
      return {};
    }
  );

  assert.equal(result.failed_count, 0);
  assert.equal(result.pending_count, 1);
  assert.equal(updates[0].values.status, 'pending');
});

test('keeps confirmed-not-sent notifications pending for a scheduled retry', async () => {
  const updates: Array<{ id: string; values: NotificationLogUpdate }> = [];
  const result = await processPendingNotifications(
    [notification],
    true,
    async () => ({ success: false, outcome: 'retryable', error: 'WhatsApp is disconnected' }),
    async (id, values) => {
      updates.push({ id, values });
      return {};
    }
  );

  assert.equal(result.failed_count, 0);
  assert.equal(result.pending_count, 1);
  assert.equal(updates[0].values.status, 'pending');
});

test('does not send or modify pending rows when automatic sending is disabled', async () => {
  let sendCalls = 0;
  let updateCalls = 0;
  const result = await processPendingNotifications(
    [notification],
    false,
    async () => {
      sendCalls += 1;
      return { success: true };
    },
    async () => {
      updateCalls += 1;
      return {};
    }
  );

  assert.equal(result.skipped_count, 1);
  assert.equal(sendCalls, 0);
  assert.equal(updateCalls, 0);
});

test('records update errors instead of reporting successful delivery bookkeeping', async () => {
  const result = await processPendingNotifications(
    [notification],
    true,
    async () => ({ success: true }),
    async () => ({ error: 'database unavailable' })
  );

  assert.equal(result.sent_count, 0);
  assert.match(result.errors[0], /database unavailable/);
});

test('limits concurrent delivery attempts to the configured worker capacity', async () => {
  let activeSends = 0;
  let maximumActiveSends = 0;
  const notifications = Array.from({ length: 7 }, (_, index) => ({
    ...notification,
    id: `notice-${index}`
  }));

  const result = await processPendingNotifications(
    notifications,
    true,
    async () => {
      activeSends += 1;
      maximumActiveSends = Math.max(maximumActiveSends, activeSends);
      await new Promise(resolve => setTimeout(resolve, 5));
      activeSends -= 1;
      return { success: true };
    },
    async () => ({}),
    3
  );

  assert.equal(result.sent_count, notifications.length);
  assert.equal(maximumActiveSends, 3);
});
