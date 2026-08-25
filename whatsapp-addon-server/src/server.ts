import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authenticateApiKey } from './middleware/auth';
import { sessionRouter } from './routes/sessionRoutes';
import { messageRouter } from './routes/messageRoutes';
import { sessionManager } from './engine/sessionManager';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve interactive UI test scanner at root and /scanner
app.get(['/', '/scanner'], (req, res) => {
  let filePath = path.join(__dirname, '../test-scanner.html');
  if (!fs.existsSync(filePath)) {
    filePath = path.join(process.cwd(), 'test-scanner.html');
  }
  
  if (fs.existsSync(filePath)) {
    let html = fs.readFileSync(filePath, 'utf8');
    const injectedKey = process.env.API_KEY || '';
    html = html.replace('__SERVER_API_KEY__', injectedKey);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } else {
    res.send('<h1>WhatsApp Add-on Server is Running</h1><p>API is active</p>');
  }
});

const VOICE_MAP: Record<string, string> = {
  zariyah: 'ar-SA-ZariyahNeural',
  hamed: 'ar-SA-HamedNeural',
  fatima: 'ar-AE-FatimaNeural',
  salma: 'ar-EG-SalmaNeural'
};

// 🎙️ High-Speed Cloud Neural Voice Endpoint (Free, 100% human authenticity, no API key required for fast audio preview)
app.get('/api/voice/neural-tts', async (req, res) => {
  try {
    const text = req.query.text as string;
    const voiceKey = (req.query.voice as string) || 'zariyah';
    const rate = (req.query.rate as string) || '+0%';

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text query parameter is required' });
    }

    const voiceId = VOICE_MAP[voiceKey] || VOICE_MAP.zariyah;
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const rateFactor = rate === '+15%' ? 1.15 : rate === '-15%' ? 0.85 : 1.0;
    const { audioStream } = tts.toStream(text, { rate: rateFactor });

    const chunks: Buffer[] = [];
    audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    audioStream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', buffer.length.toString());
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
    });
    audioStream.on('error', (err: any) => {
      console.error('Audio stream error:', err);
      res.status(500).json({ error: 'Audio synthesis failed', details: err?.message });
    });
  } catch (err: any) {
    console.error('TTS endpoint error:', err);
    res.status(500).json({ error: 'TTS Server Error', details: err?.message });
  }
});

// Protect WhatsApp session & messages routes with API Key middleware
app.use('/api/session', authenticateApiKey, sessionRouter);
app.use('/api/messages', authenticateApiKey, messageRouter);

// Start HTTP Server
app.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`🚀 [WhatsApp & Voice Server] Running on port ${PORT}`);
  console.log(`🔑 [Auth] API Key Security: ${process.env.API_KEY ? 'ENABLED' : 'DISABLED'}`);
  console.log(`🎙️ [Voice] Neural TTS Endpoint: Active at /api/voice/neural-tts`);
  console.log(`=======================================================`);

  // Auto-initialize session on startup (restores session if exists, or waits for QR scan)
  try {
    await sessionManager.initSession();
  } catch (err) {
    console.error('Initial session start error:', err);
  }
});
