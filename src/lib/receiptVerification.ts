import { encodeCompactReceiptPayload, type PublicReceiptPayload } from '@/utils/receiptEncoder';
import { PUBLIC_APP_ORIGIN } from '@/utils/publicAppUrl';

export async function createReceiptImageUrl(
  payload: PublicReceiptPayload
): Promise<string> {
  const verificationData = await encodeCompactReceiptPayload(payload);
  return `${PUBLIC_APP_ORIGIN}/api/receipts/image?d=${encodeURIComponent(verificationData)}`;
}
