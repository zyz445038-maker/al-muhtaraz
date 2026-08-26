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
  ShieldCheck,
  Loader2
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
import { playInteractionFeedback } from '@/utils/audioFeedback';

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
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [manualInput, setManualInput] = useState<string>('');
  const [lastSpeechText, setLastSpeechText] = useState<string>('أَهْلاً بِأَبُو مَاجِدْ.. أَنَا تَحْتَ أَمْرِكْ، تَفَضَّلْ وَأَبْشِرْ.');
  const [lastResponse, setLastResponse] = useState<string>('أهلاً بك يا أبو ماجد.. أنا تحت أمرك، تفضل وأبشر.');
  
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const accumulatedTextRef = useRef<string>('');
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep ref synchronized
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Initialize Speech Recognition with continuous stream & long-phrase tolerance
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true; // ✅ Do not stop on brief pauses
        recognition.interimResults = true;
        recognition.lang = 'ar-SA';

        recognition.onstart = () => {
          setIsListening(true);
          playInteractionFeedback('start_listening');
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              accumulatedTextRef.current += ' ' + event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const currentFullText = (accumulatedTextRef.current + ' ' + interimTranscript).trim();
          setTranscript(currentFullText);

          // Reset silence timer on every new speech chunk (gives 4.5 seconds for user to pause/think)
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          silenceTimerRef.current = setTimeout(() => {
            if (currentFullText.length > 2 && isListeningRef.current) {
              // User has finished speaking after 4.5s of silence
              handleProcessVoiceInput(currentFullText);
              stopListeningSession();
            }
          }, 4500);
        };

        recognition.onerror = (event: any) => {
          console.warn('Voice recognition error:', event.error);
          if (event.error !== 'no-speech') {
            setIsListening(false);
          }
        };

        recognition.onend = () => {
          // If the user hasn't explicitly stopped listening, keep session alive
          if (isListeningRef.current) {
            try {
              recognition.start();
            } catch (e) {
              setIsListening(false);
            }
          } else {
            setIsListening(false);
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [contracts, containers, customers, staffList, receipts]);

  // Stop listening cleanly
  const stopListeningSession = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    isListeningRef.current = false;
    setIsListening(false);
    try {
      recognitionRef.current?.stop();
    } catch (e) {}
  };

  // Process Real-time Deep Reasoning Query with interactive typing & audio feedback
  const handleProcessVoiceInput = (inputText: string) => {
    const cleanQuery = inputText.trim();
    if (!cleanQuery) return;

    stopListeningSession();
    setIsThinking(true);
    playInteractionFeedback('thinking'); // 🎵 Play soft thinking chime

    // Simulate natural thinking/typing reaction (350ms)
    setTimeout(() => {
      const { displayText } = processDeepAssistantQuery(cleanQuery, {
        contracts,
        containers,
        customers,
        staffList,
        receipts
      });

      setIsThinking(false);
      setLastSpeechText(displayText);
      setLastResponse(displayText);
      playInteractionFeedback('response'); // 🎵 Play crisp answer completion chime
      accumulatedTextRef.current = '';
    }, 450);
  };

  // Toggle Voice Dictation Listening
  const toggleListening = () => {
    if (isListening) {
      if (transcript.trim().length > 1) {
        handleProcessVoiceInput(transcript);
      } else {
        stopListeningSession();
      }
    } else {
      setTranscript('');
      accumulatedTextRef.current = '';
      isListeningRef.current = true;
      try {
        recognitionRef.current?.start();
        setIsListening(true);
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
        @keyframes typingDots {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }

        .floating-voice-orb-container {
          position: fixed;
          bottom: 24px;
          left: 24px;
          z-index: 9990;
          direction: rtl;
        }

        @media (max-width: 768px) {
          .floating-voice-orb-container {
            bottom: 75px !important;
            left: 16px !important;
          }
        }
      `}</style>

      {/* 👑 Floating Trigger Orb (Elevated above Mobile Bottom Bar) */}
      <div className="floating-voice-orb-container">
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
            width: '380px',
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
                  <div style={{ fontSize: '0.74rem', color: isListening ? '#38bdf8' : isThinking ? '#fbbf24' : '#34d399', fontWeight: 700 }}>
                    {isListening ? '🎙️ يستمع لك.. تحدث براحتك' : isThinking ? '⚡ جاري التحليل وصياغة الرد...' : '✨ جاهز لخدمتك يا أبو ماجد'}
                  </div>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => {
                  stopListeningSession();
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

            {/* Conversation Box */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '14px',
              marginBottom: '14px',
              minHeight: '120px',
              maxHeight: '260px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              position: 'relative'
            }}>
              {transcript && (
                <div style={{
                  fontSize: '0.8rem',
                  color: '#fbbf24',
                  marginBottom: '8px',
                  fontWeight: 700,
                  background: 'rgba(245, 158, 11, 0.1)',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(245, 158, 11, 0.2)'
                }}>
                  🎤 جاري الاستماع: "{transcript}"
                </div>
              )}

              {/* Dynamic Typing & Thinking Reaction */}
              {isThinking ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  borderRadius: '10px',
                  color: '#fbbf24',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span>المساعد يحلل البيانات ويكتب الإجابة...</span>
                  <div style={{ display: 'flex', gap: '3px', marginRight: 'auto' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fbbf24', animation: 'typingDots 1.4s infinite ease-in-out' }}></span>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fbbf24', animation: 'typingDots 1.4s infinite ease-in-out', animationDelay: '0.2s' }}></span>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#fbbf24', animation: 'typingDots 1.4s infinite ease-in-out', animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.86rem', color: '#f8fafc', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {lastResponse}
                </div>
              )}
            </div>

            {/* Quick Text Input for Long/Edited Requests */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualInput.trim()) {
                  handleProcessVoiceInput(manualInput);
                  setManualInput('');
                }
              }}
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '12px'
              }}
            >
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="أو اكتب طلبك بالتفصيل هنا..."
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'rgba(245, 158, 11, 0.2)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: '10px',
                  padding: '0 12px',
                  color: '#fbbf24',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Send size={15} />
              </button>
            </form>

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
                  fontSize: '0.92rem',
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
                <span>{isListening ? 'اضغط لإرسال السؤال الآن ⚡' : 'اضغط هنا وتحدث بصوتك 🎙️'}</span>
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
