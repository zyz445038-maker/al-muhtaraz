// Voice Assistant Engine: Ultra-Reliable Unlocked Audio Pipeline for All Browsers
import { querySystemKnowledge } from './aiCopilotKnowledge';
import { diacritizeArabicSpeech } from './arabicDiacritizer';

// ─── 1. Arabic Number to Words Converter ───────────────────────────────────────
export function numberToArabicWords(num: number): string {
  if (num === 0) return 'صفر';
  if (isNaN(num)) return '';

  const ones = ['', 'واحد', 'اثنين', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', 'عشرة', 'عشرين', 'ثلاثين', 'أربعين', 'خمسين', 'ستين', 'سبعين', 'ثمانين', 'تسعين'];
  const hundreds = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة'];

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
    else if (thousands === 2) finalResult += 'ألفان';
    else if (thousands >= 3 && thousands <= 10) finalResult += convertChunk(thousands) + ' آلاف';
    else finalResult += convertChunk(thousands) + ' ألف';
  }

  if (remaining > 0) {
    if (finalResult !== '') finalResult += ' و';
    finalResult += convertChunk(remaining);
  }

  return finalResult;
}

// ─── 2. Advanced Arabic Semantic Normalizer ───────────────────────────────────
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

// ─── 3. Natural, Concise & Eloquent Arabic Response Generator ─────────────────
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
    return { speechText: diacritizeArabicSpeech(customText), displayText: customText };
  }

  // 🧠 0. Query Comprehensive Knowledge Base
  const knowledgeMatch = querySystemKnowledge(rawIntent);
  if (knowledgeMatch) {
    return {
      speechText: diacritizeArabicSpeech(knowledgeMatch.speechResponse),
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

  const hasToken = (tokens: string[]) => tokens.some(t => normalized.includes(normalizeArabicText(t)));

  // 💰 1. Financial Status / Income
  if (hasToken(financialTokens)) {
    if (totalIncome === 0) {
      const speech = diacritizeArabicSpeech('أَهْلاً وَسَهْلاً بِأَبُو مَاجِدْ.. لَمْ تُسَجَّلْ مَدَاخِيلُ مَالِيَّةٍ حَتَّى الآنْ.');
      const display = `💰 **أهلاً وسهلاً بأبو ماجد:**\n\n• **إجمالي دخل اليوم:** 0 ر.س\n• بانتظار تسجيل السندات والتحصيلات الجديدة 🟢.`;
      return { speechText: speech, displayText: display };
    }

    const totalWords = numberToArabicWords(totalIncome);
    const speech = diacritizeArabicSpeech(`أَهْلاً وَسَهْلاً بِأَبُو مَاجِدْ.. إِجْمَالِيُّ دَخْلِ الْيَوْمْ ${totalWords} رِيَالْ..`);
    const display = `💰 **التقرير المالي - أهلاً وسهلاً بأبو ماجد:**\n\n• **إجمالي دخل اليوم:** **${totalIncome.toLocaleString('ar-SA')} ر.س**\n• **المستلم نقداً:** ${cashIncome.toLocaleString('ar-SA')} ر.س 💵\n• **سداد إلكتروني:** ${electronicIncome.toLocaleString('ar-SA')} ر.س 💳`;
    return { speechText: speech, displayText: display };
  }

  // 📦 2. Containers / Stock Availability
  if (hasToken(containerTokens)) {
    if (availableCount === 0) {
      const speech = diacritizeArabicSpeech('أَبْشِرْ يَا أَبُو مَاجِدْ.. جَمِيعُ الْحَاوِيَاتِ مُؤَجَّرَةٌ حَالِيّاً فِي الْمَيْدَانْ.');
      const display = `📦 **تقرير الأسطول:**\n\nكافة الحاويات مؤجرة حالياً في الميدان 🚛. لا توجد شواغر بالمستودع.`;
      return { speechText: speech, displayText: display };
    }

    const availWords = numberToArabicWords(availableCount);
    const speech = diacritizeArabicSpeech(`أَبْشِرْ يَا أَبُو مَاجِدْ.. يَتَوَفَّرُ فِي الْمَخْزُونِ ${availWords} حَاوِيَةً جَاهِزَةً لِلتَّأْجِيرْ..`);
    const display = `📦 **المخزون المتوفر:**\n\nيوجد حالياً **(${availableCount})** حاوية شاغرة وجاهزة للتنزيل الفوري.`;
    return { speechText: speech, displayText: display };
  }

  // ⚠️ 3. Expiring Contracts & Municipality Warning
  if (hasToken(expiringTokens)) {
    if (expiringCount === 0) {
      const speech = diacritizeArabicSpeech('أَبْشِرْ يَا أَبُو مَاجِدْ.. لَا تُوجَدُ حَاوِيَاتٌ مُتَأَخِّرَةٌ أَو تَنْتَهِي غَداً..');
      const display = `✅ **حالة العقود والبلدية:**\n\nجميع العقود سارية ومنضبطة ولا توجد أي حاويات متأخرة عن موعد السحب.`;
      return { speechText: speech, displayText: display };
    }

    const expWords = numberToArabicWords(expiringCount);
    const speech = diacritizeArabicSpeech(`تَنْبِيهٌ يَا أَبُو مَاجِدْ.. تُوجَدُ ${expWords} عُقُودٍ تَنْتَهِي غَداً يَلْزَمُ سَحْبُهَا..`);
    const display = `⚠️ **تنبيه الإدارة:**\n\nيوجد **(${expiringCount})** عقود تنتهي غداً وتتطلب سحب الحاويات أو التمديد فوراً لتفادي مخالفات الأمانة 🚜.`;
    return { speechText: speech, displayText: display };
  }

  // 🚛 4. Drivers & Field Operations
  if (hasToken(driverTokens)) {
    const speech = diacritizeArabicSpeech('أَبْشِرْ.. طَاقَمُ السَّائِقِينَ يُبَاشِرُونَ الْمَهَامَّ وَتَصِلُهُمُ الْعَنَاوِينُ تِلْقَائِيّاً..');
    const display = `🚛 **طاقم الميدان:**\n\nالسائقون يباشرون المهام وترسل تفاصيل المواقع وروابط الخرائط لهم آلياً عبر الواتساب 📲.`;
    return { speechText: speech, displayText: display };
  }

  // 🌟 Default Concise Response
  const speech = diacritizeArabicSpeech('أَهْلاً وَسَهْلاً بِأَبُو مَاجِدْ.. أَبْشِرْ، كَيْفَ أَقْدِرْ أَخْدِمَكْ الْيَوْمْ؟');
  const display = `✨ **أهلاً وسهلاً بأبو ماجد** 🌟\n\nجاهزة لمساعدتك فوراً في متابعة الأسطول، العقود، الدخل، وتوجيه السائقين.`;
  return { speechText: speech, displayText: display };
}

// ─── 4. Global Speech Dispatcher with Audio Context Unlock ───────────────────
let unlockedAudioContext: AudioContext | null = null;
let currentAudio: HTMLAudioElement | null = null;

export function unlockAudio(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx && !unlockedAudioContext) {
      unlockedAudioContext = new AudioCtx();
      if (unlockedAudioContext.state === 'suspended') {
        unlockedAudioContext.resume();
      }
    }
  } catch (e) {
    console.warn('AudioContext init notice:', e);
  }
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined') {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
  }
}

export async function speakSaudiFemaleVoice(text: string, voiceKey: string = 'zariyah'): Promise<void> {
  if (typeof window === 'undefined' || !text.trim()) return;

  stopSpeaking();
  unlockAudio();

  // Try direct cloud stream with device speech fallback
  try {
    const streamUrl = `https://al-muhtaraz-whatsapp.onrender.com/api/voice/neural-tts?text=${encodeURIComponent(text)}&voice=${voiceKey}&rate=0%&t=${Date.now()}`;
    const audio = new Audio(streamUrl);
    currentAudio = audio;
    
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      await playPromise;
      return;
    }
  } catch (err) {
    console.warn('Direct stream fallback to device speech synthesis:', err);
  }

  // Device Speech Fallback
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.pitch = voiceKey === 'hamed' ? 0.85 : 1.2;
    utterance.rate = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.startsWith('ar') || v.name.includes('Arabic') || v.name.includes('Saudi') || v.name.includes('Maged') || v.name.includes('Laila'));
    if (arabicVoice) {
      utterance.voice = arabicVoice;
    }

    window.speechSynthesis.speak(utterance);
  }
}
