/**
 * Smart Arabic Diacritizer & Phonetic Enhancer for Natural Speech
 * Adds accurate vowels, natural pause breaks, and phonetic corrections for Saudi dialects
 */

const SAUDI_DIALECT_DICTIONARY: Record<string, string> = {
  'يا هلا': 'يَا هَلَا',
  'ومسهلا': 'وَمَسْهَلَا',
  'ابو ماجد': 'أَبُو مَاجِدْ',
  'أبو ماجد': 'أَبُو مَاجِدْ',
  'المحترز': 'الْمُحْتَرَزْ',
  'للحاويات': 'لِلْحَاوِيَاتْ',
  'حاوية': 'حَاوِيَة',
  'حاويات': 'حَاوِيَاتْ',
  'انقاض': 'أَنْقَاضْ',
  'أنقاض': 'أَنْقَاضْ',
  'تنزيل': 'تَنْزِيلْ',
  'سحب': 'سَحْبْ',
  'فوري': 'فَوْرِي',
  'الرياض': 'الرِّيَاضْ',
  'عقد': 'عَقْدْ',
  'عقود': 'عُقُودْ',
  'سائق': 'سَائِقْ',
  'مهمة': 'مُهِمَّة',
  'موقع': 'مَوْقِعْ',
  'مؤسسة': 'مُؤَسَّسَةُ',
  'مرحبا': 'مَرْحَبًا',
  'مرحباً': 'مَرْحَبًا',
  'كيف اقدر اخدمك': 'كَيْفَ أَقْدِرْ أَخْدِمَكْ',
  'كيف أقدر أخدمك': 'كَيْفَ أَقْدِرْ أَخْدِمَكْ',
  'اليوم': 'الْيَوْمْ',
  'جاهز': 'جَاهِزْ',
  'جاهزة': 'جَاهِزَة',
  'خدمتك': 'خِدْمَتِكْ',
  'المقاولات': 'الْمُقَاوَلَاتْ',
  'البناء': 'الْبِنَاءْ',
  'التعمير': 'التَّعْمِيرْ',
  'السداد': 'السَّدَادْ',
  'سند': 'سَنَدْ',
  'قبض': 'قَبْضْ'
};

export function diacritizeArabicSpeech(rawText: string): string {
  if (!rawText) return '';

  let processed = rawText;

  // Replace common keywords with exact phonetically rich diacritized versions
  Object.entries(SAUDI_DIALECT_DICTIONARY).forEach(([plain, diacritized]) => {
    const regex = new RegExp(`\\b${plain}\\b`, 'gi');
    processed = processed.replace(regex, diacritized);
  });

  // Ensure natural pauses around punctuation
  processed = processed
    .replace(/([،,])/g, ' $1 ')
    .replace(/([.!?؟])/g, ' $1 ... ')
    .replace(/\s+/g, ' ')
    .trim();

  return processed;
}
