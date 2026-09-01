'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  ShieldCheck, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Radio, 
  Sparkles, 
  Key, 
  Server, 
  Phone, 
  UserCheck, 
  RefreshCw,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Zap,
  Info,
  User,
  Crown,
  Eye,
  EyeOff,
  Cloud,
  Laptop,
  CheckCircle,
  Clock,
  Smartphone,
  LogOut,
  Sliders,
  FileText,
  Truck,
  BookOpen,
  SendHorizontal,
  ChevronLeft,
  Activity,
  Layers,
  Flame
} from 'lucide-react';
import { WhatsAppSettings as IWhatsAppSettings, NotificationLog } from '@/types/database';
import { SaudiPhoneInput } from './SaudiPhoneInput';

interface WhatsAppSettingsProps {
  settings: IWhatsAppSettings;
  notifications: NotificationLog[];
  onSaveSettings: (updated: IWhatsAppSettings) => Promise<boolean>;
  onTestConnection: (testPhone: string) => Promise<boolean>;
  onSendWhatsApp: (phone: string, message: string) => void;
  onMarkAsSent?: (notifId: string) => Promise<void>;
}

export const WhatsAppSettings: React.FC<WhatsAppSettingsProps> = ({
  settings,
  notifications,
  onSaveSettings,
  onTestConnection,
  onSendWhatsApp,
  onMarkAsSent
}) => {
  // Navigation within WhatsApp Engine Hub
  const [activeSection, setActiveSection] = useState<'connection' | 'routing' | 'sandbox' | 'guide'>('connection');

  // Server & Gateway Config (Render Cloud Microservice)
  const [serverUrl, setServerUrl] = useState(
    settings.evolution_server_url && !settings.evolution_server_url.includes('8080')
      ? settings.evolution_server_url 
      : 'https://al-muhtaraz-whatsapp.onrender.com'
  );
  const [apiKey, setApiKey] = useState(
    settings.evolution_api_key && settings.evolution_api_key.startsWith('mhk_live')
      ? settings.evolution_api_key
      : 'mhk_live_9f4b1a8e2c7d0563e41982ab7c3d55e0'
  );
  const [senderPhone, setSenderPhone] = useState(settings.sender_phone || '+966536971105');
  const [adminPhone, setAdminPhone] = useState(settings.admin_phone || '+966500000001');
  const [autoSendEnabled, setAutoSendEnabled] = useState(settings.auto_send_enabled ?? true);
  const [showApiKey, setShowApiKey] = useState(false);

  // Routing Rules State
  const [notifyCustomerContract, setNotifyCustomerContract] = useState(true);
  const [notifyCustomerReceipt, setNotifyCustomerReceipt] = useState(true);
  const [notifyDriverDispatch, setNotifyDriverDispatch] = useState(true);
  const [notifyCustomerExpiry, setNotifyCustomerExpiry] = useState(true);
  const [notifyAdminDailyReport, setNotifyAdminDailyReport] = useState(true);

  // Live Status & Pairing State
  const [isCheckingLive, setIsCheckingLive] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'connected' | 'qr_ready' | 'connecting' | 'disconnected'>('connecting');
  const [livePhone, setLivePhone] = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [pairingMethod, setPairingMethod] = useState<'qr' | 'pairCode'>('qr');
  const [pairPhoneInput, setPairPhoneInput] = useState('05');
  const [isRequestingPair, setIsRequestingPair] = useState(false);
  const [generatedPairCode, setGeneratedPairCode] = useState<string | null>(null);
  const [pairError, setPairError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Sandbox Test State
  const [testPhoneInput, setTestPhoneInput] = useState('');
  const [testMessageInput, setTestMessageInput] = useState('السلام عليكم ورحمة الله، رسالة تجريبية من محرك مؤسسة المحترز للحاويات 🏗️');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch Live Status on Mount & Poll
  const fetchLiveStatus = async () => {
    setIsCheckingLive(true);
    try {
      let data: any = null;
      try {
        const res = await fetch(`/api/whatsapp/status?serverUrl=${encodeURIComponent(serverUrl)}&apiKey=${encodeURIComponent(apiKey)}`, {
          cache: 'no-store'
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch (proxyErr) {}

      if (!data || (!data.status && !data.qrCodeBase64)) {
        try {
          const directRes = await fetch(`${serverUrl.replace(/\/+$/, '')}/api/session/status`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            cache: 'no-store'
          });
          if (directRes.ok) {
            const directJson = await directRes.json();
            if (directJson.success && directJson.data) {
              data = {
                status: directJson.data.status,
                phoneNumber: directJson.data.phoneNumber,
                qrCodeBase64: directJson.data.qrCodeBase64
              };
            }
          }
        } catch (directErr) {}
      }

      if (data) {
        if (data.status === 'connected') {
          setLiveStatus('connected');
          setLivePhone(data.phoneNumber || senderPhone);
          setQrCodeBase64(null);
        } else if (data.status === 'qr_ready' || data.qrCodeBase64) {
          setLiveStatus('qr_ready');
          setQrCodeBase64(data.qrCodeBase64);
        } else {
          setLiveStatus('connecting');
        }
      }
    } catch (e) {
      console.warn('Error polling WhatsApp status:', e);
    } finally {
      setIsCheckingLive(false);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
    const interval = setInterval(fetchLiveStatus, 5000);
    return () => clearInterval(interval);
  }, [serverUrl, apiKey]);

  // Request 8-digit Pairing Code
  const handleRequestPairCode = async () => {
    if (!pairPhoneInput || pairPhoneInput.length < 9) {
      setPairError('يرجى إدخال رقم هاتف سعودي صحيح مكون من 10 أرقام');
      return;
    }
    setIsRequestingPair(true);
    setPairError(null);
    setGeneratedPairCode(null);
    try {
      let code: string | null = null;
      try {
        const res = await fetch('/api/whatsapp/pair-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: pairPhoneInput })
        });
        const json = await res.json();
        if (json.success && json.code) {
          code = json.code;
        }
      } catch (err) {}

      if (!code) {
        try {
          const directRes = await fetch(`${serverUrl.replace(/\/+$/, '')}/api/session/pair-code`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({ phone: pairPhoneInput })
          });
          if (directRes.ok) {
            const directJson = await directRes.json();
            if (directJson.success && directJson.data?.code) {
              code = directJson.data.code;
            }
          }
        } catch (directErr) {}
      }

      if (code) {
        setGeneratedPairCode(code);
      } else {
        setPairError('تعذر توليد كود الاقتران. تأكد من تشغيل خادم المحرك.');
      }
    } catch (err: any) {
      setPairError(err?.message || 'خطأ في الاتصال بالخادم');
    } finally {
      setIsRequestingPair(false);
    }
  };

  // Logout / Disconnect Current Phone
  const handleLogout = async () => {
    if (!confirm('هل أنت متأكد من رغبتك في فصل الرقم الحالي لإعادة الاقتران برقم المنشأة الرسمي؟')) return;
    setIsLoggingOut(true);
    try {
      await fetch('/api/whatsapp/status?action=logout', { method: 'GET' }).catch(() => {});
      await fetch(`${serverUrl.replace(/\/+$/, '')}/api/session/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` }
      }).catch(() => {});

      setLiveStatus('qr_ready');
      setLivePhone(null);
      setGeneratedPairCode(null);
      fetchLiveStatus();
    } catch (e) {
      alert('حدث خطأ أثناء تسجيل الخروج');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Save Settings
  const handleSave = async () => {
    setIsSaving(true);
    const updated: IWhatsAppSettings = {
      ...settings,
      evolution_server_url: serverUrl,
      evolution_api_key: apiKey,
      sender_phone: senderPhone,
      admin_phone: adminPhone,
      auto_send_enabled: autoSendEnabled,
      is_connected: liveStatus === 'connected',
      updated_at: new Date().toISOString()
    };
    const ok = await onSaveSettings(updated);
    setIsSaving(false);
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // Send Test Message
  const handleSendTest = async () => {
    if (!testPhoneInput) {
      setTestResult({ ok: false, msg: 'يرجى إدخال رقم هاتف المستلم' });
      return;
    }
    setIsSendingTest(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhoneInput,
          message: testMessageInput
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ ok: true, msg: 'تم إرسال الرسالة بنجاح عبر الواتساب في الخلفية! 🚀' });
      } else {
        setTestResult({ ok: false, msg: data.error || 'تعذر الإرسال. تأكد من اتصال المحرك.' });
      }
    } catch (err: any) {
      setTestResult({ ok: false, msg: err?.message || 'خطأ في خادم الإرسال' });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px', direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* ─── 🏆 HEADER BANNER WITH VIBRANT AURAS ─── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.4) 0%, rgba(15, 23, 42, 0.95) 50%, rgba(30, 27, 75, 0.4) 100%)',
        border: '1px solid rgba(52, 211, 153, 0.35)',
        borderRadius: '24px',
        padding: '28px 24px',
        marginBottom: '24px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 35px rgba(16, 185, 129, 0.15)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background glow orbs */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-50px',
          left: '10%',
          width: '220px',
          height: '220px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 2 }}>
          
          {/* Main Title & Icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: '2px solid rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 25px rgba(16, 185, 129, 0.5)',
              flexShrink: 0
            }}>
              <MessageSquare size={34} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>
                  مركز إدارة محرك الواتساب السحابي
                </h1>
                <span style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.25))',
                  color: '#34d399',
                  border: '1px solid rgba(52, 211, 153, 0.4)',
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  boxShadow: '0 0 10px rgba(52, 211, 153, 0.2)'
                }}>
                  ⚡ المحرك المستقل الذكي
                </span>
              </div>
              <p style={{ color: '#cbd5e1', fontSize: '0.88rem', marginTop: '4px', lineHeight: 1.5 }}>
                المنظومة المركزية الشاملة لإدارة اتصال الواتساب السحابي، بطاقات العقود الرقمية، والإشعارات المباشرة للعملاء والسائقين
              </p>
            </div>
          </div>

          {/* Current Live Badge & Refresh Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '16px',
              fontWeight: 900,
              fontSize: '0.88rem',
              background: liveStatus === 'connected' 
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.35))'
                : liveStatus === 'qr_ready'
                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.35))'
                : 'rgba(30, 41, 59, 0.8)',
              color: liveStatus === 'connected' ? '#34d399' : liveStatus === 'qr_ready' ? '#fbbf24' : '#94a3b8',
              border: liveStatus === 'connected' 
                ? '1px solid #10b981' 
                : liveStatus === 'qr_ready' 
                ? '1px solid #f59e0b' 
                : '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: liveStatus === 'connected' ? '0 0 20px rgba(16, 185, 129, 0.3)' : 'none'
            }}>
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: liveStatus === 'connected' ? '#34d399' : liveStatus === 'qr_ready' ? '#fbbf24' : '#94a3b8',
                boxShadow: liveStatus === 'connected' ? '0 0 10px #34d399' : 'none'
              }} />
              <span>
                {liveStatus === 'connected' ? `متصل: ${livePhone ? `+${livePhone}` : 'جاهز 🟢'}` : liveStatus === 'qr_ready' ? 'بانتظار المسح 📱' : 'جارِ الفحص...'}
              </span>
            </div>

            <button
              onClick={fetchLiveStatus}
              disabled={isCheckingLive}
              title="تحديث الحالة الآن"
              style={{
                padding: '10px 14px',
                background: 'rgba(30, 41, 59, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '14px',
                color: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              <RefreshCw size={18} className={isCheckingLive ? 'animate-spin text-emerald-400' : ''} />
            </button>
          </div>
        </div>

        {/* ─── VIBRANT TABS NAVIGATION ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '10px',
          marginTop: '24px',
          paddingTop: '18px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          
          {/* Tab 1: Connection */}
          <button
            onClick={() => setActiveSection('connection')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 18px',
              borderRadius: '16px',
              fontWeight: 800,
              fontSize: '0.88rem',
              border: activeSection === 'connection' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeSection === 'connection' 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                : 'rgba(15, 23, 42, 0.7)',
              color: activeSection === 'connection' ? '#ffffff' : '#cbd5e1',
              boxShadow: activeSection === 'connection' ? '0 0 25px rgba(16, 185, 129, 0.45)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Radio size={18} />
            <span>1. بوابة الاتصال والاقتران الحي</span>
          </button>

          {/* Tab 2: Routing */}
          <button
            onClick={() => setActiveSection('routing')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 18px',
              borderRadius: '16px',
              fontWeight: 800,
              fontSize: '0.88rem',
              border: activeSection === 'routing' ? '1px solid #8b5cf6' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeSection === 'routing' 
                ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' 
                : 'rgba(15, 23, 42, 0.7)',
              color: activeSection === 'routing' ? '#ffffff' : '#cbd5e1',
              boxShadow: activeSection === 'routing' ? '0 0 25px rgba(139, 92, 246, 0.45)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Sliders size={18} />
            <span>2. مصفوفة التوجيه وقواعد الأتمتة</span>
          </button>

          {/* Tab 3: Sandbox */}
          <button
            onClick={() => setActiveSection('sandbox')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 18px',
              borderRadius: '16px',
              fontWeight: 800,
              fontSize: '0.88rem',
              border: activeSection === 'sandbox' ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeSection === 'sandbox' 
                ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                : 'rgba(15, 23, 42, 0.7)',
              color: activeSection === 'sandbox' ? '#050811' : '#cbd5e1',
              boxShadow: activeSection === 'sandbox' ? '0 0 25px rgba(245, 158, 11, 0.45)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Zap size={18} />
            <span>3. مختبر فحص الإرسال المباشر</span>
          </button>

          {/* Tab 4: Guide */}
          <button
            onClick={() => setActiveSection('guide')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 18px',
              borderRadius: '16px',
              fontWeight: 800,
              fontSize: '0.88rem',
              border: activeSection === 'guide' ? '1px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.08)',
              background: activeSection === 'guide' 
                ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' 
                : 'rgba(15, 23, 42, 0.7)',
              color: activeSection === 'guide' ? '#ffffff' : '#cbd5e1',
              boxShadow: activeSection === 'guide' ? '0 0 25px rgba(236, 72, 153, 0.45)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <BookOpen size={18} />
            <span>4. الدليل التشغيلي للمدير العام</span>
          </button>
        </div>
      </div>

      {/* ─── 📡 SECTION 1: LIVE CONNECTION & PAIRING GATEWAY ─── */}
      {activeSection === 'connection' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Main Pairing Card */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 29, 0.98) 100%)',
            border: '1px solid rgba(52, 211, 153, 0.3)',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <QrCode size={22} color="#34d399" />
                  <span>بوابة ربط ومصادقة الواتساب الحية</span>
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '3px' }}>
                  ربط رقم المنشأة مباشرة مع محرك Baileys المستقل لحفظ الجلسة وإرسال الرسائل تلقائياً
                </p>
              </div>

              {liveStatus === 'connected' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#fbbf24',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      borderRadius: '12px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(245, 158, 11, 0.1)'
                    }}
                  >
                    <RefreshCw size={14} className={isLoggingOut ? 'animate-spin' : ''} />
                    <span>{isLoggingOut ? 'جارِ تهيئة الرمز...' : '🔄 تغيير جهاز WhatsApp'}</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      borderRadius: '12px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                    title="فصل الرقم الحالي وتعليق الإرسال التلقائي"
                  >
                    <LogOut size={14} />
                    <span>فصل</span>
                  </button>
                </div>
              )}
            </div>

            {/* If Connected */}
            {liveStatus === 'connected' ? (
              <div style={{
                background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.3) 0%, rgba(15, 23, 42, 0.8) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '20px',
                padding: '32px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 0 35px rgba(16, 185, 129, 0.15)'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: '3px solid rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 0 35px rgba(16, 185, 129, 0.6)'
                }}>
                  <CheckCircle2 size={44} strokeWidth={2.4} />
                </div>

                <div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffffff', marginBottom: '6px' }}>
                    المحرك متصل بنجاح وجاهز للعمل 🟢
                  </h3>
                  <p style={{ color: '#cbd5e1', fontSize: '0.92rem' }}>
                    الرقم المرتبط حالياً للإرسال: <strong style={{ color: '#34d399', fontSize: '1.1rem', letterSpacing: '1px', fontFamily: 'monospace' }}>+{livePhone || senderPhone}</strong>
                  </p>
                </div>

                <div style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  maxWidth: '520px',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  textAlign: 'right',
                  fontSize: '0.82rem',
                  color: '#94a3b8'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700 }}>
                    <Check size={16} />
                    <span>الجلسة محفوظة ومؤمنة في السيرفر السحابي بشكل دائم.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 700 }}>
                    <Check size={16} />
                    <span>بطاقات العقود وسندات القبض الرقمية جاهزة للإرسال الفوري.</span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  style={{
                    marginTop: '8px',
                    padding: '10px 22px',
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.35))',
                    border: '1px solid #f59e0b',
                    borderRadius: '12px',
                    color: '#fbbf24',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.2)'
                  }}
                >
                  <RefreshCw size={16} className={isLoggingOut ? 'animate-spin' : ''} />
                  <span>{isLoggingOut ? 'جارِ تهيئة الرمز الجديد...' : '🔄 تغيير جهاز WhatsApp (ربط رقم جديد)'}</span>
                </button>
              </div>
            ) : (
              /* If Not Connected / Needs Pairing */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'center' }}>
                
                {/* Method Switcher & Inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', background: 'rgba(30, 41, 59, 0.8)', padding: '4px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <button
                      onClick={() => setPairingMethod('qr')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        border: 'none',
                        cursor: 'pointer',
                        background: pairingMethod === 'qr' ? '#10b981' : 'transparent',
                        color: pairingMethod === 'qr' ? '#050811' : '#cbd5e1',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      📱 مسح كود QR بالكاميرا
                    </button>
                    <button
                      onClick={() => setPairingMethod('pairCode')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        border: 'none',
                        cursor: 'pointer',
                        background: pairingMethod === 'pairCode' ? '#10b981' : 'transparent',
                        color: pairingMethod === 'pairCode' ? '#050811' : '#cbd5e1',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      ⚡ الاقتران برقم الجوال
                    </button>
                  </div>

                  {pairingMethod === 'qr' ? (
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      padding: '18px',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      fontSize: '0.82rem',
                      color: '#cbd5e1',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}>
                      <p style={{ fontWeight: 800, color: '#ffffff' }}>خطوات الربط عبر كود الـ QR:</p>
                      <ol style={{ paddingRight: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px', color: '#94a3b8' }}>
                        <li>افتح تطبيق <strong>WhatsApp</strong> على هاتف المؤسسة.</li>
                        <li>اذهب إلى <strong>الأجهزة المرتبطة</strong> (Linked Devices).</li>
                        <li>اضغط <strong>ربط جهاز</strong> وصوّب الكاميرا نحو الكود المجاور.</li>
                      </ol>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <SaudiPhoneInput
                        label="رقم جوال الواتساب للمنشأة:"
                        value={pairPhoneInput}
                        onChange={(val) => setPairPhoneInput(val)}
                      />
                      <button
                        onClick={handleRequestPairCode}
                        disabled={isRequestingPair || pairPhoneInput.length < 10}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#050811',
                          fontWeight: 900,
                          borderRadius: '12px',
                          border: 'none',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        {isRequestingPair ? 'جارِ التوليد...' : 'طلب كود الربط الرقمي (8 خانات)'}
                      </button>

                      {pairError && (
                        <p style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 700 }}>{pairError}</p>
                      )}

                      {generatedPairCode && (
                        <div style={{
                          padding: '16px',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          borderRadius: '14px',
                          textAlign: 'center'
                        }}>
                          <p style={{ fontSize: '0.8rem', color: '#34d399', marginBottom: '8px' }}>أدخل هذا الرمز المكون من 8 خانات في جوالك:</p>
                          <div style={{
                            fontSize: '1.6rem',
                            fontWeight: 900,
                            color: '#34d399',
                            letterSpacing: '4px',
                            fontFamily: 'monospace',
                            background: 'rgba(0,0,0,0.5)',
                            padding: '8px 12px',
                            borderRadius: '10px'
                          }}>
                            {generatedPairCode}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* QR Display Card */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '20px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '230px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)'
                }}>
                  {qrCodeBase64 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        background: '#ffffff',
                        padding: '10px',
                        borderRadius: '16px',
                        boxShadow: '0 0 25px rgba(245, 158, 11, 0.35)',
                        border: '3px solid #f59e0b'
                      }}>
                        <img src={qrCodeBase64} alt="WhatsApp QR Code" style={{ width: '130px', height: '130px', display: 'block', borderRadius: '8px' }} />
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#fbbf24', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⚡ كود المسح السريع — يتجدد تلقائياً</span>
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#94a3b8' }}>
                      <RefreshCw size={28} className="animate-spin" color="#34d399" />
                      <p style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>جارِ استخراج كود الـ QR من السيرفر السحابي...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Server Config & API Key Card */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(10, 15, 29, 0.95) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4)'
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px', marginBottom: '16px' }}>
              <Server size={18} color="#38bdf8" />
              <span>إعدادات رابط خادم المحرك ومفتاح الأمان (Server Configuration)</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  رابط خادم الواتساب المستقل (URL):
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="https://al-muhtaraz-whatsapp.onrender.com"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    direction: 'ltr',
                    textAlign: 'left',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  مفتاح الأمان السري (API Secret Key):
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="mhk_live_xxxxxxxx"
                    style={{
                      width: '100%',
                      padding: '10px 38px 10px 14px',
                      borderRadius: '12px',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      direction: 'ltr',
                      textAlign: 'left',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer'
                    }}
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  padding: '10px 24px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#050811',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                }}
              >
                <Check size={16} />
                <span>{isSaving ? 'جارِ الحفظ...' : saveSuccess ? 'تم الحفظ بنجاح ✓' : 'حفظ الإعدادات'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 🎛️ SECTION 2: ROUTING & AUTOMATION MATRIX ─── */}
      {activeSection === 'routing' && (
        <div style={{
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 29, 0.98) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.35)',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={22} color="#a855f7" />
              <span>مصفوفة التوجيه وقواعد الأتمتة التلقائية</span>
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '3px' }}>
              حدد مسارات الإشعارات وبطاقات العقود الرقمية التي يرسلها النظام آلياً فور حدوث أي إجراء
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            
            {/* Rule 1: Customer Digital Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', borderRadius: '12px' }}>
                  <FileText size={22} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff' }}>صورة بطاقة العقد وسند القبض للعميل</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.5 }}>
                    إرسال بطاقة العقد الرقمية الملونة (HD Image) كصورة مباشرة على واتساب العميل فور إصدار العقد.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyCustomerContract}
                onChange={(e) => setNotifyCustomerContract(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: '#38bdf8', cursor: 'pointer', marginTop: '4px' }}
              />
            </div>

            {/* Rule 2: Driver Mission */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', borderRadius: '12px' }}>
                  <Truck size={22} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff' }}>إشعار مهمة التنزيل وموقع GPS للسائق</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.5 }}>
                    توجيه رسالة مهمة فورية للسائق المخصص تشمل اسم العميل، رقم الحاوية، ورابط خرائط Google.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyDriverDispatch}
                onChange={(e) => setNotifyDriverDispatch(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: '#f59e0b', cursor: 'pointer', marginTop: '4px' }}
              />
            </div>

            {/* Rule 3: Admin Instant Alert */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', borderRadius: '12px' }}>
                  <Crown size={22} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff' }}>إشعار الإدارة الفوري والتقرير اليومي</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.5 }}>
                    إشعار جوال المدير العام فوراً بأي مبالغ كاش مستلمة أو عقود جديدة وملخص الإيرادات اليومية.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyAdminDailyReport}
                onChange={(e) => setNotifyAdminDailyReport(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: '#a855f7', cursor: 'pointer', marginTop: '4px' }}
              />
            </div>

            {/* Rule 4: Expiry Warning */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', borderRadius: '12px' }}>
                  <Clock size={22} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff' }}>تنبيه اقتراب موعد سحب الحاوية</h4>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.5 }}>
                    إشعار العميل قبل 24 ساعة من انتهاء العقد للتمديد أو الاستعداد لدخول رافعة المؤسسة وسحب الحاوية.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyCustomerExpiry}
                onChange={(e) => setNotifyCustomerExpiry(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: '#ef4444', cursor: 'pointer', marginTop: '4px' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── ⚡ SECTION 3: SANDBOX TEST LAB ─── */}
      {activeSection === 'sandbox' && (
        <div style={{
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 29, 0.98) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={22} color="#fbbf24" />
              <span>مختبر فحص واختبار الإرسال الحي (WhatsApp Sandbox)</span>
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '3px' }}>
              أرسل رسالة فورية لأي رقم هاتف للتحقق من سرعة وصول الرسائل واستجابة السيرفر
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <SaudiPhoneInput
                label="رقم الهاتف المستلم للتجربة:"
                value={testPhoneInput}
                onChange={(val) => setTestPhoneInput(val)}
              />

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '6px' }}>
                  نص الرسالة التجريبية:
                </label>
                <textarea
                  value={testMessageInput}
                  onChange={(e) => setTestMessageInput(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none',
                    lineHeight: 1.5
                  }}
                />
              </div>

              {/* Quick Template Chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setTestMessageInput('📄 مرحباً بك، مرفق سند قبض وعقد تأجير حاوية من مؤسسة المحترز رقم CTR-2026')}
                  style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem', cursor: 'pointer' }}
                >
                  + نموذج عقد
                </button>
                <button
                  type="button"
                  onClick={() => setTestMessageInput('🚚 مهمة جديدة: يرجى تنزيل الحاوية رقم C-104 في حي النرجس بالرياض')}
                  style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem', cursor: 'pointer' }}
                >
                  + نموذج سائق
                </button>
              </div>

              <button
                onClick={handleSendTest}
                disabled={isSendingTest || !testPhoneInput}
                style={{
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#050811',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
                }}
              >
                <SendHorizontal size={18} />
                <span>{isSendingTest ? 'جارِ إرسال الرسالة...' : 'إرسال الرسالة الآن ⚡'}</span>
              </button>

              {testResult && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  background: testResult.ok ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${testResult.ok ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                  color: testResult.ok ? '#34d399' : '#f87171',
                  fontSize: '0.82rem',
                  fontWeight: 800
                }}>
                  {testResult.msg}
                </div>
              )}
            </div>

            {/* Notification Activity Log */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '340px',
              overflowY: 'auto'
            }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={16} color="#34d399" />
                <span>سجل الإشعارات المرسلة حديثاً</span>
              </h4>

              {notifications.length === 0 ? (
                <p style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'center', margin: 'auto' }}>
                  لا توجد سجلات إرسال حتى الآن
                </p>
              ) : (
                notifications.slice(0, 8).map((n) => (
                  <div key={n.id} style={{
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <strong style={{ color: '#ffffff' }}>{(n.recipient_role as string) === 'driver' ? '🚚 سائق' : '👤 عميل'}:</strong> {n.recipient_phone}
                      <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>{(n as any).message_preview?.slice(0, 45)}...</div>
                    </div>
                    <span style={{ color: '#34d399', fontWeight: 800 }}>✓ أُرسلت</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 📖 SECTION 4: OPERATIONAL GUIDE ─── */}
      {activeSection === 'guide' && (
        <div style={{
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 29, 0.98) 100%)',
          border: '1px solid rgba(236, 72, 153, 0.35)',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={22} color="#ec4899" />
              <span>الدليل التشغيلي وخريطة الربط السحابي</span>
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '3px' }}>
              كيف يعمل المحرك السحابي على مدار الساعة دون الحاجة لإبقاء الكمبيوتر مفتوحاً
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            
            <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '18px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, marginBottom: '10px' }}>1</div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>استقرار الجلسة السحابية ☁️</h4>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                يتم حفظ جلسة الواتساب في قرص تخزين سحابي دائم على خادم Render، بحيث تظل الجلسة متصلة حتى لو أغلقت جهاز الكمبيوتر أو المتصفح.
              </p>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '18px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, marginBottom: '10px' }}>2</div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>إرسال الوسائط والبطاقات 🖼️</h4>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                يقوم النظام تلقائياً بتوليد صورة العقد الملونة وإرسالها مباشرة كـ Image Attachment مع رابط السند الإلكتروني الرسمي.
              </p>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '18px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, marginBottom: '10px' }}>3</div>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>حماية من التذبذب والتساقط 🛡️</h4>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>
                يطبق النظام فاصلاً زمنياً ذكياً (800ms) بين رسائل العميل والسائق والمدير لضمان وصول كافة الرسائل بنسبة 100% دون أي تعليق في المقبس.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
