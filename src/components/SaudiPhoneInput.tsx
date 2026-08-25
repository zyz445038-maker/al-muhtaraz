'use client';

import React, { useMemo } from 'react';
import { Phone, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

interface SaudiPhoneInputProps {
  value: string;
  onChange: (formattedValue: string, isValid: boolean) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
  helperText?: string;
}

/**
 * Utility to format and validate Saudi mobile numbers
 * - Accepts 05xxxxxxxx (10 digits) or 5xxxxxxxx (9 digits) or +9665xxxxxxxx
 * - Returns clean 10-digit local format: 05xxxxxxxx
 */
export function normalizeSaudiPhone(input: string): { local10: string; intl966: string; isValid: boolean; error?: string } {
  if (!input) return { local10: '', intl966: '', isValid: false };

  let digits = input.replace(/\D/g, '');

  // Handle +966 or 966 prefix
  if (digits.startsWith('966')) {
    digits = digits.substring(3);
  }

  // Ensure it starts with 05 (if starts with 5, prepend 0)
  if (digits.startsWith('5')) {
    digits = '0' + digits;
  }

  // Cap at 10 digits
  if (digits.length > 10) {
    digits = digits.substring(0, 10);
  }

  const isValid = digits.length === 10 && digits.startsWith('05');
  let error = '';

  if (digits.length > 0 && !digits.startsWith('05') && !digits.startsWith('0') && !digits.startsWith('5')) {
    error = 'يجب أن يبدأ الرقم بـ 05';
  } else if (digits.length > 0 && digits.length < 10) {
    error = `متبقي ${10 - digits.length} أرقام`;
  }

  const intl966 = isValid ? '966' + digits.substring(1) : (digits ? '966' + digits.replace(/^0+/, '') : '');

  return {
    local10: digits,
    intl966,
    isValid,
    error: error || undefined
  };
}

/**
 * Checks if a phone number is a REAL callable phone number (not a mock/placeholder number)
 */
export function isRealCallablePhone(phone?: string | null): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  if (!digits || digits.length < 9) return false;

  // Filter out common dummy/placeholder test numbers like 0500000001, 0550000002, 500000001, 966500000001, etc.
  if (/^(966)?0?5[05]000000\d$/.test(digits)) return false;
  if (/^(966)?0?5000000\d{2}$/.test(digits)) return false;
  if (/^0?50000000\d$/.test(digits)) return false;
  if (/^(966)?0?51234567\d?$/.test(digits)) return false;

  const { isValid } = normalizeSaudiPhone(phone);
  return isValid;
}

export const SaudiPhoneInput: React.FC<SaudiPhoneInputProps> = ({
  value,
  onChange,
  label,
  placeholder = '05XXXXXXXX',
  required = false,
  disabled = false,
  className = '',
  style,
  inputStyle,
  helperText
}) => {
  // Compute normalized state
  const { local10, isValid } = useMemo(() => {
    return normalizeSaudiPhone(value || '');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const { local10: formatted, isValid: valid } = normalizeSaudiPhone(raw);
    onChange(formatted, valid);
  };

  const digitCount = local10.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', ...style }} className={className}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>
            {label} {required && <span style={{ color: '#f87171' }}>*</span>}
          </label>
          
          {/* Live Digits Counter / Badge */}
          {digitCount > 0 && (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: isValid
                  ? 'rgba(16, 185, 129, 0.2)'
                  : digitCount > 0 && !local10.startsWith('05')
                  ? 'rgba(239, 68, 68, 0.2)'
                  : 'rgba(245, 158, 11, 0.2)',
                color: isValid
                  ? '#34d399'
                  : digitCount > 0 && !local10.startsWith('05')
                  ? '#f87171'
                  : '#fbbf24',
                border: `1px solid ${
                  isValid
                    ? 'rgba(16, 185, 129, 0.4)'
                    : digitCount > 0 && !local10.startsWith('05')
                    ? 'rgba(239, 68, 68, 0.4)'
                    : 'rgba(245, 158, 11, 0.4)'
                }`
              }}
            >
              {isValid ? (
                <>
                  <CheckCircle2 size={12} />
                  <span>10/10 رقم سعودي صحيح 🟢</span>
                </>
              ) : digitCount > 0 && !local10.startsWith('05') ? (
                <>
                  <AlertCircle size={12} />
                  <span>يجب البدء بـ 05 🔴</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={12} />
                  <span>{digitCount}/10 أرقام (متبقي {10 - digitCount}) 🟡</span>
                </>
              )}
            </span>
          )}
        </div>
      )}

      {/* Input Group with Fixed +966 Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.85)',
          border: `1.5px solid ${
            isValid
              ? '#10b981'
              : digitCount > 0 && !local10.startsWith('05')
              ? '#ef4444'
              : digitCount > 0
              ? '#f59e0b'
              : 'rgba(255, 255, 255, 0.15)'
          }`,
          borderRadius: '12px',
          overflow: 'hidden',
          transition: 'all 0.2s',
          boxShadow: isValid ? '0 0 12px rgba(16, 185, 129, 0.15)' : 'none'
        }}
      >
        {/* Fixed Non-deletable Country Code Prefix */}
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(30, 41, 59, 0.9)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#94a3b8',
            fontSize: '0.85rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            userSelect: 'none',
            whiteSpace: 'nowrap'
          }}
          title="المملكة العربية السعودية (+966)"
        >
          <span>🇸🇦</span>
          <span style={{ color: '#cbd5e1', letterSpacing: '0.5px' }}>+966</span>
        </div>

        {/* Local Number Input (05XXXXXXXX) */}
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <input
            type="tel"
            dir="ltr"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={10}
            disabled={disabled}
            required={required}
            placeholder={placeholder}
            value={local10}
            onChange={handleChange}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              padding: '10px 12px',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '1px',
              textAlign: 'left',
              direction: 'ltr',
              ...inputStyle
            }}
          />

          {/* Inline Phone Icon */}
          <div style={{ paddingLeft: '12px', paddingRight: '12px', color: '#64748b' }}>
            <Phone size={16} color={isValid ? '#10b981' : '#64748b'} />
          </div>
        </div>
      </div>

      {/* Helper text or warning below input */}
      {helperText && (
        <span style={{ fontSize: '0.72rem', color: '#94a3b8', paddingRight: '4px' }}>
          {helperText}
        </span>
      )}
    </div>
  );
};
