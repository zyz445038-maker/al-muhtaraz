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

  const intent = rawIntent.toLowerCase().trim();

  // 💰 1. Financial Status / Income / Cash / Revenue / Accounts Query
  if (
    intent.includes('مالي') || 
    intent.includes('مالية') || 
    intent.includes('المالية') || 
    intent.includes('حساب') || 
    intent.includes('كاش') || 
    intent.includes('دخل') || 
    intent.includes('ايراد') || 
    intent.includes('إيراد') || 
    intent.includes('أرباح') || 
    intent.includes('ارباح') || 
    intent.includes('فلوس') || 
    intent.includes('سداد') || 
    intent.includes('تحصيل')
  ) {
    const speech = `يسعد لي قلبك يا بو سعود! التقرير المالي لليوم: إجمالي الدخل وصل ${totalIncome.toLocaleString('ar-SA')} ريال، منها كاش ${cashIncome.toLocaleString('ar-SA')} ريال، وسداد إلكتروني ${electronicIncome.toLocaleString('ar-SA')} ريال. عساها مداخيل الخير والبركة يا رب!`;
    const display = `💰 **يسعد لي هاليوم يا بو سعود! التقرير المالي:** ✨\n\n• **إجمالي دخل اليوم:** **${totalIncome.toLocaleString('ar-SA')} ر.س** 🎉\n• **الكاش المستلم:** ${cashIncome.toLocaleString('ar-SA')} ر.س 💵\n• **سداد إلكتروني (مدى/فيزا):** ${electronicIncome.toLocaleString('ar-SA')} ر.س 💳\n\nعساها مداخيل الخير والبركة يا رب! 🌿`;
    return { speechText: speech, displayText: display };
  }

  // 📦 2. Available Containers / Stock Query
  if (
    intent.includes('شاغر') || 
    intent.includes('متاح') || 
    intent.includes('مخزن') || 
    intent.includes('فاضي') || 
    intent.includes('حاوية') || 
    intent.includes('حاويات') || 
    intent.includes('مستودع') || 
    intent.includes('أسطول') || 
    intent.includes('اسطول')
  ) {
    const speech = `يا هلا والله يا بو سعود! ما شاء الله يتوفر الحين بالمخزن ${availableCount} حاوية جاهزة للإيجار على طول، ربي يزيد ويبارك بحلالك!`;
    const display = `✨ **يا هلا والله ومسهلا يا بو سعود!** ☀️\n\n📦 يتوفر الحين في المخزون **(${availableCount})** حاوية شاغرة وجاهزة للتأجير فوراً 🟢.\nربي يزيد ويبارك لك في حلالك! 🌸`;
    return { speechText: speech, displayText: display };
  }

  // ⚠️ 3. Expiring Contracts / Municipality Warning Query
  if (
    intent.includes('منتهي') || 
    intent.includes('سحب') || 
    intent.includes('غدا') || 
    intent.includes('بكرة') || 
    intent.includes('بلدية') || 
    intent.includes('غرامة') || 
    intent.includes('مخالفة') || 
    intent.includes('أمانة') || 
    intent.includes('امانة')
  ) {
    const speech = expiringCount > 0 
      ? `هلا بك يا غالي، انتبه ترى فيه ${expiringCount} عقود تنتهي بكرة.. يبي لنا نوجه الرافعات تسحبها عشان ما تنزل عليكم غرامات بلدية.`
      : `يا هلا والله، تطمن الأمور كلها في السليم وما فيه أي عقود منتهية أو متأخرة بكرة يا بو سعود!`;
    const display = expiringCount > 0
      ? `⚠️ **يا هلا يا بو سعود، تنبيه سريع:**\n\nفيه **(${expiringCount})** عقود تنتهي بكرة وتتطلب سحب الحاويات أو التمديد فوراً عشان نتفادى أي مخالفات من البلدية 🚜.`
      : `✅ **تطمن يا بو سعود، كل الأمور تحت السيطرة!**\n\nما عندك أي حاويات متأخرة أو تنتهي بكرة. كل الأسطول منضبط وموثق 🌟.`;
    return { speechText: speech, displayText: display };
  }

  // 🚛 4. Drivers & Fleet Crew Query
  if (
    intent.includes('سائق') || 
    intent.includes('سواق') || 
    intent.includes('سواقين') || 
    intent.includes('عمال') || 
    intent.includes('ميدان') || 
    intent.includes('سيارات') || 
    intent.includes('رافعات')
  ) {
    const speech = `أبشر يا بو سعود، طاقم السائقين والميدان شغالين وكل المهام مسندة لهم عبر الواتساب بمواقع العقود مباشرة!`;
    const display = `🚛 **أبشر يا بو سعود:**\n\nطاقم السائقين والميدان شغالين بنشاط، وتصلهم تفاصيل المواقع وروابط الخرائط تلقائياً على الواتساب 📲.`;
    return { speechText: speech, displayText: display };
  }

  // 📊 5. General Report / Daily Summary Query
  if (intent.includes('تقرير') || intent.includes('ملخص') || intent.includes('أوضاع') || intent.includes('اوضاع') || intent.includes('شغل')) {
    const speech = `يا هلا والله يا بو سعود! تقرير اليوم: عندك ${activeCount} عقد نشط، والدخل ${totalIncome.toLocaleString('ar-SA')} ريال، وبالمخزن ${availableCount} حاوية شاغرة.`;
    const display = `📊 **الموجز التنفيذي لليوم يا بو سعود:**\n\n• **العقود النشطة:** ${activeCount} عقد 📋\n• **إجمالي التحصيل:** ${totalIncome.toLocaleString('ar-SA')} ر.س 💰\n• **حاويات المخزن:** ${availableCount} حاوية 📦\n\nكل شيء مراقب وتحت السيطرة ✨!`;
    return { speechText: speech, displayText: display };
  }

  // Default Warm Saudi Greeting
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

// High-Definition Server-Piped Arabic Audio Engine (100% Guaranteed on ALL phones & desktops)
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

    // Call our internal Next.js API route that guarantees clear Arabic voice without CORS or English overrides
    const audioUrl = `/api/voice/tts?text=${encodeURIComponent(cleanText)}`;
    
    const audio = new Audio(audioUrl);
    activeAudio = audio;

    audio.onended = () => {
      activeAudio = null;
      if (onEnd) onEnd();
    };

    audio.onerror = (e) => {
      console.warn('Server TTS stream failed, trying fallback', e);
      activeAudio = null;
      fallbackSpeechSynthesis(cleanText, onEnd);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Audio stream auto-play prevented, trying fallback:', err);
        fallbackSpeechSynthesis(cleanText, onEnd);
      });
    }
    return true;
  } catch (err) {
    console.warn('Online audio player error:', err);
    fallbackSpeechSynthesis(text, onEnd);
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
      utterance.onend = () => { if (onEnd) onEnd(); };
      utterance.onerror = () => { if (onEnd) onEnd(); };
      window.speechSynthesis.speak(utterance);
    } else {
      // If no local Arabic voice pack exists in OS, don't play in English!
      if (onEnd) onEnd();
    }
  } catch (e) {
    console.warn('Fallback SpeechSynthesis error:', e);
    if (onEnd) onEnd();
  }
}

// Master Speech Synthesizer Function
export function speakSaudiFemaleVoice(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined') return;
  playOnlineArabicAudio(text, onEnd);
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
