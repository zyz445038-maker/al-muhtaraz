'use client';

import React, { useEffect } from 'react';
import { reportClientError } from '@/lib/rollbarClient';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050811',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '24px',
        direction: 'rtl'
      }}>
        <main style={{ maxWidth: '480px', textAlign: 'center' }}>
          <h1>حدث خطأ غير متوقع في النظام</h1>
          <p>نعتذر عن هذا الخطأ المؤقت. يمكنك إعادة المحاولة أو تحديث الصفحة.</p>
          <button onClick={() => reset()}>إعادة المحاولة</button>
        </main>
      </body>
    </html>
  );
}
