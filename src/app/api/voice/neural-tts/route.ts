import { NextRequest, NextResponse } from 'next/server';

// ─── Saudi Female & Male Neural Voices Catalog (100% Free Edge Neural Engine) ─
export const NEURAL_VOICES = {
  'zariyah': {
    id: 'ar-SA-ZariyahNeural',
    name: 'زاريّة (صوت أنثوي سعودي دافئ وفخم)',
    gender: 'female',
    dialect: 'سعودي 🇸🇦'
  },
  'fatima': {
    id: 'ar-AE-FatimaNeural',
    name: 'فاطمة (صوت أنثوي خليجي إعلاني)',
    gender: 'female',
    dialect: 'خليجي 🇦🇪'
  },
  'salma': {
    id: 'ar-EG-SalmaNeural',
    name: 'سلمى (صوت أنثوي حيوي للخدمات)',
    gender: 'female',
    dialect: 'عربي 🇪🇬'
  },
  'hamed': {
    id: 'ar-SA-HamedNeural',
    name: 'حامد (صوت رجالي سعودي تنفيذي)',
    gender: 'male',
    dialect: 'سعودي 🇸🇦'
  }
};

// Pure brand pronunciation fix
function cleanArabicText(input: string): string {
  if (!input) return '';
  return input
    .replace(/[#*_`]/g, '')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/المخترز/g, 'الْمُخْتَرِز')
    .replace(/للمخترز/g, 'لِلْمُخْتَرِز')
    .trim();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawText = searchParams.get('text') || '';
  const voiceKey = searchParams.get('voice') || 'zariyah';
  const rate = searchParams.get('rate') || '+0%';
  const pitch = searchParams.get('pitch') || '+0Hz';

  if (!rawText.trim()) {
    return new NextResponse('Missing text parameter', { status: 400 });
  }

  const cleanText = cleanArabicText(rawText);
  const voiceConfig = (NEURAL_VOICES as any)[voiceKey] || NEURAL_VOICES.zariyah;
  const voiceName = voiceConfig.id;

  // 1. Generate Voice via High-Fidelity Edge Neural Gateway
  try {
    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ar-SA'>
      <voice name='${voiceName}'>
        <prosody rate='${rate}' pitch='${pitch}'>
          ${cleanText}
        </prosody>
      </voice>
    </speak>`;

    // Edge Speech API Gateway (Free, High Quality Microsoft Neural)
    const edgeEndpoint = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?trustedclienttoken=6A5AA1D4EA65408183922387572714F1';
    
    // We connect via HTTP SSML stream or fallback to google translate speech if edge is restricted
    const response = await fetch(edgeEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
      },
      body: ssml
    });

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      if (audioBuffer.byteLength > 200) {
        return new NextResponse(audioBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400',
            'X-Voice-Used': voiceName
          }
        });
      }
    }
  } catch (edgeErr) {
    console.warn('Primary Neural Edge TTS stream error, trying fallback:', edgeErr);
  }

  // 2. High Quality Secondary Fallback
  try {
    const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText.slice(0, 200))}&tl=ar-SA&client=tw-ob`;
    const fallbackRes = await fetch(fallbackUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });

    if (fallbackRes.ok) {
      const buffer = await fallbackRes.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }
  } catch (fbErr) {
    console.error('TTS Fallback Error:', fbErr);
  }

  return new NextResponse('Failed to synthesize speech', { status: 500 });
}
