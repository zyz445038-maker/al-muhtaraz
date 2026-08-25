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
  ChevronLeft
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
  const [testMessageInput, setTestMessageInput] = useState('السلام عليكم ورحمة الله، رسالة تجريبية من محرك مؤسسة المخترز للحاويات 🚛');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch Live Status on Mount & Poll (Dual: API Proxy + Direct Client-Side Fallback)
  const fetchLiveStatus = async () => {
    setIsCheckingLive(true);
    try {
      // 1. Try Next.js API Proxy
      let data: any = null;
      try {
        const res = await fetch(`/api/whatsapp/status?serverUrl=${encodeURIComponent(serverUrl)}&apiKey=${encodeURIComponent(apiKey)}`, {
          cache: 'no-store'
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch (proxyErr) {}

      // 2. If proxy didn't return connected or qr_ready, try direct client-side fetch to Addon server
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
      } else {
        setLiveStatus('disconnected');
      }
    } catch (e) {
      setLiveStatus('disconnected');
    } finally {
      setIsCheckingLive(false);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
    const interval = setInterval(fetchLiveStatus, 3000);
    return () => clearInterval(interval);
  }, [serverUrl, apiKey]);

  // Request 8-digit Pairing Code (Dual: API Proxy + Direct Client-Side Fallback)
  const handleRequestPairCode = async () => {
    if (!pairPhoneInput || pairPhoneInput.length < 8) {
      setPairError('يرجى إدخال رقم جوال صحيح (مثال: 0536971105 أو 966536971105)');
      return;
    }
    setIsRequestingPair(true);
    setPairError(null);
    setGeneratedPairCode(null);

    try {
      let code: string | null = null;

      // 1. Try Next.js API Proxy
      try {
        const res = await fetch('/api/whatsapp/pair-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: pairPhoneInput })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.code) {
            code = data.code;
          }
        }
      } catch (proxyErr) {}

      // 2. If proxy failed, try direct client-side call to Addon server
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
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      
      {/* ─── 🏆 HEADER & MAIN TITLE ─── */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400 shadow-inner">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-wide">مركز إدارة محرك الواتساب</h1>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  المحرك المستقل الموحد
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1">
                المنظومة المركزية الشاملة لإدارة الربط المباشر، قواعد الأتمتة التلقائية، وسندات القبض الإلكترونية
              </p>
            </div>
          </div>

          {/* Current Live Badge */}
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 border shadow-lg ${
              liveStatus === 'connected' 
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                : liveStatus === 'qr_ready'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              <span className={`w-3 h-3 rounded-full ${
                liveStatus === 'connected' ? 'bg-emerald-400 animate-ping' : liveStatus === 'qr_ready' ? 'bg-amber-400' : 'bg-slate-400'
              }`} />
              <span>
                {liveStatus === 'connected' ? `متصل: ${livePhone ? `+${livePhone}` : 'جاهز'}` : liveStatus === 'qr_ready' ? 'بانتظار المسح' : 'جارِ الفحص...'}
              </span>
            </div>

            <button
              onClick={fetchLiveStatus}
              disabled={isCheckingLive}
              title="تحديث الحالة الآن"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition shadow"
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingLive ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => setActiveSection('connection')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow ${
              activeSection === 'connection'
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>1. بوابة الاتصال والاقتران الحي</span>
          </button>

          <button
            onClick={() => setActiveSection('routing')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow ${
              activeSection === 'routing'
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>2. مصفوفة التوجيه وقواعد الأتمتة</span>
          </button>

          <button
            onClick={() => setActiveSection('sandbox')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow ${
              activeSection === 'sandbox'
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>3. مختبر فحص الإرسال المباشر</span>
          </button>

          <button
            onClick={() => setActiveSection('guide')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow ${
              activeSection === 'guide'
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>4. الدليل التشغيلي للمدير العام</span>
          </button>
        </div>
      </div>

      {/* ─── SECTION 1: LIVE CONNECTION & PAIRING GATEWAY ─── */}
      {activeSection === 'connection' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-emerald-400" />
                  <span>بوابة ربط ومصادقة الواتساب الحية</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  ربط رقم المنشأة مباشرة مع محرك Baileys المستقل لحفظ الجلسة وإرسال الرسائل تلقائياً
                </p>
              </div>

              {liveStatus === 'connected' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition shadow"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoggingOut ? 'animate-spin' : ''}`} />
                    <span>{isLoggingOut ? 'جارِ تهيئة الرمز الجديد...' : '🔄 تغيير جهاز WhatsApp'}</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition"
                    title="فصل الرقم الحالي وتعليق الإرسال التلقائي"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>فصل</span>
                  </button>
                </div>
              )}
            </div>

            {/* If Connected */}
            {liveStatus === 'connected' ? (
              <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-8 text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-500/50 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/10">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">المحرك متصل بنجاح وجاهز للعمل 🟢</h3>
                  <p className="text-slate-300 text-sm mt-1">
                    الرقم المرتبط حالياً: <span className="font-bold text-emerald-400 font-mono tracking-wider text-base">+{livePhone || senderPhone}</span>
                  </p>
                </div>
                <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl max-w-md mx-auto text-xs text-slate-400 text-right space-y-2">
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                    <Check className="w-4 h-4" />
                    <span>الجلسة محفوظة ومؤمنة في السيرفر بشكل دائم</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                    <Check className="w-4 h-4" />
                    <span>المساعد الذكي ونظام العقود ينفذان الإرسال الصامت التلقائي</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-300 border border-amber-500/50 rounded-xl text-xs font-bold transition shadow-lg"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoggingOut ? 'animate-spin' : ''}`} />
                    <span>{isLoggingOut ? 'جارِ تهيئة الرمز الجديد...' : '🔄 تغيير جهاز WhatsApp (ربط رقم جديد)'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* If Not Connected / Needs Pairing */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Method Switcher & Inputs */}
                <div className="space-y-4">
                  <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
                    <button
                      onClick={() => setPairingMethod('qr')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                        pairingMethod === 'qr' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      📱 مسح كود QR بالكاميرا
                    </button>
                    <button
                      onClick={() => setPairingMethod('pairCode')}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                        pairingMethod === 'pairCode' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      ⚡ الاقتران برقم الجوال (بدون كاميرا)
                    </button>
                  </div>

                  {pairingMethod === 'qr' ? (
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                      <p className="font-bold text-white">خطوات الربط عبر كود الـ QR:</p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-400">
                        <li>افتح تطبيق <strong>WhatsApp</strong> على الهاتف.</li>
                        <li>اذهب إلى <strong>الأجهزة المرتبطة</strong> (Linked Devices).</li>
                        <li>اضغط <strong>ربط جهاز</strong> وصوّب الكاميرا نحو الكود المجاور.</li>
                      </ol>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <SaudiPhoneInput
                        label="رقم جوال الواتساب للمنشأة:"
                        value={pairPhoneInput}
                        onChange={(val) => setPairPhoneInput(val)}
                      />
                      <button
                        onClick={handleRequestPairCode}
                        disabled={isRequestingPair || pairPhoneInput.length < 10}
                        className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition shadow"
                      >
                        {isRequestingPair ? 'جارِ التوليد...' : 'طلب كود الربط الرقمي (8 خانات)'}
                      </button>

                      {pairError && (
                        <p className="text-xs text-red-400 font-bold">{pairError}</p>
                      )}

                      {generatedPairCode && (
                        <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-center space-y-2">
                          <p className="text-xs text-emerald-300">أدخل هذا الرمز المكون من 8 خانات في جوالك:</p>
                          <div className="text-2xl font-black text-emerald-400 tracking-widest font-mono bg-slate-950 py-2 rounded-lg border border-emerald-500/30">
                            {generatedPairCode}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* QR Display Area */}
                <div className="bg-slate-900/90 border border-amber-500/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[220px] shadow-lg shadow-amber-500/5">
                  {qrCodeBase64 ? (
                    <div className="space-y-2.5 flex flex-col items-center">
                      <div className="bg-white p-2.5 rounded-xl shadow-lg border-2 border-emerald-500/40 inline-block">
                        <img src={qrCodeBase64} alt="QR Code" className="w-32 h-32 block rounded-lg object-contain" />
                      </div>
                      <p className="text-xs text-amber-400 font-bold flex items-center gap-1">
                        <span>⚡ كود المسح السريع — يتجدد تلقائياً</span>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 text-slate-400">
                      <RefreshCw className="w-6 h-6 mx-auto animate-spin text-emerald-400" />
                      <p className="text-xs text-slate-300 font-medium">جارِ توليد كود الـ QR من السيرفر السحابي...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Server Config & API Key Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>إعدادات رابط خادم المحرك ومفتاح الأمان (Server Configuration)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">رابط خادم الواتساب المستقل (URL):</label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://localhost:5050"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 outline-none text-left"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">مفتاح الأمان السري (API Secret Key):</label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="mhk_wa_live_xxxxxxxxxxxx"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 outline-none text-left pr-10"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'جارِ الحفظ...' : saveSuccess ? 'تم الحفظ بنجاح ✓' : 'حفظ الإعدادات'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION 2: ROUTING & AUTOMATION MATRIX ─── */}
      {activeSection === 'routing' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              <span>مصفوفة التوجيه وقواعد الأتمتة التلقائية</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              حدد المهام والأحداث التي يقوم فيها النظام بالإرسال التلقائي الصامت عبر محرك الواتساب
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rule 1: Contract to Customer */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">إرسال العقد وسند القبض للمستأجر</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    إرسال رسالة توثيق فورية للعميل برقم العقد ورابط سند القبض الإلكتروني فور الحفظ.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyCustomerContract}
                onChange={(e) => setNotifyCustomerContract(e.target.checked)}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer mt-1"
              />
            </div>

            {/* Rule 2: Driver Task Dispatch */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg mt-0.5">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">إسناد مهام التنزيل والسحب للسائقين</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    إرسال تفاصيل الحاوية ورقم جوال العميل ورابط موقع التنزيل على Google Maps للسائق.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyDriverDispatch}
                onChange={(e) => setNotifyDriverDispatch(e.target.checked)}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer mt-1"
              />
            </div>

            {/* Rule 3: Contract Expiry Alerts */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-orange-500/10 text-orange-400 rounded-lg mt-0.5">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">تنبيهات قرب انتهاء عقود الحاويات</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    تنبيه المستأجر تلقائياً قبل انتهاء فترة الإيجار بـ 24 ساعة للتجديد أو جدولة السحب.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyCustomerExpiry}
                onChange={(e) => setNotifyCustomerExpiry(e.target.checked)}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer mt-1"
              />
            </div>

            {/* Rule 4: Admin Daily Briefing */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg mt-0.5">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">إرسال التقرير التنفيذي اليومي للمدير</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    إرسال ملخص الإيرادات والمصروفات وحالة الحاويات يومياً إلى واتساب المدير العام.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={notifyAdminDailyReport}
                onChange={(e) => setNotifyAdminDailyReport(e.target.checked)}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer mt-1"
              />
            </div>
          </div>

          {/* Phones Settings */}
          {/* Phones Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
            <SaudiPhoneInput
              label="رقم جوال المؤسسة الرسمي المرسل:"
              value={senderPhone}
              onChange={(val) => setSenderPhone(val)}
            />

            <SaudiPhoneInput
              label="رقم جوال المدير العام (أبو ماجد) لاستلام التقارير:"
              value={adminPhone}
              onChange={(val) => setAdminPhone(val)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'جارِ الحفظ...' : saveSuccess ? 'تم حفظ القواعد بنجاح ✓' : 'حفظ قواعد الأتمتة'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── SECTION 3: LIVE TEST & SANDBOX ─── */}
      {activeSection === 'sandbox' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              <span>مختبر فحص واختبار الإرسال المباشر</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              إجراء تجربة إرسال رسالة فورية للتأكد من وصول رسائل الواتساب الصامتة إلى أجهزة العملاء
            </p>
          </div>

          <div className="space-y-4 max-w-xl">
            <SaudiPhoneInput
              label="رقم هاتف المستلم للتجربة:"
              value={testPhoneInput}
              onChange={(val) => setTestPhoneInput(val)}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">نص الرسالة التجريبية:</label>
              <textarea
                value={testMessageInput}
                onChange={(e) => setTestMessageInput(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none"
              />
            </div>

            <button
              onClick={handleSendTest}
              disabled={isSendingTest || liveStatus !== 'connected'}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm transition shadow flex items-center gap-2"
            >
              <SendHorizontal className="w-4 h-4" />
              <span>{isSendingTest ? 'جارِ الإرسال في الخلفية...' : 'إرسال رسالة الفحص الآن 🚀'}</span>
            </button>

            {testResult && (
              <div className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                testResult.ok ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40' : 'bg-red-950/40 text-red-300 border-red-500/40'
              }`}>
                {testResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{testResult.msg}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── SECTION 4: EXECUTIVE OPERATIONAL GUIDE ─── */}
      {activeSection === 'guide' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <span>الدليل التشغيلي الشامل للمدير العام (أبو ماجد)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              شرح مبسط لكيفية عمل المنظومة من الألف إلى الياء وطرق الاستفادة من محرك الواتساب المدمج
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-2">
              <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center font-bold text-lg">
                1
              </div>
              <h3 className="font-bold text-white text-sm">توثيق العقود والتأجير</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                بمجرد إدخال بيانات المستأجر ومقاس الحاوية والضغط على حفظ، يقوم النظام في ثانية واحدة بإصدار رقم العقد وسند القبض وإرسالهما كرسالة واتساب رسمية للعميل.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-2">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-lg flex items-center justify-center font-bold text-lg">
                2
              </div>
              <h3 className="font-bold text-white text-sm">توجيه السائقين والمواقع</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                من لوحة الحاويات، عند إسناد مهمة تنزيل أو سحب لسائق الشاحنة، يصله إشعار واتساب يتضمن رقم الحاوية ورابط موقع التنزيل عبر Google Maps ورقم العميل للتنسيق.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-2">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center font-bold text-lg">
                3
              </div>
              <h3 className="font-bold text-white text-sm">المساعد الذكي والتقارير</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                في أي وقت، يمكنك فتح المساعد الذكي وطلب تقرير الدخل أو الحاويات المنتهية، أو أمره بإرسال التقرير اليومي إلى رقمك في الواتساب بضغطة زر واحدة.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
