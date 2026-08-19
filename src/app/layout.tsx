export const dynamic = 'force-dynamic';

import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'المحترز للحاويات | إدارة وتأجير الحاويات التجارية والأنقاض',
  description: 'المنصة الذكية لإدارة وتأجير الحاويات التجارية وعقود الأنقاض اليومية وتنبيهات الواتساب والمواقع الجغرافية',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
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
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
