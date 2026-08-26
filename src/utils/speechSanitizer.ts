/**
 * Speech Text Sanitizer
 * Strips all Markdown syntax, asterisks, hashtags, backticks, emojis, bullet points, and unwanted punctuation.
 * Transforms abbreviations like "ر.س" to "ريال" so speech engines never read out symbols, emojis, or punctuation.
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

  // 5. Remove bullet points and list markers (•, -, *, 1., 2.)
  cleaned = cleaned.replace(/^[\s•\-\*\d+\.]+/gm, '');

  // 6. Remove HTML tags
  cleaned = cleaned.replace(/<[^>]*>/g, '');

  // 7. Remove all Emojis and miscellaneous symbols
  // Comprehensive Unicode Emoji regex
  cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu, '');

  // 8. Replace common currency / abbreviations with natural spoken words
  cleaned = cleaned.replace(/\bر\.س\b/g, 'ريال');
  cleaned = cleaned.replace(/ر\.س/g, 'ريال');
  cleaned = cleaned.replace(/SAR/gi, 'ريال');

  // 9. Remove decorative symbols, brackets, pipes, colons at start of phrases
  cleaned = cleaned.replace(/[\|\=\+\<\>\{\}\[\]]/g, ' ');
  cleaned = cleaned.replace(/:\s*/g, ' ');

  // 10. Normalize spaces and line breaks into natural spoken pauses
  cleaned = cleaned.replace(/[\r\n]+/g, ' ، ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 11. Remove any leading/trailing commas or dots
  cleaned = cleaned.replace(/^[\s،,.]+|[\s،,.]+$/g, '').trim();

  return cleaned;
}
