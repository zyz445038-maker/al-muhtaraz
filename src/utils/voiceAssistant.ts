// Voice Assistant Engine: Speech-to-Text & Cheerful Saudi Female Voice Synthesizer

// ─── 1. Cheerful Saudi Dialect Response Formatter ─────────────────────────────
export function formatSaudiCheerResponse(rawIntent: string, data: {
  availableCount?: number;
  totalIncome?: number;
  cashIncome?: number;
  electronicIncome?: number;
  expiringCount?: number;
  activeCount?: number;
  customText?: string;
}): { speechText: string; displayText: string } {
  const { availableCount = 0, totalIncome = 0, cashIncome = 0, electronicIncome = 0, expiringCount = 0, activeCount = 0, customText } = data;

  if (customText) {
    return { speechText: customText, displayText: customText };
  }

  const intent = rawIntent.toLowerCase();

  if (intent.includes('شاغر') || intent.includes('متاح') || intent.includes('مخزن') || intent.includes('فاضي')) {
    const speech = `يا هلا والله يا بو سعود! ما شاء الله يتوفر الحين بالمخزن ${availableCount} حاوية جاهزة للإيجار على طول، ربي يزيد ويبارك!`;
    const display = `✨ **يا هلا والله ومسهلا يا بو سعود!** ☀️\n\n📦 يتوفر الحين في المخزون **(${availableCount})** حاوية شاغرة وجاهزة للتأجير فوراً 🟢.\nربي يزيد ويبارك لك في حلالك! 🌸`;
    return { speechText: speech, displayText: display };
  }

  if (intent.includes('كاش') || intent.includes('دخل') || intent.includes('ايراد') || intent.includes('أرباح') || intent.includes('فلوس')) {
    const speech = `يسعد لي قلبك يا بو سعود! إجمالي الدخل اليوم وصل ${totalIncome.toLocaleString('ar-SA')} ريال، منها كاش ${cashIncome.toLocaleString('ar-SA')} ريال، والباقي سداد إلكتروني. عساها مداخيل العافية والخير يا رب!`;
    const display = `💰 **يسعد لي هاليوم يا بو سعود!** ✨\n\n• **إجمالي دخل اليوم:** **${totalIncome.toLocaleString('ar-SA')} ر.س** 🎉\n• **الكاش المستلم:** ${cashIncome.toLocaleString('ar-SA')} ر.س 💵\n• **سداد إلكتروني:** ${electronicIncome.toLocaleString('ar-SA')} ر.س 💳\n\nعساها مداخيل الخير والبركة يا رب! 🌿`;
    return { speechText: speech, displayText: display };
  }

  if (intent.includes('منتهي') || intent.includes('سحب') || intent.includes('غدا') || intent.includes('بلدية') || intent.includes('عقد')) {
    const speech = expiringCount > 0 
      ? `هلا بك يا غالي، انتبه ترى فيه ${expiringCount} عقود تنتهي بكرة.. يبي لنا نوجه الرافعات تسحبها عشان ما تنزل عليكم غرامات بلدية.`
      : `يا هلا والله، تطمن الأمور كلها في السليم وما فيه أي عقود منتهية أو متأخرة بكرة يا بو سعود!`;
    const display = expiringCount > 0
      ? `⚠️ **يا هلا يا بو سعود، تنبيه سريع:**\n\nفيه **(${expiringCount})** عقود تنتهي بكرة وتتطلب سحب الحاويات أو التمديد فوراً عشان نتفادى أي مخالفات من البلدية 🚜.`
      : `✅ **تطمن يا بو سعود، كل الأمور تحت السيطرة!**\n\nما عندك أي حاويات متأخرة أو تنتهي بكرة. كل الأسطول منضبط وموثق 🌟.`;
    return { speechText: speech, displayText: display };
  }

  // Default warm greeting
  const speech = `أبشر من عيوني يا بو سعود! كل العمليات وسجلات الواتساب مراقبة ومحفوظة تمام، وتراك مأجر حالياً ${activeCount} عقد بالمدينة. تامرني بشي ثاني أسويه لك؟`;
  const display = `👑 **أبشر من عيوني يا بو سعود!** 🌸\n\nجميع العمليات وسجلات الواتساب مراقبة ومحدثة أولاً بأول. عندك حالياً **(${activeCount})** عقد نشط في الميدان.\n\nتامرني بشي ثاني أساعدك فيه؟ ✨`;
  return { speechText: speech, displayText: display };
}

// ─── 2. Dual-Engine Audio & Speech Synthesizer ─────────────────────────────────
let activeAudio: HTMLAudioElement | null = null;

export function unlockAudio() {
  if (typeof window === 'undefined') return;
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  } catch (e) {
    console.warn('SpeechSynthesis resume error:', e);
  }
}

// Audio Stream Engine (Universal fallback for all mobile & desktop browsers)
export function playOnlineArabicAudio(text: string, onEnd?: () => void): boolean {
  if (typeof window === 'undefined') return false;

  try {
    stopSpeaking();

    const cleanText = text
      .replace(/[#*_`]/g, '')
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
      .trim();

    if (!cleanText) {
      if (onEnd) onEnd();
      return false;
    }

    const encoded = encodeURIComponent(cleanText);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ar&client=tw-ob&q=${encoded}`;
    
    const audio = new Audio(url);
    activeAudio = audio;

    audio.onended = () => {
      activeAudio = null;
      if (onEnd) onEnd();
    };

    audio.onerror = () => {
      activeAudio = null;
      if (onEnd) onEnd();
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Audio stream auto-play prevented:', err);
        // Fallback to speech synthesis
        fallbackSpeechSynthesis(cleanText, onEnd);
      });
    }
    return true;
  } catch (err) {
    console.warn('Online audio player error:', err);
    return false;
  }
}

function fallbackSpeechSynthesis(cleanText: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  try {
    window.speechSynthesis.resume();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ar-SA';
    utterance.pitch = 1.18;
    utterance.rate = 1.02;

    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.startsWith('ar'));
    if (arabicVoice) {
      utterance.voice = arabicVoice;
    }

    utterance.onend = () => { if (onEnd) onEnd(); };
    utterance.onerror = () => { if (onEnd) onEnd(); };

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Fallback SpeechSynthesis error:', e);
    if (onEnd) onEnd();
  }
}

// Master Speech Synthesizer Function
export function speakSaudiFemaleVoice(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined') return;

  // 1. First try online clear audio stream
  const started = playOnlineArabicAudio(text, onEnd);
  if (!started) {
    // 2. If online audio not ready, use native SpeechSynthesis
    fallbackSpeechSynthesis(text, onEnd);
  }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined') {
    if (activeAudio) {
      try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
      } catch (e) {}
      activeAudio = null;
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  }
}
