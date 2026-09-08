import type { SupabaseClient } from '@supabase/supabase-js';

export interface PronunciationEntry {
  id?: string;
  word: string;
  pronunciation: string;
  enabled: boolean;
  notes?: string;
  created_at?: string;
}

// Built-in Commercial & Domain Dictionary for Al-Muhtaraz Containers
export const BUILTIN_PRONUNCIATION_DICTIONARY: Record<string, string> = {
  'المخترز': 'المُخْتَرَز',
  'مؤسسة المحترز': 'مُؤَسَّسَةُ المُخْتَرَز',
  'للحاويات': 'لِلْحَاوِيَات',
  'QR': 'كيو آر',
  'qr': 'كيو آر',
  'PDF': 'بي دي إف',
  'pdf': 'بي دي إف',
  'GPS': 'جي بي إس',
  'gps': 'جي بي إس',
  'SMS': 'رسالة نصية',
  'sms': 'رسالة نصية',
  'VAT': 'ضريبة القيمة المضافة',
  'vat': 'ضريبة القيمة المضافة',
  'WhatsApp': 'واتساب',
  'whatsapp': 'واتساب',
  'CTR': 'عقد',
  'ctr': 'عقد',
  'CNT': 'حاوية',
  'cnt': 'حاوية',
  'INV': 'فاتورة',
  'inv': 'فاتورة',
  'RCP': 'سند قبض',
  'rcp': 'سند قبض',
};

let cachedDictionary: Record<string, string> | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const { createClient } = require('@supabase/supabase-js');
    return createClient(url, key);
  } catch (e) {
    return null;
  }
}

/**
 * Retrieves the pronunciation dictionary (Combining Supabase dynamic table + Builtin fallback)
 */
export async function getPronunciationDictionary(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedDictionary && (now - lastFetchTime) < CACHE_TTL_MS) {
    return cachedDictionary;
  }

  const combinedDict = { ...BUILTIN_PRONUNCIATION_DICTIONARY };
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data, error } = await client
        .from('tts_pronunciation_dictionary')
        .select('word, pronunciation')
        .eq('enabled', true);

      if (!error && Array.isArray(data)) {
        data.forEach((row: { word: string; pronunciation: string }) => {
          if (row.word && row.pronunciation) {
            combinedDict[row.word.trim()] = row.pronunciation.trim();
          }
        });
      }
    } catch (err) {
      // Failover silently to builtin dictionary if table doesn't exist yet
    }
  }

  cachedDictionary = combinedDict;
  lastFetchTime = now;
  return combinedDict;
}


/**
 * Synchronous dictionary lookup using cached or builtin rules for sub-millisecond execution
 */
export function applyPronunciationDictionarySync(text: string): string {
  if (!text) return '';
  const dict = cachedDictionary || BUILTIN_PRONUNCIATION_DICTIONARY;
  let result = text;

  Object.entries(dict).forEach(([word, pronunciation]) => {
    const safeWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<![\\u0600-\\u06FFa-zA-Z0-9])${safeWord}(?![\\u0600-\\u06FFa-zA-Z0-9])`, 'gi');
    result = result.replace(regex, pronunciation);
  });

  return result;
}
