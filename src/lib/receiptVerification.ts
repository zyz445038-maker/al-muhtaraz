import { encodeCompactReceiptPayload, type PublicReceiptPayload } from '@/utils/receiptEncoder';
import { PUBLIC_APP_ORIGIN } from '@/utils/publicAppUrl';

const verificationTokenPattern = /^[0-9a-f]{32}$/i;

export function createReceiptVerificationUrl(
  token: string,
  baseUrl = PUBLIC_APP_ORIGIN
): string {
  if (!verificationTokenPattern.test(token)) {
    throw new Error('Receipt verification token is invalid.');
  }
  return new URL(`/receipt/verify/${token}`, baseUrl).toString();
}

export function createReceiptNumberVerificationUrl(
  receiptNumber: string,
  baseUrl = PUBLIC_APP_ORIGIN
): string {
  const normalized = receiptNumber.trim();
  if (!normalized) throw new Error('Receipt number is required to build a verification link.');
  return new URL(`/receipt/${encodeURIComponent(normalized)}`, baseUrl).toString();
}

export async function createLegacyReceiptImageUrl(
  payload: PublicReceiptPayload
): Promise<string> {
  const verificationData = await encodeCompactReceiptPayload(payload);
  return `${PUBLIC_APP_ORIGIN}/api/receipts/image?d=${encodeURIComponent(verificationData)}`;
}

export const createReceiptImageUrl = createLegacyReceiptImageUrl;
