import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { proxyWhatsAppDesktopRequest } from './whatsappDesktopProxy';

const originalBaseUrl = process.env.NEXT_PUBLIC_STAFF_ADMIN_API_BASE_URL;
const originalFetch = globalThis.fetch;

afterEach(() => {
  if (originalBaseUrl === undefined) delete process.env.NEXT_PUBLIC_STAFF_ADMIN_API_BASE_URL;
  else process.env.NEXT_PUBLIC_STAFF_ADMIN_API_BASE_URL = originalBaseUrl;
  globalThis.fetch = originalFetch;
});

test('allows local API routes to use their configured Railway service when no app proxy is set', async () => {
  delete process.env.NEXT_PUBLIC_STAFF_ADMIN_API_BASE_URL;

  const response = await proxyWhatsAppDesktopRequest(
    new Request('http://localhost:3100/api/whatsapp/status'),
    '/api/whatsapp/status'
  );

  assert.equal(response, null);
});

test('keeps localhost requests proxied to the published app when configured', async () => {
  process.env.NEXT_PUBLIC_STAFF_ADMIN_API_BASE_URL = 'https://al-muhtaraz.example/';
  let destination: URL | undefined;
  let forwardedAuthorization = '';
  let forwardedIdempotencyKey = '';
  globalThis.fetch = async (input, init) => {
    destination = new URL(input.toString());
    const headers = new Headers(init?.headers);
    forwardedAuthorization = headers.get('authorization') || '';
    forwardedIdempotencyKey = headers.get('idempotency-key') || '';
    return Response.json({ success: true, status: 'qr_ready' });
  };

  const response = await proxyWhatsAppDesktopRequest(
    new Request('http://localhost:3100/api/whatsapp/status?source=desktop', {
      headers: {
        Authorization: 'Bearer test-token',
        'Idempotency-Key': 'notification:test'
      }
    }),
    '/api/whatsapp/status'
  );

  assert.equal(destination?.href, 'https://al-muhtaraz.example/api/whatsapp/status?source=desktop');
  assert.equal(forwardedAuthorization, 'Bearer test-token');
  assert.equal(forwardedIdempotencyKey, 'notification:test');
  assert.equal(response?.status, 200);
});

test('does not proxy requests that are not addressed to localhost', async () => {
  process.env.NEXT_PUBLIC_STAFF_ADMIN_API_BASE_URL = 'https://al-muhtaraz.example';

  const response = await proxyWhatsAppDesktopRequest(
    new Request('https://al-muhtaraz.example/api/whatsapp/status'),
    '/api/whatsapp/status'
  );

  assert.equal(response, null);
});
