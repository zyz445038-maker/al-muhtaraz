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

// Health check endpoint (Public)
app.get('/health', (req, res) => {
  const status = sessionManager.getStatus();
  res.json({
    status: 'ok',
    service: 'Al-Muhtaraz WhatsApp Add-on Engine',
    whatsappConnected: status.isConnected,
    whatsappStatus: status.status,
    timestamp: new Date().toISOString()
  });
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
