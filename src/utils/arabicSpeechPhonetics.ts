/**
 * 🎙️ Advanced Arabic Speech Phonetic & Semantic Normalizer
 * =========================================================
 * Transforms raw text containing amounts, currencies, dates, contract numbers, 
 * phone numbers, quantities, and symbols into pristine spoken Arabic words.
 * 
 * Features:
 * 1. Comprehensive Tafqeet (تفقيط المبالغ المالية والهللات)
 * 2. Natural Dates pronunciation (نطق التواريخ بالأيام والشهور والسنين بدون أي "شرطة")
 * 3. Contract, Container & Serial IDs classification (أرقام العقود والحاويات)
 * 4. Phone numbers cadence (أرقام الجوال بفواصل صوتية مريحة)
 * 5. Quantity & Gender agreement (العدد والمعدود للحاويات، السائقين، الأيام، العقود)
 * 6. Percentages & Time expressions (النسب المئوية والأوقات)
 */

// ─── 1. Core Arabic Number-to-Words (Tafqeet) Engine ──────────────────────────

const ONES_MASC = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة'];
const ONES_FEM = ['', 'واحدة', 'اثنتان', 'ثلاث', 'أربع', 'خمس', 'ست', 'سبع', 'ثمان', 'تسع', 'عشر'];

const TEENS_MASC = [
  'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر',
  'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'
];
const TEENS_FEM = [
  'عشرة', 'إحدى عشرة', 'اثنتا عشرة', 'ثلاث عشرة', 'أربع عشرة', 'خمس عشرة',
  'ست عشرة', 'سبع عشرة', 'ثماني عشرة', 'تسع عشرة'
];

const TENS = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const HUNDREDS = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة'];

const DIGIT_NAMES: Record<string, string> = {
  '0': 'صفر',
  '1': 'واحد',
  '2': 'اثنين',
  '3': 'ثلاثة',
  '4': 'أربعة',
  '5': 'خمسة',
  '6': 'ستة',
  '7': 'سبعة',
  '8': 'ثمانية',
  '9': 'تسعة'
};

const ORDINAL_DAYS: Record<number, string> = {
  1: 'الأول', 2: 'الثاني', 3: 'الثالث', 4: 'الرابع', 5: 'الخامس',
  6: 'السادس', 7: 'السابع', 8: 'الثامن', 9: 'التاسع', 10: 'العاشر',
  11: 'الحادي عشر', 12: 'الثاني عشر', 13: 'الثالث عشر', 14: 'الرابع عشر', 15: 'الخامس عشر',
  16: 'السادس عشر', 17: 'السابع عشر', 18: 'الثامن عشر', 19: 'التاسع عشر', 20: 'العشرون',
  21: 'الحادي والعشرون', 22: 'الثاني والعشرون', 23: 'الثالث والعشرون', 24: 'الرابع والعشرون',
  25: 'الخامس والعشرون', 26: 'السادس والعشرون', 27: 'السابع والعشرون', 28: 'الثامن والعشرون',
  29: 'التاسع والعشرون', 30: 'الثلاثون', 31: 'الحادي والثلاثون'
};

const GREGORIAN_MONTHS: Record<number, string> = {
  1: 'يناير', 2: 'فبراير', 3: 'مارس', 4: 'أبريل', 5: 'مايو', 6: 'يونيو',
  7: 'يوليو', 8: 'أغسطس', 9: 'سبتمبر', 10: 'أكتوبر', 11: 'نوفمبر', 12: 'ديسمبر'
};

const HIJRI_MONTHS: Record<number, string> = {
  1: 'محرم', 2: 'صفر', 3: 'ربيع الأول', 4: 'ربيع الآخر', 5: 'جمادى الأولى', 6: 'جمادى الآخرة',
  7: 'رجب', 8: 'شعبان', 9: 'رمضان', 10: 'شوال', 11: 'ذو القعدة', 12: 'ذو الحجة'
};

/**
 * Converts any integer (0 to 999,999,999,999) into pure spoken Arabic words
 */
