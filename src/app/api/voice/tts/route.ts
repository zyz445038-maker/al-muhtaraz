import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text') || '';
  const provider = searchParams.get('provider') || process.env.VOICE_PROVIDER || 'auto';
  const customKey = searchParams.get('key') || '';

  if (!text.trim()) {
    return new NextResponse('Missing text parameter', { status: 400 });
  }

  // Clean and phonetically format text
  let cleanText = text
    .replace(/[#*_`]/g, '')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/يا بو سعود/g, 'يا أبو سعود')
    .replace(/\bكاش\b/g, 'نقداً')
    .trim();

  // 1. Check ElevenLabs (The highest human-realistic quality in the world)
  const elevenKey = customKey || process.env.ELEVENLABS_API_KEY;
  if ((provider === 'elevenlabs' || (provider === 'auto' && elevenKey)) && elevenKey) {
    try {
      const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Sweet natural voice (Sarah/Rachel)
      const elevenResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': elevenKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true
          }
        })
      });

      if (elevenResponse.ok) {
        const audioBuffer = await elevenResponse.arrayBuffer();
        return new NextResponse(audioBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400'
          }
        });
      }
    } catch (e) {
      console.warn('ElevenLabs TTS failed, falling back:', e);
    }
  }

  // 2. Check OpenAI TTS-1-HD (ChatGPT Voice Engine)
  const openAiKey = customKey || process.env.OPENAI_API_KEY;
  if ((provider === 'openai' || (provider === 'auto' && openAiKey)) && openAiKey) {
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
          voice: 'nova', // Young, cheerful, feminine tone
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
    } catch (e) {
      console.warn('OpenAI TTS failed, falling back:', e);
    }
  }

  // 3. Check Microsoft Azure Speech API (ar-SA-ZariNeural Official)
  const azureKey = process.env.AZURE_SPEECH_KEY;
  const azureRegion = process.env.AZURE_SPEECH_REGION || 'eastus';
  if (azureKey) {
    try {
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ar-SA'><voice name='ar-SA-ZariNeural'><prosody pitch='+0Hz' rate='+0%'>${cleanText}</prosody></voice></speak>`;
      const azureResponse = await fetch(`https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': azureKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent': 'AlMuhtaraz-App'
        },
        body: ssml
      });

      if (azureResponse.ok) {
        const audioBuffer = await azureResponse.arrayBuffer();
        return new NextResponse(audioBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400'
          }
        });
      }
    } catch (e) {
      console.warn('Azure Speech API failed, falling back:', e);
    }
  }

  // 4. Default High-Speed Arabic Audio Stream
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
