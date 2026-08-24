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
