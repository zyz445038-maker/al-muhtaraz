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
  return `<text x="${x}" y="${y}" text-anchor="start" direction="rtl" unicode-bidi="plaintext" font-family="Arial, sans-serif" font-size="${size}" fill="${color}">${escapeXml(value)}</text>`;
}

function wrapText(value: string, maxLength = 62): string[] {
  const lines: string[] = [];
  let line = '';

  for (const word of value.split(/\s+/)) {
    if (!word) continue;

    if (word.length > maxLength) {
      if (line) lines.push(line);
      line = '';
      const characters = Array.from(word);
      for (let index = 0; index < characters.length; index += maxLength) {
        const part = characters.slice(index, index + maxLength).join('');
        if (index + maxLength < characters.length) lines.push(part);
        else line = part;
      }
      continue;
    }

    if (line && line.length + word.length + 1 > maxLength) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }

  if (line) lines.push(line);
  return lines.length ? lines : ['-'];
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
    ['رقم الفاتورة', payload.receiptNumber],
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

  let nextRowY = 285;
  const detailRows = rows.map(([label, value], index) => {
    const lines = wrapText(value);
    const rowHeight = Math.max(76, 48 + lines.length * 27);
    const background = index % 2 === 0 ? '#f1f5f9' : '#ffffff';
    const valueText = `<text x="895" y="${nextRowY + 53}" text-anchor="start" direction="rtl" unicode-bidi="plaintext" font-family="Arial, sans-serif" font-size="21" fill="#172033">${lines.map((line, lineIndex) => `<tspan x="895" dy="${lineIndex === 0 ? 0 : 27}">${escapeXml(line)}</tspan>`).join('')}</text>`;
    const row = [
      `<rect x="70" y="${nextRowY}" width="860" height="${rowHeight}" rx="8" fill="${background}"/>`,
      text(label, 895, nextRowY + 24, 16, '#64748b'),
      valueText
    ].join('');
    nextRowY += rowHeight + 8;
    return row;
  }).join('');
  const height = nextRowY + 50;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1000 ${height}" preserveAspectRatio="xMidYMin meet" style="display:block;width:100vw;height:auto;max-width:100vw">
    <rect width="1000" height="${height}" fill="#eef2f7"/>
    <rect x="35" y="35" width="930" height="${height - 70}" rx="24" fill="#ffffff" stroke="#d7a12d" stroke-width="5"/>
    <rect x="70" y="70" width="860" height="180" rx="18" fill="#0f172a"/>
    ${text('المحترز للحاويات', 890, 135, 38, '#fbbf24')}
    ${text('صورة فاتورة إلكترونية', 890, 195, 28, '#ffffff')}
    ${detailRows}
    <text x="500" y="${height - 25}" text-anchor="middle" direction="rtl" font-family="Arial, sans-serif" font-size="18" fill="#64748b">صورة الفاتورة المعتمدة — للتحقق امسح رمز QR</text>
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
