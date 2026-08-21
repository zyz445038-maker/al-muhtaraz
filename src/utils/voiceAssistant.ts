// Voice Assistant Engine: Ultra-Natural Saudi Colloquial Conversational Assistant

// ─── 1. Arabic Number to Words Converter (تَفقيط الأرقام طبيعياً) ───────────────
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
    .replace(/[ًٌٍَُِّْ]/g, '') // remove tashkeel
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[^ا-ي0-9\s]/g, ' ') // remove special chars
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

  const normalized = normalizeArabicText(rawIntent);

  // Semantic Clusters
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

  // Helper matching function
  const hasToken = (tokens: string[]) => tokens.some(t => normalized.includes(normalizeArabicText(t)));

  // 💰 1. Financial Status / Income / Cash / Revenue
  if (hasToken(financialTokens)) {
    if (totalIncome === 0) {
      const speech = `هلا والله يا أبو سعود.. اليوم بعدنا ما سجلنا أي مبالغ نقدية أو تحصيل، وبإذن الله الخير جاي بالطريق والعقود جاهزة!`;
      const display = `💰 **هلا والله يا أبو سعود!** ✨\n\n• **إجمالي دخل اليوم:** 0 ر.س (لم تُسجل مبالغ حتى الآن اليوم).\n• النظام جاهز ومراقب لأي عمليات دفع جديدة 🟢.\n\nبإذن الله الخير جاي ومداخيل البركة بالطريق 🌿!`;
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

    const speech = `يا هلا والله يا أبو سعود! ما شاء الله الدخل اليوم وصل ${totalWords} ريال، ${breakdown}.. عساها مداخيل الخير والعافية يا رب!`;
    const display = `💰 **يسعد لي هاليوم يا أبو سعود! التقرير المالي:** ✨\n\n• **إجمالي دخل اليوم:** **${totalIncome.toLocaleString('ar-SA')} ر.س** 🎉\n• **المستلم نقداً:** ${cashIncome.toLocaleString('ar-SA')} ر.س 💵\n• **سداد إلكتروني:** ${electronicIncome.toLocaleString('ar-SA')} ر.س 💳\n\nعساها مداخيل الخير والبركة يا رب! 🌿`;
    return { speechText: speech, displayText: display };
  }

  // 📦 2. Containers / Stock / Fleet Availability
  if (hasToken(containerTokens)) {
    if (availableCount === 0) {
      const speech = `هلا يا أبو سعود، ما شاء الله كل الحاويات مأجرة وشغالة في الميدان حالياً، وما فيه شواغر بالحوش!`;
      const display = `📦 **ما شاء الله يا أبو سعود!**\n\nكافة الحاويات مأجرة ونشطة حالياً في الميدان 🚛. لا توجد حاويات شاغرة بالمستودع حالياً.`;
      return { speechText: speech, displayText: display };
    }

    const availWords = numberToArabicWords(availableCount);
    const speech = `يا هلا والله يا أبو سعود! متوفر الحين في الحوش ${availWords} حاويات جاهزة للتأجير والتنزيل على طول، ربي يبارك في حلالك!`;
    const display = `✨ **يا هلا والله ومسهلا يا أبو سعود!** ☀️\n\n📦 يتوفر الحين في المخزون **(${availableCount})** حاوية شاغرة وجاهزة للتأجير فوراً 🟢.\nربي يزيد ويبارك لك في حلالك! 🌸`;
    return { speechText: speech, displayText: display };
  }

  // ⚠️ 3. Expiring Contracts & Municipality Fines Warning
  if (hasToken(expiringTokens)) {
    if (expiringCount === 0) {
      const speech = `تطمن يا أبو سعود، كل العقود سارية وما عندك أي حاويات بتنتهي بكرة، وأمور البلدية كلها في السليم!`;
      const display = `✅ **تطمن يا أبو سعود، كل الأمور تحت السيطرة!**\n\nما عندك أي حاويات متأخرة أو تنتهي بكرة. كل الأسطول منضبط وموثق 🌟.`;
      return { speechText: speech, displayText: display };
    }

    const expWords = numberToArabicWords(expiringCount);
    const speech = `يا أبو سعود، انتبه ترى فيه ${expWords} عقود بتنتهي بكرة.. يبي لنا نوجه الرافعات تسحبها عشان ما تنزل عليكم غرامات بلدية.`;
    const display = `⚠️ **يا هلا يا أبو سعود، تنبيه سريع:**\n\nفيه **(${expiringCount})** عقود تنتهي بكرة وتتطلب سحب الحاويات أو التمديد فوراً عشان نتفادى أي مخالفات من البلدية 🚜.`;
    return { speechText: speech, displayText: display };
  }

  // 🚛 4. Drivers & Field Operations
  if (hasToken(driverTokens)) {
    const speech = `أبشر يا أبو سعود، طاقم السائقين شغالين ومرسلين لهم تفاصيل العناوين والخرائط على الواتساب أول بأول!`;
    const display = `🚛 **أبشر يا أبو سعود:**\n\nطاقم السائقين والميدان شغالين بنشاط، وتصلهم تفاصيل المواقع وروابط الخرائط تلقائياً على الواتساب 📲.`;
    return { speechText: speech, displayText: display };
  }

  // 📊 5. General Report & Daily Briefing ("عطني العلوم", "وش الأخبار")
  if (hasToken(generalBriefTokens) || normalized.includes('تقرير')) {
    const activeWords = numberToArabicWords(activeCount);
    const incomeWords = totalIncome > 0 ? numberToArabicWords(totalIncome) : 'صفر';
    const availWords = numberToArabicWords(availableCount);

    const speech = `يا هلا وغلا يا أبو سعود! العلوم تسرك: عندك ${activeWords} عقد شغال، وإجمالي مبالغ اليوم ${incomeWords} ريال، وبالمستودع ${availWords} حاوية جاهزة.`;
    const display = `📊 **الموجز التنفيذي لليوم يا أبو سعود:**\n\n• **العقود النشطة:** ${activeCount} عقد 📋\n• **إجمالي التحصيل:** ${totalIncome.toLocaleString('ar-SA')} ر.س 💰\n• **حاويات المخزن:** ${availableCount} حاوية 📦\n\nكل شيء مراقب والعمل يسير بأعلى كفاءة ✨!`;
    return { speechText: speech, displayText: display };
  }

  // Default Warm Saudi Copilot Greeting
  const activeWords = numberToArabicWords(activeCount);
  const speech = `أبشر من عيوني يا أبو سعود! كل العمليات والعقود مراقبة ومحفوظة، وتراك مأجر حالياً ${activeWords} عقد. تامرني بشي ثاني أسويه لك؟`;
  const display = `👑 **أبشر من عيوني يا أبو سعود!** 🌸\n\nجميع العمليات وسجلات الواتساب مراقبة ومحدثة أولاً بأول. عندك حالياً **(${activeCount})** عقد نشط في الميدان.\n\nتامرني بشي ثاني أساعدك فيه؟ ✨`;
  return { speechText: speech, displayText: display };
}

