export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getWhatsAppStatus, initWhatsAppEngine, logoutWhatsApp } from '@/lib/whatsappEngine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const reqMode = searchParams.get('mode'); // 'embedded' | 'evolution' | 'wame'
    const customUrl = searchParams.get('serverUrl');
    const customInstance = searchParams.get('instance');
    const customApiKey = searchParams.get('apiKey');

    // Handle logout action
    if (action === 'logout') {
      await logoutWhatsApp();
      return NextResponse.json({ success: true, message: 'تم قطع اتصال الواتساب بنجاح' });
    }

    // 1. Fetch saved WhatsApp Settings
    let selectedMode = reqMode || 'embedded';
    let evolutionServerUrl = customUrl || 'http://localhost:8080';
    let evolutionInstance = customInstance || 'muhtaraz-instance';
    let evolutionApiKey = customApiKey || '123456';

    try {
      const { data: settings } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .limit(1)
        .single();

      if (settings) {
        selectedMode = reqMode || settings.mode || selectedMode;
        evolutionServerUrl = customUrl || settings.evolution_server_url || evolutionServerUrl;
        evolutionInstance = customInstance || settings.evolution_instance || settings.evolution_instance_name || evolutionInstance;
        evolutionApiKey = customApiKey || settings.evolution_api_key || evolutionApiKey;
      }
    } catch (err) {
      console.warn('Could not read settings from db, using defaults:', err);
    }

    // ─── CASE A: Embedded Engine (Default & Native) ───────────────────────────
    if (selectedMode === 'embedded' || !selectedMode) {
      // Trigger engine initialization
      initWhatsAppEngine().catch((err) => console.error('Error in initWhatsAppEngine:', err));

      const status = getWhatsAppStatus();

      if (status.isConnected) {
        return NextResponse.json({
          success: true,
          status: 'connected',
          mode: 'embedded',
          state: 'open',
          message: 'الواتساب متصل ويعمل بنجاح 🟢 (المحرك المدمج داخل التطبيق)'
        });
      }

      if (status.qrCodeBase64 || status.qrCodeRaw) {
        return NextResponse.json({
          success: true,
          status: 'qr_ready',
          mode: 'embedded',
          state: 'connecting',
          qrCodeBase64: status.qrCodeBase64 || null,
          qrCodeRaw: status.qrCodeRaw || null,
          message: 'كود QR المدمج جاهز للمسح من الواتساب 📱'
        });
      }

      return NextResponse.json({
        success: true,
        status: 'connecting',
        mode: 'embedded',
        state: 'connecting',
        message: 'جارِ تهيئة محرك الواتساب المدمج وتوليد الكود...'
      });
    }

    // ─── CASE B: Evolution API (External Proxy) ──────────────────────────────
    const cleanServer = evolutionServerUrl.replace(/\/+$/, '');

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
            mode: 'evolution',
            state: 'open',
            serverUrl: cleanServer,
            instance: evolutionInstance,
            message: 'الواتساب متصل ويعمل بنجاح 🟢 (Evolution API)'
          });
        }
      }

      let connectUrl = `${cleanServer}/instance/connect/${evolutionInstance}`;
      let connectRes = await fetch(connectUrl, {
        method: 'GET',
        headers: {
          'apikey': evolutionApiKey
        },
        signal: AbortSignal.timeout(5000)
      });

      if (connectRes.ok) {
        const qrData = await connectRes.json();
        const qrBase64 = qrData?.base64 || qrData?.qrcode?.base64;
        const qrRaw = qrData?.code || qrData?.qrcode?.code;
        const pairingCode = qrData?.pairingCode;

        if (qrBase64 || qrRaw) {
          return NextResponse.json({
            success: true,
            status: 'qr_ready',
            mode: 'evolution',
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
        mode: 'evolution',
        serverUrl: cleanServer,
        instance: evolutionInstance,
        message: 'السيرفر متصل ولكن الجلسة غير مقترنة'
      });

    } catch (networkErr: any) {
      return NextResponse.json({
        success: false,
        status: 'offline',
        mode: 'evolution',
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
