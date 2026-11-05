import assert from 'node:assert/strict';
import test from 'node:test';
import QRCode from 'qrcode';
import { createReceiptVerificationUrl } from '../lib/receiptVerification';

test('public receipt links contain only a random verification token', () => {
  const token = '0123456789abcdef0123456789abcdef';
  const url = new URL(createReceiptVerificationUrl(token));

  assert.equal(url.pathname, `/receipt/verify/${token}`);
  assert.equal(url.search, '');
  assert.equal(url.hash, '');
  assert.equal(url.href.includes('customer'), false);
});

test('short verification links fit a low-density printable QR code', () => {
  const url = createReceiptVerificationUrl('0123456789abcdef0123456789abcdef');
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const moduleSizeAt220px = Math.floor(220 / (qr.modules.size + 8));

  assert.ok(qr.modules.size <= 41, `QR has ${qr.modules.size} modules per side`);
  assert.ok(moduleSizeAt220px >= 3, 'QR modules remain large enough for print rendering');
});
