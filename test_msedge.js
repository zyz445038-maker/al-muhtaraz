const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const fs = require('fs');

async function getAudioBuffer(voice, text) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text);
  
  return new Promise((resolve, reject) => {
    const chunks = [];
    audioStream.on('data', (data) => chunks.push(data));
    audioStream.on('end', () => resolve(Buffer.concat(chunks)));
    audioStream.on('error', (err) => reject(err));
  });
}

async function run() {
  console.log('Generating Real Saudi Neural Voices:');

  const bufZariyah = await getAudioBuffer('ar-SA-ZariyahNeural', 'يا هلا والله ومسهلا يا أبو ماجد، أنا زاريّة، مساعدتك الذكية لمؤسسة المحترز للحاويات.. كيف أقدر أخدمك اليوم؟');
  console.log('✅ Zariyah Generated! Bytes:', bufZariyah.length);
  fs.writeFileSync('zariyah_real.mp3', bufZariyah);

  const bufHamed = await getAudioBuffer('ar-SA-HamedNeural', 'مرحباً بك يا أبو ماجد، أنا حامد، مساعدك التنفيذي لإدارة العقود والحسابات.');
  console.log('✅ Hamed Generated! Bytes:', bufHamed.length);
  fs.writeFileSync('hamed_real.mp3', bufHamed);

  const bufFatima = await getAudioBuffer('ar-AE-FatimaNeural', 'تبحث عن حاوية أنقاض بالرياض؟ مؤسسة المحترز توفر لك تنزيل وسحب فوري بأفضل الأسعار!');
  console.log('✅ Fatima Generated! Bytes:', bufFatima.length);
  fs.writeFileSync('fatima_real.mp3', bufFatima);

  console.log('🎉 All 3 Saudi & Gulf Neural voices generated with 100% human authenticity!');
}

run().catch(console.error);
