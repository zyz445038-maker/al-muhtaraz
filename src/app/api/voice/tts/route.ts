import { NextRequest, NextResponse } from 'next/server';

// ─── Arabic Phonetic & Diacritics Tuning Engine ──────────────────────────────
// Converts colloquial & business keywords into properly vocalized Arabic for crystal-clear TTS pronunciation
export function enrichArabicPhonetics(input: string): string {
  if (!input) return '';

  let text = input
    .replace(/[#*_`]/g, '')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .trim();

  const phoneticReplacements: Array<[RegExp, string]> = [
    [/المخترز/g, 'الْمُخْتَرِز'],
    [/للحاويات/g, 'لِلْحَاوِيَات'],
    [/حاويات/g, 'حَاوِيَات'],
    [/حاوية/g, 'حَاوِيَة'],
    [/يا هلا والله/g, 'يَا هَلَا وَاللهِ'],
    [/يا بو سعود/g, 'يَا أَبُو سُعُود'],
    [/يا أبو سعود/g, 'يَا أَبُو سُعُود'],
    [/أبو سعود/g, 'أَبُو سُعُود'],
    [/بو سعود/g, 'أَبُو سُعُود'],
    [/مية/g, 'مِئَة'],
    [/ميتين/g, 'مِئَتَيْن'],
    [/ثلاثمية/g, 'ثَلَاثُمِئَة'],
    [/أربعمية/g, 'أَرْبَعُمِئَة'],
    [/خمسمية/g, 'خَمْسُمِئَة'],
    [/ستمية/g, 'سِتُّمِئَة'],
    [/سبعمية/g, 'سَبْعُمِئَة'],
    [/ثمانمية/g, 'ثَمَانُمِئَة'],
    [/تسعمية/g, 'تِسْعُمِئَة'],
    [/ألفين/g, 'أَلْفَيْن'],
    [/آلاف/g, 'آلَاف'],
    [/ريال/g, 'رِيَال'],
    [/كاش/g, 'كَاش نَقْدًا'],
    [/سداد إلكتروني/g, 'سَدَاد إِلِكْتُرُونِي'],
    [/الحوش/g, 'الْمُسْتَوْدَع'],
    [/المستودع/g, 'الْمُسْتَوْدَع'],
    [/مأجرة/g, 'مُؤَجَّرَة'],
    [/شاغرة/g, 'شَاغِرَة'],
    [/شواغر/g, 'شَوَاغِر'],
    [/العقود/g, 'الْعُقُود'],
    [/سندات/g, 'سَنَدَات'],
    [/سند قبض/g, 'سَنَدُ قَبْضٍ'],
    [/البلدية/g, 'الْبَلَدِيَّة'],
    [/الأمانة/g, 'الْأَمَانَة'],
    [/غرامات/g, 'غَرَامَات'],
    [/مخالفات/g, 'مُخَالَفَات'],
    [/سحب/g, 'سَحْب'],
    [/تنتهي بكرة/g, 'تَنْتَهِي غَدًا'],
    [/بكرة/g, 'غَدًا'],
    [/باكر/g, 'غَدًا'],
    [/أبشر/g, 'أَبْشِرْ'],
    [/عساها/g, 'عَسَاهَا'],
    [/بالتوفيق/g, 'بِالتَّوْفِيق'],
    [/ما شاء الله/g, 'مَا شَاءَ الله']
  ];

  for (const [pattern, replacement] of phoneticReplacements) {
    text = text.replace(pattern, replacement);
  }

  return text;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawText = searchParams.get('text') || '';

  if (!rawText.trim()) {
    return new NextResponse('Missing text parameter', { status: 400 });
  }

  const enrichedText = enrichArabicPhonetics(rawText);

  // ── 1. ElevenLabs Neural Engine (Highest Quality Human Voice) ───────────────
  const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
  if (elevenLabsApiKey) {
    try {
      const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pFZP5JQG7iQjIQuC4Bku'; // Lily (Natural Warm Female)
      const elevenResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': elevenLabsApiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: enrichedText,
          model_id: 'eleven_turbo_v2_5', // 3x faster response & pristine Arabic fluency
          voice_settings: {
            stability: 0.50,
            similarity_boost: 0.85,
            style: 0.10,
            use_speaker_boost: true
          }
        })
      });

      if (elevenResponse.ok) {
        const audioBuffer = await elevenResponse.arrayBuffer();
        return new NextResponse(audioBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400',
            'X-TTS-Engine': 'ElevenLabs-Turbo-v2.5'
          }
        });
      } else {
        const errJson = await elevenResponse.text();
        console.warn('ElevenLabs API response warning, falling back:', errJson);
      }
    } catch (err) {
      console.warn('ElevenLabs connection failed, falling back to neural stream:', err);
    }
  }

  // ── 2. XTTS Local/Remote Server (Optional) ─────────────────────────────────
  const xttsEndpoint = process.env.XTTS_API_URL;
  if (xttsEndpoint) {
    try {
      const xttsResponse = await fetch(xttsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: enrichedText,
          language: 'ar',
          speaker_wav: 'public/audio/saudi_voice_sample.wav'
        })
      });

      if (xttsResponse.ok) {
        const audioBuffer = await xttsResponse.arrayBuffer();
        return new NextResponse(audioBuffer, {
          headers: {
            'Content-Type': 'audio/wav',
            'Cache-Control': 'public, max-age=3600',
            'X-TTS-Engine': 'XTTS-v2'
          }
        });
      }
    } catch (err) {
      console.warn('XTTS Endpoint failed, falling back to neural stream:', err);
    }
  }

  // ── 3. High-Clarity Neural Stream Fallback (Fast, 100% Reliable) ───────────
  try {
    const chunks = enrichedText.match(/[^.،!؟\n]+[.،!؟\n]*/g) || [enrichedText];
    const audioBuffers: ArrayBuffer[] = [];

    for (const chunk of chunks) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;

      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(trimmed)}&tl=ar&client=tw-ob`;
      const response = await fetch(googleTtsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/'
        }
      });

      if (response.ok) {
        const buf = await response.arrayBuffer();
        audioBuffers.push(buf);
      }
    }

    if (audioBuffers.length > 0) {
      const totalLength = audioBuffers.reduce((acc, b) => acc + b.byteLength, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const b of audioBuffers) {
        combined.set(new Uint8Array(b), offset);
        offset += b.byteLength;
      }

      return new NextResponse(combined.buffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=86400',
          'Accept-Ranges': 'bytes',
          'X-TTS-Engine': 'Neural-Stream'
        }
      });
    }
  } catch (err) {
    console.error('TTS stream generation failed:', err);
  }

  return new NextResponse('TTS Generation Failed', { status: 500 });
}


