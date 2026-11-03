import QRCode from 'qrcode';
import { NextResponse } from 'next/server';
import { decodeReceiptVerificationPayload } from '@/utils/receiptEncoder';
import { COMPANY_OFFICIAL_INFO } from '@/types/officialContract';

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

function text(value: string, x: number, y: number, size = 25, color = '#172033', weight = 400): string {
  return `<text x="${x}" y="${y}" text-anchor="start" direction="rtl" unicode-bidi="plaintext" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${escapeXml(value)}</text>`;
}

function wrapText(value: string, maxLength: number): string[] {
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

function paymentLabel(method: string): string {
  const labels: Record<string, string> = {
    apple_pay: 'Apple Pay',
    mada: 'بطاقة مدى',
    credit_card: 'Visa / Master',
    cash: 'نقدي كاش',
    pos: 'نقاط البيع POS',
    bank_transfer: 'تحويل بنكي',
    deferred: 'آجل على الحساب',
    free: 'معتمد رسمي'
  };
  return labels[method] || method || 'سداد إلكتروني';
}

function formatIssueDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function renderField(
  label: string,
  x: number,
  y: number,
  width: number,
  lines: string[],
  background: string
): string {
  const height = Math.max(92, 63 + lines.length * 28);
  const valueLines = lines.map((line, index) =>
    `<tspan x="${x + width - 18}" dy="${index === 0 ? 0 : 28}">${escapeXml(line)}</tspan>`
  ).join('');

  return [
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" fill="${background}" stroke="#e2e8f0" stroke-width="2"/>`,
    text(label, x + width - 18, y + 31, 18, '#64748b', 700),
    `<text x="${x + width - 18}" y="${y + 65}" text-anchor="start" direction="rtl" unicode-bidi="plaintext" font-family="Arial, sans-serif" font-size="23" font-weight="700" fill="#0f172a">${valueLines}</text>`
  ].join('');
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

  const remaining = Math.max(0, payload.totalCost - payload.paidAmount);
  const isFree = payload.paymentMethod === 'free' || (payload.paidAmount === 0 && payload.totalCost === 0);
  const isPartial = !isFree && remaining > 0;
  const issueDate = formatIssueDate(payload.issueDate);
  const amountBackground = isFree ? '#f8fafc' : '#f0fdf4';
  const amountBorder = isFree ? '#e2e8f0' : '#86efac';
  const amountColor = isFree ? '#64748b' : '#059669';
  const invoiceStatus = isFree ? 'معتمد رسمي' : isPartial ? 'دفعة مسددة جزئياً' : 'مسدد بالكامل رسمياً';
  const amountY = 320;
  const amountHeight = 132;
  const partialNoticeY = amountY + amountHeight + 14;
  const qr = QRCode.create(request.url, { errorCorrectionLevel: 'M' });
  const qrModuleSize = Math.min(3.5, 340 / (qr.modules.size + 8));
  const qrQuietZone = 4;
  const qrSize = (qr.modules.size + qrQuietZone * 2) * qrModuleSize;
  const qrX = 70;
  const qrSquares: string[] = [];
  for (let row = 0; row < qr.modules.size; row++) {
    for (let column = 0; column < qr.modules.size; column++) {
      if (qr.modules.get(row, column)) {
        qrSquares.push(
          `<rect x="${qrX + (column + qrQuietZone) * qrModuleSize}" y="${(row + qrQuietZone) * qrModuleSize}" width="${qrModuleSize}" height="${qrModuleSize}"/>`
        );
      }
    }
  }

  const gridWidth = 420;
  const gridGap = 20;
  const gridTop = isPartial ? partialNoticeY + 92 : amountY + amountHeight + 18;
  const fields: Array<{ label: string; value: string; fullWidth?: boolean }> = [
    { label: 'رقم الفاتورة', value: payload.receiptNumber },
    { label: 'رقم العقد', value: payload.contractNumber },
    { label: 'اسم العميل / المستأجر', value: payload.customerName },
    { label: 'رقم جوال العميل', value: payload.customerPhone },
    { label: 'رقم الحاوية', value: payload.containerNumber },
    { label: 'نوع العقد والحاوية', value: payload.contractType },
    { label: 'تاريخ بداية الإيجار', value: payload.startDate },
    { label: 'تاريخ نهاية الإيجار', value: payload.endDate },
    { label: 'تاريخ وتوقيت الإصدار', value: issueDate },
    { label: 'حالة الفاتورة', value: invoiceStatus }
  ];
  if (payload.locationAddress) {
    fields.push({ label: 'موقع تنزيل الحاوية', value: payload.locationAddress, fullWidth: true });
  }

  let nextY = gridTop;
  let fieldMarkup = '';
  for (let index = 0; index < fields.length;) {
    const first = fields[index];
    if (first.fullWidth) {
      const lines = wrapText(first.value, 66);
      const height = Math.max(92, 63 + lines.length * 28);
      fieldMarkup += renderField(first.label, 70, nextY, 860, lines, '#f8fafc');
      nextY += height + 12;
      index++;
      continue;
    }

    const second = fields[index + 1];
    const firstLines = wrapText(first.value, 28);
    const secondLines = second ? wrapText(second.value, 28) : [];
    const rowHeight = Math.max(
      92,
      63 + Math.max(firstLines.length, secondLines.length) * 28
    );
    fieldMarkup += renderField(
      first.label,
      510,
      nextY,
      gridWidth,
      firstLines,
      index % 4 === 0 ? '#f1f5f9' : '#ffffff'
    );
    if (second) {
      fieldMarkup += renderField(
        second.label,
        70,
        nextY,
        gridWidth,
        secondLines,
        index % 4 === 0 ? '#f1f5f9' : '#ffffff'
      );
    }
    nextY += rowHeight + 12;
    index += second ? 2 : 1;
  }

  const footerY = nextY + 28;
  const height = footerY + Math.max(430, qrSize + 100);
  const qrTop = footerY + 20;
  const qrBackground = `<rect x="${qrX}" y="${qrTop}" width="${qrSize}" height="${qrSize}" rx="8" fill="#ffffff" stroke="#0f172a" stroke-width="3"/>`;
  const qrContent = `<g transform="translate(0 ${qrTop})" fill="#000000">${qrSquares.join('')}</g>`;
  const qrCaption = [
    text('✓ فاتورة إلكترونية موثقة', 900, qrTop + 55, 20, '#059669', 700),
    text('امسح للتحقق من الفاتورة', 900, qrTop + 87, 17, '#475569')
  ].join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1000 ${height}" preserveAspectRatio="xMidYMin meet" style="display:block;width:100vw;height:auto;max-width:100vw">
    <defs>
      <linearGradient id="header" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#d97706"/>
        <stop offset="100%" stop-color="#b45309"/>
      </linearGradient>
    </defs>
    <rect width="1000" height="${height}" fill="#f8fafc"/>
    <rect x="35" y="35" width="930" height="${height - 70}" rx="24" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>

    <rect x="55" y="55" width="890" height="180" rx="18" fill="url(#header)"/>
    ${text(COMPANY_OFFICIAL_INFO.nameArabic, 910, 105, 34, '#ffffff', 700)}
    ${text('تأجير الحاويات التجارية وعقود الأنقاض', 910, 141, 20, '#fff7ed', 400)}
    ${text('الرياض — المملكة العربية السعودية', 910, 172, 18, '#fff7ed', 400)}
    <rect x="75" y="75" width="300" height="140" rx="14" fill="#ffffff" fill-opacity="0.14" stroke="#ffffff" stroke-opacity="0.45" stroke-width="2"/>
    ${text('INVOICE', 345, 106, 16, '#ffedd5', 700)}
    ${text('فاتورة', 345, 137, 25, '#ffffff', 700)}
    ${text(payload.receiptNumber, 345, 168, 18, '#ffffff', 700)}
    ${text(issueDate, 345, 196, 14, '#ffedd5', 400)}

    ${text('الرقم الضريبي: 300099887700003', 910, 269, 17, '#475569', 700)}
    ${text('السجل التجاري: 1010889900', 490, 269, 17, '#475569', 700)}
    ${text('هاتف: 920001234', 910, 298, 17, '#475569', 700)}

    <rect x="70" y="${amountY}" width="860" height="${amountHeight}" rx="16" fill="${amountBackground}" stroke="${amountBorder}" stroke-width="3"/>
    ${text(isFree ? 'فاتورة تأجير رسمية معتمدة' : 'المبلغ المقبوض والمسدد', 500, amountY + 29, 18, '#64748b', 700)}
    <text x="500" y="${amountY + 73}" text-anchor="middle" direction="rtl" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="${amountColor}">${isFree ? '—' : `${payload.paidAmount.toLocaleString('ar-SA')} ر.س`}</text>
    ${text(isPartial ? `إجمالي العقد: ${payload.totalCost.toLocaleString('ar-SA')} ر.س` : paymentLabel(payload.paymentMethod), 500, amountY + 101, 16, '#334155', 700)}
    ${isPartial ? text(`المتبقي: ${remaining.toLocaleString('ar-SA')} ر.س`, 500, amountY + 124, 15, '#9a3412', 700) : ''}

    ${isPartial ? `<rect x="70" y="${partialNoticeY}" width="860" height="72" rx="12" fill="#fff7ed" stroke="#fed7aa" stroke-width="2"/>
      ${text(`دفعة جزئية على الحساب — إجمالي العقد: ${payload.totalCost.toLocaleString('ar-SA')} ر.س`, 900, partialNoticeY + 34, 18, '#9a3412', 700)}
      ${text(`المتبقي: ${remaining.toLocaleString('ar-SA')} ر.س`, 900, partialNoticeY + 57, 16, '#9a3412', 700)}` : ''}

    ${fieldMarkup}
    <line x1="430" y1="${footerY}" x2="930" y2="${footerY}" stroke="#cbd5e1" stroke-width="3" stroke-dasharray="10 8"/>
    ${qrBackground}
    ${qrContent}
    ${qrCaption}
    <rect x="610" y="${qrTop + 112}" width="300" height="150" rx="12" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
    ${text(COMPANY_OFFICIAL_INFO.nameArabic, 885, qrTop + 166, 21, '#0f172a', 700)}
    <line x1="640" y1="${qrTop + 221}" x2="880" y2="${qrTop + 221}" stroke="#0f172a" stroke-width="2"/>
    ${text('الختم والتوقيع المعتمد', 885, qrTop + 249, 16, '#475569', 700)}
    <text x="500" y="${height - 36}" text-anchor="middle" direction="rtl" font-family="Arial, sans-serif" font-size="17" fill="#92400e">تعتبر هذه الفاتورة إشعاراً مالياً صادراً من النظام السحابي لـ ${COMPANY_OFFICIAL_INFO.nameArabic} ومسجلة برقم فريد.</text>
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
