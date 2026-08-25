// Voice Assistant Engine: Ultra-Reliable Unlocked Audio Pipeline for All Browsers
import { querySystemKnowledge } from './aiCopilotKnowledge';

// ─── 1. Arabic Number to Words Converter ───────────────────────────────────────
export function numberToArabicWords(num: number): string {
  if (num === 0) return 'صفر';
  if (isNaN(num)) return '';

  const ones = ['', 'واحد', 'اثنين', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', 'عشرة', 'عشرين', 'ثلاثين', 'أربعين', 'خمسين', 'ستين', 'سبعين', 'ثمانين', 'تسعين'];
  const hundreds = ['', 'مية', 'ميتين', 'ثلاثمية', 'أربعمية', 'خمسمية', 'ستمية', 'سبعمية', 'ثمانمية', 'تسعمية'];

  function convertChunk(n: number): string {
    let result = '';
    const h = Math.floor(n / 100);
    const remainder = n % 100;

    if (h > 0) {
      result += hundreds[h];
    }

    if (remainder > 0) {
      if (result !== '') result += ' و';
      if (remainder <= 10) {
        result += ones[remainder];
      } else if (remainder < 20) {
        result += teens[remainder - 10];
      } else {
        const t = Math.floor(remainder / 10);
        const o = remainder % 10;
        if (o > 0) {
          result += ones[o] + ' و' + tens[t];
        } else {
          result += tens[t];
        }
      }
    }
    return result;
  }

  const thousands = Math.floor(num / 1000);
  const remaining = num % 1000;
  let finalResult = '';

  if (thousands > 0) {
    if (thousands === 1) finalResult += 'ألف';
    else if (thousands === 2) finalResult += 'ألفين';
    else if (thousands >= 3 && thousands <= 10) finalResult += convertChunk(thousands) + ' آلاف';
    else finalResult += convertChunk(thousands) + ' ألف';
  }

  if (remaining > 0) {
    if (finalResult !== '') finalResult += ' و';
    finalResult += convertChunk(remaining);
  }

  return finalResult;
}

// ─── 2. Advanced Arabic & Saudi Dialect Semantic Normalizer ─────────────────────
function normalizeArabicText(text: string): string {
  return text
    .replace(/[ًٌٍَُِّْ]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[^ا-ي0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// ─── 3. Natural & Spontaneous Saudi Conversational Generator ─────────────────────
export function formatSaudiCheerResponse(rawIntent: string, data: {
  availableCount?: number;
  totalIncome?: number;
  cashIncome?: number;
  electronicIncome?: number;
  expiringCount?: number;
  activeCount?: number;
  customText?: string;
}): { speechText: string; displayText: string } {
  const { 
    availableCount = 0, 
    totalIncome = 0, 
    cashIncome = 0, 
    electronicIncome = 0, 
    expiringCount = 0, 
    activeCount = 0, 
    customText 
  } = data;

  if (customText) {
    return { speechText: customText, displayText: customText };
  }

  // 🧠 0. Query Comprehensive System Knowledge Base (Creator Signature & Deep Domain Knowledge)
  const knowledgeMatch = querySystemKnowledge(rawIntent);
  if (knowledgeMatch) {
    return {
      speechText: knowledgeMatch.speechResponse,
      displayText: knowledgeMatch.displayMarkdown
    };
  }

  const normalized = normalizeArabicText(rawIntent);

  const financialTokens = [
    'مالي', 'ماليه', 'فلوس', 'دخل', 'ايراد', 'ارباح', 'ربح', 'كاش', 'سداد', 'حساب', 
    'كم جانا', 'كم جبنا', 'كم طلعنا', 'كم كسبنا', 'كم صفينا', 'كم صفى', 'دراهم', 
    'قبض', 'سندات', 'فواتير', 'مدفوعات', 'تحصيل', 'مبيعات', 'حسابات', 'تقرير مالي', 'الحاله الماليه'
  ];

  const containerTokens = [
    'حاويه', 'حاويات', 'مخزن', 'مستودع', 'حوش', 'شاغر', 'شواغر', 'فاضي', 'فاضيه', 
    'متاح', 'متوفر', 'كم باقي', 'وش باقي', 'وش عندنا', 'كم عندنا', 'اسطول', 
    'انقاض', 'تجاري', 'تجاريه', 'مقاس', 'كم حبه', 'كم قطعه'
  ];

  const expiringTokens = [
    'منتهي', 'منتهيه', 'خالص', 'خالصه', 'بتنتهي', 'تنتهي', 'بكره', 'غدا', 'باكر', 
    'سحب', 'نشيل', 'نسحب', 'بلديه', 'امانه', 'غرامه', 'غرامات', 'مخالفه', 'مخالفات', 
    'انذار', 'تاخير', 'متاخر', 'متاخره'
  ];

  const driverTokens = [
    'سائق', 'سائقين', 'سواق', 'سواقين', 'دريول', 'عمال', 'ميدان', 'سيارات', 
    'تريلات', 'سطحات', 'رافعات', 'رافعه', 'مشاوير', 'من شغال', 'من مداوم'
  ];

  const generalBriefTokens = [
    'علوم', 'وش العلوم', 'عطني العلوم', 'وش الوضع', 'وش الاخبار', 'وش صار', 
    'علمني', 'ملخص', 'تقرير', 'وش فيه اليوم', 'كيف الشغل', 'كيف الامور', 
    'بشرني', 'بشري', 'شلون الشغل', 'صباح الخير', 'مساء الخير', 'يا هلا'
  ];

  const hasToken = (tokens: string[]) => tokens.some(t => normalized.includes(normalizeArabicText(t)));

  // 💰 1. Financial Status / Income / Cash
  if (hasToken(financialTokens)) {
    if (totalIncome === 0) {
      const speech = `هلا والله يا أبو ماجد، اليوم بعدنا ما سجلنا أي مبالغ نقدية أو تحصيل، وبإذن الله الخير جاي بالطريق والعقود جاهزة!`;
      const display = `💰 **هلا والله يا أبو ماجد!** ✨\n\n• **إجمالي دخل اليوم:** 0 ر.س (لم تُسجل مبالغ حتى الآن اليوم).\n• النظام جاهز ومراقب لأي عمليات دفع جديدة 🟢.\n\nبإذن الله الخير جاي ومداخيل البركة بالطريق 🌿!`;
      return { speechText: speech, displayText: display };
    }

    const totalWords = numberToArabicWords(totalIncome);
    const cashWords = numberToArabicWords(cashIncome);
    const electronicWords = numberToArabicWords(electronicIncome);

    let breakdown = '';
    if (cashIncome > 0 && electronicIncome > 0) {
      breakdown = `منها ${cashWords} ريال نقداً، و ${electronicWords} ريال سداد إلكتروني`;
    } else if (cashIncome > 0) {
      breakdown = `كلها مستلمة نقداً`;
    } else {
      breakdown = `كلها مدفوعة عبر السداد الإلكتروني`;
    }

    const speech = `يا هلا والله يا أبو ماجد! ما شاء الله الدخل اليوم وصل ${totalWords} ريال، ${breakdown}.. عساها مداخيل الخير والعافية يا رب!`;
    const display = `💰 **يسعد لي هاليوم يا أبو ماجد! التقرير المالي:** ✨\n\n• **إجمالي دخل اليوم:** **${totalIncome.toLocaleString('ar-SA')} ر.س** 🎉\n• **المستلم نقداً:** ${cashIncome.toLocaleString('ar-SA')} ر.س 💵\n• **سداد إلكتروني:** ${electronicIncome.toLocaleString('ar-SA')} ر.س 💳\n\nعساها مداخيل الخير والبركة يا رب! 🌿`;
    return { speechText: speech, displayText: display };
  }

  // 📦 2. Containers / Stock Availability
  if (hasToken(containerTokens)) {
    if (availableCount === 0) {
      const speech = `هلا يا أبو ماجد، ما شاء الله كل الحاويات مأجرة وشغالة في الميدان حالياً، وما فيه شواغر بالحوش!`;
      const display = `📦 **ما شاء الله يا أبو ماجد!**\n\nكافة الحاويات مأجرة ونشطة حالياً في الميدان 🚛. لا توجد حاويات شاغرة بالمستودع حالياً.`;
      return { speechText: speech, displayText: display };
    }

    const availWords = numberToArabicWords(availableCount);
    const speech = `يا هلا والله يا أبو ماجد! متوفر الحين في الحوش ${availWords} حاويات جاهزة للتأجير والتنزيل على طول، ربي يبارك في حلالك!`;
    const display = `✨ **يا هلا والله ومسهلا يا أبو ماجد!** ☀️\n\n📦 يتوفر الحين في المخزون **(${availableCount})** حاوية شاغرة وجاهزة للتأجير فوراً 🟢.\nربي يزيد ويبارك لك في حلالك! 🌸`;
    return { speechText: speech, displayText: display };
  }

  // ⚠️ 3. Expiring Contracts & Municipality Warning
  if (hasToken(expiringTokens)) {
    if (expiringCount === 0) {
      const speech = `تطمن يا أبو ماجد، كل العقود سارية وما عندك أي حاويات بتنتهي بكرة، وأمور البلدية كلها في السليم!`;
      const display = `✅ **تطمن يا أبو ماجد، كل الأمور تحت السيطرة!**\n\nما عندك أي حاويات متأخرة أو تنتهي بكرة. كل الأسطول منضبط وموثق 🌟.`;
      return { speechText: speech, displayText: display };
    }

    const expWords = numberToArabicWords(expiringCount);
    const speech = `يا أبو ماجد، انتبه ترى فيه ${expWords} عقود بتنتهي بكرة.. يبي لنا نوجه الرافعات تسحبها عشان ما تنزل عليكم غرامات بلدية.`;
    const display = `⚠️ **يا هلا يا أبو ماجد، تنبيه سريع:**\n\nفيه **(${expiringCount})** عقود تنتهي بكرة وتتطلب سحب الحاويات أو التمديد فوراً عشان نتفادى أي مخالفات من البلدية 🚜.`;
    return { speechText: speech, displayText: display };
  }

  // 🚛 4. Drivers & Field Operations
  if (hasToken(driverTokens)) {
    const speech = `أبشر يا أبو ماجد، طاقم السائقين شغالين ومرسلين لهم تفاصيل العناوين والخرائط على الواتساب أول بأول!`;
    const display = `🚛 **أبشر يا أبو ماجد:**\n\nطاقم السائقين والميدان شغالين بنشاط، وتصلهم تفاصيل المواقع وروابط الخرائط تلقائياً على الواتساب 📲.`;
    return { speechText: speech, displayText: display };
  }

  // 📊 5. General Report & Daily Briefing ("عطني العلوم")
  if (hasToken(generalBriefTokens) || normalized.includes('تقرير')) {
    const activeWords = numberToArabicWords(activeCount);
    const incomeWords = totalIncome > 0 ? numberToArabicWords(totalIncome) : 'صفر';
    const availWords = numberToArabicWords(availableCount);

    const speech = `يا هلا وغلا يا أبو ماجد! العلوم تسرك: عندك ${activeWords} عقد شغال، وإجمالي مبالغ اليوم ${incomeWords} ريال، وبالمستودع ${availWords} حاوية جاهزة.`;
    const display = `📊 **الموجز التنفيذي لليوم يا أبو ماجد:**\n\n• **العقود النشطة:** ${activeCount} عقد 📋\n• **إجمالي التحصيل:** ${totalIncome.toLocaleString('ar-SA')} ر.س 💰\n• **حاويات المخزن:** ${availableCount} حاوية 📦\n\nكل شيء مراقب والعمل يسير بأعلى كفاءة ✨!`;
    return { speechText: speech, displayText: display };
  }

  // Default Warm Saudi Greeting
  const activeWords = numberToArabicWords(activeCount);
  const speech = `أبشر من عيوني يا أبو ماجد! كل العمليات والعقود مراقبة ومحفوظة، وتراك مأجر حالياً ${activeWords} عقد. تامرني بشي ثاني أسويه لك؟`;
  const display = `👑 **أبشر من عيوني يا أبو ماجد!** 🌸\n\nجميع العمليات وسجلات الواتساب مراقبة ومحدثة أولاً بأول. عندك حالياً **(${activeCount})** عقد نشط في الميدان.\n\nتامرني بشي ثاني أساعدك فيه؟ ✨`;
  return { speechText: speech, displayText: display };
}

// ─── 4. Pre-Unlocked Universal Audio Element Engine ───────────────────────────
let globalAudioElement: HTMLAudioElement | null = null;

// Call this on every user touch/click gesture to permanently unlock audio
export function unlockAudio() {
  if (typeof window === 'undefined') return;
  try {
    if (!globalAudioElement) {
      globalAudioElement = new Audio();
      globalAudioElement.preload = 'auto';
    }
    // Play a 0.05s silent data URI to unlock audio on iOS and Android
    globalAudioElement.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
    globalAudioElement.play().catch(() => {});

    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  } catch (e) {
    console.warn('Audio unlock error:', e);
  }
}

// Audio playback disabled - Responses are purely written/text-only
export async function speakSaudiFemaleVoice(text: string, onEnd?: () => void) {
  stopSpeaking();
  if (onEnd) onEnd();
}


function playBlobUrl(blobUrl: string, onEnd?: () => void, fallbackText?: string) {
  try {
    if (!globalAudioElement) {
      globalAudioElement = new Audio();
    }

    globalAudioElement.src = blobUrl;
    globalAudioElement.onended = () => {
      if (onEnd) onEnd();
    };

    globalAudioElement.onerror = () => {
      if (fallbackText) fallbackSpeechSynthesis(fallbackText, onEnd);
    };

    const playPromise = globalAudioElement.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Playback error:', err);
        if (fallbackText) fallbackSpeechSynthesis(fallbackText, onEnd);
      });
    }
  } catch (e) {
    if (fallbackText) fallbackSpeechSynthesis(fallbackText, onEnd);
  }
}


function selectBestArabicVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // Score candidate voices based on natural quality and region
  const scored = voices
    .filter(v => v.lang.startsWith('ar') || v.lang.includes('Arabic'))
    .map(v => {
      let score = 0;
      const name = (v.name || '').toLowerCase();
      const lang = (v.lang || '').toLowerCase();

      // Highest priority: Saudi Arabia natural / neural voices
      if (lang === 'ar-sa') score += 50;
      if (lang.startsWith('ar-xa') || lang.startsWith('ar-ae')) score += 35;
      if (lang.startsWith('ar')) score += 20;

      // Quality indicator keywords in voice name
      if (name.includes('natural') || name.includes('online') || name.includes('neural')) score += 40;
      if (name.includes('zari') || name.includes('hamed') || name.includes('fatima') || name.includes('layla') || name.includes('salma')) score += 30;
      if (name.includes('google')) score += 25;
      if (name.includes('microsoft')) score += 20;
      if (name.includes('desktop')) score -= 10; // Penalize legacy flat robotic desktop voices

      return { voice: v, score };
    });

  if (scored.length === 0) {
    // Fallback to any Arabic voice
    return voices.find(v => v.lang.startsWith('ar')) || null;
  }

  scored.sort((a, b) => b.score - a.score);
  return scored[0].voice;
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
    utterance.pitch = 1.04;
    utterance.rate = 0.95; // Slightly calmer, more articulate speed for Arabic natural flow

    const voices = window.speechSynthesis.getVoices();
    const bestVoice = selectBestArabicVoice(voices);
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.onend = () => { if (onEnd) onEnd(); };
    utterance.onerror = () => { if (onEnd) onEnd(); };

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    if (onEnd) onEnd();
  }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined') {
    if (globalAudioElement) {
      try {
        globalAudioElement.pause();
        globalAudioElement.currentTime = 0;
      } catch (e) {}
    }
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  }
}

