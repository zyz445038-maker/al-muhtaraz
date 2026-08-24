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
    let addonServerUrl = customUrl || process.env.WHATSAPP_ADDON_URL || 'http://localhost:5050';
    let addonApiKey = customApiKey || process.env.WHATSAPP_ADDON_API_KEY || 'mhk_wa_live_7d9e4a8b1c2f3056e84920ab4c1f';

    try {
      const { data: settings } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (settings) {
        addonServerUrl = customUrl || settings.evolution_server_url || addonServerUrl;
        addonApiKey = customApiKey || settings.evolution_api_key || addonApiKey;
      }
    } catch (err) {
      console.warn('Could not read settings from db, using defaults:', err);
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

