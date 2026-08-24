'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Bot, 
  Smartphone, 
  MessageSquare, 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Truck, 
  User, 
  Send, 
  QrCode, 
  Clock, 
  Zap, 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  Check, 
  Sliders, 
  HelpCircle,
  Copy,
  ChevronRight,
  Download,
  Mic,
  Volume2,
  VolumeX,
  Upload,
  Play,
  Square,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  Contract, 
  Container, 
  Customer, 
  Profile, 
  Receipt, 
  SmartAssistantSettings, 
  WhatsAppSettings 
} from '@/types/database';
import { formatDailyExecutiveReport } from '@/utils/voucherFormatter';
import { formatSaudiCheerResponse, speakSaudiFemaleVoice, stopSpeaking, unlockAudio } from '@/utils/voiceAssistant';

interface SmartAssistantHubProps {
  contracts: Contract[];
  containers: Container[];
  customers: Customer[];
  staffList: Profile[];
  receipts: Receipt[];
  assistantSettings: SmartAssistantSettings;
  onSaveAssistantSettings: (settings: SmartAssistantSettings) => Promise<boolean>;
  gatewaySettings: WhatsAppSettings;
  onSaveGatewaySettings: (settings: WhatsAppSettings) => Promise<boolean>;
  onSendWhatsApp: (phone: string, message: string) => void;
}

