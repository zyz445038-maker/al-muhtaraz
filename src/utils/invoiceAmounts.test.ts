import assert from 'node:assert/strict';
import test from 'node:test';
import {
  allocatePaymentAmounts,
  calculateVatAmounts,
  getContractAmounts,
  getContractPaymentContext,
  getReceiptAmounts
} from './invoiceAmounts';

test('calculates VAT from the entered pre-tax amount using currency precision', () => {
  assert.deepEqual(calculateVatAmounts(350), {
    subtotalAmount: 350,
    vatAmount: 52.5,
    grossAmount: 402.5
  });
  assert.deepEqual(calculateVatAmounts(0.1), {
    subtotalAmount: 0.1,
    vatAmount: 0.02,
    grossAmount: 0.12
  });
});

test('allocates VAT proportionally across installments and settles the rounding remainder', () => {
  const firstPayment = allocatePaymentAmounts({
    enteredAmount: 100,
    nonTaxableAmount: 0,
    nonTaxablePaidAmount: 0,
    subtotalAmount: 350,
    subtotalPaidAmount: 0,
    vatAmount: 52.5,
    vatPaidAmount: 0
  });
  assert.deepEqual(firstPayment, {
    enteredAmount: 100,
    nonTaxableAmount: 0,
    subtotalAmount: 100,
    vatAmount: 15,
    grossAmount: 115
  });

  const finalPayment = allocatePaymentAmounts({
    enteredAmount: 250,
    nonTaxableAmount: 0,
    nonTaxablePaidAmount: 0,
    subtotalAmount: 350,
    subtotalPaidAmount: firstPayment!.subtotalAmount,
    vatAmount: 52.5,
    vatPaidAmount: firstPayment!.vatAmount
  });
  assert.deepEqual(finalPayment, {
    enteredAmount: 250,
    nonTaxableAmount: 0,
    subtotalAmount: 250,
    vatAmount: 37.5,
    grossAmount: 287.5
  });
});

test('pays historical balances without adding VAT and preserves them as non-taxable on extension', () => {
  const historicalContract = {
    total_cost: 100,
    paid_amount: 30
  };
  assert.deepEqual(getContractAmounts(historicalContract), {
    nonTaxableAmount: 0,
    subtotalAmount: 100,
    vatAmount: 0,
    grossAmount: 100,
    isVatAware: false
  });

  const legacyContext = getContractPaymentContext(historicalContract);
  const legacyPayment = allocatePaymentAmounts({
    enteredAmount: 70,
    ...legacyContext
  });
  assert.equal(legacyPayment?.grossAmount, 70);
  assert.equal(legacyPayment?.vatAmount, 0);

  const hybridPayment = allocatePaymentAmounts({
    enteredAmount: 40,
    nonTaxableAmount: 100,
    nonTaxablePaidAmount: 30,
    subtotalAmount: 100,
    subtotalPaidAmount: 0,
    vatAmount: 15,
    vatPaidAmount: 0
  });
  assert.deepEqual(hybridPayment, {
    enteredAmount: 40,
    nonTaxableAmount: 40,
    subtotalAmount: 0,
    vatAmount: 0,
    grossAmount: 40
  });
});

test('does not infer VAT for old receipts with no persisted tax breakdown', () => {
  assert.deepEqual(getReceiptAmounts({ amount: 115 }), {
    nonTaxableAmount: 0,
    subtotalAmount: 115,
    vatAmount: 0,
    grossAmount: 115,
    isVatAware: false
  });
});
