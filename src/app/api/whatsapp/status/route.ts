export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getWhatsAppAddonConfig } from '@/lib/whatsappAddonConfig';
import { getWhatsAppStatus, logoutWhatsApp } from '@/lib/whatsappEngine';
import { authorizeWhatsAppRequest, isWhatsAppAuthorizationError } from '@/lib/whatsappApiAuth';
import { proxyWhatsAppDesktopRequest } from '@/lib/whatsappDesktopProxy';

export async function GET(request: Request) {
  try {
    const proxyResponse = await proxyWhatsAppDesktopRequest(request, '/api/whatsapp/status');
    if (proxyResponse) return proxyResponse;

    const { searchParams } = new URL(request.url);
    const isLogout = searchParams.get('action') === 'logout';
    const authorization = await authorizeWhatsAppRequest(request, isLogout);
    if (isWhatsAppAuthorizationError(authorization)) return authorization;

    const addon = await getWhatsAppAddonConfig();

    if (isLogout) {
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
        const canViewPairingQr = authorization.profile.role === 'admin';
        return NextResponse.json({
          success: true,
          status: 'qr_ready',
          mode: 'embedded',
          state: 'connecting',
          qrCodeBase64: canViewPairingQr ? status.qrCodeBase64 || null : null,
          qrCodeRaw: canViewPairingQr ? status.qrCodeRaw || null : null,
          message: canViewPairingQr
            ? 'كود QR جاهز للمسح من الواتساب 📱'
            : 'يوجد جهاز واتساب غير مرتبط. تواصل مع المدير لإكمال الربط.'
        });
      }

      return NextResponse.json({
        success: false,
        status: 'not_configured',
        mode: 'unavailable',
        state: 'disconnected',
        message: 'خادم الواتساب غير مهيأ في إعدادات خلفية التطبيق.'
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
    const lastError = 'lastError' in info && typeof info.lastError === 'string'
      ? info.lastError.slice(0, 300)
      : null;
    const sessionStoragePathIsAbsolute = 'sessionStoragePathIsAbsolute' in info
      && typeof info.sessionStoragePathIsAbsolute === 'boolean'
      ? info.sessionStoragePathIsAbsolute
      : undefined;

    if ('status' in info && info.status === 'connected' || 'isConnected' in info && info.isConnected) {
      return NextResponse.json({
        success: true,
        status: 'connected',
        mode: 'addon',
        state: 'open',
        phoneNumber: 'phoneNumber' in info ? info.phoneNumber || null : null,
        userJid: 'userJid' in info ? info.userJid || null : null,
        lastError,
        sessionStoragePathIsAbsolute,
        message: 'الواتساب متصل ويعمل بنجاح 🟢'
      });
    }

    if ('status' in info && info.status === 'qr_ready' || 'qrCodeBase64' in info && info.qrCodeBase64) {
      const canViewPairingQr = authorization.profile.role === 'admin';
      return NextResponse.json({
        success: true,
        status: 'qr_ready',
        mode: 'addon',
        state: 'connecting',
        qrCodeBase64: canViewPairingQr && 'qrCodeBase64' in info ? info.qrCodeBase64 || null : null,
        qrCodeRaw: canViewPairingQr && 'qrCodeRaw' in info ? info.qrCodeRaw || null : null,
        lastError,
        sessionStoragePathIsAbsolute,
        message: canViewPairingQr
          ? 'كود QR جاهز للمسح من الواتساب 📱'
          : 'يوجد جهاز واتساب غير مرتبط. تواصل مع المدير لإكمال الربط.'
      });
    }

    return NextResponse.json({
      success: true,
      status: 'connecting',
      mode: 'addon',
      state: 'connecting',
      lastError,
      sessionStoragePathIsAbsolute,
      message: lastError || 'جارِ تهيئة محرك الواتساب...'
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
