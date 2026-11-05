import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { sendWhatsAppViaAddon } from './whatsappAddonClient';

const originalUrl = process.env.WHATSAPP_ADDON_URL;
const originalKey = process.env.WHATSAPP_ADDON_API_KEY;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  process.env.WHATSAPP_ADDON_URL = 'https://whatsapp-addon.test';
  process.env.WHATSAPP_ADDON_API_KEY = 'test-key';
});

afterEach(() => {
  if (originalUrl === undefined) delete process.env.WHATSAPP_ADDON_URL;
  else process.env.WHATSAPP_ADDON_URL = originalUrl;
  if (originalKey === undefined) delete process.env.WHATSAPP_ADDON_API_KEY;
  else process.env.WHATSAPP_ADDON_API_KEY = originalKey;
  globalThis.fetch = originalFetch;
});

async function classifyResponse(status: number, body: unknown) {
  globalThis.fetch = async () => new Response(JSON.stringify(body), { status });
  return sendWhatsAppViaAddon({ phone: '+966500000000', message: 'Test' }, 'test-key');
}

test('treats a generic server error as an unknown delivery outcome', async () => {
  const result = await classifyResponse(500, { success: false, error: 'Could not persist result' });
  assert.equal(result.outcome, 'unknown');
  assert.equal(result.success, false);
});

test('preserves confirmed safe-to-retry responses', async () => {
  const result = await classifyResponse(502, {
    success: false,
    outcome: 'retryable',
    error: 'WhatsApp is disconnected'
  });
  assert.equal(result.outcome, 'retryable');
});

test('keeps in-progress idempotency responses unknown', async () => {
  const result = await classifyResponse(409, {
    success: false,
    code: 'IDEMPOTENCY_PENDING',
    outcome: 'unknown',
    error: 'Send is still unresolved'
  });
  assert.equal(result.outcome, 'unknown');
});

test('accepts a failed outcome only when the server explicitly confirms it', async () => {
  const result = await classifyResponse(502, {
    success: false,
    outcome: 'failed',
    error: 'Retry limit reached'
  });
  assert.equal(result.outcome, 'failed');
});
