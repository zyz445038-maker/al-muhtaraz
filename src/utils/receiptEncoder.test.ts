import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeReceiptVerificationPayload, encodeCompactReceiptPayload } from './receiptEncoder';

const receipt = {
  type: 'receipt' as const,
  receiptNumber: 'RCP-2026-0042',
  contractNumber: 'CNT-2026-001',
  customerName: 'شركة المحترز',
  customerVatNumber: '300099887700003',
  customerPhone: '+966500000000',
  containerNumber: 'C-105',
  contractType: 'حاوية تجارية للمنشآت',
  paidAmount: 1150,
  totalCost: 1150,
  contractPaidAmount: 1150,
  nonTaxableAmount: 0,
  subtotalAmount: 1000,
  vatAmount: 150,
  receiptNonTaxableAmount: 0,
  receiptSubtotalAmount: 1000,
  receiptVatAmount: 150,
  paymentMethod: 'bank_transfer',
  startDate: '2026/11/01',
  endDate: '2026/12/01',
  locationAddress: 'سكاكا',
  issueDate: '2026-11-05T05:30:00.000Z'
};

test('compact receipt payloads retain VAT details and customer VAT number', async () => {
  const encoded = await encodeCompactReceiptPayload(receipt);
  const decoded = await decodeReceiptVerificationPayload(encoded);

  assert.equal(decoded?.type, 'receipt');
  if (decoded?.type !== 'receipt') assert.fail('Expected a decoded receipt.');
  assert.equal(decoded.customerVatNumber, receipt.customerVatNumber);
  assert.equal(decoded.vatAmount, 150);
  assert.equal(decoded.receiptVatAmount, 150);
});

test('legacy compact receipt payload versions remain decodable', async () => {
  const values = [
    2,
    receipt.receiptNumber,
    receipt.contractNumber,
    receipt.customerName,
    receipt.customerPhone,
    receipt.containerNumber,
    receipt.contractType,
    receipt.paidAmount,
    receipt.totalCost,
    receipt.paymentMethod,
    receipt.startDate,
    receipt.endDate,
    receipt.locationAddress,
    receipt.issueDate,
    receipt.customerVatNumber,
    receipt.contractPaidAmount
  ];
  const bytes = new TextEncoder().encode(JSON.stringify(values));
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  const encoded = `j1.${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')}`;
  const decoded = await decodeReceiptVerificationPayload(encoded);

  assert.equal(decoded?.type, 'receipt');
  if (decoded?.type !== 'receipt') assert.fail('Expected a decoded legacy receipt.');
  assert.equal(decoded.receiptNumber, receipt.receiptNumber);
  assert.equal(decoded.customerVatNumber, receipt.customerVatNumber);
});
