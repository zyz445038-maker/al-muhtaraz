'use client';

import React, { useState, useRef } from 'react';
import { 
  FlaskConical, 
  Volume2, 
  Sparkles, 
  Send, 
  Play, 
  RefreshCw, 
  Globe, 
  Smartphone,
  CheckCircle2,
  Smile,
  Briefcase,
  Heart,
  Sliders,
  FileCheck,
  Gauge
} from 'lucide-react';
import { diacritizeArabicSpeech } from '@/utils/arabicDiacritizer';

interface DevLabProps {
  currentRole: string;
}

export const DevLab: React.FC<DevLabProps> = ({ currentRole }) => {
  // Voice Studio States
  const [selectedVoice, setSelectedVoice] = useState<'zariyah' | 'hamed' | 'fatima'>('zariyah');
  const [inputText, setInputText] = useState('أَهْلاً وَسَهْلاً بِأَبُو مَاجِدْ.. أَبْشِرْ، كَيْفَ أَقْدِرْ أَخْدِمَكْ الْيَوْمْ؟');
  const [speechRate, setSpeechRate] = useState<string>('0%');
  const [voiceMood, setVoiceMood] = useState<'cheerful' | 'formal' | 'friendly'>('cheerful');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [isApproved, setIsApproved] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Discord Bridge States
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('https://discord.com/api/webhooks/1541716427071819858/t30PNmg-72eTI9p5NnwPzDZGz6wm1B4DNWgPvHcQrMuNrnCQQSeb0bT5iyiKYH2ya3W1');
  const [isSendingDiscord, setIsSendingDiscord] = useState(false);
  const [discordStatus, setDiscordStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Automatic Arabic Diacritization & Phonetic Shaping
  const handleAutoDiacritize = () => {
    if (!inputText.trim()) return;
    const diacritized = diacritizeArabicSpeech(inputText);
    setInputText(diacritized);
    setIsApproved(true);
  };

  // Convert rate percentage to factor
  const getRateMultiplier = (rateStr: string): number => {
    switch (rateStr) {
      case '-30%': return 0.70;
      case '-20%': return 0.80;
      case '-10%': return 0.90;
      case '+10%': return 1.10;
      case '+20%': return 1.20;
      case '+30%': return 1.30;
      default: return 1.0;
    }
  };

  // Native Device Speech Synthesis (Instant, 100% human-natural on modern iOS/Android/Windows)
  const playNativeDeviceSpeech = (text: string, voiceKey: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setErrorMessage('متصفحك لا يدعم مشغل الصوت المدمج');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    
    // Apply granular speed
    const baseSpeed = getRateMultiplier(speechRate);
    utterance.rate = baseSpeed;

    // Apply Mood and Pitch Adjustments
    if (voiceMood === 'cheerful') {
      // 🌟 Cheerful & Playful: higher lively pitch and slightly upbeat tone
      utterance.pitch = voiceKey === 'hamed' ? 1.0 : 1.35;
      utterance.rate = baseSpeed * 1.08;
    } else if (voiceMood === 'formal') {
      // 👔 Formal & Executive: steady, dignified, and deep
      utterance.pitch = voiceKey === 'hamed' ? 0.80 : 1.0;
      utterance.rate = baseSpeed * 0.95;
    } else {
      // 🌸 Warm & Calm
      utterance.pitch = voiceKey === 'hamed' ? 0.88 : 1.15;
    }

    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.startsWith('ar') || v.name.includes('Arabic') || v.name.includes('Saudi') || v.name.includes('Maged') || v.name.includes('Laila') || v.name.includes('Tarik'));
    if (arabicVoice) {
      utterance.voice = arabicVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsLoadingAudio(false);
    };
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  // Generate & Play Voice via Cloud or Device
  const handlePlayVoice = () => {
    if (!inputText.trim()) return;
    setIsLoadingAudio(true);
    setErrorMessage(null);

    // Cancel previous audio
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const streamUrl = `https://al-muhtaraz-whatsapp.onrender.com/api/voice/neural-tts?text=${encodeURIComponent(inputText)}&voice=${selectedVoice}&rate=${encodeURIComponent(speechRate)}&mood=${voiceMood}&t=${Date.now()}`;

    if (audioRef.current) {
      audioRef.current.src = streamUrl;
      audioRef.current.load();
      
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsLoadingAudio(false);
          })
          .catch((err) => {
            console.warn('Cloud audio stream notice, playing native device voice:', err);
            playNativeDeviceSpeech(inputText, selectedVoice);
          });
      }
    } else {
      playNativeDeviceSpeech(inputText, selectedVoice);
    }
  };

  // Send Approved Content to Discord
  const handleSendApprovedToDiscord = async () => {
    if (!discordWebhookUrl) {
      setDiscordStatus({ ok: false, msg: 'يرجى إدخال رابط الـ Webhook الخاص بقناة ديسكورد' });
      return;
    }

    if (!inputText.trim()) {
      setDiscordStatus({ ok: false, msg: 'لا يوجد نص لإرساله' });
      return;
    }

    setIsSendingDiscord(true);
    setDiscordStatus(null);

    const voiceTitle = selectedVoice === 'zariyah' ? '🌸 زاريّة (المساعد الصوتي)' : selectedVoice === 'hamed' ? '👔 حامد (المشرف التنفيذي)' : '✨ فاطمة (المعلقة الإعلانية)';
    const moodTitle = voiceMood === 'cheerful' ? '😄 مرح وحيوي' : voiceMood === 'formal' ? '👔 رسمي رزين' : '🌸 ودود دافئ';

    const payload = {
      username: `غرفة عمليات المحترز | ${voiceTitle}`,
      avatar_url: selectedVoice === 'hamed' ? 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' : 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png',
      embeds: [{
        title: '📢 بيان/تسجيل معتمد من المدير العام (أبو ماجد)',
        description: inputText,
        color: selectedVoice === 'hamed' ? 0xf59e0b : selectedVoice === 'zariyah' ? 0xec4899 : 0x38bdf8,
        fields: [
          { name: '🎙️ المعلق الصوتي', value: voiceTitle, inline: true },
          { name: '🎭 طابع النبرة', value: moodTitle, inline: true },
          { name: '⚡ حالة الاعتماد', value: 'تمت المراجعة والموافقة بنجاح ✅', inline: true }
        ],
        footer: { text: 'غرفة العمليات المركزية | ديسكورد' },
        timestamp: new Date().toISOString()
      }]
    };

    try {
      const res = await fetch(discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok || res.status === 204) {
        setDiscordStatus({ ok: true, msg: 'تم إرسال المنشور المعتمد إلى ديسكورد بنجاح تام! 🎯' });
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
      
      {/* Audio Element instance */}
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          console.warn('Audio element error, falling back to device speech');
          playNativeDeviceSpeech(inputText, selectedVoice);
        }}
        preload="auto"
      />

      {/* ─── 🧪 HEADER BANNER ─── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.4) 0%, rgba(15, 23, 42, 0.95) 50%, rgba(14, 116, 144, 0.4) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.4)',
        borderRadius: '24px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)',
              flexShrink: 0
            }}>
              <FlaskConical size={30} strokeWidth={2.4} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff' }}>
                  مختبر الذكاء الصوتي ومشاعر النطق (R&D Lab)
                </h1>
                <span style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.4)', fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: '12px' }}>
                  🔒 تحكم وإشراف المدير العام (أبو ماجد)
                </span>
              </div>
              <p style={{ color: '#cbd5e1', fontSize: '0.86rem', marginTop: '4px' }}>
                تحكم كامل في نبرات المشاعر (المرح / الرصانة)، سرعات النطق الدقيقة بالسالب والموجب، وتشكيل الحروف الفصيحة
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        
        {/* ─── 🎙️ SECTION 1: SCRIPT COMPOSER, MOODS & GRANULAR SPEEDS ─── */}
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
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Volume2 size={22} color="#ec4899" />
                <span>ضبط النبرة الصوتية والشعور ومخارج الحروف</span>
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '3px' }}>
                تحكم في طابع الصوت المرح والرسمي وتعديل السرعة بالدرجات
              </p>
            </div>
            {isApproved && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', padding: '4px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800 }}>
                <CheckCircle2 size={14} />
                <span>نص معتمد ومضبوط</span>
              </span>
            )}
          </div>

          {/* Voice Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '8px' }}>
              1. اختر المعلق الصوتي:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
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
                  textAlign: 'right'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>🌸 زاريّة</span>
                  <span style={{ fontSize: '0.65rem', background: '#ec4899', color: '#fff', padding: '1px 5px', borderRadius: '6px' }}>أنثى 🇸🇦</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: '2px' }}>نبرة سعودية دافئة وعفوية</div>
              </button>

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
                  textAlign: 'right'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>👔 حامد</span>
                  <span style={{ fontSize: '0.65rem', background: '#d97706', color: '#fff', padding: '1px 5px', borderRadius: '6px' }}>ذكر 🇸🇦</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: '2px' }}>صوت رجالي تنفيذي فخم</div>
              </button>

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
                  textAlign: 'right'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>✨ فاطمة</span>
                  <span style={{ fontSize: '0.65rem', background: '#0284c7', color: '#fff', padding: '1px 5px', borderRadius: '6px' }}>أنثى 🇦🇪</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: '2px' }}>نبرة إعلانية خليجية رنانة</div>
              </button>
            </div>
          </div>

          {/* 🎭 Voice Mood / Emotion Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '8px' }}>
              2. طابع الشعور والمزاج الصوتي:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              
              {/* Cheerful Mood */}
              <button
                onClick={() => setVoiceMood('cheerful')}
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  border: voiceMood === 'cheerful' ? '2px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: voiceMood === 'cheerful' ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.3), rgba(244, 114, 182, 0.2))' : 'rgba(0,0,0,0.3)',
                  color: voiceMood === 'cheerful' ? '#f472b6' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Smile size={16} />
                <span>😄 مرح وحيوي</span>
              </button>

              {/* Formal Mood */}
              <button
                onClick={() => setVoiceMood('formal')}
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  border: voiceMood === 'formal' ? '2px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: voiceMood === 'formal' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(217, 119, 6, 0.2))' : 'rgba(0,0,0,0.3)',
                  color: voiceMood === 'formal' ? '#fbbf24' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Briefcase size={16} />
                <span>👔 رسمي رزين</span>
              </button>

              {/* Friendly Mood */}
              <button
                onClick={() => setVoiceMood('friendly')}
                style={{
                  padding: '10px',
                  borderRadius: '12px',
                  border: voiceMood === 'friendly' ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: voiceMood === 'friendly' ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.3), rgba(14, 165, 233, 0.2))' : 'rgba(0,0,0,0.3)',
                  color: voiceMood === 'friendly' ? '#38bdf8' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Heart size={16} />
                <span>🌸 ودود دافئ</span>
              </button>
            </div>
          </div>

          {/* Text Area */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1' }}>
                3. النص المراد إلقاؤه:
              </label>
              <button
                onClick={handleAutoDiacritize}
                style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(236, 72, 153, 0.2))',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  color: '#c084fc',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Sparkles size={13} />
                <span>✨ تشكيل وضبط مخارج الحروف تلقائياً</span>
              </button>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setIsApproved(false);
              }}
              rows={4}
              placeholder="اكتب هنا أي كلام تريده أن يُنطق أو يُنشر..."
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: isApproved ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontSize: '0.92rem',
                lineHeight: 1.7,
                outline: 'none'
              }}
            />
          </div>

          {/* Granular Speed Controls (-30% to +30%) */}
          <div style={{ background: 'rgba(0,0,0,0.35)', padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Gauge size={16} color="#38bdf8" />
                <span>مستويات السرعة الدقيقة (بالسالب والموجب):</span>
              </span>
              <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 900 }}>
                {speechRate === '0%' ? 'سرعة قياسية (0%)' : `مستوى السرعة: ${speechRate}`}
              </span>
            </div>

            {/* Granular Speed Buttons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['-30%', '-20%', '-10%', '0%', '+10%', '+20%', '+30%'].map((rate) => {
                const isSelected = speechRate === rate;
                const isNegative = rate.startsWith('-');
                const isPositive = rate.startsWith('+');
                
                let activeColor = '#38bdf8';
                if (isNegative) activeColor = '#a78bfa'; // Purple for slower
                if (isPositive) activeColor = '#f472b6'; // Pink for faster
                if (rate === '0%') activeColor = '#34d399'; // Emerald for standard

                return (
                  <button
                    key={rate}
                    onClick={() => setSpeechRate(rate)}
                    style={{
                      flex: '1 0 11%',
                      padding: '7px 4px',
                      borderRadius: '10px',
                      border: isSelected ? `2px solid ${activeColor}` : '1px solid rgba(255,255,255,0.1)',
                      background: isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.3)',
                      color: isSelected ? '#ffffff' : '#94a3b8',
                      fontWeight: isSelected ? 900 : 600,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {rate === '0%' ? '0%' : rate}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '6px' }}>
            <button
              onClick={handlePlayVoice}
              disabled={isLoadingAudio}
              style={{
                padding: '12px 24px',
                background: isPlaying ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ec4899, #be185d)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.88rem',
                borderRadius: '14px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 18px rgba(236, 72, 153, 0.45)'
              }}
            >
              {isLoadingAudio ? <RefreshCw size={18} className="animate-spin" /> : isPlaying ? <Volume2 size={18} className="animate-bounce" /> : <Play size={18} />}
              <span>{isLoadingAudio ? 'جارِ التحضير...' : isPlaying ? 'الصوت يعمل الآن 🔊' : 'استماع للنص الصوتي 🔊'}</span>
            </button>

            <button
              onClick={() => playNativeDeviceSpeech(inputText, selectedVoice)}
              style={{
                padding: '12px 16px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '14px',
                color: '#38bdf8',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="نطق فوري عبر معالج الجهاز"
            >
              <Smartphone size={16} />
              <span>نطق الجهاز الفوري</span>
            </button>
          </div>

          {errorMessage && (
            <p style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 700 }}>{errorMessage}</p>
          )}
        </div>

        {/* ─── 🎮 SECTION 2: DISCORD OPERATIONS & PUBLISHING HUB ─── */}
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
              <span>غرفة عمليات ديسكورد والموافقة على النشر (Discord Bridge)</span>
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '3px' }}>
              لا يتم نشر أي رسالة أو بيان إلا بعد صياغته ومراجعتك وموافقتك التامة
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '6px' }}>
              رابط قناة ديسكورد المعتمدة (Webhook URL):
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
          </div>

          {/* Action Approval Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCheck size={18} color="#a5b4fc" />
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffffff' }}>معاينة ما سيتم إرساله لديسكورد:</span>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '12px',
              borderRadius: '10px',
              color: '#e2e8f0',
              fontSize: '0.82rem',
              lineHeight: 1.6,
              maxHeight: '100px',
              overflowY: 'auto'
            }}>
              {inputText || 'لا يوجد نص مكتوب حالياً'}
            </div>

            <button
              onClick={handleSendApprovedToDiscord}
              disabled={isSendingDiscord || !inputText.trim()}
              style={{
                padding: '12px',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                border: 'none',
                borderRadius: '12px',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)',
                transition: 'all 0.2s'
              }}
            >
              {isSendingDiscord ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
              <span>{isSendingDiscord ? 'جارِ النشر إلى ديسكورد...' : 'اعتماد ونشر هذا البيان إلى ديسكورد الآن 🚀'}</span>
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
