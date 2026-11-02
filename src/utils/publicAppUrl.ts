const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || 'https://al-muhtaraz.vercel.app';

export const PUBLIC_APP_ORIGIN = new URL(configuredOrigin).origin;
