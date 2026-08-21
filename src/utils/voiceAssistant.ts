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
  const speech = `أبشر من عيوني يا بو سعود! كل العمليات والعقود مراقبة ومحفوظة تمام، وتراك مأجر حالياً ${activeCount} عقد بالمدينة. تامرني بشي ثاني أسويه لك؟`;
  const display = `👑 **أبشر من عيوني يا بو سعود!** 🌸\n\nجميع العمليات وسجلات الواتساب مراقبة ومحدثة أولاً بأول. عندك حالياً **(${activeCount})** عقد نشط في الميدان.\n\nتامرني بشي ثاني أساعدك فيه؟ ✨`;
  return { speechText: speech, displayText: display };
}

// ─── 2. Cheerful Saudi Female Text-to-Speech Engine ───────────────────────────
export function speakSaudiFemaleVoice(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Text to speech not supported in this browser');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const cleanText = text
    .replace(/[#*_`]/g, '') // remove markdown symbols
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // remove emojis for natural speech
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'ar-SA';
  
  // Tuned for a sweet, cheerful, feminine, warm young pitch
  utterance.pitch = 1.18; // feminine bright pitch
  utterance.rate = 1.02;  // natural conversational rhythm

  // Try to find natural Arabic female voice available in the browser/OS
  const voices = window.speechSynthesis.getVoices();
  const arabicFemaleVoice = voices.find(v => 
    v.lang.startsWith('ar') && (
      v.name.toLowerCase().includes('female') ||
      v.name.toLowerCase().includes('zari') ||
      v.name.toLowerCase().includes('hoda') ||
      v.name.toLowerCase().includes('fatima') ||
      v.name.toLowerCase().includes('marium') ||
      v.name.toLowerCase().includes('leila') ||
      v.name.toLowerCase().includes('sana') ||
      v.name.toLowerCase().includes('salma') ||
      v.name.toLowerCase().includes('zeina')
    )
  ) || voices.find(v => v.lang.startsWith('ar'));

  if (arabicFemaleVoice) {
    utterance.voice = arabicFemaleVoice;
  }

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