export const SmartAssistantHub: React.FC<SmartAssistantHubProps> = ({
  contracts,
  containers,
  customers,
  staffList,
  receipts,
  assistantSettings,
  onSaveAssistantSettings,
  gatewaySettings,
  onSaveGatewaySettings,
  onSendWhatsApp
}) => {
  const [activeSection, setActiveSection] = useState<'routing' | 'reports' | 'chat' | 'shortcut'>('routing');
  const [localAssistantSettings, setLocalAssistantSettings] = useState<SmartAssistantSettings>(assistantSettings);
  const [localGatewaySettings, setLocalGatewaySettings] = useState<WhatsAppSettings>(gatewaySettings);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);

  // Voice Reference Studio State
  const [hasVoiceSample, setHasVoiceSample] = useState<boolean>(false);
  const [isUploadingSample, setIsUploadingSample] = useState<boolean>(false);
  const [isRecordingSample, setIsRecordingSample] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(6);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetch('/api/voice/reference')
      .then(res => res.json())
      .then(data => setHasVoiceSample(data.exists))
      .catch(() => {});
  }, []);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingSample(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/voice/reference', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setHasVoiceSample(true);
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
        alert('تم حفظ بصمة الصوت المرجعية بنجاح! سيتم استخدامها لاستنساخ الصوت 🎙️✨');
      }
    } catch (err) {
      alert('حدث خطأ أثناء رفع الصوت');
    } finally {
      setIsUploadingSample(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'recorded_sample.wav');
        setIsUploadingSample(true);
        try {
          const res = await fetch('/api/voice/reference', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.success) {
            setHasVoiceSample(true);
            confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
            alert('تم تسجيل وحفظ بصمة الصوت (6 ثوانٍ) بنجاح تام! 👑🎙️');
          }
        } catch (e) {
          alert('حدث خطأ أثناء حفظ التسجيل');
        } finally {
          setIsUploadingSample(false);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingSample(true);
      setCountdown(6);

      let timeLeft = 6;
      const interval = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(interval);
          mediaRecorder.stop();
          setIsRecordingSample(false);
        }
      }, 1000);
    } catch (err) {
      alert('يرجى السماح بالوصول إلى الميكروفون للتسجيل');
    }
  };

  // Chat State
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; time: string }>>([
    {
      role: 'assistant',
      text: 'مرحباً بك يا بو سعود 👑 أنا المساعد الذكي لمؤسسة المحترز للحاويات. جاهز لمساعدتك في تحليل الأسطول، إرسال تقارير اليوم، أو تتبع مبالغ الكاش والسائقين. كيف يمكنني خدمتك؟',
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Compute live executive metrics
  const liveMetrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Contracts today
    const todayContracts = contracts.filter(c => c.created_at.startsWith(todayStr));
    const activeContracts = contracts.filter(c => c.status === 'active');
    
    // Available / Rented Containers
    const availableContainers = containers.filter(c => c.status === 'available');
    const rentedContainers = containers.filter(c => c.status === 'rented');

    // Receipts / Income Today
    const todayReceipts = receipts.filter(r => r.issued_at?.startsWith(todayStr) || r.created_at?.startsWith(todayStr));
    const cashToday = todayReceipts.filter(r => r.payment_method === 'cash').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const electronicToday = todayReceipts.filter(r => r.payment_method !== 'cash').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalIncomeToday = cashToday + electronicToday;

    // Expiring tomorrow
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const expiringTomorrow = contracts.filter(c => c.status === 'active' && c.end_date?.startsWith(tomorrow));

    return {
      todayDate: new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      totalIncomeToday,
      cashToday,
      electronicToday,
      newContractsCount: todayContracts.length,
      activeContractsCount: activeContracts.length,
      availableContainersCount: availableContainers.length,
      rentedContainersCount: rentedContainers.length,
      expiringTomorrowCount: expiringTomorrow.length
    };
  }, [contracts, containers, receipts]);

  // Generate Report Text
  const dailyReportText = useMemo(() => {
    return formatDailyExecutiveReport({
      date: liveMetrics.todayDate,
      totalIncomeToday: liveMetrics.totalIncomeToday,
      cashToday: liveMetrics.cashToday,
      electronicToday: liveMetrics.electronicToday,
      newContractsCount: liveMetrics.newContractsCount,
      activeContractsCount: liveMetrics.activeContractsCount,
      availableContainersCount: liveMetrics.availableContainersCount,
      rentedContainersCount: liveMetrics.rentedContainersCount,
      expiringTomorrowCount: liveMetrics.expiringTomorrowCount
    });
  }, [liveMetrics]);

  // Save Settings Handler
  const handleSaveAllSettings = async () => {
    await onSaveAssistantSettings(localAssistantSettings);
    await onSaveGatewaySettings(localGatewaySettings);
    setSaveSuccess(true);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  // Deep-Reasoning AI Copilot Query Handler
  const handleAskCopilot = (query: string) => {
    if (!query.trim()) return;

    const userTime = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    const newMessages = [...chatMessages, { role: 'user' as const, text: query, time: userTime }];
    setChatMessages(newMessages);
    setChatInput('');

    // Process intelligence query against real data dynamically
    setTimeout(() => {
      const { displayText } = processDeepAssistantQuery(query, {
        contracts,
        containers,
        customers,
        staffList,
        receipts
      });

      const botTime = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
      setChatMessages(prev => [...prev, { role: 'assistant', text: displayText, time: botTime }]);
    }, 200);
  };



  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 16px', direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* ── Header Title Banner ──────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        borderRadius: '24px',
        padding: '28px 24px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(245, 158, 11, 0.45)',
            color: '#050811'
          }}>
            <Bot size={34} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>
                مركز المساعد الذكي والأتمتة التنفيذية
              </h1>
              <span style={{
                background: 'rgba(52, 211, 153, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                padding: '3px 10px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 800
              }}>
                نشط وآمن 100% 🛡️
              </span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>
              لوحة التحكم المركزية لتوجيه رسائل العقود، خصوصية السائقين، والتقارير التنفيذية اللحظية
            </p>
          </div>
        </div>

        {/* Save Changes Button */}
        <button
          onClick={handleSaveAllSettings}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            border: 'none',
            borderRadius: '14px',
            padding: '12px 24px',
            color: '#050811',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(245, 158, 11, 0.3)',
            transition: 'all 0.2s ease'
          }}
        >
          {saveSuccess ? <Check size={18} strokeWidth={3} /> : <CheckCircle2 size={18} />}
          <span>{saveSuccess ? 'تم حفظ التعديلات بنجاح!' : 'حفظ إعدادات المساعد'}</span>
        </button>
      </div>

      {/* ── Section Navigation Tabs ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '6px'
      }}>
        {[
          { id: 'reports', label: '📊 التقارير اليومية والتنفيذية', icon: FileText },
          { id: 'chat', label: '💬 استفسارات المساعد الفورية', icon: Bot },
          { id: 'shortcut', label: '⚡ إضافة اختصار لشاشة الهاتف', icon: Smartphone },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '12px',
                border: isActive ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
                background: isActive ? 'rgba(245, 158, 11, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                color: isActive ? '#fbbf24' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={17} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Section 1: AI Executive Daily Briefing ───────────────────────────── */}
      {activeSection === 'reports' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          
          {/* Real-time metrics grid */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '24px'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color="#fbbf24" />
              <span>نبض الأداء المباشر لليوم</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '14px' }}>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>إجمالي الدخل اليوم</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#34d399', marginTop: '4px' }}>
                  {liveMetrics.totalIncomeToday.toLocaleString('ar-SA')} <span style={{ fontSize: '0.8rem' }}>ر.س</span>
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '14px' }}>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>مبالغ الكاش الموردة</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fbbf24', marginTop: '4px' }}>
                  {liveMetrics.cashToday.toLocaleString('ar-SA')} <span style={{ fontSize: '0.8rem' }}>ر.س</span>
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '14px' }}>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>الحاويات المتاحة 🟢</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#38bdf8', marginTop: '4px' }}>
                  {liveMetrics.availableContainersCount} <span style={{ fontSize: '0.8rem' }}>حاوية</span>
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '14px' }}>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>تنتهي غداً وتتطلب سحب</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#f87171', marginTop: '4px' }}>
                  {liveMetrics.expiringTomorrowCount} <span style={{ fontSize: '0.8rem' }}>حاوية</span>
                </div>
              </div>
            </div>

            {/* Direct WhatsApp Report Button */}
            <button
              onClick={() => {
                const targetPhone = localGatewaySettings.admin_phone || '966500000001';
                onSendWhatsApp(targetPhone, dailyReportText);
              }}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
                border: 'none',
                color: '#050811',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 6px 20px rgba(52, 211, 153, 0.3)'
              }}
            >
              <Send size={18} />
              <span>إرسال تقرير اليوم إلى واتساب المدير الآن 📲</span>
            </button>
          </div>

          {/* Report Live Preview Card */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>معاينة نص التقرير الصادر</h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(dailyReportText);
                  alert('تم نسخ نص التقرير إلى الحافظة بنجاح ✅');
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#94a3b8',
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Copy size={14} />
                <span>نسخ</span>
              </button>
            </div>

            <pre style={{
              background: 'rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '16px',
              color: '#e2e8f0',
              fontFamily: 'inherit',
              fontSize: '0.85rem',
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              margin: 0
            }}>
              {dailyReportText}
            </pre>
          </div>
        </div>
      )}

      {/* ── Section 3: Interactive Copilot Chat ──────────────────────────────── */}
      {activeSection === 'chat' && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '20px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '480px'
        }}>
          {/* Quick Prompts Bar */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto'
          }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, whiteSpace: 'nowrap' }}>أسئلة سريعة:</span>
            {[
              '🚚 كم حاوية شاغرة بالمخزن؟',
              '💰 ما إجمالي مبالغ الكاش اليوم؟',
              '⚠️ اعطني قائمة العقود المنتهية',
              '🚛 من هم السائقين المكلفين؟'
            ].map(prompt => (
              <button
                key={prompt}
                onClick={() => handleAskCopilot(prompt)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '16px',
                  padding: '5px 12px',
                  color: '#e2e8f0',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '360px' }}>
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-start' : 'flex-end',
                  maxWidth: '85%',
                  alignSelf: msg.role === 'user' ? 'flex-start' : 'flex-end'
                }}
              >
                <div style={{
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255, 255, 255, 0.07)',
                  color: msg.role === 'user' ? '#050811' : '#f8fafc',
                  border: msg.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '16px',
                  padding: '12px 18px',
                  fontSize: '0.9rem',
                  lineHeight: 1.6,
                  fontWeight: msg.role === 'user' ? 800 : 500,
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.text}
                </div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', padding: '0 4px' }}>
                  {msg.time}
                </span>
              </div>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskCopilot(chatInput);
            }}
            style={{
              padding: '14px 16px',
              background: 'rgba(0, 0, 0, 0.4)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="اسأل المساعد الذكي عن الحاويات، العقود، أو السندات..."
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                fontFamily: 'inherit',
                fontSize: '0.92rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 20px',
                color: '#050811',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Send size={16} />
              <span>إرسال</span>
            </button>
          </form>
        </div>
      )}

      {/* ── Section 4: Quick Shortcut Setup ─────────────────────────────────── */}
      {activeSection === 'shortcut' && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          padding: '32px 24px',
          maxWidth: '720px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#050811',
            boxShadow: '0 0 30px rgba(245, 158, 11, 0.4)',
            marginBottom: '16px'
          }}>
            <Smartphone size={32} />
          </div>

          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', marginBottom: '8px' }}>
            تثبيت اختصار المساعد الذكي على شاشة هاتفك
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '24px' }}>
            تم تضمين المساعد الذكي مباشرة في قائمة الاختصارات السريعة (App Shortcuts). بالضغط المطول على أيقونة المحترز في شاشتك، يفتح لك المساعد فوراً دون أي تأخير!
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            textAlign: 'right',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '20px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>1</div>
              <span style={{ color: '#f8fafc', fontSize: '0.9rem' }}>ثبّت التطبيق من الزر الذهبي أعلى الهيدر.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>2</div>
              <span style={{ color: '#f8fafc', fontSize: '0.9rem' }}>اضغط ضغطة مطولة على أيقونة "المحترز" في شاشة الهاتف الرئيسية.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>3</div>
              <span style={{ color: '#f8fafc', fontSize: '0.9rem' }}>اختر <strong>(عقد جديد)</strong> أو <strong>(سند قبض)</strong> للوصول المباشر في ثانية واحدة!</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