export function tafqeetNumber(num: number, isFeminine: boolean = false): string {
  if (isNaN(num)) return '';
  num = Math.floor(Math.abs(num));
  if (num === 0) return 'صفر';

  const ones = isFeminine ? ONES_FEM : ONES_MASC;
  const teens = isFeminine ? TEENS_FEM : TEENS_MASC;

  function convertUnder1000(n: number, isFem: boolean): string {
    let parts: string[] = [];
    const h = Math.floor(n / 100);
    const rem = n % 100;

    if (h > 0) {
      parts.push(HUNDREDS[h]);
    }

    if (rem > 0) {
      const oList = isFem ? ONES_FEM : ONES_MASC;
      const tList = isFem ? TEENS_FEM : TEENS_MASC;

      if (rem <= 10) {
        parts.push(oList[rem]);
      } else if (rem < 20) {
        parts.push(tList[rem - 10]);
      } else {
        const t = Math.floor(rem / 10);
        const o = rem % 10;
        if (o > 0) {
          parts.push(`${oList[o]} و${TENS[t]}`);
        } else {
          parts.push(TENS[t]);
        }
      }
    }

    return parts.join(' و');
  }

  const billions = Math.floor(num / 1000000000);
  const millions = Math.floor((num % 1000000000) / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remaining = num % 1000;

  const resultSegments: string[] = [];

  // Billions (مليارات)
  if (billions > 0) {
    if (billions === 1) resultSegments.push('مليار');
    else if (billions === 2) resultSegments.push('ملياران');
    else if (billions >= 3 && billions <= 10) resultSegments.push(`${convertUnder1000(billions, false)} مليارات`);
    else resultSegments.push(`${convertUnder1000(billions, false)} مليار`);
  }

  // Millions (ملايين)
  if (millions > 0) {
    if (millions === 1) resultSegments.push('مليون');
    else if (millions === 2) resultSegments.push('مليونان');
    else if (millions >= 3 && millions <= 10) resultSegments.push(`${convertUnder1000(millions, false)} ملايين`);
    else resultSegments.push(`${convertUnder1000(millions, false)} مليون`);
  }

  // Thousands (آلاف)
  if (thousands > 0) {
    if (thousands === 1) resultSegments.push('ألف');
    else if (thousands === 2) resultSegments.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) resultSegments.push(`${convertUnder1000(thousands, false)} آلاف`);
    else resultSegments.push(`${convertUnder1000(thousands, false)} ألف`);
  }

  // Under 1000
  if (remaining > 0) {
    resultSegments.push(convertUnder1000(remaining, isFeminine));
  }

  return resultSegments.join(' و');
}

/**
 * Converts currency amounts to fluent Saudi Riyal & Halala phrasing
 * e.g., 1500.50 -> ألف وخمسمائة ريال وخمسون هللة
 */
export function tafqeetCurrency(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'صفر ريال';
  const cleanAmount = Math.abs(amount);
  const riyals = Math.floor(cleanAmount);
  const halalas = Math.round((cleanAmount - riyals) * 100);

  let riyalText = '';
  if (riyals === 1) {
    riyalText = 'ريال واحد';
  } else if (riyals === 2) {
    riyalText = 'ريالان';
  } else if (riyals >= 3 && riyals <= 10) {
    riyalText = `${tafqeetNumber(riyals, false)} ريالات`;
  } else if (riyals > 10) {
    riyalText = `${tafqeetNumber(riyals, false)} ريالاً`;
  }

  let halalaText = '';
  if (halalas > 0) {
    if (halalas === 1) halalaText = 'هللة واحدة';
    else if (halalas === 2) halalaText = 'هللتان';
    else if (halalas >= 3 && halalas <= 10) halalaText = `${tafqeetNumber(halalas, true)} هللات`;
    else halalaText = `${tafqeetNumber(halalas, true)} هللة`;
  }

  if (riyalText && halalaText) {
    return `${riyalText} و${halalaText}`;
  } else if (riyalText) {
    return riyalText;
  } else if (halalaText) {
    return halalaText;
  }
  return 'صفر ريال';
}

/**
 * Formats a Date into rich spoken Arabic (never mentions "شرطة" or "slash")
 */
export function formatSpokenDate(yearStr: string, monthStr: string, dayStr: string, isHijri: boolean = false): string {
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  const daySpoken = ORDINAL_DAYS[day] || `اليوم ${tafqeetNumber(day, false)}`;
  const monthName = isHijri 
    ? (HIJRI_MONTHS[month] || `شهر ${tafqeetNumber(month, false)}`) 
    : (GREGORIAN_MONTHS[month] || `شهر ${tafqeetNumber(month, false)}`);
  
  if (year) {
    const yearSpoken = tafqeetNumber(year, false);
    const suffix = isHijri ? 'هجرية' : '';
    return `${daySpoken} من ${monthName} لعام ${yearSpoken} ${suffix}`.trim();
  }

  return `${daySpoken} من ${monthName}`;
}

/**
 * Formats phone numbers into natural digit clusters with spoken pauses
 * e.g., "0501234567" -> "صفر خمسة صفر ، واحد اثنين ثلاثة ، أربعة خمسة ستة سبعة"
 */
