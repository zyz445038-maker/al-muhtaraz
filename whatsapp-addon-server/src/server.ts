import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authenticateApiKey } from './middleware/auth';
import { sessionRouter } from './routes/sessionRoutes';
import { messageRouter } from './routes/messageRoutes';
import { sessionManager } from './engine/sessionManager';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

import path from 'path';
import fs from 'fs';

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

// Protect all /api routes with API Key middleware
app.use('/api', authenticateApiKey);

// Mount routes
app.use('/api/session', sessionRouter);
app.use('/api/messages', messageRouter);

// Start HTTP Server
app.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`🚀 [WhatsApp Add-on Server] Running on http://localhost:${PORT}`);
  console.log(`🔑 [Auth] API Key Security: ${process.env.API_KEY ? 'ENABLED' : 'DISABLED'}`);
  console.log(`=======================================================`);

  // Auto-initialize session on startup (restores session if exists, or waits for QR scan)
  try {
    await sessionManager.initSession();
  } catch (err) {
    console.error('Initial session start error:', err);
  }
});
