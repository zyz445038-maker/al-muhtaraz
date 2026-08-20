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
  Smartphone
} from 'lucide-react';
import { WhatsAppSettings as IWhatsAppSettings, WhatsAppMode, NotificationLog } from '@/types/database';

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
  // Mode selection state: 'evolution' or 'wame'
  const [mode, setMode] = useState<WhatsAppMode>(settings.mode || 'evolution');

  // Option 1: Evolution API State
  const [evolutionServerUrl, setEvolutionServerUrl] = useState(settings.evolution_server_url || 'http://localhost:8080');
  const [evolutionInstanceName, setEvolutionInstanceName] = useState(settings.evolution_instance_name || 'muhtaraz-instance');
  const [evolutionApiKey, setEvolutionApiKey] = useState(settings.evolution_api_key || '123456');

  // Common State
  const [senderPhone, setSenderPhone] = useState(settings.sender_phone || '+966920001234');
  const [adminPhone, setAdminPhone] = useState(settings.admin_phone || '+966500000001');
  const [isConnected, setIsConnected] = useState(settings.is_connected ?? false);
  const [autoSendEnabled, setAutoSendEnabled] = useState(settings.auto_send_enabled ?? true);
  const [showApiKey, setShowApiKey] = useState(false);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isCopiedDocker, setIsCopiedDocker] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'templates' | 'logs'>('config');

  // Live status / QR fetching state
  const [isCheckingLiveStatus, setIsCheckingLiveStatus] = useState(false);
  const [liveQrCode, setLiveQrCode] = useState<string | null>(null);
  const [liveStatusText, setLiveStatusText] = useState<string | null>(null);

  const dockerCommand = `docker run -d --name evolution-api -p 8080:8080 -e AUTHENTICATION_API_KEY=${evolutionApiKey || '123456'} evoapicloud/evolution-api:latest`;

  const handleCopyDocker = () => {
    navigator.clipboard.writeText(dockerCommand);
    setIsCopiedDocker(true);
    setTimeout(() => setIsCopiedDocker(false), 2500);
  };

  // Check live status on load or on button click
  const checkLiveStatus = async () => {
    setIsCheckingLiveStatus(true);
    try {
      const res = await fetch(`/api/whatsapp/status?serverUrl=${encodeURIComponent(evolutionServerUrl)}&instance=${encodeURIComponent(evolutionInstanceName)}&apiKey=${encodeURIComponent(evolutionApiKey)}`);
      const data = await res.json();
      if (data.status === 'connected') {
        setIsConnected(true);
        setLiveStatusText('🟢 متصل بنجاح وجاهز للإرسال الصامت');
      } else if (data.status === 'qr_ready') {
        setIsConnected(false);
        setLiveQrCode(data.qrCodeBase64 || null);
        setLiveStatusText('📱 كود QR جاهز للاقتران');
      } else {
        setIsConnected(false);
        setLiveStatusText(data.message || '🔴 السيرفر غير متصل');
      }
    } catch (err: any) {
      setLiveStatusText('🔴 تعذر الاتصال بالخادم المحلي');
    } finally {
      setIsCheckingLiveStatus(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    const updated: IWhatsAppSettings = {
      ...settings,
      mode,
      evolution_server_url: evolutionServerUrl,
      evolution_instance_name: evolutionInstanceName,
      evolution_api_key: evolutionApiKey,
      sender_phone: senderPhone,
      admin_phone: adminPhone,
      is_connected: isConnected,
      auto_send_enabled: autoSendEnabled,
      updated_at: new Date().toISOString()
    };

    // Save to localStorage as well for instant persistent restore
    try {
      localStorage.setItem('muhtaraz_whatsapp_settings', JSON.stringify(updated));
    } catch (err) {}

    const ok = await onSaveSettings(updated);
    setIsSaving(false);
    if (ok) {
      setTestResult({ ok: true, msg: '✅ تم حفظ إعدادات محرك الواتساب والأرقام الأساسية بنجاح!' });
      setTimeout(() => setTestResult(null), 4000);
    }
  };

  const handleTest = async () => {
    const targetPhone = adminPhone || senderPhone;
    if (!targetPhone) {
      setTestResult({ ok: false, msg: 'يرجى تحديد رقم جوال المدير أو رقم المنشأة لاستقبال الرسالة التجريبية.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: targetPhone,
          message: `✅ رسالة اختبار محرك الواتساب — مؤسسة المحترز للحاويات\n\n🕒 التوقيت: ${new Date().toLocaleTimeString('ar-SA')}\n📡 حالة البوابة: تعمل بنجاح 🚀`,
          recipient_role: 'admin',
          notification_type: 'custom_alert'
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsConnected(true);
        setTestResult({ ok: true, msg: `✅ تم الاتصال بنجاح وإرسال رسالة تجريبية إلى الرقم (${targetPhone})!` });
      } else {
        setTestResult({ ok: false, msg: `❌ ${data.error || 'تعذر الإرسال. تأكد من تشغيل خادم Evolution API واقتران الرقم.'}` });
      }
    } catch (err: any) {
      setTestResult({ ok: false, msg: `❌ خطأ في الاتصال: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDirectClickSend = (phone: string, message: string, notifId?: string) => {
    onSendWhatsApp(phone, message);
    if (notifId && onMarkAsSent) {
      onMarkAsSent(notifId);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1150px', margin: '0 auto' }}>
      
      {/* 1. Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(15, 23, 42, 0.8))',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '20px',
        padding: '24px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#34d399', fontSize: '0.85rem', fontWeight: '800', marginBottom: '6px' }}>
            <Sparkles size={16} />
            <span>محرك إشعارات الواتساب الأوتوماتيكي المجاني 100% (0 ريال)</span>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#ffffff', margin: 0 }}>
            إعدادات ومحرك الواتساب (WhatsApp Engine Hub) 📱
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '4px', marginBottom: 0 }}>
            إرسال آلي صامت للعميل والسائق بمجرد توثيق أو تمديد العقد دون أي تدخل يدوي
          </p>
        </div>

        {/* Live Status Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: isConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${isConnected ? 'rgba(52, 211, 153, 0.4)' : 'rgba(239, 68, 68, 0.3)'}`,
          padding: '10px 18px',
          borderRadius: '14px'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: isConnected ? '#10b981' : '#ef4444',
            boxShadow: isConnected ? '0 0 12px #10b981' : '0 0 8px #ef4444'
          }} />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: isConnected ? '#34d399' : '#f87171' }}>
              {isConnected ? 'الواتساب متصل ويعمل 🟢' : 'الواتساب غير متصل 🔴'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {mode === 'evolution' ? 'محاكي Evolution API' : 'نظام wa.me المباشر'}
            </div>
          </div>
          <button
            type="button"
            onClick={checkLiveStatus}
            disabled={isCheckingLiveStatus}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              color: '#ffffff',
              cursor: 'pointer'
            }}
            title="فحص فوري للاتصال"
          >
            <RefreshCw size={14} style={{ animation: isCheckingLiveStatus ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* 2. Top Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('config')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            background: activeTab === 'config' ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'config' ? '#050811' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Server size={16} />
          <span>إعدادات الربط وأرقام المنشأة</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            background: activeTab === 'templates' ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'templates' ? '#050811' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <MessageSquare size={16} />
          <span>نماذج الرسائل التلقائية (العميل والسائق)</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            background: activeTab === 'logs' ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'logs' ? '#050811' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Clock size={16} />
          <span>سجل الرسائل المرسلة ({notifications.length})</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: CONFIGURATION & NUMBERS
          ========================================================================= */}
      {activeTab === 'config' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* Main Primary Numbers Box */}
          <div className="glass-panel" style={{ padding: '24px', borderRight: '4px solid #3b82f6' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#60a5fa', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Smartphone size={20} />
              <span>أرقام الواتساب الأساسية التي تحرك التطبيق:</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>
                  📞 رقم الواتساب الأساسي للمنشأة (المُرسِل):
                </label>
                <input
                  type="tel"
                  className="form-input"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="+966920001234 أو +966500000000"
                  style={{ direction: 'ltr', textAlign: 'left', fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  الرقم الذي يظهر في ترويسة العقود وسندات القبض ورسائل العملاء
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#fbbf24' }}>
                  👑 رقم جوال المدير العام (لاستلام التقارير والتنبيهات):
                </label>
                <input
                  type="tel"
                  className="form-input"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="+966500000001"
                  style={{ direction: 'ltr', textAlign: 'left', fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  يستقبل تنبيهات سداد المبالغ الكبيرة والأعطال وحالات الطوارئ
                </span>
              </div>
            </div>
          </div>

          {/* 2 Main Choice Modes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Mode 1: Evolution API */}
            <div 
              onClick={() => {
                setMode('evolution');
                setAutoSendEnabled(true);
              }}
              className="glass-panel"
              style={{
                padding: '22px',
                cursor: 'pointer',
                border: `2px solid ${mode === 'evolution' ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}`,
                background: mode === 'evolution' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.6)',
                boxShadow: mode === 'evolution' ? '0 0 30px rgba(16, 185, 129, 0.25)' : 'none',
                borderRadius: '18px',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: mode === 'evolution' ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Server size={24} color={mode === 'evolution' ? '#050811' : '#cbd5e1'} />
                </div>

                <span style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  background: mode === 'evolution' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  color: mode === 'evolution' ? '#34d399' : '#94a3b8'
                }}>
                  {mode === 'evolution' ? '✓ الوضع المعتمد' : 'اختيار'}
                </span>
              </div>

              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: mode === 'evolution' ? '#34d399' : '#ffffff' }}>
                  الخيار 1: المحاكي المحلي / السحابي - Evolution API
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', lineHeight: '1.5' }}>
                  <strong>إرسال تلقائي صامت 100% (0 ريال)</strong> بدون فتح أي نوافذ متصفح. يرسل للعميل والسائق فوراً في الخلفية.
                </p>
              </div>
            </div>

            {/* Mode 2: wa.me Direct Click */}
            <div 
              onClick={() => {
                setMode('wame');
                setAutoSendEnabled(false);
              }}
              className="glass-panel"
              style={{
                padding: '22px',
                cursor: 'pointer',
                border: `2px solid ${mode === 'wame' ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)'}`,
                background: mode === 'wame' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(15, 23, 42, 0.6)',
                boxShadow: mode === 'wame' ? '0 0 30px rgba(245, 158, 11, 0.25)' : 'none',
                borderRadius: '18px',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: mode === 'wame' ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Zap size={24} color={mode === 'wame' ? '#050811' : '#cbd5e1'} />
                </div>

                <span style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  background: mode === 'wame' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  color: mode === 'wame' ? '#fbbf24' : '#94a3b8'
                }}>
                  {mode === 'wame' ? '✓ الوضع المعتمد' : 'اختيار'}
                </span>
              </div>

              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: mode === 'wame' ? '#fbbf24' : '#ffffff' }}>
                  الخيار 2: الروابط الذكية السريعة - wa.me
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px', lineHeight: '1.5' }}>
                  <strong>بدون أي سيرفرات أو برامج إضافية</strong>. تظهر العقود بأزرار سريعة تفتح تطبيق الواتساب بنقرة واحدة والرسالة مكتوبة بالكامل.
                </p>
              </div>
            </div>

          </div>

          {/* Detailed Gateway Settings Form */}
          {mode === 'evolution' && (
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#10b981', margin: 0 }}>
                  ⚙️ حقول ربط خادم Evolution API (محلي أو سحابي مجاني):
                </h4>

                <button
                  type="button"
                  onClick={() => {
                    setShowQrModal(true);
                    checkLiveStatus();
                  }}
                  className="btn-emerald"
                  style={{ padding: '7px 16px', fontSize: '0.82rem' }}
                >
                  <QrCode size={16} />
                  <span>فتح نافذة ربط QR Code</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>
                    🌐 رابط السيرفر (Server URL):
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={evolutionServerUrl}
                    onChange={(e) => setEvolutionServerUrl(e.target.value)}
                    placeholder="http://localhost:8080 أو https://your-app.onrender.com"
                    style={{ direction: 'ltr', textAlign: 'left', fontSize: '0.85rem' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>
                    📱 اسم الجلسة (Instance):
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={evolutionInstanceName}
                    onChange={(e) => setEvolutionInstanceName(e.target.value)}
                    placeholder="muhtaraz-instance"
                    style={{ direction: 'ltr', textAlign: 'left', fontSize: '0.85rem' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>
                    🔑 المفتاح السري (API Key):
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      className="form-input"
                      value={evolutionApiKey}
                      onChange={(e) => setEvolutionApiKey(e.target.value)}
                      placeholder="123456"
                      style={{ direction: 'ltr', textAlign: 'left', fontSize: '0.85rem', paddingLeft: '36px' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Docker One-Click Box */}
              <div style={{
                background: '#040711',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, marginBottom: '4px' }}>
                    🐳 أمر التشغيل المحلي السريع (Docker Desktop):
                  </div>
                  <code style={{ fontSize: '0.78rem', color: '#34d399', fontFamily: 'monospace', direction: 'ltr', textAlign: 'left', display: 'block' }}>
                    {dockerCommand}
                  </code>
                </div>

                <button
                  type="button"
                  onClick={handleCopyDocker}
                  style={{
                    background: isCopiedDocker ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    color: isCopiedDocker ? '#050811' : '#ffffff',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    flexShrink: 0
                  }}
                >
                  {isCopiedDocker ? <Check size={14} /> : <Copy size={14} />}
                  <span>{isCopiedDocker ? 'تم النسخ' : 'نسخ الأمر'}</span>
                </button>
              </div>

            </div>
          )}

          {/* Feedback alert */}
          {testResult && (
            <div style={{
              padding: '12px 18px',
              borderRadius: '12px',
              fontSize: '0.9rem',
              fontWeight: 700,
              background: testResult.ok ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: testResult.ok ? '#34d399' : '#f87171',
              border: `1px solid ${testResult.ok ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}>
              {testResult.msg}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', paddingTop: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleTest}
              disabled={isTesting}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Send size={16} />
              <span>{isTesting ? 'جارٍ الإرسال الفعلي...' : 'إرسال رسالة تجريبية لرقم الإدارة'}</span>
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={() => handleSave()}
              disabled={isSaving}
              style={{ minWidth: '180px', padding: '10px 24px', fontSize: '0.95rem' }}
            >
              <ShieldCheck size={18} />
              <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ وتثبيت الإعدادات'}</span>
            </button>
          </div>

        </div>
      )}

      {/* =========================================================================
          TAB 2: AUTOMATIC DISPATCH TEMPLATES PREVIEW
          ========================================================================= */}
      {activeTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
            هذه الرسائل يولدها النظام تلقائياً ويرسلها للعميل وللسائق المكلّف فور الضغط على "حفظ العقد" أو "تمديد العقد":
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Customer Template Card */}
            <div className="glass-panel" style={{ padding: '22px', borderRight: '4px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <User size={20} color="#10b981" />
                <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#34d399', margin: 0 }}>
                  رسالة العميل (تأكيد العقد والسند)
                </h4>
              </div>

              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '0.85rem',
                color: '#e2e8f0',
                lineHeight: 1.7,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontFamily: 'system-ui, sans-serif'
              }}>
                مرحباً <strong>[اسم العميل]</strong>،<br />
                تم توثيق عقدك رقم <strong>(CNT-2026-XXXX)</strong> بنجاح لدى مؤسسة المحترز للحاويات 🏗️.<br />
                📦 رقم الحاوية: <strong>C-101</strong> (تجارية مغلقة)<br />
                💰 المبلغ الإجمالي: <strong>3500 ر.س</strong><br />
                🧾 رابط السند الإلكتروني مع كود QR:<br />
                <span style={{ color: '#38bdf8', textDecoration: 'underline' }}>https://almuhtaraz.com/receipt/RCP-2026-XXXX</span><br />
                شكراً لثقتكم بنا.
              </div>
            </div>

            {/* Driver Template Card */}
            <div className="glass-panel" style={{ padding: '22px', borderRight: '4px solid #38bdf8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <UserCheck size={20} color="#38bdf8" />
                <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#38bdf8', margin: 0 }}>
                  رسالة السائق (مهمة التنزيل والموقع الجغرافي)
                </h4>
              </div>

              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '0.85rem',
                color: '#e2e8f0',
                lineHeight: 1.7,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                fontFamily: 'system-ui, sans-serif'
              }}>
                🚛 <strong>مهمة تنزيل حاوية جديدة</strong><br />
                عقد رقم: <strong>CNT-2026-XXXX</strong><br />
                رقم الحاوية المطلوبة: <strong>C-101</strong><br />
                العميل: <strong>محمد القحطاني</strong> (050XXXXXXX)<br />
                📍 موقع التنزيل الدقيق على الخريطة:<br />
                <span style={{ color: '#38bdf8', textDecoration: 'underline' }}>https://maps.google.com/?q=24.7136,46.6753</span><br />
                ⏰ موعد التسليم: اليوم قبل الساعة 4:00 عصراً.
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: LOGS TABLE
          ========================================================================= */}
      {activeTab === 'logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff', margin: 0 }}>
              سجل الرسائل والإشعارات المسجلة ({notifications.length})
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.map((item, idx) => (
              <div
                key={item.id || idx}
                className="glass-panel"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  borderRight: `4px solid ${item.recipient_role === 'customer' ? '#10b981' : '#38bdf8'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      background: item.recipient_role === 'customer' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(14, 165, 233, 0.15)',
                      color: item.recipient_role === 'customer' ? '#34d399' : '#38bdf8'
                    }}>
                      {item.recipient_role === 'customer' ? '👤 العميل' : '🚛 السائق'}
                    </span>
                    <strong style={{ color: '#ffffff', fontSize: '0.9rem' }}>{item.recipient_name || 'مستلم'}</strong>
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem', direction: 'ltr' }}>{item.recipient_phone}</span>
                  </div>

                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: item.status === 'sent' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: item.status === 'sent' ? '#34d399' : '#fbbf24'
                  }}>
                    {item.status === 'sent' ? '✓ تم الإرسال' : '⏳ مجدول'}
                  </span>
                </div>

                <div style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  color: '#cbd5e1'
                }}>
                  {item.message_body}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleDirectClickSend(item.recipient_phone, item.message_body, item.id)}
                    className="btn-secondary"
                    style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                  >
                    <ExternalLink size={12} />
                    <span>إعادة إرسال عبر wa.me</span>
                  </button>
                </div>
              </div>
            ))}

            {notifications.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                <MessageSquare size={36} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.4 }} />
                <div>لا توجد رسائل مسجلة حالياً</div>
                <div style={{ fontSize: '0.8rem' }}>ستظهر الرسائل هنا تلقائياً عند حفظ العقود</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          LIVE QR CODE MODAL
          ========================================================================= */}
      {showQrModal && (
        <div className="modal-backdrop" onClick={() => setShowQrModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '28px', maxWidth: '440px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#ffffff', marginBottom: '8px' }}>
              اقتران الواتساب (Scan QR Code) 📱
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '18px', lineHeight: 1.5 }}>
              افتح تطبيق واتساب على جوال المنشأة &larr; الإعدادات &larr; الأجهزة المرتبطة &larr; ربط جهاز:
            </p>

            {/* QR Frame */}
            <div style={{
              width: '240px',
              height: '240px',
              margin: '0 auto 18px auto',
              background: '#ffffff',
              borderRadius: '20px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 40px rgba(16, 185, 129, 0.35)',
              position: 'relative'
            }}>
              {liveQrCode ? (
                <img src={liveQrCode.startsWith('data:') ? liveQrCode : `data:image/png;base64,${liveQrCode}`} alt="WhatsApp QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <QrCode size={190} color="#050811" />
              )}
            </div>

            <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: 700, marginBottom: '18px' }}>
              {liveStatusText || `🟢 جاهز للاقتران بالجلسة (${evolutionInstanceName})`}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={checkLiveStatus}
                disabled={isCheckingLiveStatus}
              >
                <RefreshCw size={14} style={{ animation: isCheckingLiveStatus ? 'spin 1s linear infinite' : 'none' }} />
                <span>تحديث الكود</span>
              </button>

              <button
                type="button"
                className="btn-emerald"
                style={{ flex: 1.5 }}
                onClick={() => {
                  setIsConnected(true);
                  setShowQrModal(false);
                  alert('تم حفظ وتأكيد اتصال الواتساب بنجاح 🟢!');
                }}
              >
                <CheckCircle2 size={16} />
                <span>تم الاقتران بنجاح</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
