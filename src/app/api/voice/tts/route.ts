import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text') || '';
  const provider = searchParams.get('provider') || process.env.VOICE_PROVIDER || 'xtts';

  if (!text.trim()) {
    return new NextResponse('Missing text parameter', { status: 400 });
  }

  // Clean and phonetically format text for natural Saudi flow
  let cleanText = text
    .replace(/[#*_`]/g, '')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/يا بو سعود/g, 'يا أبو سُعود')
    .replace(/\bكاش\b/g, 'نقداً')
    .trim();

  // ─── 1. XTTS v2 Voice Cloning Engine (Saudi Female Reference) ───────────
  const xttsEndpoint = process.env.XTTS_API_URL;
  if (xttsEndpoint) {
    try {
      const xttsResponse = await fetch(xttsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'audio/wav, audio/mpeg, application/json'
        },
        body: JSON.stringify({
          text: cleanText,
          language: 'ar',
          speaker_wav: process.env.XTTS_SPEAKER_WAV || 'saudi_female_6s',
          speed: 1.0
        })
      });

      if (xttsResponse.ok) {
        const audioBuffer = await xttsResponse.arrayBuffer();
        return new NextResponse(audioBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400'
          }
        });
      }
    } catch (e) {
      console.warn('XTTS v2 endpoint failed, attempting direct neural pipeline:', e);
    }
  }

  // ─── 2. OpenAI / ElevenLabs Neural Fallbacks ────────────────────────────
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    try {
      const openAiResponse = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1-hd',
          input: cleanText,
          voice: 'nova',
          response_format: 'mp3',
          speed: 1.0
        })
      });

      if (openAiResponse.ok) {
        const audioBuffer = await openAiResponse.arrayBuffer();
        return new NextResponse(audioBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400'
          }
        });
      }
    } catch (e) {}
  }

  // ─── 3. Default Fast Audio Stream ───────────────────────────────────────
  try {
    const encoded = encodeURIComponent(cleanText);
    const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ar&client=tw-ob&q=${encoded}`;

    const response = await fetch(fallbackUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'audio/mpeg, audio/*',
        'Referer': 'https://translate.google.com/'
      }
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=86400'
        }
      });
    }
  } catch (error) {
    console.error('Server TTS Fallback Error:', error);
  }

  return new NextResponse('Audio synthesis error', { status: 500 });
}
