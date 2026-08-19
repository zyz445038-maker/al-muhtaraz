'use client';

import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  UserCheck, 
  Key, 
  ShieldAlert, 
  X, 
  ArrowRight, 
  CheckCircle2, 
  Delete, 
  Eye, 
  EyeOff,
  Briefcase,
  Crown
} from 'lucide-react';
import { Profile } from '@/types/database';

interface StaffLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Profile[];
  currentProfile: Profile | null;
  onSelectProfile: (profile: Profile) => void;
  isMandatory?: boolean;
}

export const StaffLoginModal: React.FC<StaffLoginModalProps> = ({
  isOpen,
  onClose,
  staffList,
  currentProfile,
  onSelectProfile,
  isMandatory = false
}) => {
  const [selectedStaff, setSelectedStaff] = useState<Profile | null>(null);
  const [pin, setPin] = useState('');
  const [showPinText, setShowPinText] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Filter only authorized login profiles (admin and office staff, excluding drivers)
  const authorizedStaff = staffList.filter(s => s.role === 'admin' || s.role === 'employee');

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMsg('');
      setIsSuccess(false);
      setIsShaking(false);
      // If there's a currently active profile, we can start with selection screen
      setSelectedStaff(null);
    }
  }, [isOpen]);

  // Handle Physical Keyboard Typing
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedStaff) {
        if (e.key >= '0' && e.key <= '9') {
          if (pin.length < 8) {
            handleDigitPress(e.key);
          }
        } else if (e.key === 'Backspace') {
          handleBackspace();
        } else if (e.key === 'Enter') {
          handleSubmit();
        } else if (e.key === 'Escape') {
          setSelectedStaff(null);
          setPin('');
          setErrorMsg('');
        }
      } else if (e.key === 'Escape' && !isMandatory) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedStaff, pin, isMandatory]);

  if (!isOpen) return null;

  const handleDigitPress = (digit: string) => {
    if (pin.length >= 8) return;
    setErrorMsg('');
    const newPin = pin + digit;
    setPin(newPin);

    // Auto-submit if pin reaches 4 digits (standard PIN length)
    const expectedPin = selectedStaff?.password_pin || '1234';
    if (newPin === expectedPin) {
      triggerSuccess(newPin);
    }
  };

  const handleBackspace = () => {
    setErrorMsg('');
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setErrorMsg('');
    setPin('');
  };

  const triggerSuccess = (enteredPin: string) => {
    if (!selectedStaff) return;
    setIsSuccess(true);
    setErrorMsg('');
    setTimeout(() => {
      onSelectProfile(selectedStaff);
      onClose();
    }, 600);
  };

  const handleSubmit = () => {
    if (!selectedStaff) return;
    const expectedPin = selectedStaff.password_pin || '1234';

    if (pin === expectedPin) {
      triggerSuccess(pin);
    } else {
      setErrorMsg('كلمة المرور / الرمز السري غير صحيح، يرجى المحاولة مجدداً');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin('');
    }
  };

  return (
    <div 
      onClick={(e) => {
        // Only allow closing on backdrop click if login is not mandatory
        if (!isMandatory && e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.94)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        direction: 'rtl'
      }}
    >
      <div 
        className={isShaking ? 'shake-animation' : ''}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(5, 8, 17, 0.99) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '24px',
          maxWidth: '460px',
          width: '100%',
          padding: '28px 24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 50px rgba(245, 158, 11, 0.15)',
          position: 'relative',
          color: '#ffffff'
        }}
      >
        {/* Close Button (Hidden if login is mandatory to prevent bypass) */}
        {!isMandatory && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              color: '#94a3b8',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title="إغلاق"
          >
            <X size={18} />
          </button>
        )}

        {/* ======================================================== */}
        {/* STAGE 1: SELECT EMPLOYEE PROFILE                         */}
        {/* ======================================================== */}
        {!selectedStaff ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '18px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                color: '#fbbf24'
              }}>
                <UserCheck size={30} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                تسجيل دخول الموظفين
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '6px', marginBottom: 0 }}>
                اختر اسمك من قائمة الموظفين المصرح لهم للدخول بالرمز السري
              </p>
            </div>

            {/* Staff List Grid */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '340px',
              overflowY: 'auto',
              paddingLeft: '4px',
              paddingRight: '4px'
            }}>
              {authorizedStaff.map((staff) => {
                const isAdmin = staff.role === 'admin';
                const isCurrent = currentProfile?.id === staff.id;

                return (
                  <div
                    key={staff.id}
                    onClick={() => {
                      setSelectedStaff(staff);
                      setPin('');
                      setErrorMsg('');
                    }}
                    style={{
                      background: isCurrent 
                        ? 'rgba(245, 158, 11, 0.15)' 
                        : 'rgba(30, 41, 59, 0.6)',
                      border: `1px solid ${isCurrent ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)'}`,
                      borderRadius: '14px',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#fbbf24';
                      e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isCurrent ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.background = isCurrent ? 'rgba(245, 158, 11, 0.15)' : 'rgba(30, 41, 59, 0.6)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: isAdmin ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'rgba(56, 189, 248, 0.15)',
                        border: `1px solid ${isAdmin ? '#fbbf24' : 'rgba(56, 189, 248, 0.3)'}`,
                        color: isAdmin ? '#000000' : '#38bdf8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '1rem'
                      }}>
                        {isAdmin ? <Crown size={20} /> : staff.full_name.substring(0, 2)}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#ffffff' }}>
                            {staff.full_name}
                          </span>
                          {isAdmin && (
                            <span style={{
                              background: 'rgba(245, 158, 11, 0.2)',
                              color: '#fbbf24',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '6px'
                            }}>
                              المدير العام
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                          {isAdmin ? 'تحكم مالي وإداري كامل' : 'موظف استقبال وعمليات ميدانية'}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#fbbf24',
                      fontSize: '0.82rem',
                      fontWeight: 700
                    }}>
                      <span>دخول 🔒</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{
              marginTop: '18px',
              padding: '10px 14px',
              background: 'rgba(245, 158, 11, 0.06)',
              borderRadius: '10px',
              border: '1px dashed rgba(245, 158, 11, 0.2)',
              fontSize: '0.78rem',
              color: '#fbbf24',
              textAlign: 'center'
            }}>
              💡 كلمة المرور الافتراضية للتجربة: <strong>1234</strong> (أو ما حدده المدير في صفحة الموظفين)
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* STAGE 2: LUXURY PIN & PASSWORD PAD                       */
          /* ======================================================== */
          <div>
            {/* Header: Back & Selected Staff Info */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <button
                onClick={() => {
                  setSelectedStaff(null);
                  setPin('');
                  setErrorMsg('');
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fbbf24',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <ArrowRight size={14} />
                <span>تغيير الموظف</span>
              </button>

              <div style={{
                background: selectedStaff.role === 'admin' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                color: selectedStaff.role === 'admin' ? '#fbbf24' : '#38bdf8',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 800
              }}>
                {selectedStaff.role === 'admin' ? '👑 حساب المدير العام' : '👷 حساب موظف الاستقبال'}
              </div>
            </div>

            {/* Profile Avatar & Name */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: selectedStaff.role === 'admin' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'rgba(56, 189, 248, 0.2)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                color: selectedStaff.role === 'admin' ? '#000000' : '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.2rem',
                margin: '0 auto 8px',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)'
              }}>
                {selectedStaff.role === 'admin' ? <Crown size={26} /> : selectedStaff.full_name.substring(0, 2)}
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#ffffff' }}>
                {selectedStaff.full_name}
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px', marginBottom: 0 }}>
                أدخل كلمة المرور / الرمز السري للمتابعة
              </p>
            </div>

            {/* PIN Dots / Display Field */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: `2px solid ${errorMsg ? '#ef4444' : isSuccess ? '#10b981' : '#f59e0b'}`,
              borderRadius: '16px',
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              boxShadow: isSuccess 
                ? '0 0 20px rgba(16, 185, 129, 0.4)' 
                : 'inset 0 2px 4px rgba(0, 0, 0, 0.5)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color={isSuccess ? '#10b981' : '#fbbf24'} />
                
                {/* Visual PIN Dots */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '24px' }}>
                  {pin.length === 0 ? (
                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>اكتب أو انقر الرمز السري...</span>
                  ) : showPinText ? (
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '4px', color: '#ffffff' }}>
                      {pin}
                    </span>
                  ) : (
                    Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          background: i < pin.length ? (isSuccess ? '#10b981' : '#fbbf24') : 'rgba(255, 255, 255, 0.1)',
                          border: `1px solid ${i < pin.length ? '#fbbf24' : 'rgba(255, 255, 255, 0.2)'}`,
                          boxShadow: i < pin.length ? '0 0 10px rgba(251, 191, 36, 0.6)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* View Toggle */}
              <button
                type="button"
                onClick={() => setShowPinText(!showPinText)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPinText ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Error or Success Alert */}
            {errorMsg && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                padding: '8px 12px',
                color: '#f87171',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '14px'
              }}>
                <ShieldAlert size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {isSuccess && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '10px',
                padding: '8px 12px',
                color: '#34d399',
                fontSize: '0.85rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginBottom: '14px'
              }}>
                <CheckCircle2 size={18} color="#34d399" />
                <span>تم التحقق بنجاح! جارٍ الدخول...</span>
              </div>
            )}

            {/* ======================================================== */}
            {/* TOUCH KEYPAD MATRIX (1 - 9, 0, Backspace, Clear)         */}
            {/* ======================================================== */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              marginBottom: '16px'
            }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigitPress(digit)}
                  style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '14px',
                    color: '#ffffff',
                    fontSize: '1.3rem',
                    fontWeight: 800,
                    padding: '14px 0',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                    transition: 'all 0.1s ease',
                    userSelect: 'none'
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.94)';
                    e.currentTarget.style.background = 'rgba(245, 158, 11, 0.25)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.background = 'rgba(30, 41, 59, 0.7)';
                  }}
                >
                  {digit}
                </button>
              ))}

              {/* Clear */}
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '14px',
                  color: '#f87171',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  padding: '14px 0',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                مسح
              </button>

              {/* Zero */}
              <button
                type="button"
                onClick={() => handleDigitPress('0')}
                style={{
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  color: '#ffffff',
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  padding: '14px 0',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.94)';
                  e.currentTarget.style.background = 'rgba(245, 158, 11, 0.25)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = 'rgba(30, 41, 59, 0.7)';
                }}
              >
                0
              </button>

              {/* Backspace */}
              <button
                type="button"
                onClick={handleBackspace}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  color: '#fbbf24',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '14px 0',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <Delete size={20} />
              </button>
            </div>

            {/* Confirm / Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pin.length === 0}
              style={{
                width: '100%',
                background: pin.length > 0
                  ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                  : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '14px',
                color: pin.length > 0 ? '#000000' : '#64748b',
                fontWeight: 900,
                fontSize: '1rem',
                padding: '14px',
                cursor: pin.length > 0 ? 'pointer' : 'not-allowed',
                boxShadow: pin.length > 0 ? '0 10px 25px rgba(245, 158, 11, 0.3)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <Lock size={18} />
              <span>تأكيد تسجيل الدخول</span>
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-10px); }
          40%, 80% { transform: translateX(10px); }
        }
        .shake-animation {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
};
