import assert from 'node:assert/strict';
import test from 'node:test';
import {
  allocateGrossPayment,
  calculateVatAmounts,
  calculatePriceAmounts,
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

test('supports inclusive and exclusive agreed prices and applies discounts in the selected price basis', () => {
  assert.deepEqual(calculatePriceAmounts(300, 0, 'inclusive'), {
    priceAmount: 300,
    discountAmount: 0,
    discountedAmount: 300,
    priceIncludesVat: true,
    subtotalAmount: 260.87,
    vatAmount: 39.13,
    grossAmount: 300
  });
  assert.deepEqual(calculatePriceAmounts(300, 0, 'exclusive'), {
    priceAmount: 300,
    discountAmount: 0,
    discountedAmount: 300,
    priceIncludesVat: false,
    subtotalAmount: 300,
    vatAmount: 45,
    grossAmount: 345
  });
  assert.deepEqual(calculatePriceAmounts(300, 30, 'inclusive'), {
    priceAmount: 300,
    discountAmount: 30,
    discountedAmount: 270,
    priceIncludesVat: true,
    subtotalAmount: 234.78,
    vatAmount: 35.22,
    grossAmount: 270
  });
  assert.equal(calculatePriceAmounts(300, 30, 'exclusive').grossAmount, 310.5);
  assert.deepEqual(calculatePriceAmounts(0.04, 0, 'inclusive'), {
    priceAmount: 0.04,
    discountAmount: 0,
    discountedAmount: 0.04,
    priceIncludesVat: true,
    subtotalAmount: 0.03,
    vatAmount: 0.01,
    grossAmount: 0.04
  });
});

test('allocates the actual received gross across taxable installments without increasing the receipt', () => {
  const firstPayment = allocateGrossPayment({
    enteredAmount: 100,
    nonTaxableAmount: 0,
    nonTaxablePaidAmount: 0,
    subtotalAmount: 260.87,
    subtotalPaidAmount: 0,
    vatAmount: 39.13,
    vatPaidAmount: 0
  });
  assert.deepEqual(firstPayment, {
    enteredAmount: 100,
    nonTaxableAmount: 0,
    subtotalAmount: 86.96,
    vatAmount: 13.04,
    grossAmount: 100
  });

  const finalPayment = allocateGrossPayment({
    enteredAmount: 200,
    nonTaxableAmount: 0,
    nonTaxablePaidAmount: 0,
    subtotalAmount: 260.87,
    subtotalPaidAmount: firstPayment!.subtotalAmount,
    vatAmount: 39.13,
    vatPaidAmount: firstPayment!.vatAmount
  });
  assert.deepEqual(finalPayment, {
    enteredAmount: 200,
    nonTaxableAmount: 0,
    subtotalAmount: 173.91,
    vatAmount: 26.09,
    grossAmount: 200
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
  const legacyPayment = allocateGrossPayment({
    enteredAmount: 70,
    ...legacyContext
  });
  assert.equal(legacyPayment?.grossAmount, 70);
  assert.equal(legacyPayment?.vatAmount, 0);

  const hybridPayment = allocateGrossPayment({
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

test('allocates mixed balances to historical non-taxable amounts before taxable extensions', () => {
  const payment = allocateGrossPayment({
    enteredAmount: 80,
    nonTaxableAmount: 100,
    nonTaxablePaidAmount: 30,
    subtotalAmount: 100,
    subtotalPaidAmount: 0,
    vatAmount: 15,
    vatPaidAmount: 0
  });

  assert.deepEqual(payment, {
    enteredAmount: 80,
    nonTaxableAmount: 70,
    subtotalAmount: 8.7,
    vatAmount: 1.3,
    grossAmount: 80
  });
});

test('rejects payments above the gross balance and reconciles the final cent', () => {
  const context = {
    nonTaxableAmount: 0,
    nonTaxablePaidAmount: 0,
    subtotalAmount: 0.03,
    subtotalPaidAmount: 0,
    vatAmount: 0.01,
    vatPaidAmount: 0
  };
  assert.equal(allocateGrossPayment({ enteredAmount: 0.05, ...context }), null);

  const fullPayment = allocateGrossPayment({ enteredAmount: 0.04, ...context });
  assert.deepEqual(fullPayment, {
    enteredAmount: 0.04,
    nonTaxableAmount: 0,
    subtotalAmount: 0.03,
    vatAmount: 0.01,
    grossAmount: 0.04
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
