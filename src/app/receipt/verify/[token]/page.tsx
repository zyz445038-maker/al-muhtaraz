import { getPublicReceiptVerification } from '@/lib/publicReceiptVerification';
import { createReceiptNumberVerificationUrl } from '@/lib/receiptVerification';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ token: string }>;
};

const TOKEN_PATTERN = /^[0-9a-f]{32}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  return {
    title: 'التحقق من الفاتورة',
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
    alternates: { canonical: `/receipt/verify/${token}` }
  };
}

export default async function ReceiptVerificationPage({ params }: Props) {
  const { token } = await params;
  if (!TOKEN_PATTERN.test(token)) notFound();

  const verified = await getPublicReceiptVerification(token);
  if (!verified) notFound();

  const receiptUrl = new URL(createReceiptNumberVerificationUrl(verified.receiptNumber));
  receiptUrl.searchParams.set('t', token);
  redirect(receiptUrl.toString());
}
