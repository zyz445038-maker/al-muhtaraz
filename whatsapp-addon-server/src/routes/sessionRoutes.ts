import { Router, Request, Response } from 'express';
import { sessionManager } from '../engine/sessionManager';

export const sessionRouter = Router();

// GET /api/session/status
sessionRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const status = sessionManager.getStatus();

    // If disconnected and not currently trying to connect, trigger background init
    if (status.status === 'disconnected') {
      sessionManager.initSession().catch(console.error);
    }

    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error while getting status'
    });
  }
});

// POST /api/session/pair-code
sessionRouter.post('/pair-code', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({
        success: false,
        error: 'رقم الهاتف مطلوب لاستخراج كود الاقتران'
      });
      return;
    }

    const code = await sessionManager.requestPairingCode(phone);
    res.json({
      success: true,
      data: {
        code,
        message: 'تم توليد كود الاقتران بنجاح. أدخله في تطبيق واتساب بهاتفك الآن.'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'فشل توليد كود الاقتران'
    });
  }
});

// POST /api/session/logout
sessionRouter.post('/logout', async (req: Request, res: Response) => {
  try {
    await sessionManager.logout();
    res.json({
      success: true,
      message: 'تم تسجيل الخروج ومسح بيانات الجلسة بنجاح.'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'فشل تسجيل الخروج'
    });
  }
});

// POST /api/session/restart
sessionRouter.post('/restart', async (req: Request, res: Response) => {
  try {
    await sessionManager.initSession(true);
    res.json({
      success: true,
      message: 'تمت إعادة تشغيل الجلسة بنجاح.'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || 'فشل إعادة تشغيل الجلسة'
    });
  }
});
