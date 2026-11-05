import assert from 'node:assert/strict';
import test from 'node:test';
import { createInvoicePresentation } from './invoicePresentation';
import type { PublicReceiptPayload } from './receiptEncoder';

const baseInvoice: PublicReceiptPayload = {
  type: 'receipt',
  receiptNumber: 'RCP-2026-0042',
  contractNumber: 'CNT-2026-0001',
  customerName: 'عميل اختبار',
  customerPhone: '0500000000',
  containerNumber: 'C-105',
  contractType: 'حاوية مخلفات وأنقاض',
  paidAmount: 115,
  totalCost: 402.5,
  contractPaidAmount: 115,
  subtotalAmount: 350,
  vatAmount: 52.5,
  receiptSubtotalAmount: 100,
  receiptVatAmount: 15,
  paymentMethod: 'bank_transfer',
  startDate: '2026/11/01',
  endDate: '2026/12/01',
  locationAddress: '',
  issueDate: '2026-11-05T00:00:00.000Z'
};

test('presents the same VAT-aware installment and remaining balance across invoice surfaces', () => {
  const presentation = createInvoicePresentation(baseInvoice);

  assert.equal(presentation.invoiceAmounts.grossAmount, 402.5);
  assert.equal(presentation.receiptAmounts.grossAmount, 115);
  assert.equal(presentation.remainingAmount, 287.5);
  assert.equal(presentation.isPartial, true);
  assert.equal(presentation.paymentMethod.label, 'تحويل بنكي');
  assert.equal(presentation.issueDate, '2026/11/05');
});

test('presents a fully paid VAT-aware invoice with a matching collection and zero balance', () => {
  const presentation = createInvoicePresentation({
    ...baseInvoice,
    paidAmount: 402.5,
    contractPaidAmount: 402.5,
    receiptSubtotalAmount: 350,
    receiptVatAmount: 52.5
  });

  assert.equal(presentation.invoiceAmounts.grossAmount, 402.5);
  assert.equal(presentation.receiptAmounts.grossAmount, 402.5);
  assert.equal(presentation.remainingAmount, 0);
  assert.equal(presentation.isPartial, false);
});

test('supports an unpaid deferred contract without inventing a collection', () => {
  const presentation = createInvoicePresentation({
    ...baseInvoice,
    paidAmount: 0,
    contractPaidAmount: 0,
    totalCost: 402.5,
    receiptSubtotalAmount: undefined,
    receiptVatAmount: undefined,
    paymentMethod: 'deferred'
  });

  assert.equal(presentation.invoiceAmounts.grossAmount, 402.5);
  assert.equal(presentation.receiptAmounts.grossAmount, 0);
  assert.equal(presentation.remainingAmount, 402.5);
  assert.equal(presentation.isPartial, true);
});

test('keeps extension amount, tax, collection and remaining balance aligned', () => {
  const presentation = createInvoicePresentation({
    ...baseInvoice,
    paidAmount: 23,
    totalCost: 157.5,
    contractPaidAmount: 123,
    subtotalAmount: 150,
    vatAmount: 7.5,
    receiptSubtotalAmount: 20,
    receiptVatAmount: 3,
    paymentMethod: 'cash'
  });

  assert.equal(presentation.invoiceAmounts.grossAmount, 157.5);
  assert.equal(presentation.receiptAmounts.grossAmount, 23);
  assert.equal(presentation.remainingAmount, 34.5);
  assert.equal(presentation.isPartial, true);
});

test('preserves a zero-value payment and never invents historical VAT', () => {
  const free = createInvoicePresentation({
    ...baseInvoice,
    paidAmount: 0,
    totalCost: 0,
    contractPaidAmount: 0,
    subtotalAmount: undefined,
    vatAmount: undefined,
    receiptSubtotalAmount: undefined,
    receiptVatAmount: undefined,
    paymentMethod: 'free'
  });

  assert.equal(free.invoiceAmounts.grossAmount, 0);
  assert.equal(free.receiptAmounts.grossAmount, 0);
  assert.equal(free.isFree, true);
  assert.equal(free.isPartial, false);

  const historical = createInvoicePresentation({
    ...baseInvoice,
    totalCost: 115,
    paidAmount: 0,
    contractPaidAmount: 0,
    subtotalAmount: undefined,
    vatAmount: undefined,
    receiptSubtotalAmount: undefined,
    receiptVatAmount: undefined
  });

  assert.equal(historical.invoiceAmounts.grossAmount, 115);
  assert.equal(historical.invoiceAmounts.vatAmount, 0);
  assert.equal(historical.remainingAmount, 115);
});
