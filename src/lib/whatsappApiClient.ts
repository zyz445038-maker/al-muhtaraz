'use client';

import { supabaseBrowser } from '@/lib/supabaseBrowser';

export async function getWhatsAppApiHeaders(json = false): Promise<Record<string, string>> {
  const { data: { session }, error } = await supabaseBrowser.auth.getSession();
  if (error || !session?.access_token) {
    throw new Error('انتهت جلسة الدخول. سجّل الدخول مجدداً ثم أعد المحاولة.');
  }

  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${session.access_token}`
  };
}
