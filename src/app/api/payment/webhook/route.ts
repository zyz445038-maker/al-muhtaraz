export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { normalizeErrorMessage, validateRequiredFields, withDbSafety } from '@/lib/apiSafety';
import { runDbQuery } from '@/lib/db';
import { logEvent } from '@/lib/eventLogger';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signatureFromHeader = request.headers.get('x-signature') || request.headers.get('x-moyasar-signature') || '';
    const secret = process.env.MOYASAR_WEBHOOK_SECRET;

    if (!secret) {
      return NextResponse.json({
        success: false,
        error: 'Webhook secret is not configured. Set MOYASAR_WEBHOOK_SECRET in env.'
      }, { status: 503 });
    }

    const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    const provided = signatureFromHeader.replace(/^sha256=/i, '').trim();

    if (!provided) {
      return NextResponse.json({
        success: false,
        error: 'Missing webhook signature header.'
      }, { status: 401 });
    }

    const expectedBuffer = Buffer.from(expected, 'hex');
    const providedBuffer = Buffer.from(provided, 'hex');

    if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid webhook signature.'
      }, { status: 401 });
    }

    const payload = JSON.parse(rawBody || '{}');
    console.log('Moyasar Webhook received:', payload);

    const required = ['status'];
    const validation = validateRequiredFields(payload.data || payload, required);
    if (!validation.ok) {
      return NextResponse.json({
        success: false,
        warning: 'Payment payload missing required fields',
        missing: validation.missing
      }, { status: 400 });
    }

    const eventType = payload.type || payload.event || 'payment_paid';
    const paymentData = payload.data || payload;
    const status = paymentData.status;

    if (status !== 'paid' && status !== 'captured' && eventType !== 'payment_paid') {
      return NextResponse.json({ success: true, message: `Ignored status: ${status}` });
    }

    const metadata = paymentData.metadata || {};
    const contractId = metadata.contract_id || payload.contract_id;
    const contractNumber = metadata.contract_number || payload.contract_number;
    const amount = (paymentData.amount ? paymentData.amount / 100 : payload.amount) || 0;
    const source = paymentData.source || {};

    let paymentMethod = 'mada';
    if (source.type === 'applepay' || source.company === 'applepay') {
      paymentMethod = 'apple_pay';
    } else if (source.type === 'creditcard' || source.company === 'visa' || source.company === 'master') {
      paymentMethod = 'credit_card';
    } else if (source.company === 'mada') {
      paymentMethod = 'mada';
    }

    const transactionRef = paymentData.id || `TXN_${Date.now()}`;
    const receiptNumber = `RCP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (!(contractId || contractNumber)) {
      return NextResponse.json({
        success: false,
        warning: 'No contract reference found in payment payload.',
        message: 'Webhook was accepted but no contract could be matched.'
      }, { status: 200 });
    }

    const dbResult = await withDbSafety('webhook-record-contract-payment', async () => {
      const admin = getSupabaseAdminClient();
      let resolvedContractId = contractId;
      if (!resolvedContractId && contractNumber) {
        const lookup = await runDbQuery<{ id: string }>(
          'payment.webhook.contract.lookup',
          () => admin.from('contracts').select('id').eq('contract_number', contractNumber).maybeSingle()
        );
        if (!lookup.ok || !lookup.data?.id) {
          throw new Error(lookup.ok ? 'لم يُعثر على العقد المرتبط بالسداد.' : lookup.error);
        }
        resolvedContractId = lookup.data.id;
      }

      if (!resolvedContractId) {
        throw new Error('لا يوجد رقم عقد صالح في بيانات السداد.');
      }

      const paymentResult = await runDbQuery(
        'payment.webhook.record',
        () => admin.rpc('record_contract_payment_gross', {
          p_contract_id: resolvedContractId,
          p_amount: amount,
          p_payment_method: paymentMethod,
          p_receipt_number: receiptNumber,
          p_transaction_ref: transactionRef
        })
      );
      if (!paymentResult.ok) throw new Error(paymentResult.error);

      const payment = paymentResult.data as {
        contract?: { id?: string; contract_number?: string; customer_id?: string };
        receipt?: { id?: string };
        already_processed?: boolean;
      } | null;
      if (!payment?.contract?.id || !payment.receipt?.id) {
        throw new Error('لم تؤكد قاعدة البيانات حفظ التحصيل الإلكتروني وإيصال الضريبة.');
      }

      if (!payment.already_processed) {
        const notificationResult = await runDbQuery('payment.webhook.notification.insert', () => admin.from('notifications').insert([{
          contract_id: payment.contract!.id,
          title: `💳 سداد إلكتروني ناجح (${payment.contract!.contract_number || contractNumber || ''})`,
          message: `تم تسجيل مبلغ ${amount.toFixed(2)} ر.س شاملاً الضريبة للعقد.`,
          type: 'payment_alert'
        }]));
        if (!notificationResult.ok) throw new Error(notificationResult.error);

        logEvent('payment.webhook.processed', {
          contractId: payment.contract.id,
          transactionReference: transactionRef,
          amount
        });
      }

      return { alreadyProcessed: !!payment.already_processed };
    });

    if (!dbResult.ok || !dbResult.data) {
      return NextResponse.json({
        success: false,
        warning: 'Payment was received but local database update failed.',
        error: dbResult.error || 'Database operation returned no confirmation.',
        message: 'Payment webhook accepted but persistence failed. Manual reconciliation required.'
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      message: dbResult.data.alreadyProcessed
        ? 'Payment was already recorded.'
        : 'Payment processed and verified successfully'
    });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    return NextResponse.json({
      success: false,
      error: normalizeErrorMessage(error, 'Webhook processing failed')
    }, { status: 500 });
  }
}
