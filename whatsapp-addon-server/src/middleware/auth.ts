import { Request, Response, NextFunction } from 'express';

export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  const configuredKey = process.env.API_KEY;

  if (!configuredKey) {
    res.status(503).json({
      success: false,
      error: 'الخدمة غير مهيأة: مفتاح API غير مضبوط على الخادم.'
    });
    return;
  }

  const authHeader = req.headers.authorization;
  const providedKey = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7).trim()
    : '';

  if (!providedKey || providedKey !== configuredKey) {
    res.status(401).json({
      success: false,
      error: 'غير مصرح بالوصول: يرجى تمرير مفتاح API الصحيح (Unauthorized: Invalid or missing API Key)'
    });
    return;
  }

  next();
}
