import { NextRequest, NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { cleanSpeechText } from '@/utils/speechSanitizer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text: rawText, voice = 'ar-SA-ZariyahNeural', rate = '+0%' } = body;

    if (!rawText || !rawText.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const text = cleanSpeechText(rawText);

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const rateFactor = rate === '+15%' ? 1.15 : rate === '-15%' ? 0.85 : 1.0;
    const { audioStream } = tts.toStream(text, { rate: rateFactor });

    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      audioStream.on('end', () => resolve());
      audioStream.on('error', (err: any) => reject(err));
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
  } catch (error: any) {
    console.error('Neural TTS Route Error:', error);
    return NextResponse.json({ error: 'Failed to synthesize speech', details: error?.message }, { status: 500 });
  }
}
