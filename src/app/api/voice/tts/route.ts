import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text') || '';

  if (!text.trim()) {
    return new NextResponse('Missing text parameter', { status: 400 });
  }

  // تنظيف النص
  const cleanText = text
    .replace(/[#*_`]/g, '')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .trim();

  const xttsEndpoint = process.env.XTTS_API_URL || 'http://localhost:8020';

  try {
    const xttsResponse = await fetch(xttsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText,
        language: 'ar',
        speaker_wav: 'public/audio/saudi_voice_sample.wav'
      })
    });

    if (xttsResponse.ok) {
      const audioBuffer = await xttsResponse.arrayBuffer();
      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/wav',
          'Cache-Control': 'no-store'
        }
      });
    } else {
      const err = await xttsResponse.text();
      console.error('XTTS Server Error:', err);
      return new NextResponse(`XTTS Failed: ${err}`, { status: 500 });
    }
  } catch (error) {
    console.error('Connection Error:', error);
    return new NextResponse('XTTS Server Unreachable', { status: 503 });
  }
}
