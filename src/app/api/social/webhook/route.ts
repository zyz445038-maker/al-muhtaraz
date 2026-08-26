import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📢 Received Social Campaign Webhook Payload:', body);

    const {
      platform,
      theme,
      tone,
      title,
      content,
      hashtags,
      contact,
      scheduled_for,
      timestamp
    } = body;

    // Simulated successful intake & validation
    return NextResponse.json({
      success: true,
      message: `تم استقبال حملة (${platform || 'منصة التواصل'}) بنجاح وتجهيزها للنشر الآلي.`,
      received_at: new Date().toISOString(),
      payload_summary: {
        title: title || 'بدون عنوان',
        platform: platform || 'all',
        scheduled_for: scheduled_for || 'فوري',
        hashtags_count: Array.isArray(hashtags) ? hashtags.length : 0,
        contact: contact || '-'
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Social Webhook intake error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Invalid webhook payload JSON'
    }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Al-Muhtaraz Social Media Automated Webhook Gateway',
    status: 'ACTIVE 🟢',
    supported_methods: ['POST'],
    instructions: 'Send a JSON payload with { platform, title, content, hashtags, contact, scheduled_for } to trigger automated campaign distribution.'
  });
}
