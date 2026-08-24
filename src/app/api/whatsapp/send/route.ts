export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/whatsappEngine';

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
      notification_type, 
      mode: requestedMode 
    } = body;

    if (!phone || (!message && !mediaUrl && !mediaBase64 && !location)) {
      return NextResponse.json({ success: false, error: 'Phone and message or media are required' }, { status: 400 });
    }

    // 1. Fetch WhatsApp Gateway Settings
    let mode = requestedMode || 'embedded';
    let evolutionServerUrl = 'http://localhost:8080';
    let evolutionInstance = 'muhtaraz-instance';
    let evolutionApiKey = '123456';
    let autoSendEnabled = true;

    try {
      const { data: settings } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (settings) {
        mode = requestedMode || settings.mode || settings.gateway_mode || mode;
        evolutionServerUrl = settings.evolution_server_url || evolutionServerUrl;
        evolutionInstance = settings.evolution_instance || settings.evolution_instance_name || evolutionInstance;
        evolutionApiKey = settings.evolution_api_key || evolutionApiKey;
        autoSendEnabled = settings.auto_send_enabled ?? true;
      }
    } catch (err) {
      console.warn('Using default settings due to db fetch failure:', err);
    }

    // Format phone number
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('05')) {
      cleanPhone = '966' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('5')) {
      cleanPhone = '966' + cleanPhone;
    }

    let sendSuccess = false;
    let apiResponse: any = null;

    // 2. Dispatch based on Gateway Mode
    if (mode === 'embedded') {
      // Direct Native WhatsApp Socket (Baileys)
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
    } else if (mode === 'evolution' && autoSendEnabled) {
      // External Evolution API
      try {
        const cleanServer = evolutionServerUrl.replace(/\/+$/, '');
        const isMedia = mediaUrl || mediaBase64;
        const targetUrl = isMedia
          ? `${cleanServer}/message/sendMedia/${evolutionInstance}`
          : `${cleanServer}/message/sendText/${evolutionInstance}`;

        const evolutionPayload = isMedia ? {
          number: cleanPhone,
          mediatype: mediaType || 'document',
          mimetype: mimetype || 'application/pdf',
          caption: caption || message,
          media: mediaUrl || mediaBase64,
          fileName: fileName || 'document.pdf'
        } : {
          number: cleanPhone,
          text: message,
          options: {
            delay: 1200,
            presence: 'composing',
            linkPreview: true
          }
        };

        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey
          },
          body: JSON.stringify(evolutionPayload)
        });

        apiResponse = await res.json();
        sendSuccess = res.ok;
      } catch (fetchErr: any) {
        console.error('Evolution API Fetch Error:', fetchErr);
        sendSuccess = false;
        apiResponse = { error: fetchErr.message };
      }
    } else {
      // Direct Web / wa.me Manual Mode
      sendSuccess = true;
      apiResponse = { 
        mode: 'wame', 
        direct_url: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message || caption || '')}` 
      };
    }

    // 3. Log notification to Supabase
    try {
      await supabase.from('notification_logs').insert([{
        contract_id: contract_id || null,
        customer_id: customer_id || null,
        recipient_phone: cleanPhone,
        phone: cleanPhone,
        message_body: message,
        recipient_name: body.recipient_name || 'مستلم',
        recipient_role: recipient_role || 'customer',
        notification_type: notification_type || 'manual_notice',
        status: sendSuccess ? 'sent' : 'failed'
      }]);
    } catch (logErr) {
      console.error('Failed to write log to supabase:', logErr);
    }

    return NextResponse.json({
      success: sendSuccess,
      mode,
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
