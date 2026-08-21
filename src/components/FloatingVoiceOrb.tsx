'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  X, 
  Sparkles, 
  Bot, 
  Send, 
  TrendingUp, 
  Truck, 
  Package, 
  ShieldCheck 
} from 'lucide-react';
import { Contract, Container, Receipt, UserRole } from '@/types/database';
import { formatSaudiCheerResponse, speakSaudiFemaleVoice, stopSpeaking } from '@/utils/voiceAssistant';

interface FloatingVoiceOrbProps {
  userRole: UserRole;
  contracts: Contract[];
  containers: Container[];
  receipts: Receipt[];
}

export const FloatingVoiceOrb: React.FC<FloatingVoiceOrbProps> = ({
  userRole,
  contracts,
  containers,
  receipts
}) => {
  // STRICT ADMIN ONLY: If not admin, hide completely from UI
  if (userRole !== 'admin') {
    return null;
  }

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [voiceMuted, setVoiceMuted] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [lastResponse, setLastResponse] = useState<string>('يا هلا والله يا بو سعود 🌸 اضغط على المايك وتكلم، أنا أسمعك وجاهزة لأي سؤال عن الحاويات والأرباح والعقود!');
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'ar-SA';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const text = event.results[current][0].transcript;
          setTranscript(text);
          if (event.results[current].isFinal) {
            handleProcessVoiceInput(text);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Voice recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      stopSpeaking();
    };
  }, [contracts, containers, receipts, voiceMuted]);

  // Process Voice Query and Respond Cheerfully
  const handleProcessVoiceInput = (inputText: string) => {
    if (!inputText.trim()) return;

    // Calculate live numbers
    const todayStr = new Date().toISOString().split('T')[0];
    const availableCount = containers.filter(c => c.status === 'available').length;
    const activeCount = contracts.filter(c => c.status === 'active').length;
    const todayReceipts = receipts.filter(r => r.issued_at?.startsWith(todayStr) || r.created_at?.startsWith(todayStr));
    const cashIncome = todayReceipts.filter(r => r.payment_method === 'cash').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const electronicIncome = todayReceipts.filter(r => r.payment_method !== 'cash').reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const totalIncome = cashIncome + electronicIncome;

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const expiringCount = contracts.filter(c => c.status === 'active' && c.end_date?.startsWith(tomorrow)).length;

    // Generate cheerful Saudi response
    const { speechText, displayText } = formatSaudiCheerResponse(inputText, {
      availableCount,
      totalIncome,
      cashIncome,
      electronicIncome,
      expiringCount,
      activeCount
    });

    setLastResponse(displayText);

    // Speak back in cheerful sweet Saudi female voice if not muted
    if (!voiceMuted) {
      setIsSpeaking(true);
      speakSaudiFemaleVoice(speechText, () => setIsSpeaking(false));
    }
  };

  // Toggle Voice Listening
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      stopSpeaking();
      setIsSpeaking(false);
      setTranscript('');
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  };

  return (
    <>
      <style>{`
        @keyframes floatOrbPulse {
          0%, 100% {
            box-shadow: 0 0 25px rgba(245, 158, 11, 0.4), 0 0 50px rgba(236, 72, 153, 0.2);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 35px rgba(245, 158, 11, 0.7), 0 0 70px rgba(236, 72, 153, 0.4);
            transform: scale(1.06);
          }
        }

        @keyframes waveAnimation {
          0%, 100% { height: 6px; }
          50% { height: 26px; }
        }

        .voice-wave-bar {
          width: 3px;
          background: #fbbf24;
          border-radius: 3px;
          animation: waveAnimation 1s infinite ease-in-out;
        }
      `}</style>

      {/* 👑 Floating Trigger Orb (Bottom-Left) */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 9990,
        direction: 'rtl'
      }}>
        {!isOpen && (
          <button
            onClick={() => {
              setIsOpen(true);
              if (!voiceMuted && !isSpeaking) {
                setIsSpeaking(true);
                speakSaudiFemaleVoice('يا هلا والله يا بو سعود، أنا معك وجاهزة لأي استفسار!', () => setIsSpeaking(false));
              }
            }}
            style={{
              width: '62px',
              height: '62px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #d97706 100%)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              color: '#050811',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              animation: 'floatOrbPulse 3.5s infinite ease-in-out',
              position: 'relative'
            }}
            title="مساعد المدير الذكي الصوتي (خاص بالإدارة)"
          >
            <Mic size={28} strokeWidth={2.4} />
            
            {/* Crown badge */}
            <div style={{
              position: 'absolute',
              top: '-6px',
              right: '-4px',
              background: '#050811',
              border: '1px solid #fbbf24',
              borderRadius: '10px',
              padding: '1px 5px',
              fontSize: '0.65rem',
              color: '#fbbf24',
              fontWeight: 900
            }}>
              👑 AI
            </div>
          </button>
        )}

        {/* 🌟 Voice Conversation Pop-up Card */}
        {isOpen && (
          <div style={{
            width: '360px',
            maxWidth: 'calc(100vw - 32px)',
            background: 'linear-gradient(165deg, rgba(15, 23, 42, 0.96) 0%, rgba(5, 8, 17, 0.98) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '24px',
            padding: '22px 20px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(245, 158, 11, 0.2)',
            animation: 'fadeIn 0.2s ease',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#050811'
                }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>مساعد المحترز الذكي</span>
                    <span style={{ fontSize: '0.7rem', color: '#fbbf24' }}>👑</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>
                    {isSpeaking ? '🌸 تتحدث بصوت رقيق مبتسم...' : isListening ? '🎙️ تستمع لصوتك الآن...' : '✨ جاهزة لخدمتك يا بو سعود'}
                  </div>
                </div>
              </div>

              {/* Action Icons (Mute & Close) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => {
                    const newMuted = !voiceMuted;
                    setVoiceMuted(newMuted);
                    if (newMuted) stopSpeaking();
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    borderRadius: '8px',
                    width: '30px',
                    height: '30px',
                    color: voiceMuted ? '#f87171' : '#34d399',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title={voiceMuted ? 'تفعيل الصوت' : 'كتم الصوت'}
                >
                  {voiceMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>

                <button
                  onClick={() => {
                    stopSpeaking();
                    setIsOpen(false);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: 'none',
                    borderRadius: '8px',
                    width: '30px',
                    height: '30px',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Conversation Box */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '14px',
              marginBottom: '16px',
              minHeight: '110px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              {transcript && (
                <div style={{ fontSize: '0.78rem', color: '#fbbf24', marginBottom: '8px', fontWeight: 700 }}>
                  🎤 سمعتك تقول: "{transcript}"
                </div>
              )}
              <div style={{ fontSize: '0.86rem', color: '#f8fafc', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {lastResponse}
              </div>
            </div>

            {/* Live Waveform when speaking or listening */}
            {(isListening || isSpeaking) && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                height: '30px',
                marginBottom: '14px'
              }}>
                <div className="voice-wave-bar" style={{ animationDelay: '0s' }} />
                <div className="voice-wave-bar" style={{ animationDelay: '0.2s' }} />
                <div className="voice-wave-bar" style={{ animationDelay: '0.4s' }} />
                <div className="voice-wave-bar" style={{ animationDelay: '0.1s' }} />
                <div className="voice-wave-bar" style={{ animationDelay: '0.3s' }} />
              </div>
            )}

            {/* Main Microphone Button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={toggleListening}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '14px',
                  background: isListening 
                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                    : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  border: 'none',
                  color: '#050811',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: isListening 
                    ? '0 0 25px rgba(239, 68, 68, 0.5)' 
                    : '0 8px 25px rgba(245, 158, 11, 0.35)',
                  transition: 'all 0.2s ease'
                }}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                <span>{isListening ? 'اضغط لإيقاف التسجيل...' : 'اضغط هنا وتحدث بصوتك 🎙️'}</span>
              </button>

              {/* Quick Chips */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={() => handleProcessVoiceInput('كم الحاويات الشاغرة')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '4px 10px',
                    color: '#94a3b8',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  📦 الحاويات الشاغرة
                </button>

                <button
                  onClick={() => handleProcessVoiceInput('كم دخل اليوم كاش')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '4px 10px',
                    color: '#94a3b8',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  💰 دخل اليوم
                </button>

                <button
                  onClick={() => handleProcessVoiceInput('العقود المنتهية غدا')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '4px 10px',
                    color: '#94a3b8',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  ⚠️ عقود تنتهي غداً
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
