import { Router, Request, Response } from 'express';
import { sendWhatsAppMessage, SendMessageOptions } from '../engine/whatsappClient';

export const messageRouter = Router();

// POST /api/messages/send-text
messageRouter.post('/send-text', async (req: Request, res: Response) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      res.status(400).json({
        success: false,
        error: 'Phone number and message text are required'
      });
      return;
    }

    const result = await sendWhatsAppMessage({ phone, message });
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error while sending message'
    });
  }
});

// POST /api/messages/send-media
messageRouter.post('/send-media', async (req: Request, res: Response) => {
  try {
    const options: SendMessageOptions = req.body;
    if (!options.phone) {
      res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
      return;
    }

    const result = await sendWhatsAppMessage(options);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error while sending media'
    });
  }
});
