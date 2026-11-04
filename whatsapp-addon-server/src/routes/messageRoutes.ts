import { Router } from 'express';
import { createHash } from 'crypto';
import type { Request, Response } from 'express';
import { whatsappIdempotencyStore } from '../engine/idempotencyStore.js';
import { sendWhatsAppMessage } from '../engine/whatsappClient.js';
import type { SendMessageOptions } from '../engine/whatsappClient.js';

export const messageRouter = Router();

async function sendIdempotently(
  req: Request,
  res: Response,
  options: SendMessageOptions
): Promise<void> {
  const key = req.get('Idempotency-Key')?.trim() || '';
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(key)) {
    res.status(400).json({ success: false, error: 'A valid Idempotency-Key header is required.' });
    return;
  }

  const fingerprint = createHash('sha256').update(JSON.stringify(options)).digest('hex');
  const reservation = await whatsappIdempotencyStore.reserve(key, fingerprint);
  if (reservation.state === 'conflict') {
    res.status(409).json({
      success: false,
      code: 'IDEMPOTENCY_CONFLICT',
      error: 'This Idempotency-Key was already used with a different message.'
    });
    return;
  }
  if (reservation.state === 'pending') {
    res.status(409).json({
      success: false,
      code: 'IDEMPOTENCY_PENDING',
      outcome: 'unknown',
      error: 'This send is already in progress or its result is unknown. Reuse the same key; do not create a new send.'
    });
    return;
  }
  if (reservation.state === 'completed') {
    res.setHeader('Idempotency-Replayed', 'true');
    res.status(reservation.statusCode).json(reservation.body);
    return;
  }

  const result = await sendWhatsAppMessage(options);
  const responseBody = { ...result, provider: 'railway' };
  const storedResult = { statusCode: result.success ? 200 : 502, body: responseBody };

  if (result.outcome === 'retryable') {
    const retry = await whatsappIdempotencyStore.markRetryable(key, fingerprint, storedResult);
    if (retry.state === 'completed') {
      res.status(retry.statusCode).json(retry.body);
      return;
    }
    res.status(storedResult.statusCode).json(responseBody);
    return;
  }

  if (result.outcome === 'unknown') {
    await whatsappIdempotencyStore.markUnknown(key, fingerprint, storedResult);
    res.status(storedResult.statusCode).json(responseBody);
    return;
  }

  await whatsappIdempotencyStore.complete(key, fingerprint, storedResult);
  res.status(storedResult.statusCode).json(responseBody);
}

// POST /api/messages/send-text
messageRouter.post('/send-text', async (req: Request, res: Response) => {
  try {
    const { phone, message } = req.body || {};
    if (typeof phone !== 'string' || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({
        success: false,
        error: 'Phone number and message text are required'
      });
      return;
    }

    await sendIdempotently(req, res, { phone, message });
  } catch (error: any) {
    console.error('WhatsApp text send failed:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error while sending message'
    });
  }
});

// POST /api/messages/send-media
messageRouter.post('/send-media', async (req: Request, res: Response) => {
  try {
    const options = req.body as SendMessageOptions | undefined;
    if (!options || typeof options.phone !== 'string' || !options.phone.trim()) {
      res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
      return;
    }

    await sendIdempotently(req, res, options);
  } catch (error: any) {
    console.error('WhatsApp media send failed:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error while sending media'
    });
  }
});
