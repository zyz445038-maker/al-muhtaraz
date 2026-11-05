import { getContractAmounts, getReceiptAmounts } from '@/utils/invoiceAmounts';
import type { PublicReceiptPayload } from '@/utils/receiptEncoder';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  apple_pay: 'Apple Pay',
  mada: 'بطاقة مدى',
  credit_card: 'Visa / Master',
  cash: 'نقدي كاش',
  pos: 'نقاط البيع POS',
  bank_transfer: 'تحويل بنكي',
  deferred: 'آجل على الحساب',
  free: 'معتمد رسمي'
};

const PAYMENT_METHOD_ICONS: Record<string, string> = {
  apple_pay: '🍎',
  mada: '💳',
  credit_card: '💳',
  cash: '💵',
  pos: '🖥️',
  bank_transfer: '🏦',
  deferred: '💳'
};

export function formatInvoiceMoney(amount: number): string {
  return amount.toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatInvoiceDate(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const parts = Object.fromEntries(dateParts.map(part => [part.type, part.value]));
  return `${parts.year}/${parts.month}/${parts.day}`;
}

export function getInvoicePaymentMethod(method: string): { label: string; icon: string } {
  return {
    label: PAYMENT_METHOD_LABELS[method] || method || 'سداد إلكتروني',
    icon: PAYMENT_METHOD_ICONS[method] || '💳'
  };
}

export function createInvoicePresentation(
  payload: PublicReceiptPayload & { isFree?: boolean; remainingAmount?: number }
) {
  const invoiceAmounts = getContractAmounts({
    total_cost: payload.totalCost,
    non_taxable_amount: payload.nonTaxableAmount,
    subtotal_amount: payload.subtotalAmount,
    vat_amount: payload.vatAmount
  });
  const receiptAmounts = getReceiptAmounts({
    amount: payload.paidAmount,
    non_taxable_amount: payload.receiptNonTaxableAmount,
    subtotal_amount: payload.receiptSubtotalAmount,
    vat_amount: payload.receiptVatAmount
  });
  const contractPaidAmount = Math.min(
    invoiceAmounts.grossAmount,
    Math.max(0, payload.contractPaidAmount ?? payload.paidAmount)
  );
  const remainingAmount = Math.max(
    0,
    payload.remainingAmount ?? invoiceAmounts.grossAmount - contractPaidAmount
  );
  const isFree = payload.isFree
    ?? (payload.paymentMethod === 'free' || (invoiceAmounts.grossAmount === 0 && payload.paidAmount === 0));

  return {
    invoiceAmounts,
    receiptAmounts,
    contractPaidAmount,
    remainingAmount,
    isPartial: !isFree && remainingAmount > 0,
    isFree,
    paymentMethod: getInvoicePaymentMethod(payload.paymentMethod),
    issueDate: formatInvoiceDate(payload.issueDate),
    formatMoney: formatInvoiceMoney
  };
}
