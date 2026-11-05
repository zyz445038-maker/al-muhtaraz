export const VAT_RATE = 0.15;

export interface VatAmounts {
  subtotalAmount: number;
  vatAmount: number;
  grossAmount: number;
}

export interface ContractAmounts extends VatAmounts {
  nonTaxableAmount: number;
  isVatAware: boolean;
}

export interface ReceiptAmounts extends VatAmounts {
  nonTaxableAmount: number;
  isVatAware: boolean;
}

export interface PaymentAllocation extends VatAmounts {
  nonTaxableAmount: number;
  enteredAmount: number;
}

export interface ContractPaymentContext {
  nonTaxableAmount: number;
  nonTaxablePaidAmount: number;
  subtotalAmount: number;
  subtotalPaidAmount: number;
  vatAmount: number;
  vatPaidAmount: number;
  isVatAware: boolean;
}

function toCents(amount: number): number {
  return Number.isFinite(amount) ? Math.round((amount + Number.EPSILON) * 100) : 0;
}

function fromCents(amount: number): number {
  return amount / 100;
}

export function roundCurrency(amount: number): number {
  return fromCents(toCents(amount));
}

export function calculateVatAmounts(subtotalAmount: number): VatAmounts {
  const subtotalCents = Math.max(0, toCents(subtotalAmount));
  const vatCents = Math.round(subtotalCents * 15 / 100);

  return {
    subtotalAmount: fromCents(subtotalCents),
    vatAmount: fromCents(vatCents),
    grossAmount: fromCents(subtotalCents + vatCents)
  };
}

export function getContractAmounts(contract: {
  total_cost: number;
  non_taxable_amount?: number | null;
  subtotal_amount?: number | null;
  vat_amount?: number | null;
}): ContractAmounts {
  const totalCents = Math.max(0, toCents(contract.total_cost));
  const hasVatData = contract.subtotal_amount != null && contract.vat_amount != null;

  if (!hasVatData) {
    return {
      nonTaxableAmount: 0,
      subtotalAmount: fromCents(totalCents),
      vatAmount: 0,
      grossAmount: fromCents(totalCents),
      isVatAware: false
    };
  }

  const subtotalCents = Math.max(0, toCents(contract.subtotal_amount ?? 0));
  const vatCents = Math.max(0, toCents(contract.vat_amount ?? 0));
  const nonTaxableCents = contract.non_taxable_amount == null
    ? Math.max(0, totalCents - subtotalCents - vatCents)
    : Math.max(0, toCents(contract.non_taxable_amount));

  return {
    nonTaxableAmount: fromCents(nonTaxableCents),
    subtotalAmount: fromCents(subtotalCents),
    vatAmount: fromCents(vatCents),
    grossAmount: fromCents(nonTaxableCents + subtotalCents + vatCents),
    isVatAware: true
  };
}

export function getContractPaymentContext(contract: {
  total_cost: number;
  paid_amount: number;
  non_taxable_amount?: number | null;
  subtotal_amount?: number | null;
  vat_amount?: number | null;
  non_taxable_paid_amount?: number | null;
  subtotal_paid_amount?: number | null;
  vat_paid_amount?: number | null;
}): ContractPaymentContext {
  const isVatAware = contract.subtotal_amount != null && contract.vat_amount != null;

  if (!isVatAware) {
    return {
      nonTaxableAmount: Math.max(0, roundCurrency(contract.total_cost)),
      nonTaxablePaidAmount: Math.max(0, roundCurrency(contract.paid_amount)),
      subtotalAmount: 0,
      subtotalPaidAmount: 0,
      vatAmount: 0,
      vatPaidAmount: 0,
      isVatAware: false
    };
  }

  const amounts = getContractAmounts(contract);
  const subtotalPaidAmount = Math.max(0, roundCurrency(contract.subtotal_paid_amount ?? 0));
  const vatPaidAmount = Math.max(0, roundCurrency(contract.vat_paid_amount ?? 0));
  const nonTaxablePaidAmount = Math.max(
    0,
    roundCurrency(contract.non_taxable_paid_amount
      ?? contract.paid_amount - subtotalPaidAmount - vatPaidAmount)
  );

  return {
    nonTaxableAmount: amounts.nonTaxableAmount,
    nonTaxablePaidAmount,
    subtotalAmount: amounts.subtotalAmount,
    subtotalPaidAmount,
    vatAmount: amounts.vatAmount,
    vatPaidAmount,
    isVatAware: true
  };
}

export function getReceiptAmounts(receipt: {
  amount: number;
  non_taxable_amount?: number | null;
  subtotal_amount?: number | null;
  vat_amount?: number | null;
}): ReceiptAmounts {
  const hasVatData = receipt.subtotal_amount != null && receipt.vat_amount != null;
  if (!hasVatData) {
    return {
      nonTaxableAmount: 0,
      subtotalAmount: Math.max(0, roundCurrency(receipt.amount)),
      vatAmount: 0,
      grossAmount: Math.max(0, roundCurrency(receipt.amount)),
      isVatAware: false
    };
  }

  const nonTaxableAmount = Math.max(0, roundCurrency(receipt.non_taxable_amount ?? 0));
  const subtotalAmount = Math.max(0, roundCurrency(receipt.subtotal_amount ?? 0));
  const vatAmount = Math.max(0, roundCurrency(receipt.vat_amount ?? 0));
  return {
    nonTaxableAmount,
    subtotalAmount,
    vatAmount,
    grossAmount: roundCurrency(nonTaxableAmount + subtotalAmount + vatAmount),
    isVatAware: true
  };
}

export function allocatePaymentAmounts(input: {
  enteredAmount: number;
  nonTaxableAmount: number;
  nonTaxablePaidAmount: number;
  subtotalAmount: number;
  subtotalPaidAmount: number;
  vatAmount: number;
  vatPaidAmount: number;
}): PaymentAllocation | null {
  const enteredCents = Math.max(0, toCents(input.enteredAmount));
  const nonTaxableRemaining = Math.max(
    0,
    toCents(input.nonTaxableAmount) - toCents(input.nonTaxablePaidAmount)
  );
  const subtotalTotal = Math.max(0, toCents(input.subtotalAmount));
  const subtotalPaid = Math.max(0, toCents(input.subtotalPaidAmount));
  const subtotalRemaining = Math.max(0, subtotalTotal - subtotalPaid);

  if (enteredCents > nonTaxableRemaining + subtotalRemaining) return null;

  const nonTaxablePaid = Math.min(enteredCents, nonTaxableRemaining);
  const subtotalPaidNow = Math.min(enteredCents - nonTaxablePaid, subtotalRemaining);
  const newSubtotalPaid = subtotalPaid + subtotalPaidNow;
  const totalVat = Math.max(0, toCents(input.vatAmount));
  const vatPaid = Math.max(0, toCents(input.vatPaidAmount));
  const targetVatPaid = subtotalTotal === 0 || newSubtotalPaid >= subtotalTotal
    ? totalVat
    : Math.min(totalVat, Math.round(totalVat * newSubtotalPaid / subtotalTotal));
  const vatPaidNow = Math.max(0, targetVatPaid - vatPaid);

  return {
    enteredAmount: fromCents(enteredCents),
    nonTaxableAmount: fromCents(nonTaxablePaid),
    subtotalAmount: fromCents(subtotalPaidNow),
    vatAmount: fromCents(vatPaidNow),
    grossAmount: fromCents(nonTaxablePaid + subtotalPaidNow + vatPaidNow)
  };
}
