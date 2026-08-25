import { NextRequest, NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const NEURAL_VOICES = {
  zariyah: {
    id: 'ar-SA-ZariyahNeural',
    name: 'زاريّة (سعودي أنثى)',
    gender: 'female',
    dialect: 'sa',
    description: 'صوت نسائي سعودي دافئ وعفوي جداً'
  },
  hamed: {
    id: 'ar-SA-HamedNeural',
    name: 'حامد (سعودي ذكر)',
    gender: 'male',
    dialect: 'sa',
    description: 'صوت رجالي سعودي تنفيذي وفخم'
  },
  fatima: {
    id: 'ar-AE-FatimaNeural',
    name: 'فاطمة (خليجي إعلاني)',
    gender: 'female',
    dialect: 'ae',
    description: 'صوت إعلاني خليجي قوي وواضح'
  },
  salma: {
    id: 'ar-EG-SalmaNeural',
    name: 'سلمى (عربي هادئ)',
    gender: 'female',
    dialect: 'eg',
    description: 'صوت هادئ متزن للشروحات والتقارير'
  }
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get('text');
    const voiceKey = (searchParams.get('voice') || 'zariyah') as keyof typeof NEURAL_VOICES;
    const rate = searchParams.get('rate') || '+0%';
    const pitch = searchParams.get('pitch') || '+0Hz';

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text parameter is required' }, { status: 400 });
    }

    const selectedVoice = NEURAL_VOICES[voiceKey] || NEURAL_VOICES.zariyah;
    const voiceId = selectedVoice.id;

    // Synthesize using genuine Microsoft Neural Edge TTS Engine
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    
    // Support SSML rate/pitch if specified
    const rateFactor = rate === '+15%' ? 1.15 : rate === '-15%' ? 0.85 : 1.0;
    const { audioStream } = tts.toStream(text, {
      rate: rateFactor
    });

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
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200',
        'Accept-Ranges': 'bytes'
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
