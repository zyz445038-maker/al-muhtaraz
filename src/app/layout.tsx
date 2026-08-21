export const dynamic = 'force-dynamic';

import type { Metadata, Viewport } from 'next';
import './globals.css';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'المحترز للحاويات | إدارة وتأجير الحاويات التجارية والأنقاض',
  description: 'المنصة الذكية لإدارة وتأجير الحاويات التجارية وعقود الأنقاض اليومية وتنبيهات الواتساب والمواقع الجغرافية',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' }
    ],
    shortcut: '/icon-192x192.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
  },
  applicationName: 'المحترز للحاويات',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'المحترز للحاويات',
  },
};

export const viewport: Viewport = {
  themeColor: '#050811',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
