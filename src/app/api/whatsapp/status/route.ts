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
    let addonServerUrl = customUrl || process.env.WHATSAPP_ADDON_URL || 'https://al-muhtaraz-whatsapp.onrender.com';
    let addonApiKey = customApiKey || process.env.WHATSAPP_ADDON_API_KEY || 'mhk_live_9f4b1a8e2c7d0563e41982ab7c3d55e0';

    try {
      const { data: settings } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (settings) {
        if (settings.evolution_server_url && !settings.evolution_server_url.includes('localhost') && !settings.evolution_server_url.includes('8080')) {
          addonServerUrl = settings.evolution_server_url;
        }
        if (settings.evolution_api_key && settings.evolution_api_key.startsWith('mhk_live')) {
          addonApiKey = settings.evolution_api_key;
        }
      }
    } catch (err) {
      console.warn('Could not read settings from db, using defaults:', err);
    }

    if (addonServerUrl.includes('localhost') || addonServerUrl.includes('8080')) {
      addonServerUrl = 'https://al-muhtaraz-whatsapp.onrender.com';
    }
    const cleanServer = addonServerUrl.replace(/\/+$/, '');

    // Handle logout action
    if (action === 'logout') {
      try {
        await fetch(`${cleanServer}/api/session/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${addonApiKey}`
          }
        });
      } catch (e) {
        console.warn('Error calling addon logout:', e);
      }
      await logoutWhatsApp();
      return NextResponse.json({ success: true, message: 'تم قطع اتصال الواتساب بنجاح' });
    }

    // ─── Query Standalone WhatsApp Add-on Server ───────────────────────────
    try {
      const addonRes = await fetch(`${cleanServer}/api/session/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${addonApiKey}`
        },
        cache: 'no-store'
      });

      if (addonRes.ok) {
        const addonData = await addonRes.json();
        const info = addonData.data || {};

        if (info.status === 'connected' || info.isConnected) {
          return NextResponse.json({
            success: true,
            status: 'connected',
            mode: 'addon',
            state: 'open',
            phoneNumber: info.phoneNumber || null,
            userJid: info.userJid || null,
            message: 'الواتساب متصل ويعمل بنجاح 🟢 (محرك مؤسسة المخترز المستقل)'
          });
        }

        if (info.status === 'qr_ready' || info.qrCodeBase64) {
          return NextResponse.json({
            success: true,
            status: 'qr_ready',
            mode: 'addon',
            state: 'connecting',
            qrCodeBase64: info.qrCodeBase64 || null,
            qrCodeRaw: info.qrCodeRaw || null,
            message: 'كود QR المدمج جاهز للمسح من الواتساب 📱'
          });
        }

        return NextResponse.json({
          success: true,
          status: info.status || 'connecting',
          mode: 'addon',
          state: 'connecting',
          message: 'جارِ تهيئة محرك الواتساب وتوليد الكود...'
        });
      }
    } catch (addonErr: any) {
      console.warn('Could not connect to Addon Server, falling back to embedded status:', addonErr?.message);
    }

    // Fallback: Check local embedded status
    const status = getWhatsAppStatus();
    if (status.isConnected) {
      return NextResponse.json({
        success: true,
        status: 'connected',
        mode: 'embedded',
        state: 'open',
        message: 'الواتساب متصل ويعمل بنجاح 🟢'
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
        message: 'كود QR جاهز للمسح من الواتساب 📱'
      });
    }

    return NextResponse.json({
      success: true,
      status: 'connecting',
      mode: 'embedded',
      state: 'connecting',
      message: 'جارِ تهيئة المحرك...'
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      status: 'error',
      error: error.message
    }, { status: 500 });
  }
}

