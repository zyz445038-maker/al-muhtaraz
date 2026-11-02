export function normalizeWhatsAppPairingCode(value: string): string | null {
  const code = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return /^[A-Z0-9]{8}$/.test(code) ? code : null;
}
