import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text') || '';

  if (!text.trim()) {
    return new NextResponse('Missing text parameter', { status: 400 });
  }

  // Clean text from markdown and emojis and apply phonetic smoothness
  let cleanText = text
    .replace(/[#*_`]/g, '')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/يا بو سعود/g, 'يا أبو سعود')
    .replace(/\bكاش\b/g, 'نقداً')
    .trim();

  try {
    const encoded = encodeURIComponent(cleanText);
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ar&client=tw-ob&q=${encoded}`;

    const response = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'audio/mpeg, audio/*',
        'Referer': 'https://translate.google.com/'
      }
    });

    if (!response.ok) {
      return new NextResponse('TTS fetch error', { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200'
      }
    });
  } catch (error) {
    console.error('Server TTS Error:', error);
    return new NextResponse('Internal TTS Error', { status: 500 });
  }
}
