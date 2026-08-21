'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Send, Clock, CheckCircle2, AlertCircle, User, Phone,
  Sparkles, ExternalLink, Filter, Settings, Zap, Server, Key, Radio,
  RefreshCw, ShieldCheck, Info, ToggleLeft, ToggleRight, ChevronDown,
  ChevronUp, Copy, Check, Eye, EyeOff, Wifi, WifiOff, QrCode, Bot
} from 'lucide-react';
import { NotificationLog, NotificationType, RecipientRole } from '@/types/database';

interface WhatsAppHubProps {
  notifications: NotificationLog[];
  onMarkAsSent: (notificationId: string) => Promise<void>;
  onSendWhatsApp: (phone: string, message: string) => void;
  gatewaySettings?: {
    mode?: 'evolution' | 'wame';
    evolution_server_url?: string;
    evolution_instance_name?: string;
    evolution_api_key?: string;
    sender_phone?: string;
    admin_phone?: string;
    is_connected?: boolean;
    auto_send_enabled?: boolean;
  };
  onSaveGatewaySettings?: (s: any) => Promise<boolean>;
  onTestConnection?: (phone: string) => Promise<boolean>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getNotificationBadge(type: NotificationType) {
  switch (type) {
    case 'debris_pickup_4h':       return { label: '⏰ سحب أنقاض (4 ساعات)', color: '#fbbf24', bg: 'rgba(245,158,11,0.15)' };
    case 'commercial_7d_before':   return { label: '📅 تجاري (قبل 7 أيام)', color: '#a5b4fc', bg: 'rgba(99,102,241,0.15)' };
    case 'commercial_2d_before':   return { label: '🔴 تجاري حرج (يومان)', color: '#f87171', bg: 'rgba(239,68,68,0.15)' };
    case 'contract_created':       return { label: '✅ توثيق عقد جديد', color: '#34d399', bg: 'rgba(16,185,129,0.15)' };
    default:                       return { label: '📣 تنبيه مخصص', color: '#38bdf8', bg: 'rgba(14,165,233,0.15)' };
  }
}

// ─── Section Toggle Card ──────────────────────────────────────────────────────
const Section: React.FC<{ title: string; icon: React.ReactNode; color: string; children: React.ReactNode; defaultOpen?: boolean }> = ({
  title, icon, color, children, defaultOpen = true
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: 'rgba(15,23,42,0.7)', border: `1px solid ${color}30`,
      borderRadius: '14px', overflow: 'hidden', marginBottom: '0'
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: `${color}10`, border: 'none', cursor: 'pointer',
          borderBottom: open ? `1px solid ${color}20` : 'none'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color, fontWeight: 700, fontSize: '0.95rem' }}>
          {icon} {title}
        </span>
        {open ? <ChevronUp size={16} color={color} /> : <ChevronDown size={16} color={color} />}
      </button>
      {open && <div style={{ padding: '20px' }}>{children}</div>}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const WhatsAppHub: React.FC<WhatsAppHubProps> = ({
  notifications,
  onMarkAsSent,
  onSendWhatsApp,
  gatewaySettings,
  onSaveGatewaySettings,
  onTestConnection
}) => {
  // ── Connection Settings State ───────────────────────────────────────────────
  const [mode, setMode]         = useState<'evolution' | 'wame'>(gatewaySettings?.mode || 'evolution');
  const [serverUrl, setServerUrl]   = useState(gatewaySettings?.evolution_server_url || 'http://localhost:8080');
  const [instanceName, setInstance] = useState(gatewaySettings?.evolution_instance_name || 'muhtaraz-instance');
  const [apiKey, setApiKey]         = useState(gatewaySettings?.evolution_api_key || '');
  const [senderPhone, setSenderPhone] = useState(gatewaySettings?.sender_phone || '');
  const [adminPhone, setAdminPhone]   = useState(gatewaySettings?.admin_phone || '');
  const [autoSend, setAutoSend]       = useState(gatewaySettings?.auto_send_enabled ?? true);
  const [isConnected, setIsConnected] = useState(gatewaySettings?.is_connected ?? false);
  const [showApiKey, setShowApiKey]   = useState(false);
  const [copied, setCopied]           = useState(false);

  // ── Test / Save ─────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving]   = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saveMsg, setSaveMsg]       = useState<string | null>(null);

  // ── Notification Filters ────────────────────────────────────────────────────
  const [filterRole, setFilterRole]     = useState<'all' | RecipientRole>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'sent'>('all');
  const [testPhone, setTestPhone]       = useState('');

  // ── Manual Send ─────────────────────────────────────────────────────────────
  const [manualPhone, setManualPhone]   = useState('');
  const [manualMsg, setManualMsg]       = useState('');
  const [sendingManual, setSendingManual] = useState(false);
  const [manualResult, setManualResult]   = useState<{ ok: boolean; msg: string } | null>(null);

  const filteredNotifications = notifications.filter(n => {
    if (filterRole !== 'all' && n.recipient_role !== filterRole) return false;
    if (filterStatus !== 'all' && n.status !== filterStatus) return false;
    return true;
  });

  const handleSendAndMark = async (n: NotificationLog) => {
    // Try silent API first, fall back to wa.me
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: n.recipient_phone, message: n.message_body })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    } catch {
      onSendWhatsApp(n.recipient_phone, n.message_body);
    }
    await onMarkAsSent(n.id);
  };

  const handleSave = async () => {
    if (!onSaveGatewaySettings) return;
    setIsSaving(true);
    const ok = await onSaveGatewaySettings({
      mode, evolution_server_url: serverUrl, evolution_instance_name: instanceName,
      evolution_api_key: apiKey, sender_phone: senderPhone, admin_phone: adminPhone,
      auto_send_enabled: autoSend, is_connected: isConnected
    });
    setIsSaving(false);
    setSaveMsg(ok ? '✅ تم حفظ الإعدادات بنجاح' : '❌ فشل الحفظ');
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const phone = testPhone || senderPhone || adminPhone;
    if (!phone) { setTestResult({ ok: false, msg: 'أدخل رقم هاتف للاختبار' }); setIsTesting(false); return; }
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message: '✅ رسالة اختبار من مؤسسة المحترز للحاويات — الاتصال يعمل بنجاح 🏗️' })
      });
      const data = await res.json();
      if (data.success) {
        setIsConnected(true);
        setTestResult({ ok: true, msg: `✅ تم الإرسال بنجاح إلى ${phone}` });
      } else {
        setTestResult({ ok: false, msg: `❌ فشل: ${data.error || 'خطأ في البوابة'}` });
      }
    } catch (e: any) {
      setTestResult({ ok: false, msg: `❌ خطأ في الاتصال: ${e?.message}` });
    }
    setIsTesting(false);
  };

  const handleManualSend = async () => {
    if (!manualPhone || !manualMsg) return;
    setSendingManual(true);
    setManualResult(null);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: manualPhone, message: manualMsg })
      });
      const data = await res.json();
      if (data.success) {
        setManualResult({ ok: true, msg: `✅ أُرسلت بنجاح إلى ${manualPhone}` });
        setManualPhone(''); setManualMsg('');
      } else {
        setManualResult({ ok: false, msg: `❌ ${data.error || 'فشل الإرسال'}` });
      }
    } catch (e: any) {
      setManualResult({ ok: false, msg: `❌ ${e?.message}` });
    }
    setSendingManual(false);
  };

  const copyDockerCmd = () => {
    const cmd = `docker run -d --name evolution-api -p 8080:8080 -e AUTHENTICATION_API_KEY=${apiKey || 'YOUR_KEY'} evoapicloud/evolution-api:latest`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 14px', borderRadius: '10px', fontSize: '0.88rem',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#e2e8f0', fontFamily: 'inherit', outline: 'none', direction: 'ltr', textAlign: 'left'
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700, marginBottom: '5px', display: 'block'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#34d399', fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
          <Sparkles size={16} /> محرك الواتساب المتكامل
        </div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>
          مركز إعداد وإرسال الواتساب 🚀
        </h2>
        <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0 }}>
          ربط البوابة، إرسال رسائل مباشر، وسجل التنبيهات التلقائية عند توثيق العقود
        </p>
      </div>

      {/* ── Connection Status Bar ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
        padding: '12px 18px', borderRadius: '12px',
        background: isConnected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
        border: `1px solid ${isConnected ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`
      }}>
        {isConnected ? <Wifi size={20} color="#34d399" /> : <WifiOff size={20} color="#f87171" />}
        <span style={{ fontWeight: 700, color: isConnected ? '#34d399' : '#f87171' }}>
          {isConnected ? '🟢 الواتساب متصل ويعمل' : '🔴 الواتساب غير متصل'}
        </span>
        <span style={{ color: '#64748b', fontSize: '0.82rem' }}>
          {mode === 'evolution' ? 'Evolution API' : 'WhatsApp Web (wa.me)'}
        </span>
        <span style={{ marginRight: 'auto', fontSize: '0.78rem', color: autoSend ? '#34d399' : '#f59e0b', fontWeight: 600 }}>
          {autoSend ? '⚡ الإرسال التلقائي عند التوثيق: مفعّل' : '⏸ الإرسال التلقائي: موقوف'}
        </span>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 1. CONNECTION SETTINGS */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Section title="إعدادات الاتصال بالبوابة" icon={<Settings size={18} />} color="#f59e0b">

        {/* Mode Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ ...labelStyle, color: '#fbbf24' }}>اختر طريقة الاتصال:</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Evolution API */}
            <div
              onClick={() => setMode('evolution')}
              style={{
                padding: '16px', borderRadius: '12px', cursor: 'pointer',
                border: `2px solid ${mode === 'evolution' ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
                background: mode === 'evolution' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <Server size={18} color={mode === 'evolution' ? '#f59e0b' : '#64748b'} />
                <span style={{ fontWeight: 800, color: mode === 'evolution' ? '#fbbf24' : '#94a3b8' }}>
                  Evolution API
                </span>
                {mode === 'evolution' && (
                  <span style={{ background: '#f59e0b', color: '#000', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    مُوصى به
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                بوابة خادم محلي أو سحابي — إرسال صامت تلقائي 100% دون فتح الواتساب.
                مناسب للاستخدام التجاري المتقدم.
              </p>
            </div>

            {/* WhatsApp Web */}
            <div
              onClick={() => setMode('wame')}
              style={{
                padding: '16px', borderRadius: '12px', cursor: 'pointer',
                border: `2px solid ${mode === 'wame' ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
                background: mode === 'wame' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <MessageSquare size={18} color={mode === 'wame' ? '#10b981' : '#64748b'} />
                <span style={{ fontWeight: 800, color: mode === 'wame' ? '#34d399' : '#94a3b8' }}>
                  واتساب ويب
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                فتح wa.me في المتصفح — بسيط ومباشر. يتطلب تأكيداً يدوياً لكل رسالة من الموظف.
              </p>
            </div>
          </div>
        </div>

        {/* Evolution API Fields */}
        {mode === 'evolution' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: '10px', padding: '12px 14px', fontSize: '0.78rem', color: '#7dd3fc', lineHeight: 1.7 }}>
              <strong>آلية العمل عند التوثيق:</strong> عند حفظ عقد جديد أو تمديده، يُرسل التطبيق تلقائياً رسالة
              للعميل (تأكيد العقد) وللسائق المكلّف (مهمة التنزيل + الموقع) عبر Evolution API — بدون أي تدخل يدوي أو فتح واتساب.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>🌐 عنوان الخادم (Server URL)</label>
                <input style={inputStyle} value={serverUrl} onChange={e => setServerUrl(e.target.value)}
                  placeholder="http://localhost:8080" />
              </div>
              <div>
                <label style={labelStyle}>📱 اسم الـ Instance</label>
                <input style={inputStyle} value={instanceName} onChange={e => setInstance(e.target.value)}
                  placeholder="muhtaraz-instance" />
              </div>
            </div>

            <div>
              <label style={labelStyle}>🔑 API Key</label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...inputStyle, paddingLeft: '40px' }}
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey} onChange={e => setApiKey(e.target.value)}
                  placeholder="أدخل مفتاح API الخاص بك"
                />
                <button
                  onClick={() => setShowApiKey(v => !v)}
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Docker Quick Setup */}
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>🐳 تثبيت سريع بـ Docker (خادم محلي)</span>
                <button
                  onClick={copyDockerCmd}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '6px', padding: '4px 10px', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  {copied ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                  {copied ? 'تم النسخ' : 'نسخ'}
                </button>
              </div>
              <code style={{ fontSize: '0.72rem', color: '#34d399', wordBreak: 'break-all', display: 'block', lineHeight: 1.6 }}>
                {`docker run -d --name evolution-api -p 8080:8080 -e AUTHENTICATION_API_KEY=${apiKey || 'YOUR_KEY'} evoapicloud/evolution-api:latest`}
              </code>
            </div>
          </div>
        )}

        {/* WhatsApp Web Fields */}
        {mode === 'wame' && (
          <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: '10px', padding: '14px', fontSize: '0.82rem', color: '#6ee7b7', lineHeight: 1.7 }}>
            <strong>آلية العمل:</strong> عند التوثيق، ستفتح نافذة متصفح جديدة تحمل رسالة الواتساب جاهزة.
            الموظف يضغط "إرسال" من الواتساب ويب مرة واحدة. مناسب للاستخدام الشخصي أو المبدئي.
          </div>
        )}

        {/* Common Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
          <div>
            <label style={labelStyle}>📞 رقم المُرسِل (الشركة)</label>
            <input style={inputStyle} value={senderPhone} onChange={e => setSenderPhone(e.target.value)}
              placeholder="+966920001234" />
          </div>
          <div>
            <label style={labelStyle}>👤 رقم الإدارة (للتنبيهات الحرجة)</label>
            <input style={inputStyle} value={adminPhone} onChange={e => setAdminPhone(e.target.value)}
              placeholder="+966500000001" />
          </div>
        </div>

        {/* Auto Send Toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderRadius: '10px', marginTop: '14px',
          background: autoSend ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${autoSend ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.08)'}`
        }}>
          <div>
            <div style={{ fontWeight: 700, color: autoSend ? '#34d399' : '#94a3b8', fontSize: '0.9rem' }}>
              ⚡ الإرسال التلقائي عند التوثيق
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              إرسال رسالة للعميل والسائق تلقائياً عند حفظ أي عقد جديد أو تمديد
            </div>
          </div>
          <button onClick={() => setAutoSend(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            {autoSend
              ? <ToggleRight size={36} color="#10b981" />
              : <ToggleLeft size={36} color="#475569" />
            }
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px',
              borderRadius: '10px', background: '#f59e0b', border: 'none',
              color: '#050811', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer',
              opacity: isSaving ? 0.7 : 1
            }}
          >
            <ShieldCheck size={16} /> {isSaving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
          </button>

          {/* Test Connection */}
          <div style={{ display: 'flex', gap: '6px', flex: 1, minWidth: '200px' }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              value={testPhone} onChange={e => setTestPhone(e.target.value)}
              placeholder="رقم هاتف للاختبار (اختياري)"
            />
            <button
              onClick={handleTest}
              disabled={isTesting}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
                borderRadius: '10px', background: 'rgba(14,165,233,0.2)',
                border: '1px solid rgba(14,165,233,0.4)',
                color: '#38bdf8', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                whiteSpace: 'nowrap', opacity: isTesting ? 0.7 : 1
              }}
            >
              {isTesting ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={15} />}
              اختبار
            </button>
          </div>
        </div>

        {/* Feedback */}
        {saveMsg && (
          <div style={{ marginTop: '10px', padding: '8px 14px', borderRadius: '8px', background: saveMsg.startsWith('✅') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: saveMsg.startsWith('✅') ? '#34d399' : '#f87171', fontSize: '0.85rem', fontWeight: 600 }}>
            {saveMsg}
          </div>
        )}
        {testResult && (
          <div style={{ marginTop: '10px', padding: '8px 14px', borderRadius: '8px', background: testResult.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: testResult.ok ? '#34d399' : '#f87171', fontSize: '0.85rem', fontWeight: 600 }}>
            {testResult.msg}
          </div>
        )}
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 2. SEND MESSAGE MANUAL */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Section title="إرسال رسالة مباشرة" icon={<Send size={18} />} color="#10b981" defaultOpen={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>📞 رقم الهاتف</label>
              <input style={inputStyle} value={manualPhone} onChange={e => setManualPhone(e.target.value)}
                placeholder="+966xxxxxxxxx" />
            </div>
            <div>
              <label style={labelStyle}>✍️ نص الرسالة</label>
              <input style={inputStyle} value={manualMsg} onChange={e => setManualMsg(e.target.value)}
                placeholder="اكتب رسالتك هنا..." />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleManualSend}
              disabled={sendingManual || !manualPhone || !manualMsg}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 20px',
                borderRadius: '10px', background: '#10b981', border: 'none',
                color: '#fff', fontWeight: 700, cursor: 'pointer',
                opacity: (sendingManual || !manualPhone || !manualMsg) ? 0.5 : 1
              }}
            >
              {sendingManual ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
              إرسال عبر API
            </button>
            <button
              onClick={() => onSendWhatsApp(manualPhone, manualMsg)}
              disabled={!manualPhone || !manualMsg}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px',
                borderRadius: '10px', background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8',
                fontWeight: 700, cursor: 'pointer',
                opacity: (!manualPhone || !manualMsg) ? 0.5 : 1
              }}
            >
              <ExternalLink size={15} /> فتح wa.me
            </button>
          </div>
          {manualResult && (
            <div style={{ padding: '8px 14px', borderRadius: '8px', background: manualResult.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: manualResult.ok ? '#34d399' : '#f87171', fontSize: '0.85rem', fontWeight: 600 }}>
              {manualResult.msg}
            </div>
          )}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 3. HOW IT WORKS */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Section title="آلية العمل عند التوثيق" icon={<Bot size={18} />} color="#a5b4fc" defaultOpen={false}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { step: '1', icon: '📝', title: 'يوثّق الموظف عقداً جديداً', desc: 'يضغط "حفظ وتوثيق العقد" من نافذة العقد الجديد' },
            { step: '2', icon: '🤖', title: 'يُرسل النظام تلقائياً رسالتين', desc: 'رسالة للعميل: تأكيد العقد ورقم الحاوية والمبلغ. ورسالة للسائق: مهمة التنزيل + موقع GPS + بيانات العميل' },
            { step: '3', icon: '📊', title: 'يظهر إشعار النتيجة للموظف', desc: 'بانر أخضر عند النجاح. بانر أحمر دائم (لا يختفي) عند الفشل مع خيار إعادة المحاولة أو الإرسال اليدوي' },
            { step: '4', icon: '🧾', title: 'يظهر السند الرسمي على الشاشة', desc: 'سند قبض كامل بـ QR يفتح صفحة السند الإلكترونية على هاتف العميل عند مسحه' },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(165,180,252,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '3px' }}>{s.title}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 4. NOTIFICATIONS LOG */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Section title={`سجل الإشعارات المجدولة (${notifications.length})`} icon={<MessageSquare size={18} />} color="#38bdf8" defaultOpen={true}>

        {/* Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>المستلم:</span>
            {([['all', 'الكل'], ['customer', 'العملاء'], ['employee', 'الموظفون']] as const).map(([id, lbl]) => (
              <button key={id} onClick={() => setFilterRole(id as any)} style={{
                padding: '4px 12px', borderRadius: '7px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 600,
                background: filterRole === id ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.05)',
                color: filterRole === id ? '#34d399' : '#64748b',
                border: filterRole === id ? '1px solid rgba(52,211,153,0.4)' : '1px solid transparent'
              }}>{lbl}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>الحالة:</span>
            {([['all', 'الكل'], ['pending', 'انتظار'], ['sent', 'مُرسَل']] as const).map(([id, lbl]) => (
              <button key={id} onClick={() => setFilterStatus(id as any)} style={{
                padding: '4px 12px', borderRadius: '7px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 600,
                background: filterStatus === id ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                color: filterStatus === id ? '#fbbf24' : '#64748b',
                border: filterStatus === id ? '1px solid rgba(245,158,11,0.4)' : '1px solid transparent'
              }}>{lbl}</button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredNotifications.map(item => {
            const badge = getNotificationBadge(item.notification_type);
            return (
              <div key={item.id} style={{
                padding: '16px 18px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRight: `4px solid ${badge.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '12px'
              }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ padding: '3px 9px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 700 }}>
                      {item.recipient_name || 'المستلم'}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#64748b', direction: 'ltr' }}>
                      {item.recipient_phone}
                    </span>
                    <span style={{
                      fontSize: '0.72rem', padding: '2px 7px', borderRadius: '5px',
                      background: item.status === 'sent' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                      color: item.status === 'sent' ? '#34d399' : '#fbbf24',
                      display: 'inline-flex', alignItems: 'center', gap: '3px'
                    }}>
                      {item.status === 'sent' ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                      {item.status === 'sent' ? 'مُرسَل' : 'مجدول'}
                    </span>
                  </div>
                  <div style={{ background: 'rgba(15,23,42,0.7)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.83rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                    {item.message_body}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={11} />
                    {new Date(item.scheduled_for).toLocaleString('ar-SA')}
                  </div>
                </div>
                <button
                  onClick={() => handleSendAndMark(item)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                    borderRadius: '9px', background: 'rgba(16,185,129,0.18)',
                    border: '1px solid rgba(52,211,153,0.35)', color: '#34d399',
                    fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap'
                  }}
                >
                  <Send size={14} /> إرسال
                </button>
              </div>
            );
          })}
          {filteredNotifications.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#475569' }}>
              <MessageSquare size={36} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>لا توجد تنبيهات</div>
              <div style={{ fontSize: '0.82rem' }}>ستظهر هنا تلقائياً عند توثيق أي عقد</div>
            </div>
          )}
        </div>
      </Section>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
