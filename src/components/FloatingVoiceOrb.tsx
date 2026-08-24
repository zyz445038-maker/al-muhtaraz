'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  X, 
  Sparkles, 
  Bot, 
  Send, 
  TrendingUp, 
  Truck, 
  Package, 
  ShieldCheck 
} from 'lucide-react';
import { 
  Contract, 
  Container, 
  Customer,
  Profile,
  Receipt, 
  UserRole 
} from '@/types/database';
import { 
  processDeepAssistantQuery 
} from '@/utils/aiCopilotBrain';

interface FloatingVoiceOrbProps {
  userRole: UserRole;
  contracts: Contract[];
  containers: Container[];
  customers?: Customer[];
  staffList?: Profile[];
  receipts: Receipt[];
}

export const FloatingVoiceOrb: React.FC<FloatingVoiceOrbProps> = ({
  userRole,
  contracts,
  containers,
  customers = [],
  staffList = [],
  receipts
}) => {
  // STRICT ADMIN ONLY: If not admin, hide completely from UI
  if (userRole !== 'admin') {
    return null;
  }

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [lastSpeechText, setLastSpeechText] = useState<string>('يا هلا والله يا بو سعود، أنا معك وجاهز لأي استفسار!');
  const [lastResponse, setLastResponse] = useState<string>('يا هلا والله يا بو سعود 🌸 اسألني عن أي تفصيل في العقود، الحاويات، كبار العملاء، المبالغ المتبقية، أو المستودع!');
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

    return () => {};
  }, [contracts, containers, customers, staffList, receipts]);

  // Process Real-time Deep Reasoning Query
  const handleProcessVoiceInput = (inputText: string) => {
    if (!inputText.trim()) return;

    // Process through Deep Intelligence Brain
    const { displayText } = processDeepAssistantQuery(inputText, {
      contracts,
      containers,
      customers,
      staffList,
      receipts
    });

    // Update text response instantly
    setLastSpeechText(displayText);
    setLastResponse(displayText);
  };


  // Toggle Voice Dictation Listening
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
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
            onClick={() => setIsOpen(true)}
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
            title="مساعد المدير الذكي (خاص بالإدارة)"
          >
            <Bot size={28} strokeWidth={2.4} />
            
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

        {/* 🌟 Conversation Pop-up Card */}
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
                    {isListening ? '🎙️ يستمع لصوتك الآن...' : '✨ جاهز لخدمتك يا بو سعود'}
                  </div>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => setIsOpen(false)}
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

            {/* Conversation Box */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '14px',
              marginBottom: '16px',
              minHeight: '110px',
              maxHeight: '260px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              {transcript && (
                <div style={{ fontSize: '0.78rem', color: '#fbbf24', marginBottom: '8px', fontWeight: 700 }}>
                  🎤 سؤالك: "{transcript}"
                </div>
              )}
              <div style={{ fontSize: '0.86rem', color: '#f8fafc', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {lastResponse}
              </div>
            </div>


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
