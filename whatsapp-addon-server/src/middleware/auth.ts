import { Request, Response, NextFunction } from 'express';

export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  const configuredKey = process.env.API_KEY;

  // If no API_KEY is set in environment, allow with warning
  if (!configuredKey) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  const queryKey = req.query.apiKey as string | undefined;

  let providedKey = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7).trim();
  } else if (queryKey) {
    providedKey = queryKey.trim();
  }

  if (!providedKey || providedKey !== configuredKey) {
    res.status(401).json({
      success: false,
      error: 'غير مصرح بالوصول: يرجى تمرير مفتاح API الصحيح (Unauthorized: Invalid or missing API Key)'
    });
    return;
  }

  next();
}
