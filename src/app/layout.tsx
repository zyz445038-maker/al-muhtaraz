export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'المحترز للحاويات | إدارة وتأجير الحاويات التجارية والأنقاض',
  description: 'المنصة الذكية لإدارة وتأجير الحاويات التجارية وعقود الأنقاض اليومية وتنبيهات الواتساب والمواقع الجغرافية',
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
