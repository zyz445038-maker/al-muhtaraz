export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { runDbQuery } from '@/lib/db';
import { apiErrorResponse } from '@/lib/apiSafety';
import type { PaymentSettings } from '@/types/database';

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (body === null) {
      throw new TypeError('Invalid invoice request body');
    }
    const { contract_id, contract_number, amount, customer_name, customer_phone, description } =
      Object(body) as Record<string, unknown>;

    if (!contract_id || !amount) {
      return NextResponse.json({ success: false, error: 'Contract ID and amount are required' }, { status: 400 });
    }

    // 1. Fetch Moyasar Payment Settings
    let secretKey = '';
    let isEnabled = true;

    try {
      const settingsResult = await runDbQuery<PaymentSettings>('payment.settings.read', () => supabase
        .from('payment_settings')
        .select('*')
        .limit(1)
        .single());

      if (settingsResult.ok && settingsResult.data) {
        const settings = settingsResult.data;
        isEnabled = settings.is_enabled;
        secretKey = settings.secret_key || '';
      }
    } catch (error) {
      return apiErrorResponse('payment.settings.read', error, 'Payment settings could not be loaded', 503);
    }

    if (!secretKey) {
      return NextResponse.json({
        success: false,
        error: 'Payment provider is not configured'
      }, { status: 503 });
    }

    if (!isEnabled) {
      return NextResponse.json({ success: false, error: 'Electronic payment is disabled by admin' }, { status: 400 });
    }

    // 2. Generate simulated or real Moyasar invoice URL
    // In production, you would call: https://api.moyasar.com/v1/invoices
    const invoiceId = `inv_${contract_number || Date.now()}`;
    const invoiceUrl = `https://checkout.moyasar.com/invoices/${invoiceId}?amount=${amount}`;

    return NextResponse.json({
      success: true,
      invoice_id: invoiceId,
      invoice_url: invoiceUrl,
      amount,
      contract_number,
      message: 'Payment link generated successfully'
    });
  } catch (error) {
    return apiErrorResponse('payment.create-invoice', error, 'Internal Server Error');
  }
}
