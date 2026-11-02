import { supabase } from '@/lib/supabase';
import { runDbQuery } from '@/lib/db';

type WhatsAppAddonSettings = {
  evolution_server_url: string | null;
  evolution_api_key: string | null;
};

export async function getWhatsAppAddonConfig(): Promise<{ baseUrl: string; apiKey: string } | null> {
  let savedSettings: WhatsAppAddonSettings | null = null;
  const environmentUrl = process.env.WHATSAPP_ADDON_URL?.trim() || '';
  const environmentApiKey = process.env.WHATSAPP_ADDON_API_KEY?.trim() || '';

  if (!environmentUrl || !environmentApiKey) {
    const result = await runDbQuery<WhatsAppAddonSettings>('whatsapp.settings.read', () => supabase
      .from('whatsapp_settings')
      .select('evolution_server_url, evolution_api_key')
      .limit(1)
      .maybeSingle());

    if (!result.ok && (!environmentUrl || !environmentApiKey)) {
      throw new Error(`تعذر قراءة إعدادات خادم الواتساب: ${result.error}`);
    }

    savedSettings = result.ok ? result.data : null;
  }

  const savedUrl = savedSettings?.evolution_server_url?.trim() || '';
  const baseUrl = (environmentUrl || (
    savedUrl
    && !savedUrl.includes('localhost')
    && !savedUrl.includes('8080')
      ? savedUrl
      : ''
  )).replace(/\/+$/, '');
  const apiKey = environmentApiKey || savedSettings?.evolution_api_key?.trim() || '';

  if (!baseUrl || !apiKey) {
    return null;
  }

  return { baseUrl, apiKey };
}
