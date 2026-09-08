const PHONETIC_DIALECT_MAP: [RegExp, string][] = [
  // Common Saudi Greetings & Friendly Idioms (Strict Harakat without Shaddah or Tanween on Ghain)
  [/(?<![\u0600-\u06FF])يا\s+هلا\s+وغلا(?![\u0600-\u06FF])/g, 'يَا هَلَا وَغَلَا'],
  [/(?<![\u0600-\u06FF])هلا\s+وغلا(?![\u0600-\u06FF])/g, 'هَلَا وَغَلَا'],
  [/(?<![\u0600-\u06FF])يا\s+هلا(?![\u0600-\u06FF])/g, 'يَا هَلَا'],
  [/(?<![\u0600-\u06FF])ومسهلا(?![\u0600-\u06FF])/g, 'وَمَسْهَلَا'],
  [/(?<![\u0600-\u06FF])مرحبتين(?![\u0600-\u06FF])/g, 'مَرْحَبَتَيْن'],
  [/(?<![\u0600-\u06FF])حياك\s+الله(?![\u0600-\u06FF])/g, 'حَيَّاك الله'],
  [/(?<![\u0600-\u06FF])الله\s+يحييك(?![\u0600-\u06FF])/g, 'الله يُحَيِّيك'],
  [/(?<![\u0600-\u06FF])أبشر(?![\u0600-\u06FF])/g, 'أَبْشِر'],
  [/(?<![\u0600-\u06FF])ابشر(?![\u0600-\u06FF])/g, 'أَبْشِر'],
  [/(?<![\u0600-\u06FF])أبشري(?![\u0600-\u06FF])/g, 'أَبْشِرِي'],
  [/(?<![\u0600-\u06FF])طال\s+عمرك(?![\u0600-\u06FF])/g, 'طَال عُمْرَك'],
  [/(?<![\u0600-\u06FF])أبو\s+ماجد(?![\u0600-\u06FF])/g, 'أَبُو مَاجِد'],
  [/(?<![\u0600-\u06FF])ابو\s+ماجد(?![\u0600-\u06FF])/g, 'أَبُو مَاجِد'],
  [/(?<![\u0600-\u06FF])المحترز(?![\u0600-\u06FF])/g, 'المُحْتَرَز'],
  [/(?<![\u0600-\u06FF])للحاويات(?![\u0600-\u06FF])/g, 'لِلْحَاوِيَات'],
];

export function diacritizeArabicSpeech(rawText: string): string {
  if (!rawText) return '';

  let processed = rawText;

  // Apply explicit phonetic replacements for Saudi dialect idioms
  PHONETIC_DIALECT_MAP.forEach(([regex, replacement]) => {
    processed = processed.replace(regex, replacement);
  });

  // Remove multiple dots, ellipses (...), or exclamation/question mark clusters that cause unnatural pauses
  processed = processed
    .replace(/\.{2,}/g, '.')
    .replace(/!{2,}/g, '!')
    .replace(/؟{2,}/g, '؟')
    .replace(/\?{2,}/g, '?');

  // Ensure standard spacing around punctuation marks so TTS handles pitch inflections smoothly
  processed = processed
    .replace(/\s*([،,.!?؟])\s*/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim();

  return processed;
}