// ─── 4. Ultra-Lifelike Native Siri / Google Neural Arabic Engine ───────────────
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

// Speaks using the device's native Siri (Apple) or Google Neural Wavenet (Android/Chrome)
export function speakSaudiFemaleVoice(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined') return;

  stopSpeaking();

  const cleanText = text
    .replace(/[#*_`]/g, '')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .trim();

  if (!cleanText) {
    if (onEnd) onEnd();
    return;
  }

  // Check if browser supports native SpeechSynthesis
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.resume();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'ar-SA';
      utterance.pitch = 1.05; // Natural human pitch
      utterance.rate = 0.98;  // Natural conversational pace

      const voices = window.speechSynthesis.getVoices();
      
      // Look for high quality Arabic female voices (Apple Siri Arabic / Google Arabic Wavenet)
      const bestArabicVoice = voices.find(v => 
        v.lang.startsWith('ar') && (
          v.name.includes('Laila') ||
          v.name.includes('Marium') ||
          v.name.includes('Fatima') ||
          v.name.includes('Hoda') ||
          v.name.includes('Salma') ||
          v.name.includes('Zari') ||
          v.name.includes('Zeina') ||
          v.name.includes('Natural') ||
          v.name.includes('Wavenet') ||
          v.name.includes('Neural') ||
          v.name.toLowerCase().includes('female')
        )
      ) || voices.find(v => v.lang.startsWith('ar') || v.lang.includes('SA'));

      if (bestArabicVoice) {
        utterance.voice = bestArabicVoice;
      }

      utterance.onend = () => {
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        // Fallback to server stream only if native speech fails
        fallbackServerAudio(cleanText, onEnd);
      };

      window.speechSynthesis.speak(utterance);
      return;
    } catch (e) {
      console.warn('Native speech error, using fallback:', e);
    }
  }

  // Fallback to server audio if speech synthesis is completely unavailable
  fallbackServerAudio(cleanText, onEnd);
}

function fallbackServerAudio(cleanText: string, onEnd?: () => void) {
  try {
    const audioUrl = `/api/voice/tts?text=${encodeURIComponent(cleanText)}`;
    const audio = new Audio(audioUrl);
    activeAudio = audio;

    audio.onended = () => {
      activeAudio = null;
      if (onEnd) onEnd();
    };

    audio.onerror = () => {
      activeAudio = null;
      if (onEnd) onEnd();
    };

    audio.play().catch(() => {
      if (onEnd) onEnd();
    });
  } catch (err) {
    if (onEnd) onEnd();
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
