import React from 'react';
import Link from 'next/link';
import { AlertCircle, Home } from 'lucide-react';

export default function NotFound() {
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
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '40px 32px',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(245, 158, 11, 0.15)',
          color: '#fbbf24',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <AlertCircle size={36} />
        </div>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '10px', color: '#ffffff' }}>
          الصفحة غير موجودة (404)
        </h1>

        <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '28px' }}>
          عذراً، لم نتمكن من العثور على الصفحة أو المسار المطلوب في نظام المحترز للحاويات.
        </p>

        <Link
          href="/"
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
            textDecoration: 'none',
            boxShadow: '0 10px 20px rgba(245, 158, 11, 0.25)',
            transition: 'transform 0.2s ease'
          }}
        >
          <Home size={18} />
          <span>العودة للوحة التحكم الرئيسية</span>
        </Link>
      </div>
    </div>
  );
}
