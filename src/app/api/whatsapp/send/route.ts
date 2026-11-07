export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { insertNotificationLog } from '@/lib/db';
import { logError, logEvent } from '@/lib/eventLogger';
import { sendWhatsAppViaAddon } from '@/lib/whatsappAddonClient';
import { authorizeWhatsAppRequest, isWhatsAppAuthorizationError } from '@/lib/whatsappApiAuth';
import { proxyWhatsAppDesktopRequest } from '@/lib/whatsappDesktopProxy';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const proxyResponse = await proxyWhatsAppDesktopRequest(request, '/api/whatsapp/send');
    if (proxyResponse) return proxyResponse;

    const authorization = await authorizeWhatsAppRequest(request);
    if (isWhatsAppAuthorizationError(authorization)) return authorization;
    if (authorization.profile.role !== 'admin'
      && authorization.profile.permissions?.can_send_whatsapp === false) {
      return NextResponse.json({ success: false, error: 'ليس لديك صلاحية إرسال رسائل واتساب.' }, { status: 403 });
    }

    const idempotencyKey = request.headers.get('idempotency-key')?.trim();
    if (!idempotencyKey || idempotencyKey.length > 128) {
      return NextResponse.json({ success: false, error: 'مفتاح منع التكرار مطلوب وغير صالح.' }, { status: 400 });
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'بيانات رسالة واتساب غير صالحة.' }, { status: 400 });
    }
    const { 
      phone, 
      message, 
      mediaUrl, 
      mediaBase64, 
      mediaType, 
      fileName, 
      mimetype, 
      caption, 
      location,
      contract_id, 
      customer_id, 
      recipient_role, 
      notification_type
    } = body as Record<string, unknown>;

    if (typeof phone !== 'string' || (!message && !mediaUrl && !mediaBase64 && !location)) {
      return NextResponse.json({ success: false, error: 'Phone and message or media are required' }, { status: 400 });
    }
    if (message !== undefined && typeof message !== 'string') {
      return NextResponse.json({ success: false, error: 'نص رسالة واتساب غير صالح.' }, { status: 400 });
    }

    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('00966')) {
      cleanPhone = cleanPhone.substring(2);
    }
    if (cleanPhone.startsWith('96605')) {
      cleanPhone = '966' + cleanPhone.substring(4);
    } else if (cleanPhone.startsWith('05')) {
      cleanPhone = '966' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('5') && cleanPhone.length === 9) {
      cleanPhone = '966' + cleanPhone;
    }

    const sendResult = await sendWhatsAppViaAddon({
      phone: cleanPhone,
      ...(typeof message === 'string' ? { message } : {}),
      ...(typeof mediaUrl === 'string' ? { mediaUrl } : {}),
      ...(typeof mediaBase64 === 'string' ? { mediaBase64 } : {}),
      ...(typeof mediaType === 'string' ? { mediaType } : {}),
      ...(typeof fileName === 'string' ? { fileName } : {}),
      ...(typeof mimetype === 'string' ? { mimetype } : {}),
      ...(typeof caption === 'string' ? { caption } : {}),
      ...(location && typeof location === 'object' ? { location } : {})
    }, idempotencyKey);

    let logPersisted = false;
    let logErrorMessage: string | undefined;
    try {
      const recipientRole = recipient_role === 'employee' || recipient_role === 'admin'
        ? recipient_role
        : 'customer';
      const logResult = await insertNotificationLog('whatsapp.message.log', {
        idempotency_key: idempotencyKey,
        contract_id: typeof contract_id === 'string' ? contract_id : null,
        customer_id: typeof customer_id === 'string' ? customer_id : null,
        recipient_phone: cleanPhone,
        recipient_name: 'recipient_name' in body && typeof body.recipient_name === 'string' ? body.recipient_name : 'مستلم',
        recipient_role: recipientRole,
        notification_type: notification_type === 'contract_created'
          ? 'contract_created'
          : notification_type === 'container_picked_up'
            ? 'container_picked_up'
            : 'custom_alert',
        message_body: typeof message === 'string' && message
          ? message
          : typeof caption === 'string' && caption ? caption : '[media]',
        status: sendResult.success ? 'sent' : 'failed',
        delivery_outcome: sendResult.outcome,
        sent_at: sendResult.success ? new Date().toISOString() : null,
        error_message: sendResult.error || null
      });
      logPersisted = logResult.ok;
      if (!logResult.ok) {
        logErrorMessage = logResult.error;
        logError('whatsapp.message.log', logResult.error);
      }

      logEvent('whatsapp.message.completed', {
        phone: cleanPhone,
        success: sendResult.success,
        outcome: sendResult.outcome,
        logPersisted,
        provider: 'railway',
        messageId: sendResult.messageId || null
      });
    } catch (error) {
      logErrorMessage = error instanceof Error ? error.message : 'تعذر حفظ سجل إرسال واتساب.';
      logError('whatsapp.message.log', error);
    }

    return NextResponse.json({
      ...sendResult,
      logPersisted,
      ...(logErrorMessage ? { logError: logErrorMessage } : {}),
      provider: 'railway'
    }, { status: sendResult.success ? 200 : 502 });

  } catch (error: unknown) {
    console.error('Send WhatsApp Error:', error);
    const errorMessage = error !== null && typeof error === 'object' && 'message' in error
      && typeof error.message === 'string' ? error.message : undefined;
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
