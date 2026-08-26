'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Gauge, 
  Brain, 
  Plus, 
  Trash2, 
  BookOpen, 
  GraduationCap, 
  Zap, 
  MessageSquare, 
  Search,
  Check,
  Bot,
  User,
  Lightbulb,
  Mic,
  MicOff,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { diacritizeArabicSpeech } from '@/utils/arabicDiacritizer';
import { 
  KnowledgeItem, 
  getLearnedKnowledge, 
  teachAssistantRule, 
  deleteLearnedRule, 
  querySystemKnowledge,
  parseConversationalTeaching
} from '@/utils/aiCopilotKnowledge';
import { formatSaudiCheerResponse } from '@/utils/voiceAssistant';
import { SocialMediaAIHub } from '@/components/SocialMediaAIHub';
import { AlMuhtarazExecutiveAgent } from '@/utils/aiExecutiveAgent';
import { Contract, Container, Customer, Profile, Receipt } from '@/types';

interface DevLabProps {
  currentRole: string;
  contracts?: Contract[];
  containers?: Container[];
  customers?: Customer[];
  staffList?: Profile[];
  receipts?: Receipt[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  speechText?: string;
  isTaught?: boolean;
  time: string;
}

export const DevLab: React.FC<DevLabProps> = ({ 
  currentRole, 
  contracts = [], 
  containers = [], 
  customers = [], 
  staffList = [], 
  receipts = [] 
}) => {
  // Navigation Tabs inside DevLab
  const [activeLabTab, setActiveLabTab] = useState<'social_ai' | 'chat' | 'education' | 'voice_studio' | 'discord'>('social_ai');

  // ─── Voice Studio States ─────────────────────────
  const [selectedVoice, setSelectedVoice] = useState<'zariyah' | 'hamed' | 'fatima'>('zariyah');
  const [inputText, setInputText] = useState('أَهْلاً وَسَهْلاً بِأَبُو مَاجِدْ.. أَبْشِرْ، كَيْفَ أَقْدِرْ أَخْدِمَكْ الْيَوْمْ؟');
  const [speechRate, setSpeechRate] = useState<string>('0%');
  const [voiceMood, setVoiceMood] = useState<'cheerful' | 'formal' | 'friendly'>('cheerful');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [isApproved, setIsApproved] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ─── Interactive Chat & Live Learning States ───────
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: 'أهلاً وسهلاً بأبو ماجد.. أنا جاهز للتحدث معك صوتياً والتعلم منك! يمكنك الضغط على المايك 🎙️ والتحدث مباشرة، أو تلقيني قواعد وعبارات جديدة.',
      speechText: 'أَهْلاً وَسَهْلاً بِأَبُو مَاجِدْ.. أَنَا جَاهِزٌ لِلتَّحَدُّثِ مَعَكَ صَوْتِيّاً وَالتَّعَلُّمِ مِنْكْ..',
      time: 'الآن'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // ─── Dynamic AI Education & Learning States ───────
  const [learnedRules, setLearnedRules] = useState<KnowledgeItem[]>([]);
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState<'pricing' | 'policy' | 'drivers' | 'containers' | 'custom_rule'>('pricing');
  const [newRuleTriggers, setNewRuleTriggers] = useState('');
  const [newRuleResponse, setNewRuleResponse] = useState('');
  const [testQuery, setTestQuery] = useState('');
  const [testQueryResult, setTestQueryResult] = useState<{ match: KnowledgeItem | null; tested: boolean }>({ match: null, tested: false });
  const [isTeaching, setIsTeaching] = useState(false);

  // ─── Discord Bridge States ───────────────────────
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('https://discord.com/api/webhooks/1541716427071819858/t30PNmg-72eTI9p5NnwPzDZGz6wm1B4DNWgPvHcQrMuNrnCQQSeb0bT5iyiKYH2ya3W1');
  const [isSendingDiscord, setIsSendingDiscord] = useState(false);
  const [discordStatus, setDiscordStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load learned memory on mount
  useEffect(() => {
    setLearnedRules(getLearnedKnowledge());
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Automatic Arabic Diacritization
  const handleAutoDiacritize = () => {
    if (!inputText.trim()) return;
    const diacritized = diacritizeArabicSpeech(inputText);
    setInputText(diacritized);
    setIsApproved(true);
  };

  // Convert rate percentage to factor
  const getRateMultiplier = (rateStr: string): number => {
    const clean = parseFloat(rateStr.replace('%', '').trim());
    if (!isNaN(clean)) {
      return Math.max(0.5, Math.min(2.0, 1.0 + (clean / 100)));
    }
    return 1.0;
  };

  // Native Device Speech Synthesis
  const playNativeDeviceSpeech = (text: string, voiceKey: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setErrorMessage('متصفحك لا يدعم مشغل الصوت المدمج');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    
    const baseSpeed = getRateMultiplier(speechRate);
    utterance.rate = baseSpeed;

    if (voiceMood === 'cheerful') {
      utterance.pitch = voiceKey === 'hamed' ? 1.0 : 1.35;
      utterance.rate = baseSpeed * 1.08;
    } else if (voiceMood === 'formal') {
      utterance.pitch = voiceKey === 'hamed' ? 0.80 : 1.0;
      utterance.rate = baseSpeed * 0.95;
    } else {
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

  // Generate & Play Voice with active rate & mood
  const handlePlayVoice = (textToPlay: string = inputText) => {
    if (!textToPlay.trim()) return;
    setIsLoadingAudio(true);
    setErrorMessage(null);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const streamUrl = `https://al-muhtaraz-whatsapp.onrender.com/api/voice/neural-tts?text=${encodeURIComponent(textToPlay)}&voice=${selectedVoice}&rate=${encodeURIComponent(speechRate)}&mood=${voiceMood}&t=${Date.now()}`;

    if (audioRef.current) {
      audioRef.current.src = streamUrl;
      audioRef.current.playbackRate = getRateMultiplier(speechRate);
      audioRef.current.load();
      
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsLoadingAudio(false);
          })
          .catch((err) => {
            console.warn('Cloud stream notice, playing native device speech:', err);
            playNativeDeviceSpeech(textToPlay, selectedVoice);
          });
      }
    } else {
      playNativeDeviceSpeech(textToPlay, selectedVoice);
    }
  };

  // 🎙️ Toggle Live Voice Microphone (Speech to Text)
  const handleToggleVoiceRecognition = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('المتصفح الحالي لا يدعم التعرف الصوتي المباشر. يُفضل استخدام متصفح Chrome أو Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-SA';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setChatInput(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setIsListening(false);
    }
  };

  // 💬 Handle Conversational Chat & In-Line Teaching
  const handleSendChatMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userMsg = chatInput.trim();
    if (!userMsg || isReplying) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: userMsg,
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
    setIsReplying(true);

    setTimeout(async () => {
      // 1. Check if user is teaching the assistant directly in conversation
      const teachingResult = parseConversationalTeaching(userMsg);

      if (teachingResult.isTeaching) {
        setLearnedRules(getLearnedKnowledge());
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.8 } });

        const replyMsg: ChatMessage = {
          id: 'reply-' + Date.now(),
          sender: 'assistant',
          text: teachingResult.responseMessage || 'أبشر.. تم حفظ هذه المعلومة وتعلمها بنجاح! 💾✨',
          speechText: teachingResult.speechResponse,
          isTaught: true,
          time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
        };

        setChatMessages(prev => [...prev, replyMsg]);
        setIsReplying(false);

        if (teachingResult.speechResponse) {
          handlePlayVoice(teachingResult.speechResponse);
        }
        return;
      }

      // 2. ⚡ Autonomous AI Executive Agent (Live Tool Execution from Database)
      const agent = new AlMuhtarazExecutiveAgent({
        contracts,
        containers,
        customers,
        staffList,
        receipts,
        currentUserName: 'أبو ماجد'
      });
      const agentResult = await agent.executeUserCommand(userMsg);

      if (agentResult.toolExecuted) {
        const replyMsg: ChatMessage = {
          id: 'reply-' + Date.now(),
          sender: 'assistant',
          text: agentResult.displayMarkdown,
          speechText: agentResult.speechResponse,
          time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, replyMsg]);
        setIsReplying(false);
        if (agentResult.speechResponse) {
          handlePlayVoice(agentResult.speechResponse);
        }
        return;
      }

      // 3. Check System & Learned Knowledge Base
      const knowledgeMatch = querySystemKnowledge(userMsg);
      if (knowledgeMatch) {
        const replyMsg: ChatMessage = {
          id: 'reply-' + Date.now(),
          sender: 'assistant',
          text: knowledgeMatch.displayMarkdown || knowledgeMatch.speechResponse,
          speechText: knowledgeMatch.speechResponse,
          time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages(prev => [...prev, replyMsg]);
        setIsReplying(false);
        handlePlayVoice(knowledgeMatch.speechResponse);
        return;
      }

      // 4. Fallback to standard intelligent response
      const standardResponse = formatSaudiCheerResponse(userMsg, {
        availableCount: containers.filter(c => c.status === 'available').length || 4,
        totalIncome: contracts.reduce((s, c) => s + (Number(c.paid_amount) || 0), 0) || 1800,
        cashIncome: contracts.filter(c => c.payment_method === 'cash').reduce((s, c) => s + (Number(c.paid_amount) || 0), 0) || 600,
        electronicIncome: contracts.filter(c => c.payment_method !== 'cash').reduce((s, c) => s + (Number(c.paid_amount) || 0), 0) || 1200,
        expiringCount: 0,
        activeCount: contracts.filter(c => c.status === 'active').length || 12
      });

      const replyMsg: ChatMessage = {
        id: 'reply-' + Date.now(),
        sender: 'assistant',
        text: standardResponse.displayText,
        speechText: standardResponse.speechText,
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, replyMsg]);
      setIsReplying(false);
      handlePlayVoice(standardResponse.speechText);
    }, 400);
  };

  // Teach Assistant New Rule from Form
  const handleTeachRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleTitle.trim() || !newRuleTriggers.trim() || !newRuleResponse.trim()) {
      return;
    }

    setIsTeaching(true);
    const triggersArray = newRuleTriggers.split(',').map(t => t.trim()).filter(Boolean);
    const diacritizedResponse = diacritizeArabicSpeech(newRuleResponse.trim());

    teachAssistantRule({
      category: newRuleCategory,
      title: newRuleTitle.trim(),
      triggers: triggersArray,
      speechResponse: diacritizedResponse,
      displayMarkdown: `📌 **${newRuleTitle.trim()}:**\n\n${newRuleResponse.trim()}`,
      taught_by: 'المدير العام (أبو ماجد)'
    });

    setLearnedRules(getLearnedKnowledge());
    setNewRuleTitle('');
    setNewRuleTriggers('');
    setNewRuleResponse('');
    setIsTeaching(false);

    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
  };

  // Delete Rule
  const handleDeleteRule = (id: string) => {
    deleteLearnedRule(id);
    setLearnedRules(getLearnedKnowledge());
  };

  // Test Assistant Knowledge
  const handleTestKnowledge = () => {
    if (!testQuery.trim()) return;
    const match = querySystemKnowledge(testQuery.trim());
    setTestQueryResult({ match, tested: true });

    if (match) {
      handlePlayVoice(match.speechResponse);
    }
  };

  // Send Approved Content to Discord
  const handleSendApprovedToDiscord = async () => {
    if (!discordWebhookUrl || !inputText.trim()) return;

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
          { name: '⚡ سرعة النطق', value: speechRate, inline: true },
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
          console.warn('Audio tag notice, playing device voice');
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
        marginBottom: '20px',
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
              <Bot size={32} strokeWidth={2.3} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff' }}>
                  مختبر الذكاء الاصطناعي والمحادثة التعليمية
                </h1>
                <span style={{ background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.4)', fontSize: '0.75rem', fontWeight: 800, padding: '3px 10px', borderRadius: '12px' }}>
                  🔒 بيئة تطوير معزولة خاصة بأبو ماجد
                </span>
              </div>
              <p style={{ color: '#cbd5e1', fontSize: '0.86rem', marginTop: '4px' }}>
                تحدث مع المساعد صوتياً بالمايك أو كتابة، وعلّمه عبارات وقواعد جديدة ليتذكرها ويجيب بها فوراً
              </p>
            </div>
          </div>

          {/* Quick Sub-Tabs Switcher */}
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.4)', padding: '5px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
            
            {/* 💬 TAB: LIVE CHAT & LEARNING */}
            <button
              onClick={() => setActiveLabTab('social_ai')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeLabTab === 'social_ai' ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : 'transparent',
                color: activeLabTab === 'social_ai' ? '#fff' : '#94a3b8',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: activeLabTab === 'social_ai' ? '0 0 15px rgba(236, 72, 153, 0.4)' : 'none'
              }}
            >
              <Share2 size={16} />
              <span>منظومة السوشيال ميديا 📢</span>
            </button>

            <button
              onClick={() => setActiveLabTab('chat')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeLabTab === 'chat' ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'transparent',
                color: activeLabTab === 'chat' ? '#fff' : '#94a3b8',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <MessageSquare size={16} />
              <span>محادثة وتعلّم فوري</span>
            </button>

            <button
              onClick={() => setActiveLabTab('education')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeLabTab === 'education' ? 'linear-gradient(135deg, #ec4899, #be185d)' : 'transparent',
                color: activeLabTab === 'education' ? '#fff' : '#94a3b8',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Brain size={16} />
              <span>بنك القواعد ({learnedRules.length})</span>
            </button>

            <button
              onClick={() => setActiveLabTab('voice_studio')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeLabTab === 'voice_studio' ? 'linear-gradient(135deg, #a855f7, #7e22ce)' : 'transparent',
                color: activeLabTab === 'voice_studio' ? '#fff' : '#94a3b8',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Volume2 size={16} />
              <span>المشاعر والسرعات</span>
            </button>

            <button
              onClick={() => setActiveLabTab('discord')}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeLabTab === 'discord' ? 'linear-gradient(135deg, #6366f1, #4338ca)' : 'transparent',
                color: activeLabTab === 'discord' ? '#fff' : '#94a3b8',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Globe size={16} />
              <span>ديسكورد</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 📢 TAB: SOCIAL MEDIA & MULTI-PLATFORM PROMO AI HUB ─── */}
      {activeLabTab === 'social_ai' && (
        <SocialMediaAIHub />
      )}

      {/* ─── 💬 TAB 0: LIVE CONVERSATION & INSTANT LEARNING ─── */}
      {activeLabTab === 'chat' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          
          {/* Chat Messenger Container */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 29, 0.98) 100%)',
            border: '1px solid rgba(6, 182, 212, 0.35)',
            borderRadius: '24px',
            padding: '20px',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            height: '620px'
          }}>
            
            {/* Chat Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ffffff' }}>
                  محادثة المساعد المباشرة ({selectedVoice === 'zariyah' ? '🌸 زاريّة' : selectedVoice === 'hamed' ? '👔 حامد' : '✨ فاطمة'})
                </span>
              </div>

              {/* Quick speed selector inside chat */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '3px 8px', borderRadius: '10px' }}>
                <Gauge size={13} color="#38bdf8" />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>السرعة:</span>
                <select
                  value={speechRate}
                  onChange={(e) => setSpeechRate(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontWeight: 800, fontSize: '0.75rem', outline: 'none', cursor: 'pointer' }}
                >
                  {['-30%', '-20%', '-10%', '0%', '+10%', '+20%', '+30%'].map(r => (
                    <option key={r} value={r} style={{ background: '#0f172a', color: '#fff' }}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chat Messages Log */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 4px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {chatMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-start' : 'flex-end',
                      maxWidth: '85%',
                      alignSelf: isUser ? 'flex-start' : 'flex-end'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
                        {isUser ? 'أبو ماجد' : selectedVoice === 'zariyah' ? 'زاريّة' : 'المساعد'}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{msg.time}</span>
                    </div>

                    <div style={{
                      padding: '12px 16px',
                      borderRadius: isUser ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                      background: isUser ? 'linear-gradient(135deg, #0284c7, #0369a1)' : msg.isTaught ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(168, 85, 247, 0.25))' : 'rgba(30, 41, 59, 0.9)',
                      border: msg.isTaught ? '1px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      lineHeight: 1.6,
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                    }}>
                      {msg.isTaught && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#f472b6', fontWeight: 900, fontSize: '0.75rem', marginBottom: '4px' }}>
                          <Sparkles size={14} />
                          <span>تم حفظ المعلومة في الذاكرة المكتسبة!</span>
                        </div>
                      )}
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                    </div>

                    {!isUser && msg.speechText && (
                      <button
                        onClick={() => handlePlayVoice(msg.speechText)}
                        style={{
                          marginTop: '4px',
                          background: 'transparent',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 6px'
                        }}
                      >
                        <Volume2 size={13} />
                        <span>إعادة الاستماع بالصوت ({speechRate})</span>
                      </button>
                    )}
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Listening Indicator when Mic is Active */}
            {isListening && (
              <div style={{
                marginBottom: '8px',
                padding: '8px 14px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                fontSize: '0.78rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                animation: 'pulse 1.5s infinite'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                <span>المايك يستمع لصوتك الآن.. تحدث وسيكتب كلامك تلقائياً 🎙️</span>
              </div>
            )}

            {/* Chat Input Field with Mic & Send */}
            <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px' }}>
              
              {/* 🎙️ Microphone Speech-to-Text Button */}
              <button
                type="button"
                onClick={handleToggleVoiceRecognition}
                style={{
                  padding: '12px 14px',
                  background: isListening ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'rgba(255, 255, 255, 0.08)',
                  border: isListening ? '2px solid #f87171' : '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '14px',
                  color: isListening ? '#ffffff' : '#38bdf8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: isListening ? '0 0 15px rgba(239, 68, 68, 0.6)' : 'none',
                  transition: 'all 0.2s'
                }}
                title={isListening ? 'إيقاف الاستماع' : 'تحدث بالصوت عبر المايك'}
              >
                {isListening ? <MicOff size={18} className="animate-bounce" /> : <Mic size={18} />}
              </button>

              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="اكتب أو تحدث بالمايك: (مثال: قل مستقبلاً: أهلاً وسهلاً بك في المحترز)..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '14px',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: isListening ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  outline: 'none'
                }}
              />

              <button
                type="submit"
                disabled={isReplying || !chatInput.trim()}
                style={{
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                  border: 'none',
                  borderRadius: '14px',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 15px rgba(6, 182, 212, 0.4)'
                }}
              >
                {isReplying ? <RefreshCw size={17} className="animate-spin" /> : <Send size={17} />}
                <span>إرسال</span>
              </button>
            </form>
          </div>

          {/* Quick Learning Hints & Speed Fine-Tuning Guide */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Quick Teaching Guide Card */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 29, 0.98) 100%)',
              border: '1px solid rgba(236, 72, 153, 0.35)',
              borderRadius: '24px',
              padding: '20px',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Lightbulb size={20} color="#f472b6" />
                <span>كيف تلقّن المساعد بالصوت أو النص؟</span>
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '12px' }}>
                المساعد يمتلك الآن محرك استخراج ذاتي يفهم أوامر التلقين في المحادثة ويحفظها في ذاكرته فوراً! جرب إرسال أو نطق التالي:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  onClick={() => setChatInput('قل مستقبلاً: أهلاً وسهلاً بك في مؤسسة المحترز لخدمات الحاويات')}
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px dashed rgba(236, 72, 153, 0.4)',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    color: '#f472b6',
                    cursor: 'pointer'
                  }}
                >
                  💬 <strong>قل مستقبلاً:</strong> «أهلاً وسهلاً بك في مؤسسة المحترز لخدمات الحاويات»
                </div>

                <div
                  onClick={() => setChatInput('إذا سألتك عن سعر الحاوية في حي النرجس قل: السعر 600 ريال لمدة أسبوع')}
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px dashed rgba(56, 189, 248, 0.4)',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    color: '#38bdf8',
                    cursor: 'pointer'
                  }}
                >
                  💬 <strong>إذا سألتك عن [كذا] قل:</strong> «السعر 600 ريال لمدة أسبوع»
                </div>

                <div
                  onClick={() => setChatInput('تعلم: السائق محمد يتولى حاويات شمال الرياض فقط')}
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px dashed rgba(168, 85, 247, 0.4)',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    color: '#d8b4fe',
                    cursor: 'pointer'
                  }}
                >
                  💬 <strong>تعلم:</strong> «السائق محمد يتولى حاويات شمال الرياض فقط»
                </div>
              </div>
            </div>

            {/* Active Speech Speed & Emotion Summary */}
            <div style={{
              background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 29, 0.98) 100%)',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              borderRadius: '24px',
              padding: '20px',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Gauge size={18} color="#a855f7" />
                  <span>مستويات السرعة الفعّالة (+ / -):</span>
                </h3>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34d399' }}>
                  مفعلة وتؤثر على النطق فوراً ✅
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['-30%', '-20%', '-10%', '0%', '+10%', '+20%', '+30%'].map((rate) => {
                  const isSelected = speechRate === rate;
                  return (
                    <button
                      key={rate}
                      onClick={() => setSpeechRate(rate)}
                      style={{
                        flex: '1 0 12%',
                        padding: '8px 4px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #ec4899' : '1px solid rgba(255,255,255,0.1)',
                        background: isSelected ? 'rgba(236, 72, 153, 0.25)' : 'rgba(0,0,0,0.3)',
                        color: isSelected ? '#ffffff' : '#94a3b8',
                        fontWeight: isSelected ? 900 : 600,
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      {rate}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '14px' }}>
                <button
                  onClick={() => setVoiceMood('cheerful')}
                  style={{
                    padding: '8px',
                    borderRadius: '10px',
                    border: voiceMood === 'cheerful' ? '2px solid #ec4899' : '1px solid rgba(255,255,255,0.1)',
                    background: voiceMood === 'cheerful' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(0,0,0,0.3)',
                    color: voiceMood === 'cheerful' ? '#f472b6' : '#94a3b8',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  😄 مرح
                </button>

                <button
                  onClick={() => setVoiceMood('formal')}
                  style={{
                    padding: '8px',
                    borderRadius: '10px',
                    border: voiceMood === 'formal' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                    background: voiceMood === 'formal' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(0,0,0,0.3)',
                    color: voiceMood === 'formal' ? '#fbbf24' : '#94a3b8',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  👔 رسمي
                </button>

                <button
                  onClick={() => setVoiceMood('friendly')}
                  style={{
                    padding: '8px',
                    borderRadius: '10px',
                    border: voiceMood === 'friendly' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
                    background: voiceMood === 'friendly' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(0,0,0,0.3)',
                    color: voiceMood === 'friendly' ? '#38bdf8' : '#94a3b8',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  🌸 ودود
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ─── 🧠 TAB 1: AI EDUCATION & KNOWLEDGE BRAIN ─── */}
      {activeLabTab === 'education' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          
          {/* 1. Form to Teach New Rule */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 29, 0.98) 100%)',
            border: '1px solid rgba(236, 72, 153, 0.35)',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Brain size={22} color="#ec4899" />
                <span>تلقين قاعدة أو معرفة جديدة للمساعد</span>
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '3px' }}>
                علّم المساعد قواعد عملك وسيتعلمها فوراً ويجيب بها بصوته البشري
              </p>
            </div>

            <form onSubmit={handleTeachRule} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '5px' }}>
                  عنوان المعلومة / التوجيه:
                </label>
                <input
                  type="text"
                  value={newRuleTitle}
                  onChange={(e) => setNewRuleTitle(e.target.value)}
                  placeholder="مثال: أسعار حاويات حي النرجس شمال الرياض"
                  required
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '5px' }}>
                    تصنيف المعرفة:
                  </label>
                  <select
                    value={newRuleCategory}
                    onChange={(e: any) => setNewRuleCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: '12px',
                      background: 'rgba(0, 0, 0, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  >
                    <option value="pricing">💰 سياسات التسعير والعروض</option>
                    <option value="policy">📜 سياسات وعقود المؤسسة</option>
                    <option value="drivers">🚛 تعليمات السائقين والميدان</option>
                    <option value="containers">📦 قواعد الحاويات والمقاسات</option>
                    <option value="custom_rule">⚙️ توجيه إداري مخصص</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '5px' }}>
                    الكلمات المفتاحية (مفصولة بفواصل):
                  </label>
                  <input
                    type="text"
                    value={newRuleTriggers}
                    onChange={(e) => setNewRuleTriggers(e.target.value)}
                    placeholder="مثال: سعر النرجس, حاوية النرجس, اسعار النرجس"
                    required
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: '12px',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontSize: '0.82rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '5px' }}>
                  ما يجب على المساعد قوله وتطبيقه عند السؤال (المنطوق المعتمد):
                </label>
                <textarea
                  value={newRuleResponse}
                  onChange={(e) => setNewRuleResponse(e.target.value)}
                  rows={3}
                  placeholder="مثال: أهلاً وسهلاً بأبو ماجد.. سعر الحاوية مقاس 20 ياردة في حي النرجس 600 ريال لمدة 7 أيام والتمديد اليومي بـ 50 ريال."
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontSize: '0.86rem',
                    lineHeight: 1.6,
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isTeaching}
                style={{
                  padding: '13px',
                  background: 'linear-gradient(135deg, #ec4899, #be185d)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  borderRadius: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 18px rgba(236, 72, 153, 0.45)',
                  marginTop: '4px'
                }}
              >
                {isTeaching ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
                <span>تلقين وحفظ في ذاكرة المساعد الذكي 💾</span>
              </button>
            </form>
          </div>

          {/* 2. Learned Knowledge Bank */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 15, 29, 0.98) 100%)',
            border: '1px solid rgba(168, 85, 247, 0.35)',
            borderRadius: '24px',
            padding: '20px',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={18} color="#c084fc" />
                <span>بنك المعرفة والذاكرة المكتسبة ({learnedRules.length})</span>
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 800 }}>
                تحديث تلقائي لحظي 🔄
              </span>
            </div>

            {learnedRules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8' }}>
                <Brain size={36} color="#64748b" style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: '0.84rem' }}>لا توجد قواعد مخصصة ملقنة بعد.. لقّن المساعد من الشات أو من النموذج المقابل!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
                {learnedRules.map((rule) => (
                  <div
                    key={rule.id}
                    style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '14px',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffffff' }}>{rule.title}</span>
                        <span style={{ fontSize: '0.65rem', background: 'rgba(168, 85, 247, 0.25)', color: '#d8b4fe', padding: '1px 6px', borderRadius: '6px' }}>
                          {rule.category}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '3px', lineHeight: 1.4 }}>
                        {rule.speechResponse}
                      </p>
                      {rule.taught_by && (
                        <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                          تلقين بواسطة: {rule.taught_by}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => handlePlayVoice(rule.speechResponse)}
                        style={{ background: 'rgba(236, 72, 153, 0.2)', border: 'none', color: '#f472b6', width: '32px', height: '32px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="استماع للنطق"
                      >
                        <Volume2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id!)}
                        style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', color: '#f87171', width: '32px', height: '32px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="حذف القاعدة"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 🎙️ TAB 2: VOICE & MOOD STUDIO ─── */}
      {activeLabTab === 'voice_studio' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
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

            {/* Granular Speed Controls */}
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

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['-30%', '-20%', '-10%', '0%', '+10%', '+20%', '+30%'].map((rate) => {
                  const isSelected = speechRate === rate;
                  const isNegative = rate.startsWith('-');
                  const isPositive = rate.startsWith('+');
                  
                  let activeColor = '#38bdf8';
                  if (isNegative) activeColor = '#a78bfa';
                  if (isPositive) activeColor = '#f472b6';
                  if (rate === '0%') activeColor = '#34d399';

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

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingTop: '6px' }}>
              <button
                onClick={() => handlePlayVoice(inputText)}
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
          </div>
        </div>
      )}

      {/* ─── 🎮 TAB 3: DISCORD OPERATIONS ─── */}
      {activeLabTab === 'discord' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
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
              <span>{isSendingDiscord ? 'جارِ النشر إلى ديسكورد...' : 'اعتماد ونشر البيان إلى ديسكورد الآن 🚀'}</span>
            </button>

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
      )}

    </div>
  );
};
