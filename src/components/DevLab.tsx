'use client';

import React, { useState, useRef } from 'react';
import { 
  FlaskConical, 
  Mic, 
  Volume2, 
  Sparkles, 
  Send, 
  Play, 
  Pause, 
  Download, 
  RefreshCw, 
  Radio, 
  MessageSquare, 
  Bot, 
  Sliders, 
  FileText, 
  Check, 
  ExternalLink,
  Crown,
  Zap,
  Globe,
  Truck,
  Heart
} from 'lucide-react';
import { NEURAL_VOICES } from '@/app/api/voice/neural-tts/route';

interface DevLabProps {
  currentRole: string;
}

export const DevLab: React.FC<DevLabProps> = ({ currentRole }) => {
  // Voice Studio States
  const [selectedVoice, setSelectedVoice] = useState<'zariyah' | 'fatima' | 'salma' | 'hamed'>('zariyah');
  const [customText, setCustomText] = useState('يا هلا والله ومسهلا يا أبو ماجد 🌸 أنا زاريّة، مساعدتك الذكية لمؤسسة المحترز للحاويات.. كيف أقدر أخدمك اليوم؟');
  const [speechRate, setSpeechRate] = useState<string>('+0%');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Discord Bridge States
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('https://discord.com/api/webhooks/1541716427071819858/t30PNmg-72eTI9p5NnwPzDZGz6wm1B4DNWgPvHcQrMuNrnCQQSeb0bT5iyiKYH2ya3W1');
  const [isSendingDiscord, setIsSendingDiscord] = useState(false);
  const [discordStatus, setDiscordStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate & Play Voice
  const handleGenerateVoice = async () => {
    if (!customText.trim()) return;
    setIsLoadingAudio(true);
    setErrorMessage(null);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    try {
      const url = `/api/voice/neural-tts?text=${encodeURIComponent(customText)}&voice=${selectedVoice}&rate=${encodeURIComponent(speechRate)}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error('تعذر توليد الصوت من الخادم، يرجى المحاولة ثانية');
      }

      const blob = await res.blob();
      const newAudioUrl = URL.createObjectURL(blob);
      setAudioUrl(newAudioUrl);

      // Auto play
      const audio = new Audio(newAudioUrl);
      audioRef.current = audio;
      audio.onplay = () => setIsPlaying(true);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
        setErrorMessage('حدث خطأ أثناء تشغيل الملف الصوتي');
      };
      await audio.play();
    } catch (err: any) {
      setErrorMessage(err?.message || 'خطأ في معالجة الصوت البشري');
      setIsPlaying(false);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // Toggle Audio Play/Pause
  const handleTogglePlay = () => {
    if (!audioRef.current) {
      handleGenerateVoice();
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Send Test Message to Discord Webhook
  const handleSendDiscordTest = async (type: 'contract' | 'alert' | 'marketing') => {
    if (!discordWebhookUrl) {
      setDiscordStatus({ ok: false, msg: 'يرجى إدخال رابط الـ Webhook الخاص بقناة ديسكورد أولاً' });
      return;
    }

    setIsSendingDiscord(true);
    setDiscordStatus(null);

    let payload: any = {};
    if (type === 'contract') {
      payload = {
        username: 'مؤسسة المحترز للحاويات 🚛',
        avatar_url: 'https://cdn-icons-png.flaticon.com/512/2830/2830305.png',
        embeds: [{
          title: '📋 عقد جديد رقم: CTR-2026-88',
          description: 'تم إصدار عقد تأجير حاوية بنجاح وإرسال السند للعميل والسائق.',
          color: 0xf59e0b, // Amber Gold
          fields: [
            { name: '👤 العميل', value: 'شركة مشاريع الرياض للمقاولات', inline: true },
            { name: '📦 الحاوية', value: 'حاوية أنقاض (20 ياردة) - C104', inline: true },
            { name: '💰 المبلغ المحصل', value: '1,500 ريال (كاش ✅)', inline: true },
            { name: '📍 الموقع', value: 'حي النرجس، شمال الرياض', inline: false }
          ],
          footer: { text: 'منظومة المحترز الذكية | الإشراف التنفيذي' },
          timestamp: new Date().toISOString()
        }]
      };
    } else if (type === 'alert') {
      payload = {
        username: 'مساعد الرقابة والمتابعة ⚠️',
        embeds: [{
          title: '🚨 تنبيه تشغيلي: حاوية متأخرة عن موعد السحب',
          description: 'الحاوية رقم **C-08** لدى مؤسسة التعمير انتهى عقدها منذ 24 ساعة ولم تسحب بعد.',
          color: 0xef4444, // Red
          fields: [
            { name: '🚚 السائق المسؤول', value: 'أحمد السائق (+966500000002)', inline: true },
            { name: '📍 الحي', value: 'حي العارض، الرياض', inline: true }
          ]
        }]
      };
    } else {
      payload = {
        username: 'استوديو التسويق الذكي 📢',
        content: `**🚀 إعلان جديد جاهز للنشر على منصة X وانستغرام:**\n\n${customText}\n\n📞 للحجز الفوري عبر الواتساب: 0536971105`
      };
    }

    try {
      const res = await fetch(discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok || res.status === 204) {
        setDiscordStatus({ ok: true, msg: 'تم إرسال الرسالة إلى سيرفر ديسكورد بنجاح تام! 🎯' });
      } else {
        setDiscordStatus({ ok: false, msg: 'تعذر الإرسال. تأكد من صحة رابط الـ Webhook.' });
      }
    } catch (e: any) {
      setDiscordStatus({ ok: false, msg: 'خطأ في الاتصال بديسكورد: ' + e?.message });
    } finally {
      setIsSendingDiscord(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '70px', direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* ─── 🧪 HEADER BANNER ─── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.4) 0%, rgba(15, 23, 42, 0.95) 50%, rgba(14, 116, 144, 0.4) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.4)',
        borderRadius: '24px',
        padding: '26px 24px',
        marginBottom: '24px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 35px rgba(168, 85, 247, 0.15)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
              border: '2px solid rgba(255, 255, 255, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 25px rgba(168, 85, 247, 0.5)',
              flexShrink: 0
            }}>
              <FlaskConical size={32} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>
                  مختبر التطوير والابتكار المستقل (R&D Dev-Lab)
                </h1>
                <span style={{
                  background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(168, 85, 247, 0.25))',
                  color: '#f472b6',
                  border: '1px solid rgba(236, 72, 153, 0.4)',
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  padding: '3px 10px',
                  borderRadius: '12px'
                }}>
                  🔒 خاص بالمدير العام
                </span>
              </div>
              <p style={{ color: '#cbd5e1', fontSize: '0.88rem', marginTop: '4px', lineHeight: 1.5 }}>
                مساحة تجارب معزولة 100% لبناء واختبار التعليق الصوتي البشري، بوتات ديسكورد، واستوديو النشر الإعلاني
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        
        {/* ─── 🎙️ SECTION 1: SAUDI NEURAL VOICE STUDIO (FEMALE & MALE) ─── */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 29, 0.98) 100%)',
          border: '1px solid rgba(236, 72, 153, 0.35)',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Volume2 size={22} color="#ec4899" />
              <span>استوديو الصوت البشري السعودي (مجاني 100%)</span>
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '3px' }}>
              محرك صوتي متقن بنبرة بشرية طبيعية ودافئة بدون روبوتية وبدون تكاليف اشتراك
            </p>
          </div>

          {/* Voice Selector Cards */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '8px' }}>
              اختر المعلق الصوتي المفضل:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
              
              {/* Option 1: Zariyah (Default Female) */}
              <button
                onClick={() => setSelectedVoice('zariyah')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '14px',
                  border: selectedVoice === 'zariyah' ? '2px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: selectedVoice === 'zariyah' ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(168, 85, 247, 0.2))' : 'rgba(0, 0, 0, 0.3)',
                  color: selectedVoice === 'zariyah' ? '#f472b6' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'right',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedVoice === 'zariyah' ? '0 0 15px rgba(236, 72, 153, 0.25)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>🌸 زاريّة (المقترح)</span>
                  <span style={{ fontSize: '0.65rem', background: '#ec4899', color: '#fff', padding: '1px 5px', borderRadius: '6px' }}>أنثى 🇸🇦</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#cbd5e1', fontWeight: 500 }}>صوت سعودي دافئ وعفوي</span>
              </button>

              {/* Option 2: Fatima (UAE / Ad Female) */}
              <button
                onClick={() => setSelectedVoice('fatima')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '14px',
                  border: selectedVoice === 'fatima' ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: selectedVoice === 'fatima' ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(14, 165, 233, 0.2))' : 'rgba(0, 0, 0, 0.3)',
                  color: selectedVoice === 'fatima' ? '#38bdf8' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'right',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>✨ فاطمة</span>
                  <span style={{ fontSize: '0.65rem', background: '#0284c7', color: '#fff', padding: '1px 5px', borderRadius: '6px' }}>أنثى 🇦🇪</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#cbd5e1', fontWeight: 500 }}>نبرة إعلانية خليجية قوية</span>
              </button>

              {/* Option 3: Hamed (Saudi Male) */}
              <button
                onClick={() => setSelectedVoice('hamed')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '14px',
                  border: selectedVoice === 'hamed' ? '2px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: selectedVoice === 'hamed' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.2))' : 'rgba(0, 0, 0, 0.3)',
                  color: selectedVoice === 'hamed' ? '#fbbf24' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'right',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>👔 حامد</span>
                  <span style={{ fontSize: '0.65rem', background: '#d97706', color: '#fff', padding: '1px 5px', borderRadius: '6px' }}>ذكر 🇸🇦</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#cbd5e1', fontWeight: 500 }}>صوت رجالي تنفيذي</span>
              </button>
            </div>
          </div>

          {/* Textarea Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '6px' }}>
              نص الكلام المراد نطقه بصوت بشري:
            </label>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '14px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '0.88rem',
                lineHeight: 1.6,
                outline: 'none'
              }}
            />
          </div>

          {/* Quick Preset Chips */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setCustomText('يا هلا والله ومسهلا يا أبو ماجد 🌸 أنا زاريّة، مساعدتك الذكية لمؤسسة المحترز للحاويات.. كيف أقدر أخدمك اليوم؟')}
              style={{ background: 'rgba(236, 72, 153, 0.15)', border: '1px solid rgba(236, 72, 153, 0.3)', color: '#f472b6', padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}
            >
              + ترحيب المدير
            </button>
            <button
              onClick={() => setCustomText('تبحث عن حاوية أنقاض وبناء بالرياض؟ مؤسسة المحترز توفر لك تنزيل وسحب فوري بأفضل الأسعار.. اتصل بنا الآن على 0536971105!')}
              style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}
            >
              + إعلان المقاولين
            </button>
            <button
              onClick={() => setCustomText('مرحباً بك يا أحمد، تم إسناد مهمة تنزيل حاوية جديدة لك في حي النرجس، نرجو التوجه للموقع فوراً.')}
              style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', padding: '4px 10px', borderRadius: '8px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}
            >
              + مهمة سائق
            </button>
          </div>

          {/* Speech Rate & Audio Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>سرعة الإلقاء:</span>
              <select
                value={speechRate}
                onChange={(e) => setSpeechRate(e.target.value)}
                style={{
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  outline: 'none'
                }}
              >
                <option value="-15%">هادئ متزن (-15%)</option>
                <option value="+0%">طبيعي (+0%)</option>
                <option value="+15%">سريع حماسي (+15%)</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleGenerateVoice}
                disabled={isLoadingAudio}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #ec4899, #be185d)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)'
                }}
              >
                {isLoadingAudio ? <RefreshCw size={16} className="animate-spin" /> : isPlaying ? <Pause size={16} /> : <Play size={16} />}
                <span>{isLoadingAudio ? 'جارِ توليد الصوت البشري...' : isPlaying ? 'إيقاف مؤقت' : 'استماع للصوت الآن 🔊'}</span>
              </button>

              {audioUrl && (
                <a
                  href={audioUrl}
                  download="almuhtaraz_voice.mp3"
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    textDecoration: 'none'
                  }}
                  title="تحميل المقطع كملف MP3"
                >
                  <Download size={16} />
                </a>
              )}
            </div>
          </div>

          {errorMessage && (
            <p style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 700 }}>{errorMessage}</p>
          )}
        </div>

        {/* ─── 🎮 SECTION 2: DISCORD OPERATIONS & MARKETING BRIDGE ─── */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 29, 0.98) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={22} color="#818cf8" />
              <span>جسر ديسكورد وغرفة العمليات المباشرة (Discord Bridge)</span>
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '3px' }}>
              ربط فوري ومجاني بدون بوتات معقدة لإرسال التقارير، بطاقات العقود، والإعلانات
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '6px' }}>
              رابط الـ Webhook الخاص بقناة ديسكورد (Discord Webhook URL):
            </label>
            <input
              type="text"
              value={discordWebhookUrl}
              onChange={(e) => setDiscordWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/xxxx/xxxx"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '0.82rem',
                direction: 'ltr',
                textAlign: 'left',
                outline: 'none'
              }}
            />
            <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
              💡 من إعدادات أي قناة في ديسكورد ➔ Integrations ➔ Create Webhook ➔ Copy Webhook URL.
            </p>
          </div>

          {/* Test Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => handleSendDiscordTest('contract')}
              disabled={isSendingDiscord}
              style={{
                padding: '12px',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.25))',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '12px',
                color: '#fbbf24',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
            >
              <span>📋 تجربة إرسال بطاقة عقد ملونة إلى ديسكورد</span>
              <Send size={16} />
            </button>

            <button
              onClick={() => handleSendDiscordTest('alert')}
              disabled={isSendingDiscord}
              style={{
                padding: '12px',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.25))',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '12px',
                color: '#f87171',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
            >
              <span>🚨 تجربة إرسال تنبيه تأخير حاوية إلى ديسكورد</span>
              <Send size={16} />
            </button>

            <button
              onClick={() => handleSendDiscordTest('marketing')}
              disabled={isSendingDiscord}
              style={{
                padding: '12px',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(147, 51, 234, 0.25))',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                borderRadius: '12px',
                color: '#c084fc',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
            >
              <span>📢 تجربة إرسال منشور إعلاني إلى ديسكورد</span>
              <Send size={16} />
            </button>
          </div>

          {discordStatus && (
            <div style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: discordStatus.ok ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${discordStatus.ok ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              color: discordStatus.ok ? '#34d399' : '#f87171',
              fontSize: '0.8rem',
              fontWeight: 800
            }}>
              {discordStatus.msg}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
