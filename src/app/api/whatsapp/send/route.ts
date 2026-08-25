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
      notification_type
    } = body;

    if (!phone || (!message && !mediaUrl && !mediaBase64 && !location)) {
      return NextResponse.json({ success: false, error: 'Phone and message or media are required' }, { status: 400 });
    }

    // 1. Fetch saved WhatsApp Settings
    let dbServerUrl = '';
    let dbApiKey = '';

    try {
      const { data: settings } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (settings) {
        dbServerUrl = settings.evolution_server_url || '';
        dbApiKey = settings.evolution_api_key || '';
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

    // Resolve active cloud Add-on server URL & API Key
    let addonServerUrl = process.env.WHATSAPP_ADDON_URL || dbServerUrl || 'https://al-muhtaraz-whatsapp.onrender.com';
    if (addonServerUrl.includes('localhost') || addonServerUrl.includes('8080')) {
      addonServerUrl = 'https://al-muhtaraz-whatsapp.onrender.com';
    }
    const cleanServer = addonServerUrl.replace(/\/+$/, '');

    let addonApiKey = process.env.WHATSAPP_ADDON_API_KEY || dbApiKey || 'mhk_live_9f4b1a8e2c7d0563e41982ab7c3d55e0';
    if (!addonApiKey || addonApiKey === '123456' || addonApiKey.includes('7d9e4a8b1c2f3056e84920ab4c1f')) {
      addonApiKey = 'mhk_live_9f4b1a8e2c7d0563e41982ab7c3d55e0';
    }

    // 2. Dispatch message through Cloud Add-on server
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
