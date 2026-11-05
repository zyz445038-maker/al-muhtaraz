import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { getDebrisContractTypeLabel } from '@/utils/rentalPricing';
import type { PublicReceiptPayload } from '@/utils/receiptEncoder';

const TOKEN_PATTERN = /^[0-9a-f]{32}$/i;

type Relation<T> = T | T[] | null | undefined;
type CustomerDetails = { name?: string | null; phone?: string | null; vat_number?: string | null };
type ContainerDetails = { container_number?: string | null };

function firstRelation<T>(value: Relation<T>): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

type VerifiedContract = {
  contract_number: string;
  receipt_number?: string | null;
  contract_type: string;
  period_type: string;
  duration_days: number;
  start_date?: string | null;
  end_date?: string | null;
  location_address?: string | null;
  total_cost: number;
  paid_amount: number;
  payment_method?: string | null;
  customer_vat_number?: string | null;
  non_taxable_amount?: number | null;
  subtotal_amount?: number | null;
  vat_amount?: number | null;
  non_taxable_paid_amount?: number | null;
  subtotal_paid_amount?: number | null;
  vat_paid_amount?: number | null;
  created_at?: string | null;
  notes?: string | null;
  customer: Relation<CustomerDetails>;
  container: Relation<ContainerDetails>;
};

function buildReceiptPayload(input: {
  receipt?: {
    receipt_number?: string;
    amount?: number;
    non_taxable_amount?: number | null;
    subtotal_amount?: number | null;
    vat_amount?: number | null;
    customer_vat_number?: string | null;
    customer?: Relation<CustomerDetails>;
    payment_method?: string | null;
    created_at?: string | null;
    notes?: string | null;
  };
  contract: VerifiedContract;
}): PublicReceiptPayload {
  const { contract, receipt } = input;
  const receiptHasVatData = receipt?.subtotal_amount != null && receipt.vat_amount != null;
  const receiptCustomer = firstRelation(receipt?.customer);
  const contractCustomer = firstRelation(contract.customer);
  const container = firstRelation(contract.container);

  return {
    type: 'receipt',
    receiptNumber: receipt?.receipt_number || contract.receipt_number || contract.contract_number,
    contractNumber: contract.contract_number,
    customerName: receiptCustomer?.name || contractCustomer?.name || 'عميل مؤسسة المحترز',
    customerVatNumber: receipt
      ? receipt.customer_vat_number || ''
      : contract.customer_vat_number || '',
    customerPhone: receiptCustomer?.phone || contractCustomer?.phone || '-',
    containerNumber: container?.container_number || '-',
    contractType: contract.contract_type === 'commercial'
      ? 'حاوية تجارية للمنشآت'
      : getDebrisContractTypeLabel(contract.period_type, contract.duration_days),
    paidAmount: Number(receipt ? receipt.amount ?? 0 : contract.paid_amount ?? contract.total_cost ?? 0),
    totalCost: receipt
      ? Number(receiptHasVatData ? contract.total_cost : receipt.amount || 0)
      : Number(contract.total_cost || 0),
    contractPaidAmount: receipt
      ? Number(receiptHasVatData ? contract.paid_amount : receipt.amount || 0)
      : Number(contract.paid_amount || 0),
    ...(receiptHasVatData ? {
      nonTaxableAmount: contract.non_taxable_amount ?? undefined,
      subtotalAmount: contract.subtotal_amount ?? undefined,
      vatAmount: contract.vat_amount ?? undefined
    } : {}),
    receiptNonTaxableAmount: receipt?.non_taxable_amount ?? contract.non_taxable_paid_amount ?? undefined,
    receiptSubtotalAmount: receipt?.subtotal_amount ?? contract.subtotal_paid_amount ?? undefined,
    receiptVatAmount: receipt?.vat_amount ?? contract.vat_paid_amount ?? undefined,
    paymentMethod: receipt?.payment_method || contract.payment_method || 'mada',
    startDate: contract.start_date ? new Date(contract.start_date).toLocaleDateString('ar-SA') : '-',
    endDate: contract.end_date ? new Date(contract.end_date).toLocaleDateString('ar-SA') : '-',
    locationAddress: contract.location_address || 'الموقع المحدد بالعقد',
    issueDate: receipt?.created_at || contract.created_at || new Date().toISOString(),
    notes: receipt?.notes || contract.notes || ''
  };
}

export async function getPublicReceiptVerification(token: string): Promise<{
  receiptNumber: string;
  payload: PublicReceiptPayload;
} | null> {
  if (!TOKEN_PATTERN.test(token)) return null;

  const admin = getSupabaseAdminClient();
  const { data: receipt, error: receiptError } = await admin
    .from('receipts')
    .select(`
      receipt_number, amount, non_taxable_amount, subtotal_amount, vat_amount,
      customer_vat_number, payment_method, created_at, notes,
      customer:customers(name, phone),
      contract:contracts(
        contract_number, receipt_number, contract_type, period_type, duration_days,
        start_date, end_date, location_address, total_cost, paid_amount,
        payment_method, customer_vat_number, non_taxable_amount, subtotal_amount,
        vat_amount, non_taxable_paid_amount, subtotal_paid_amount, vat_paid_amount,
        created_at, notes, customer:customers(name, phone),
        container:containers(container_number)
      )
    `)
    .eq('public_verification_token', token)
    .maybeSingle();

  if (receiptError) throw new Error(`Could not load receipt verification data: ${receiptError.message}`);
  if (receipt?.contract) {
    const contract = firstRelation(receipt.contract);
    if (!contract) return null;
    const payload = buildReceiptPayload({ receipt, contract });
    return { receiptNumber: payload.receiptNumber, payload };
  }

  const { data: contractData, error: contractError } = await admin
    .from('contracts')
    .select(`
      contract_number, receipt_number, contract_type, period_type, duration_days,
      start_date, end_date, location_address, total_cost, paid_amount,
      payment_method, customer_vat_number, non_taxable_amount, subtotal_amount,
      vat_amount, non_taxable_paid_amount, subtotal_paid_amount, vat_paid_amount,
      created_at, notes, customer:customers(name, phone),
      container:containers(container_number)
    `)
    .eq('public_verification_token', token)
    .maybeSingle();
  if (contractError) throw new Error(`Could not load contract verification data: ${contractError.message}`);
  const contract = firstRelation(contractData);
  if (!contract) return null;

  const payload = buildReceiptPayload({ contract });
  return { receiptNumber: payload.receiptNumber, payload };
}
