import { normalizeArabicSpeechPhonetics } from './arabicSpeechPhonetics';
import { diacritizeArabicSpeech } from './arabicDiacritizer';

/**
 * Speech Text Sanitizer & Semantic Normalizer
 * ============================================
 * 1. Strips all Markdown syntax, asterisks, hashtags, backticks, emojis, and unwanted symbols.
 * 2. Phonetically normalizes dates, monetary amounts (Tafqeet), contract numbers, phone numbers, and quantities.
 * 3. Adds Saudi dialect phonetic diacritics and natural punctuation pauses.
 * 4. Ensures speech engines never read out symbols, slashes ("شرطة"), or raw digit codes.
 */
export function cleanSpeechText(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  // 1. Remove Markdown headers (#, ##, ###)
  cleaned = cleaned.replace(/#{1,6}\s*/g, '');

  // 2. Remove Markdown bold/italic asterisks & underscores (**text**, *text*, __text__, _text_)
  cleaned = cleaned.replace(/[\*_~]{1,3}/g, '');

  // 3. Remove Markdown links [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

  // 4. Remove Markdown code blocks & inline code
  cleaned = cleaned.replace(/`{1,3}[^`]*`{1,3}/g, '');
  cleaned = cleaned.replace(/`/g, '');

  // 5. Remove HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  // 6. Remove all Emojis and miscellaneous symbols
  cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu, '');

  // 7. Remove bullet points (•, - at line start) without stripping important numbers
  cleaned = cleaned.replace(/^[\s•\-\*]+/gm, '');

  // 8. Transform semantic tokens, dates, amounts, contract codes, and numbers to spoken words
  cleaned = normalizeArabicSpeechPhonetics(cleaned);

  // 9. Apply Saudi dialect diacritics and acoustic pauses
  cleaned = diacritizeArabicSpeech(cleaned);

  // 10. Normalize spaces and line breaks into natural spoken pauses
  cleaned = cleaned.replace(/[\r\n]+/g, ' ، ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 11. Remove any leading/trailing commas or dots
  cleaned = cleaned.replace(/^[\s،,.]+|[\s،,.]+$/g, '').trim();

  return cleaned;
}

