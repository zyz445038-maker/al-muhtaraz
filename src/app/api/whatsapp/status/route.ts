export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getWhatsAppAddonConfig } from '@/lib/whatsappAddonConfig';
import { getWhatsAppStatus, logoutWhatsApp } from '@/lib/whatsappEngine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const addon = await getWhatsAppAddonConfig();

    if (searchParams.get('action') === 'logout') {
      if (addon) {
        const addonRes = await fetch(`${addon.baseUrl}/api/session/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${addon.apiKey}`
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(10_000)
        });
        const addonData: unknown = await addonRes.json().catch(() => null);
        const succeeded = addonData && typeof addonData === 'object'
          && 'success' in addonData
          && addonData.success === true;

        if (!addonRes.ok || !succeeded) {
          const error = addonData && typeof addonData === 'object'
            && 'error' in addonData && typeof addonData.error === 'string'
            ? addonData.error
            : 'تعذر فصل جلسة الواتساب من الخادم.';
          return NextResponse.json({ success: false, error }, { status: 502 });
        }
      }

      await logoutWhatsApp();
      return NextResponse.json({ success: true, message: 'تم قطع اتصال الواتساب بنجاح' });
    }

    if (!addon) {
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
        success: false,
        status: 'not_configured',
        mode: 'unavailable',
        state: 'disconnected',
        message: 'خادم الواتساب غير مهيأ. احفظ رابط الخادم ومفتاح الأمان أولاً.'
      });
    }

    const addonRes = await fetch(`${addon.baseUrl}/api/session/status`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${addon.apiKey}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000)
    });
    const addonData: unknown = await addonRes.json().catch(() => null);
    const responseData = addonData && typeof addonData === 'object' ? addonData : null;

    if (!addonRes.ok || !responseData || !('success' in responseData) || responseData.success !== true) {
      const error = responseData && 'error' in responseData && typeof responseData.error === 'string'
        ? responseData.error
        : 'تعذر قراءة حالة اتصال خادم الواتساب.';
      return NextResponse.json({
        success: false,
        status: 'error',
        state: 'disconnected',
        message: error
      }, { status: 502 });
    }

    const info = 'data' in responseData && responseData.data && typeof responseData.data === 'object'
      ? responseData.data
      : {};

    if ('status' in info && info.status === 'connected' || 'isConnected' in info && info.isConnected) {
      return NextResponse.json({
        success: true,
        status: 'connected',
        mode: 'addon',
        state: 'open',
        phoneNumber: 'phoneNumber' in info ? info.phoneNumber || null : null,
        userJid: 'userJid' in info ? info.userJid || null : null,
        message: 'الواتساب متصل ويعمل بنجاح 🟢'
      });
    }

    if ('status' in info && info.status === 'qr_ready' || 'qrCodeBase64' in info && info.qrCodeBase64) {
      return NextResponse.json({
        success: true,
        status: 'qr_ready',
        mode: 'addon',
        state: 'connecting',
        qrCodeBase64: 'qrCodeBase64' in info ? info.qrCodeBase64 || null : null,
        qrCodeRaw: 'qrCodeRaw' in info ? info.qrCodeRaw || null : null,
        message: 'كود QR جاهز للمسح من الواتساب 📱'
      });
    }

    return NextResponse.json({
      success: true,
      status: 'connecting',
      mode: 'addon',
      state: 'connecting',
      message: 'جارِ تهيئة محرك الواتساب...'
    });
  } catch (error) {
    console.error('Error in /api/whatsapp/status:', error);
    return NextResponse.json({
      success: false,
      status: 'error',
      state: 'disconnected',
      message: error instanceof Error ? error.message : 'تعذر الاتصال بخادم الواتساب.'
    }, { status: 500 });
  }
}
