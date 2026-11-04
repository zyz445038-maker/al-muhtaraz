export async function getWhatsAppAddonConfig(): Promise<{ baseUrl: string; apiKey: string } | null> {
  const environmentUrl = process.env.WHATSAPP_ADDON_URL?.trim() || '';
  const environmentApiKey = process.env.WHATSAPP_ADDON_API_KEY?.trim() || '';
  const baseUrl = environmentUrl.replace(/\/+$/, '');
  const apiKey = environmentApiKey;

  if (!baseUrl || !apiKey) {
    return null;
  }

  return { baseUrl, apiKey };
}
