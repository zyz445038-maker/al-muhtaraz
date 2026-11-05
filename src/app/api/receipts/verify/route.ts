import { NextResponse } from 'next/server';
import { getPublicReceiptVerification } from '@/lib/publicReceiptVerification';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || '';

  try {
    const verified = await getPublicReceiptVerification(token);
    if (!verified) {
      return NextResponse.json({ error: 'Receipt verification link is invalid or expired.' }, {
        status: 404,
        headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }
      });
    }

    return NextResponse.json({ payload: verified.payload }, {
      headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }
    });
  } catch (error) {
    console.error('Public receipt verification failed:', error);
    return NextResponse.json({ error: 'Receipt verification is temporarily unavailable.' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }
    });
  }
}
