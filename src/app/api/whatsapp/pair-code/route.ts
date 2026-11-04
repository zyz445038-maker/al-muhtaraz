import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppAddonConfig } from '@/lib/whatsappAddonConfig';
import { authorizeWhatsAppRequest, isWhatsAppAuthorizationError } from '@/lib/whatsappApiAuth';
import { proxyWhatsAppDesktopRequest } from '@/lib/whatsappDesktopProxy';
import { normalizeSaudiMobileNumber } from '@/utils/saudiPhone';
import { normalizeWhatsAppPairingCode } from '@/utils/whatsappPairing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const proxyResponse = await proxyWhatsAppDesktopRequest(req, '/api/whatsapp/pair-code');
    if (proxyResponse) return proxyResponse;

    const authorization = await authorizeWhatsAppRequest(req, true);
    if (isWhatsAppAuthorizationError(authorization)) return authorization;

    const body: unknown = await req.json().catch(() => null);
    const phone = body && typeof body === 'object' && 'phone' in body && typeof body.phone === 'string'
      ? normalizeSaudiMobileNumber(body.phone)
      : null;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'أدخل رقم جوال سعودي صحيحًا بصيغة 05xxxxxxxx أو +9665xxxxxxxx' },
        { status: 400 }
      );
    }

    const addon = await getWhatsAppAddonConfig();
    if (!addon) {
      return NextResponse.json(
        { success: false, error: 'خادم الواتساب غير مهيأ في إعدادات خلفية التطبيق.' },
        { status: 503 }
      );
    }

    const addonRes = await fetch(`${addon.baseUrl}/api/session/pair-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${addon.apiKey}`
      },
      body: JSON.stringify({ phone }),
      cache: 'no-store',
      signal: AbortSignal.timeout(55_000)
    });

    const addonData: unknown = await addonRes.json().catch(() => null);
    const responseData = addonData && typeof addonData === 'object' ? addonData : null;
    const codeData = responseData && 'data' in responseData && responseData.data
      && typeof responseData.data === 'object'
      ? responseData.data
      : null;
    const rawCode = codeData && 'code' in codeData && typeof codeData.code === 'string'
      ? codeData.code
      : null;
    const code = rawCode ? normalizeWhatsAppPairingCode(rawCode) : null;

    if (!addonRes.ok || !responseData || !('success' in responseData) || responseData.success !== true || !code) {
      const error = responseData && 'error' in responseData && typeof responseData.error === 'string'
        ? responseData.error
        : 'رد خادم الواتساب برمز غير صالح. أعد تشغيل جلسة الخادم ثم اطلب رمزًا جديدًا.';
      return NextResponse.json({ success: false, error }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      code,
      message: 'تم توليد كود الاقتران بنجاح! أدخله في تطبيق الواتساب الآن.'
    });
  } catch (error) {
    console.error('Error in /api/whatsapp/pair-code:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error
          ? error.message
          : 'تعذر الاتصال بخادم الواتساب. تحقق من الإعدادات ثم حاول مجددًا.'
      },
      { status: 500 }
    );
  }
}
