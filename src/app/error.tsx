'use client';

import React, { useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Application Error:', error);
  }, [error]);

  return (
    <div style={{
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
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        borderRadius: '24px',
        padding: '40px 32px',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <AlertTriangle size={36} />
        </div>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '10px', color: '#ffffff' }}>
          حدث خطأ غير متوقع في النظام
        </h1>

        <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '28px' }}>
          نعتذر عن هذا الخطأ المؤقت. تم تسجيل التنبيه ويمكنك إعادة المحاولة وتحديث الصفحة فوراً.
        </p>

        <button
          onClick={() => reset()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#000000',
            fontWeight: 800,
            fontSize: '1rem',
            padding: '12px 28px',
            borderRadius: '14px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 10px 20px rgba(245, 158, 11, 0.25)',
            transition: 'transform 0.2s ease'
          }}
        >
          <RefreshCw size={18} />
          <span>إعادة المحاولة وتحديث النظام</span>
        </button>
      </div>
    </div>
  );
}
