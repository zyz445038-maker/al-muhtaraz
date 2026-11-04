import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { IdempotencyStore } from './idempotencyStore.js';

test('reserves concurrent sends once and replays the persisted result', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'whatsapp-idempotency-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'store.json');
  const store = new IdempotencyStore(filePath);

  const reservations = await Promise.all([
    store.reserve('notification:one', 'payload-hash'),
    store.reserve('notification:one', 'payload-hash')
  ]);
  assert.deepEqual(reservations.map(({ state }) => state), ['reserved', 'pending']);

  await store.complete('notification:one', 'payload-hash', {
    statusCode: 200,
    body: { success: true, messageId: 'message-1' }
  });

  const restartedStore = new IdempotencyStore(filePath);
  assert.deepEqual(await restartedStore.reserve('notification:one', 'payload-hash'), {
    state: 'completed',
    statusCode: 200,
    body: { success: true, messageId: 'message-1' }
  });
  assert.deepEqual(await restartedStore.reserve('notification:one', 'different-payload'), {
    state: 'conflict'
  });
});