export function formatSpokenPhoneNumber(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');
  let localNum = digitsOnly;
  if (localNum.startsWith('966')) {
    localNum = '0' + localNum.slice(3);
  }
  if (!localNum.startsWith('0')) {
    localNum = '0' + localNum;
  }

  // Read as: 05X , XXX , XXXX
  const p1 = localNum.slice(0, 3).split('').map(d => DIGIT_NAMES[d] || d).join(' ');
  const p2 = localNum.slice(3, 6).split('').map(d => DIGIT_NAMES[d] || d).join(' ');
  const p3 = localNum.slice(6).split('').map(d => DIGIT_NAMES[d] || d).join(' ');

  return `${p1} ، ${p2} ، ${p3}`;
}

/**
 * Formats contract / container code or alphanumeric serials for speech
 */
export function formatSpokenSerialOrCode(code: string): string {
  // If it's a simple integer (e.g. 105 or 42)
  if (/^\d{1,6}$/.test(code)) {
    return tafqeetNumber(parseInt(code, 10), false);
  }

  // If it has hyphens/letters e.g. 2024-0012 or C-44
  const parts = code.split(/[\-\_\/\s]+/);
  return parts.map(part => {
    if (/^\d+$/.test(part)) {
      if (part.length <= 4) {
        return tafqeetNumber(parseInt(part, 10), false);
      }
      return part.split('').map(d => DIGIT_NAMES[d] || d).join(' ');
    }
    return part;
  }).join(' ، ');
}

// ─── 2. Full Semantic Pipeline for Voice Synthesis ────────────────────────────

/**
 * Main Speech Phonetic Normalizer
 * Resolves dates, money, contract codes, phone numbers, quantities, and symbols into pure Arabic speech.
 */
