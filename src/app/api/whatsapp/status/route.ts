export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customUrl = searchParams.get('serverUrl');
    const customInstance = searchParams.get('instance');
    const customApiKey = searchParams.get('apiKey');

    // 1. Fetch saved WhatsApp Settings
    let evolutionServerUrl = customUrl || 'http://localhost:8080';
    let evolutionInstance = customInstance || 'muhtaraz-instance';
    let evolutionApiKey = customApiKey || '123456';

    if (!customUrl || !customInstance || !customApiKey) {
      try {
        const { data: settings } = await supabase
          .from('whatsapp_settings')
          .select('*')
          .limit(1)
          .single();

        if (settings) {
          evolutionServerUrl = customUrl || settings.evolution_server_url || evolutionServerUrl;
          evolutionInstance = customInstance || settings.evolution_instance || settings.evolution_instance_name || evolutionInstance;
          evolutionApiKey = customApiKey || settings.evolution_api_key || evolutionApiKey;
        }
      } catch (err) {
        console.warn('Could not read settings from db, using defaults:', err);
      }
    }

    const cleanServer = evolutionServerUrl.replace(/\/+$/, '');

    // 2. Query Evolution API for connection state
    try {
      const stateUrl = `${cleanServer}/instance/connectionState/${evolutionInstance}`;
      const stateRes = await fetch(stateUrl, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey
        },
        signal: AbortSignal.timeout(5000)
      });

      if (stateRes.ok) {
        const stateData = await stateRes.json();
        const isConnected = stateData?.instance?.state === 'open' || stateData?.state === 'open';

        if (isConnected) {
          return NextResponse.json({
            success: true,
            status: 'connected',
            state: 'open',
            serverUrl: cleanServer,
            instance: evolutionInstance,
            message: 'الواتساب متصل ويعمل بنجاح 🟢'
          });
        }
      }

      // If not connected or need QR, try fetching QR code from /instance/connect/{instance}
      const connectUrl = `${cleanServer}/instance/connect/${evolutionInstance}`;
      const connectRes = await fetch(connectUrl, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey
        },
        signal: AbortSignal.timeout(5000)
      });

      if (connectRes.ok) {
        const qrData = await connectRes.json();
        const qrBase64 = qrData?.base64 || qrData?.qrcode?.base64;
        const pairingCode = qrData?.pairingCode || qrData?.code;
        const isAlreadyOpen = qrData?.instance?.state === 'open' || qrData?.state === 'open';

        if (isAlreadyOpen) {
          return NextResponse.json({
            success: true,
            status: 'connected',
            state: 'open',
            serverUrl: cleanServer,
            instance: evolutionInstance,
            message: 'الواتساب متصل ويعمل بنجاح 🟢'
          });
        }

        return NextResponse.json({
          success: true,
          status: 'qr_ready',
          state: 'connecting',
          qrCodeBase64: qrBase64 || null,
          pairingCode: pairingCode || null,
          serverUrl: cleanServer,
          instance: evolutionInstance,
          message: 'كود QR جاهز للمسح من الواتساب 📱'
        });
      }

      return NextResponse.json({
        success: false,
        status: 'disconnected',
        serverUrl: cleanServer,
        instance: evolutionInstance,
        message: 'السيرفر متصل ولكن الجلسة غير مقترنة، يرجى مسح كود QR'
      });

    } catch (networkErr: any) {
      return NextResponse.json({
        success: false,
        status: 'offline',
        serverUrl: cleanServer,
        instance: evolutionInstance,
        error: networkErr?.message || 'تعذر الوصول إلى خادم Evolution API',
        message: 'خادم Evolution API غير متصل أو لم يتم تشغيله بعد على ' + cleanServer
      });
    }

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      status: 'error',
      error: error.message
    }, { status: 500 });
  }
}
