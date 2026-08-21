import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, message: 'لم يتم إرفاق ملف صوتي' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const publicAudioDir = path.join(process.cwd(), 'public', 'audio');
    if (!fs.existsSync(publicAudioDir)) {
      fs.mkdirSync(publicAudioDir, { recursive: true });
    }

    const filePath = path.join(publicAudioDir, 'saudi_voice_sample.wav');
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
      message: 'تم حفظ بصمة الصوت المرجعية بنجاح!',
      url: '/audio/saudi_voice_sample.wav'
    });
  } catch (error) {
    console.error('Error saving voice sample:', error);
    return NextResponse.json({ success: false, message: 'حدث خطأ أثناء حفظ الصوت' }, { status: 500 });
  }
}

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'audio', 'saudi_voice_sample.wav');
  const exists = fs.existsSync(filePath);
  return NextResponse.json({ exists, url: exists ? '/audio/saudi_voice_sample.wav' : null });
}
