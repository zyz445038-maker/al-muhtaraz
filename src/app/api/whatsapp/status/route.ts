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

      // 3. If not connected, fetch QR code or create instance
      let connectUrl = `${cleanServer}/instance/connect/${evolutionInstance}`;
      let connectRes = await fetch(connectUrl, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey
        },
        signal: AbortSignal.timeout(5000)
      });

      // If instance does not exist yet (404/400), try creating it automatically
      if (!connectRes.ok && connectRes.status === 404) {
        try {
          const createUrl = `${cleanServer}/instance/create`;
          const createRes = await fetch(createUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionApiKey
            },
            body: JSON.stringify({
              instanceName: evolutionInstance,
              qrcode: true,
              integration: 'WHATSAPP-BAILEYS'
            }),
            signal: AbortSignal.timeout(5000)
          });

          if (createRes.ok) {
            const createData = await createRes.json();
            const qrBase64 = createData?.base64 || createData?.qrcode?.base64;
            const qrRaw = createData?.code || createData?.qrcode?.code;
            const pairingCode = createData?.pairingCode;

            return NextResponse.json({
              success: true,
              status: 'qr_ready',
              state: 'connecting',
              qrCodeBase64: qrBase64 || null,
              qrCodeRaw: qrRaw || null,
              pairingCode: pairingCode || null,
              serverUrl: cleanServer,
              instance: evolutionInstance,
              message: 'كود QR تم توليده وجاهز للمسح من الواتساب 📱'
            });
          }
        } catch (createErr) {
          console.warn('Instance auto-creation failed:', createErr);
        }
      }

      if (connectRes.ok) {
        const qrData = await connectRes.json();
        const qrBase64 = qrData?.base64 || qrData?.qrcode?.base64;
        const qrRaw = qrData?.code || qrData?.qrcode?.code;
        const pairingCode = qrData?.pairingCode;
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

        if (qrBase64 || qrRaw) {
          return NextResponse.json({
            success: true,
            status: 'qr_ready',
            state: 'connecting',
            qrCodeBase64: qrBase64 || null,
            qrCodeRaw: qrRaw || null,
            pairingCode: pairingCode || null,
            serverUrl: cleanServer,
            instance: evolutionInstance,
            message: 'كود QR جاهز للمسح من الواتساب 📱'
          });
        }
      }

      return NextResponse.json({
        success: false,
        status: 'disconnected',
        serverUrl: cleanServer,
        instance: evolutionInstance,
        message: 'السيرفر متصل ولكن الجلسة غير مقترنة بعد'
      });

    } catch (networkErr: any) {
      return NextResponse.json({
        success: false,
        status: 'offline',
        serverUrl: cleanServer,
        instance: evolutionInstance,
        error: networkErr?.message || 'تعذر الوصول إلى خادم Evolution API',
        message: `خادم Evolution API غير مشغل حالياً على (${cleanServer}).`
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
