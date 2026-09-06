export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/whatsappEngine';
import { insertNotificationLog, runDbQuery } from '@/lib/db';
import { logError, logEvent } from '@/lib/eventLogger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
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
    } = body;

    if (!phone || (!message && !mediaUrl && !mediaBase64 && !location)) {
      return NextResponse.json({ success: false, error: 'Phone and message or media are required' }, { status: 400 });
    }

    // 1. Fetch saved WhatsApp Settings
    let dbServerUrl = '';
    let dbApiKey = '';

    try {
      const settingsResult = await runDbQuery<{ evolution_server_url?: string; evolution_api_key?: string }>('whatsapp.settings.read', () => supabase
        .from('whatsapp_settings')
        .select('*')
        .limit(1)
        .maybeSingle());

      if (settingsResult.ok && settingsResult.data) {
        const settings = settingsResult.data;
        dbServerUrl = settings.evolution_server_url || '';
        dbApiKey = settings.evolution_api_key || '';
      }
    } catch (error) {
      logError('whatsapp.settings.read', error);
    }

    // Format and normalize phone number
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

    let sendSuccess = false;
    let apiResponse: any = null;

    // Resolve active cloud Add-on server URL & API Key from environment only
    const addonServerUrl = process.env.WHATSAPP_ADDON_URL || dbServerUrl;
    const addonApiKey = process.env.WHATSAPP_ADDON_API_KEY || dbApiKey;

    // 2. Dispatch message through Cloud Add-on server only when configuration exists
    if (addonServerUrl && addonApiKey) {
      const cleanServer = addonServerUrl.replace(/\/+$/, '');

      try {
        const isMedia = mediaUrl || mediaBase64 || location || mediaType === 'document' || fileName?.endsWith('.pdf');
        const targetUrl = isMedia ? `${cleanServer}/api/messages/send-media` : `${cleanServer}/api/messages/send-text`;

        const addonPayload = isMedia ? {
          phone: cleanPhone,
          message,
          mediaUrl,
          mediaBase64,
          mediaType: mediaType || (location ? 'location' : 'document'),
          fileName,
          mimetype,
          caption: caption || message,
          location
        } : {
          phone: cleanPhone,
          message
        };

        const addonRes = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${addonApiKey}`
          },
          body: JSON.stringify(addonPayload)
        });

        if (addonRes.ok) {
          apiResponse = await addonRes.json();
          if (apiResponse.success) {
            sendSuccess = true;
          }
        } else {
          const errorText = await addonRes.text();
          console.error('Addon server response error:', addonRes.status, errorText);
        }
      } catch (addonErr) {
        console.warn('Failed sending via Addon server, attempting local fallback:', addonErr);
      }
    } else {
      console.warn('WhatsApp add-on is not configured. Skipping external send route.');
    }

    // If cloud microservice was unreachable, try embedded fallback
    if (!sendSuccess) {
      try {
        const res = await sendWhatsAppMessage(cleanPhone, {
          text: message,
          mediaUrl,
          mediaBase64,
          mediaType,
          fileName,
          mimetype,
          caption: caption || message,
          location
        });
        sendSuccess = res.success;
        apiResponse = res;
      } catch (fallbackErr) {
        console.warn('Embedded fallback error:', fallbackErr);
      }
    }

    // 3. Log notification to Supabase
    try {
      const logResult = await insertNotificationLog('whatsapp.message.log', {
        contract_id: contract_id || null,
        customer_id: customer_id || null,
        recipient_phone: cleanPhone,
        recipient_name: body.recipient_name || 'مستلم',
        recipient_role: recipient_role || 'customer',
        notification_type: notification_type === 'contract_created' ? 'contract_created' : 'custom_alert',
        message_body: message || caption || '[media]',
        status: sendSuccess ? 'sent' : 'failed'
      });
      if (!logResult.ok) {
        logError('whatsapp.message.log', logResult.error);
      }
      logEvent('whatsapp.message.completed', { phone: cleanPhone, success: sendSuccess });
    } catch (error) {
      logError('whatsapp.message.log', error);
    }

    return NextResponse.json({
      success: sendSuccess,
      mode: 'addon',
      data: apiResponse
    });

  } catch (error: any) {
    console.error('Send WhatsApp Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
