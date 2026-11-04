import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { IdempotencyStore, MAX_SEND_ATTEMPTS } from './idempotencyStore.js';

test('reserves concurrent sends once and replays the persisted result', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'whatsapp-idempotency-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'store.json');
  const store = new IdempotencyStore(filePath);

  const reservations = await Promise.all([
    store.reserve('notification:one', 'payload-hash'),
    store.reserve('notification:one', 'payload-hash')
  ]);
  assert.deepEqual(reservations, [
    { state: 'reserved', attempts: 1 },
    { state: 'pending' }
  ]);

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

test('never retries an unknown send, including after a service restart', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'whatsapp-idempotency-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'store.json');
  const store = new IdempotencyStore(filePath);

  assert.deepEqual(await store.reserve('notification:unknown', 'payload-hash'), {
    state: 'reserved',
    attempts: 1
  });
  await store.markUnknown('notification:unknown', 'payload-hash', {
    statusCode: 502,
    body: { success: false, outcome: 'unknown' }
  });

  const restartedStore = new IdempotencyStore(filePath);
  assert.deepEqual(await restartedStore.reserve('notification:unknown', 'payload-hash'), {
    state: 'pending'
  });
});

test('retries confirmed-not-sent attempts up to the configured limit', async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'whatsapp-idempotency-'));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const store = new IdempotencyStore(path.join(directory, 'store.json'));

  for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt += 1) {
    assert.deepEqual(await store.reserve('notification:retryable', 'payload-hash'), {
      state: 'reserved',
      attempts: attempt
    });
    const result = await store.markRetryable('notification:retryable', 'payload-hash', {
      statusCode: 502,
      body: { success: false, outcome: 'retryable', error: 'WhatsApp is disconnected' }
    });

    if (attempt < MAX_SEND_ATTEMPTS) {
      assert.deepEqual(result, { state: 'retryable' });
    } else {
      assert.equal(result.state, 'completed');
      if (result.state === 'completed') {
        assert.equal(result.body.outcome, 'failed');
        assert.equal(result.body.code, 'IDEMPOTENCY_RETRY_EXHAUSTED');
      }
    }
  }

  assert.equal((await store.reserve('notification:retryable', 'payload-hash')).state, 'completed');
});
