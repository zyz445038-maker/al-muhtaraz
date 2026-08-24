import { NextRequest, NextResponse } from 'next/server';
import { requestWhatsAppPairingCode } from '@/lib/whatsappEngine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = body.phone || '';

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'يرجى إدخال رقم الهاتف' },
        { status: 400 }
      );
    }

    // 1. Try Add-on Server
    const addonServerUrl = process.env.WHATSAPP_ADDON_URL || 'http://localhost:5050';
    const addonApiKey = process.env.WHATSAPP_ADDON_API_KEY || 'mhk_wa_live_7d9e4a8b1c2f3056e84920ab4c1f';
    const cleanServer = addonServerUrl.replace(/\/+$/, '');

    try {
      const addonRes = await fetch(`${cleanServer}/api/session/pair-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${addonApiKey}`
        },
        body: JSON.stringify({ phone })
      });

      if (addonRes.ok) {
        const addonData = await addonRes.json();
        if (addonData.success && addonData.data?.code) {
          return NextResponse.json({
            success: true,
            code: addonData.data.code,
            message: 'تم توليد كود الاقتران بنجاح! أدخله في تطبيق الواتساب الآن.'
          });
        }
      }
    } catch (addonErr) {
      console.warn('Addon pair-code failed, trying embedded:', addonErr);
    }

    // 2. Fallback to embedded engine
    const res = await requestWhatsAppPairingCode(phone);
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || 'فشل توليد كود الاقتران' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      code: res.code,
      message: 'تم توليد كود الاقتران بنجاح! أدخله في تطبيق الواتساب الآن.'
    });
  } catch (error: any) {
    console.error('Error in /api/whatsapp/pair-code:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}
