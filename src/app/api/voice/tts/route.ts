import { NextRequest, NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { cleanSpeechText } from '@/utils/speechSanitizer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    if (body === null) {
      throw new TypeError('Invalid TTS request body');
    }
    const payload = Object(body) as Record<string, unknown>;
    const rawText = payload.text;
    const voiceValue = payload.voice;
    const voice = voiceValue === undefined ? 'ar-SA-ZariyahNeural' : voiceValue;
    const rate = payload.rate === undefined ? '+0%' : payload.rate;

    if (!rawText) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    if (typeof rawText !== 'string' || typeof voice !== 'string') {
      throw new TypeError('Invalid TTS request values');
    }
    if (!rawText.trim()) return NextResponse.json({ error: 'Text is required' }, { status: 400 });

    const text = cleanSpeechText(rawText);

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const rateFactor = rate === '+15%' ? 1.15 : rate === '-15%' ? 0.85 : 1.0;
    const { audioStream } = tts.toStream(text, { rate: rateFactor });

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      audioStream.on('end', () => resolve());
      audioStream.on('error', (err: Error) => reject(err));
    });

    const audioBuffer = Buffer.concat(chunks);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
        'Accept-Ranges': 'bytes'
      }
    });
  } catch (error: unknown) {
    console.error('Neural TTS Route Error:', error);
    return NextResponse.json({
      error: 'Failed to synthesize speech',
      details: error instanceof Error ? error.message : undefined
    }, { status: 500 });
  }
}