export function normalizeArabicSpeechPhonetics(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText;

  // 1. Unify Arabic-Indic digits (٠-٩) to standard (0-9)
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  arabicDigits.forEach((d, idx) => {
    text = text.replace(new RegExp(d, 'g'), idx.toString());
  });

  // Remove comma thousands separators in numbers: 1,500 -> 1500
  text = text.replace(/(\d+),(\d{3})/g, '$1$2');

  // 2. Dates Normalization (YYYY-MM-DD, DD/MM/YYYY, YYYY/MM/DD, DD-MM-YYYY)
  // Gregorian Full Dates (e.g., 2026-08-26, 2026/08/26, 26/08/2026, 26-08-2026)
  text = text.replace(/\b(20\d{2})[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](0?[1-9]|[12]\d|3[01])\b/g, (_, y, m, d) => {
    return formatSpokenDate(y, m, d, false);
  });
  text = text.replace(/\b(0?[1-9]|[12]\d|3[01])[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](20\d{2})\b/g, (_, d, m, y) => {
    return formatSpokenDate(y, m, d, false);
  });

  // Hijri Full Dates (e.g., 1445/08/15, 1447-02-20)
  text = text.replace(/\b(14\d{2})[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](0?[1-9]|[12]\d|3[01])\b/g, (_, y, m, d) => {
    return formatSpokenDate(y, m, d, true);
  });
  text = text.replace(/\b(0?[1-9]|[12]\d|3[01])[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](14\d{2})\b/g, (_, d, m, y) => {
    return formatSpokenDate(y, m, d, true);
  });

  // Short Dates (e.g. 7/8 or 26/8 or 07/08)
  text = text.replace(/(?<!\d)(0?[1-9]|[12]\d|3[01])[\/\-](0?[1-9]|1[0-2])(?!\d)/g, (_, d, m) => {
    return formatSpokenDate('', m, d, false);
  });

  // 3. Saudi Phone Numbers (+9665xxxxxxxx, 05xxxxxxxx, 9665xxxxxxxx)
  text = text.replace(/(?:\+?966|0)5\d{8}\b/g, match => {
    return `رقم الجوال ${formatSpokenPhoneNumber(match)}`;
  });

  // 4. Monetary Amounts & Currencies
  // e.g. "1500 ريال", "1500 ر.س", "1500.50 SAR", "المبلغ 750", "إجمالي 1200", "الدخل 5000"
  text = text.replace(/(\d+(?:\.\d{1,2})?)\s*(?:ريال|ريالاً|ريالات|ر\.س|ر\.س\.|SAR|sar)/gi, (_, amt) => {
    return tafqeetCurrency(parseFloat(amt));
  });

  // Patterns like "المبلغ: 1500" or "الإجمالي: 2500" or "المحصل: 300"
  text = text.replace(/(المبلغ|الإجمالي|إجمالي|المدفوع|المتبقي|الدخل|التحصيل|سداد|قيمة|تكلفة)\s*[:\-]?\s*(\d+(?:\.\d{1,2})?)(?!\s*حاوي|\s*سائق|\s*يوم|\s*عقد|\s*ساعة)/g, (_, label, amt) => {
    return `${label} ${tafqeetCurrency(parseFloat(amt))}`;
  });

  // 5. Quantities & Counters with proper Arabic feminine/masculine matching
  // Containers (حاوية / حاويات - مؤنث)
  text = text.replace(/\b(\d+)\s*(حاوية|حاويات|حاويه|حاوي)/g, (_, n, word) => {
    const num = parseInt(n, 10);
    if (num === 0) return 'صفر حاوية';
    if (num === 1) return 'حاوية واحدة';
    if (num === 2) return 'حاويتان';
    if (num >= 3 && num <= 10) return `${ONES_FEM[num]} حاويات`;
    return `${tafqeetNumber(num, true)} حاوية`;
  });

  // Drivers (سائق / سائقين - مذكر)
  text = text.replace(/\b(\d+)\s*(سائق|سائقين|سواق|سواقين)/g, (_, n) => {
    const num = parseInt(n, 10);
    if (num === 0) return 'صفر سائق';
    if (num === 1) return 'سائق واحد';
    if (num === 2) return 'سائقان';
    if (num >= 3 && num <= 10) return `${ONES_MASC[num]} سائقين`;
    return `${tafqeetNumber(num, false)} سائقاً`;
  });

  // Contracts (عقد / عقود - مذكر)
  text = text.replace(/\b(\d+)\s*(عقد|عقود)/g, (_, n) => {
    const num = parseInt(n, 10);
    if (num === 0) return 'صفر عقود';
    if (num === 1) return 'عقد واحد';
    if (num === 2) return 'عقدان';
    if (num >= 3 && num <= 10) return `${ONES_MASC[num]} عقود`;
    return `${tafqeetNumber(num, false)} عقداً`;
  });

  // Days (يوم / أيام - مذكر)
  text = text.replace(/\b(\d+)\s*(يوم|أيام|ايام)/g, (_, n) => {
    const num = parseInt(n, 10);
    if (num === 1) return 'يوم واحد';
    if (num === 2) return 'يومان';
    if (num >= 3 && num <= 10) return `${ONES_MASC[num]} أيام`;
    return `${tafqeetNumber(num, false)} يوماً`;
  });

  // Hours (ساعة / ساعات - مؤنث)
  text = text.replace(/\b(\d+)\s*(ساعة|ساعات|ساعه)/g, (_, n) => {
    const num = parseInt(n, 10);
    if (num === 1) return 'ساعة واحدة';
    if (num === 2) return 'ساعتان';
    if (num >= 3 && num <= 10) return `${ONES_FEM[num]} ساعات`;
    return `${tafqeetNumber(num, true)} ساعة`;
  });

  // 6. Contract Numbers, Container Numbers & ID Codes
  // "العقد (102)" or "عقد رقم 102" or "العقد رقم CNT-2024"
  text = text.replace(/(العقد|عقد|الحاوية|حاوية|سند|فاتورة|سجل)\s*(?:رقم|كود|رمز)?\s*[\(\[]?([A-Za-z0-9\-_]+)[\)\]]?/g, (match, entity, code) => {
    // If code is pure digits or alphanumeric code
    const spokenCode = formatSpokenSerialOrCode(code);
    return `${entity} رقم ${spokenCode}`;
  });

  // 7. Percentages (e.g. 85% -> خمسة وثمانون بالمئة)
  text = text.replace(/(\d+(?:\.\d+)?)\s*%/g, (_, n) => {
    const num = parseFloat(n);
    return `${tafqeetNumber(Math.floor(num), false)} بالمئة`;
  });

  // 8. General Remaining Standalone Numbers (Convert any leftover digit clusters to full spoken words)
  text = text.replace(/\b\d+\b/g, match => {
    const num = parseInt(match, 10);
    return tafqeetNumber(num, false);
  });

  // 9. Remove any remaining slashes, hyphens, and math symbols so the TTS NEVER says "شرطة"
  text = text.replace(/[\/\-\_\\]+/g, ' ، ');
  text = text.replace(/[\+\=\<\>\|\~\^]/g, ' ');
  
  // 10. Clean multiple spaces and ensure natural pauses
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}
