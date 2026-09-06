export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
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

    const dbResult = await withDbSafety('webhook-update-contract', async () => {
      let query = supabase.from('contracts').update({
        payment_status: 'paid',
        payment_method: paymentMethod,
        paid_amount: amount,
        receipt_number: receiptNumber,
        updated_at: new Date().toISOString()
      });

      if (contractId) {
        query = query.eq('id', contractId);
      } else {
        query = query.eq('contract_number', contractNumber);
      }

      const contractResult = await runDbQuery<any>(
        'payment.webhook.contract.update',
        () => query.select('*, customer:customers(*), container:containers(*)').single()
      );

      if (!contractResult.ok) {
        throw new Error(contractResult.error);
      }

      const updatedContract = contractResult.data;

      if (!updatedContract) {
        return { updatedContract: null };
      }

      const receiptResult = await runDbQuery('payment.webhook.receipt.insert', () => supabase.from('receipts').insert([{
        receipt_number: receiptNumber,
        contract_id: updatedContract.id,
        customer_id: updatedContract.customer_id,
        customer_name: updatedContract.customer?.name || 'عميل المحترز',
        amount: amount,
        payment_method: paymentMethod,
        transaction_reference: transactionRef,
        contract_number: updatedContract.contract_number,
        container_number: updatedContract.container?.container_number,
        container_type: updatedContract.contract_type,
        notes: 'تم التحصيل إلكترونياً بنجاح عبر سداد / مدى / Apple Pay'
      }]));

      if (!receiptResult.ok) {
        throw new Error(receiptResult.error);
      }

      const notificationResult = await runDbQuery('payment.webhook.notification.insert', () => supabase.from('notifications').insert([{
        contract_id: updatedContract.id,
        title: `💳 سداد إلكتروني ناجح (${updatedContract.contract_number})`,
        message: `قام العميل ${updatedContract.customer?.name} بسداد ${amount} ر.س إلكترونياً بنجاح.`,
        type: 'payment_received'
      }]));

      if (!notificationResult.ok) {
        throw new Error(notificationResult.error);
      }

      logEvent('payment.webhook.processed', {
        contractId: updatedContract.id,
        transactionReference: transactionRef,
        amount
      });

      return { updatedContract };
    });

    if (!dbResult.ok) {
      return NextResponse.json({
        success: false,
        warning: 'Payment was received but local database update failed.',
        error: dbResult.error,
        message: 'Payment webhook accepted but persistence failed. Manual reconciliation required.'
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment processed and verified successfully'
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({
      success: false,
      error: normalizeErrorMessage(error, 'Webhook processing failed')
    }, { status: 500 });
  }
}
