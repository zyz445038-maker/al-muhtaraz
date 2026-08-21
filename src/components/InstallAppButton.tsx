'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, Share2, PlusSquare, X, ShieldCheck, Sparkles, Check } from 'lucide-react';

export const InstallAppButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check if already installed / running in standalone mode
    const checkStandalone = () => {
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);
    };

    checkStandalone();

    // 2. Check if iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // 3. Listen for Android / Chrome / Edge 'beforeinstallprompt'
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // 4. Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Handle Install Trigger
  const handleInstallClick = async () => {
    if (isIOS) {
      // Show iOS guided modal
      setShowIOSModal(true);
      return;
    }

    if (deferredPrompt) {
      // Trigger native browser install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback for browsers with no prompt captured: show modal
      setShowIOSModal(true);
    }
  };

  // If already running inside standalone app, do not show button
  if (isInstalled) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes ambientBeaconPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5), 0 4px 15px rgba(0, 0, 0, 0.4);
          }
          20% {
            box-shadow: 0 0 0 7px rgba(245, 158, 11, 0.15), 0 4px 20px rgba(245, 158, 11, 0.35);
          }
          40% {
            box-shadow: 0 0 0 12px rgba(245, 158, 11, 0), 0 4px 15px rgba(0, 0, 0, 0.4);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(245, 158, 11, 0), 0 4px 15px rgba(0, 0, 0, 0.4);
          }
        }

        @keyframes badgeGlow {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }

        .pwa-install-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(15, 23, 42, 0.85) 100%);
          border: 1px solid rgba(245, 158, 11, 0.55);
          border-radius: 12px;
          padding: 6px 14px;
          color: #ffffff;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          animation: ambientBeaconPulse 6.5s infinite ease-in-out;
        }

        .pwa-install-btn:hover {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(30, 41, 59, 0.95) 100%);
          border-color: #fbbf24;
          transform: translateY(-1px);
          box-shadow: 0 6px 25px rgba(245, 158, 11, 0.35);
        }

        .pwa-install-btn:active {
          transform: translateY(0);
        }

        .pulse-beacon-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 8px #34d399;
          animation: badgeGlow 2.5s infinite ease-in-out;
        }
      `}</style>

      {/* 🌟 Luxury Header Install Button */}
      <button
        type="button"
        onClick={handleInstallClick}
        className="pwa-install-btn"
        title="تثبيت منصة المحترز للحاويات كتطبيق رسمي على جهازك"
        aria-label="تثبيت التطبيق"
      >
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
          color: '#050811',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 10px rgba(245, 158, 11, 0.4)'
        }}>
          <Smartphone size={16} strokeWidth={2.4} />
        </div>

        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            fontSize: '0.82rem',
            fontWeight: 800,
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            lineHeight: 1.2
          }}>
            <span>تثبيت التطبيق</span>
            <div className="pulse-beacon-dot" />
          </div>
          <span style={{ fontSize: '0.66rem', color: '#94a3b8', marginTop: '1px' }}>
            وصول فوري وآمن 🛡️
          </span>
        </div>
      </button>

      {/* 🍎 iOS / Desktop Instruction Modal */}
      {showIOSModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(5, 8, 17, 0.82)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          direction: 'rtl'
        }}>
          <div style={{
            maxWidth: '460px',
            width: '100%',
            background: 'linear-gradient(165deg, rgba(15, 23, 42, 0.95) 0%, rgba(5, 8, 17, 0.98) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '24px',
            padding: '32px 26px',
            boxShadow: '0 30px 70px rgba(0, 0, 0, 0.7), 0 0 35px rgba(245, 158, 11, 0.15)',
            position: 'relative',
            animation: 'fadeIn 0.25s ease'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowIOSModal(false)}
              style={{
                position: 'absolute',
                top: '18px',
                left: '18px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            {/* Header Emblem */}
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: 'linear-gradient(135deg, #f59e0b, #b45309)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 30px rgba(245, 158, 11, 0.35)',
                marginBottom: '14px'
              }}>
                <Smartphone size={32} color="#050811" />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', marginBottom: '6px' }}>
                تثبيت تطبيق المحترز للحاويات
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.86rem', lineHeight: '1.5' }}>
                تجربة كاملة وسريعة بدون شريط المتصفح مع حفظ العقود والسندات
              </p>
            </div>

            {/* Step-by-Step Instructions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '26px' }}>
              {isIOS ? (
                <>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px'
                  }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#fbbf24',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Share2 size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                        1. اضغط على زر المشاركة
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        في شريط متصفح Safari بالأسفل (أيقونة المربع والسهم ⎋)
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px'
                  }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(52, 211, 153, 0.15)',
                      color: '#34d399',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <PlusSquare size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                        2. اختر "إضافة إلى الشاشة الرئيسية"
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        (Add to Home Screen) ليظهر التطبيق مع تطبيقات هاتفك
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  textAlign: 'center'
                }}>
                  <p style={{ fontSize: '0.88rem', color: '#f8fafc', lineHeight: 1.6 }}>
                    يمكنك تثبيت المنصة مباشرة بالضغط على زر <strong>(تثبيت التطبيق / Install)</strong> في شريط عنوان المتصفح أو القائمة الجانبية (⋮).
                  </p>
                </div>
              )}
            </div>

            {/* Trust & Guarantee Banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              background: 'rgba(52, 211, 153, 0.08)',
              border: '1px solid rgba(52, 211, 153, 0.2)',
              borderRadius: '10px',
              color: '#34d399',
              fontSize: '0.78rem',
              fontWeight: 700,
              marginBottom: '20px'
            }}>
              <ShieldCheck size={16} />
              <span>تطبيق ويب تقدمي رسمي (PWA) معتمد ومشفر 100%</span>
            </div>

            {/* Close / Action Button */}
            <button
              onClick={() => setShowIOSModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none',
                color: '#050811',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
              }}
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}

      {/* 🎉 Toast on App Installed */}
      {showSuccessToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(52, 211, 153, 0.5)',
          borderRadius: '16px',
          padding: '14px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
          direction: 'rtl'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'rgba(52, 211, 153, 0.2)',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Check size={14} strokeWidth={3} />
          </div>
          <span style={{ color: '#ffffff', fontSize: '0.88rem', fontWeight: 700 }}>
            تم تثبيت تطبيق المحترز للحاويات بنجاح على جهازك! 🎉
          </span>
        </div>
      )}
    </>
  );
};
