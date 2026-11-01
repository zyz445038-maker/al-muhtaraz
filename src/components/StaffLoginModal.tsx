'use client';

import React, { FormEvent, useState } from 'react';
import { KeyRound, LockKeyhole } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { Profile } from '@/types/database';

interface StaffLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProfile: (profile: Profile) => void;
  isMandatory?: boolean;
}

export const StaffLoginModal: React.FC<StaffLoginModalProps> = ({
  isOpen,
  onClose,
  onSelectProfile,
  isMandatory = false
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (error || !data.user) {
        setErrorMessage('تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.');
        return;
      }

      const { data: profile, error: profileError } = await supabaseBrowser
        .from('profiles')
        .select('id, full_name, email, phone, role, is_active, can_view_all_records, permissions, notes, created_at, updated_at')
        .eq('id', data.user.id)
        .maybeSingle();
      if (profileError) {
        await supabaseBrowser.auth.signOut();
        throw profileError;
      }
      if (!profile || !profile.is_active) {
        await supabaseBrowser.auth.signOut();
        setErrorMessage('هذا الحساب غير نشط أو لا يملك ملف موظف معتمدًا.');
        return;
      }

      onSelectProfile(profile);
      setPassword('');
    } catch (error) {
      console.error('Staff authentication failed:', error);
      setErrorMessage('تعذر إكمال تسجيل الدخول. حاول مرة أخرى أو تواصل مع المدير.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={(event) => {
        if (!isMandatory && event.target === event.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        direction: 'rtl',
        background: 'rgba(2, 6, 23, 0.94)',
        backdropFilter: 'blur(16px)'
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 440,
          padding: 28,
          color: '#fff',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: 24,
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98), rgba(5, 8, 17, 0.99))',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ color: '#fbbf24', marginBottom: 12 }}>
            <LockKeyhole size={36} style={{ margin: 'auto' }} />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900 }}>تسجيل دخول الموظفين</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 0 }}>
            استخدم بيانات حسابك المعتمد في النظام
          </p>
        </div>

        <label style={{ display: 'block', marginBottom: 14, color: '#cbd5e1', fontSize: '0.9rem' }}>
          البريد الإلكتروني
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 18, color: '#cbd5e1', fontSize: '0.9rem' }}>
          كلمة المرور
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={inputStyle}
          />
        </label>

        {errorMessage && (
          <p role="alert" style={{ color: '#fca5a5', fontSize: '0.85rem', margin: '0 0 14px' }}>
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '12px 18px',
            color: '#050811',
            fontSize: '0.95rem',
            fontWeight: 800,
            border: 0,
            borderRadius: 12,
            background: isSubmitting ? '#a8a29e' : 'linear-gradient(135deg, #f59e0b, #d97706)',
            cursor: isSubmitting ? 'wait' : 'pointer'
          }}
        >
          <KeyRound size={18} />
          {isSubmitting ? 'جارٍ التحقق...' : 'دخول آمن'}
        </button>
      </form>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  marginTop: 7,
  padding: '11px 12px',
  color: '#fff',
  background: 'rgba(15, 23, 42, 0.9)',
  border: '1px solid rgba(148, 163, 184, 0.35)',
  borderRadius: 10,
  outlineColor: '#f59e0b'
};
