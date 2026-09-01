import { NextRequest, NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { cleanSpeechText } from '@/utils/speechSanitizer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Exclusively Zariyah (Saudi Female Neural Voice)
const ZARIYAH_VOICE_ID = 'ar-SA-ZariyahNeural';
const FATIMA_VOICE_ID = 'ar-SA-FatimaNeural';
const HAMED_VOICE_ID = 'ar-SA-HamedNeural';

// In-Memory Audio Cache to return frequent phrases (like greetings) in 0ms
const ttsAudioCache = new Map<string, Buffer>();
const MAX_CACHE_ENTRIES = 150;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawText = searchParams.get('text');
    const rate = searchParams.get('rate') || '+0%';

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json({ error: 'Text parameter is required' }, { status: 400 });
    }

    // Clean all markdown, asterisks, emojis, and symbols so TTS never reads out punctuation
    const text = cleanSpeechText(rawText);
    const voiceId = ZARIYAH_VOICE_ID;
    const cacheKey = `${voiceId}_${rate}_${text}`;

    // 1. Instant Cache Hit (0ms response time!)
    if (ttsAudioCache.has(cacheKey)) {
      const cachedBuffer = ttsAudioCache.get(cacheKey)!;
      return new NextResponse(cachedBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': cachedBuffer.length.toString(),
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'Accept-Ranges': 'bytes'
        }
      });
    }

    // 2. Direct High-Speed Local Neural Synthesis (Exclusively Zariyah Female Voice)
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    
    let rateFactor = 1.0;
    if (rate) {
      const cleanNum = parseFloat(rate.replace('%', '').trim());
      if (!isNaN(cleanNum)) {
        rateFactor = Math.max(0.5, Math.min(2.0, 1.0 + (cleanNum / 100)));
      }
    }
    const { audioStream } = tts.toStream(text, { rate: rateFactor });

    const chunksForCache: Buffer[] = [];
    
    const stream = new ReadableStream({
      start(controller) {
        audioStream.on('data', chunk => {
          chunksForCache.push(chunk);
          controller.enqueue(new Uint8Array(chunk));
        });
        audioStream.on('end', () => {
          const finalBuffer = Buffer.concat(chunksForCache);
          ttsAudioCache.set(cacheKey, finalBuffer);
          if (ttsAudioCache.size > MAX_CACHE_ENTRIES) {
            const firstKey = ttsAudioCache.keys().next().value;
            if (firstKey) ttsAudioCache.delete(firstKey);
          }
          controller.close();
        });
        audioStream.on('error', err => controller.error(err));
      }
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked'
      }
    });
  } catch (error: any) {
    console.error('TTS Generation Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate neural speech', details: error?.message },
      { status: 500 }
    );
  }
}

