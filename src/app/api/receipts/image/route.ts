import { NextResponse } from 'next/server';
import { decodeReceiptVerificationPayload } from '@/utils/receiptEncoder';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function text(value: string, x: number, y: number, size = 25, color = '#172033'): string {
  return `<text x="${x}" y="${y}" text-anchor="end" direction="rtl" unicode-bidi="plaintext" font-family="Arial, sans-serif" font-size="${size}" fill="${color}">${escapeXml(value)}</text>`;
}

export async function GET(request: Request) {
  const encoded = new URL(request.url).searchParams.get('d');
  if (!encoded || encoded.length > 5000) {
    return new NextResponse('Receipt image not found.', { status: 404 });
  }

  const payload = await decodeReceiptVerificationPayload(encoded);
  if (!payload || payload.type === 'official_contract') {
    return new NextResponse('Receipt image data is invalid.', { status: 400 });
  }

  const rows = [
    ['رقم السند', payload.receiptNumber],
    ['رقم العقد', payload.contractNumber],
    ['اسم العميل', payload.customerName],
    ['رقم الجوال', payload.customerPhone],
    ['رقم الحاوية', payload.containerNumber],
    ['نوع العقد', payload.contractType],
    ['طريقة الدفع', payload.paymentMethod],
    ['المبلغ المسدد', `${payload.paidAmount.toLocaleString('ar-SA')} ر.س`],
    ['إجمالي العقد', `${payload.totalCost.toLocaleString('ar-SA')} ر.س`],
    ['تاريخ البداية', payload.startDate],
    ['تاريخ النهاية', payload.endDate],
    ['تاريخ الإصدار', new Date(payload.issueDate).toLocaleDateString('ar-SA')],
    ['الموقع', payload.locationAddress]
  ];

  const detailRows = rows.map(([label, value], index) => {
    const y = 320 + index * 64;
    const background = index % 2 === 0 ? '#f1f5f9' : '#ffffff';
    return [
      `<rect x="70" y="${y - 39}" width="860" height="54" rx="8" fill="${background}"/>`,
      text(label, 895, y, 20, '#64748b'),
      text(value, 570, y, 21)
    ].join('');
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1240" viewBox="0 0 1000 1240">
    <rect width="1000" height="1240" fill="#eef2f7"/>
    <rect x="35" y="35" width="930" height="1170" rx="24" fill="#ffffff" stroke="#d7a12d" stroke-width="5"/>
    <rect x="70" y="70" width="860" height="180" rx="18" fill="#0f172a"/>
    ${text('المحترز للحاويات', 890, 135, 38, '#fbbf24')}
    ${text('صورة سند قبض إلكتروني', 890, 195, 28, '#ffffff')}
    ${detailRows}
    <text x="500" y="1160" text-anchor="middle" direction="rtl" font-family="Arial, sans-serif" font-size="18" fill="#64748b">صورة السند المعتمدة — للتحقق امسح رمز QR على النسخة الأصلية</text>
  </svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Content-Disposition': 'inline; filename="receipt.svg"',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
