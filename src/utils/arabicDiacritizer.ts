/**
 * Smart Arabic Phonetic Enhancer for Natural Speech
 * Ensures proper sentence boundaries and natural phrasing for Neural TTS voices (e.g. ZariyahNeural).
 */

export function diacritizeArabicSpeech(rawText: string): string {
  if (!rawText) return '';

  let processed = rawText;

  // Normalize common Saudi greeting variations for natural tone without forcing Sukun
  processed = processed
    .replace(/(?<![\u0600-\u06FF])ومسهلا(?![\u0600-\u06FF])/g, 'ومرحباً')
    .replace(/(?<![\u0600-\u06FF])مرحبا(?![\u0600-\u06FF])/g, 'مرحباً');

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


