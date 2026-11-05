import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import QRCode from 'qrcode';
import { NextResponse } from 'next/server';
import { decodeReceiptVerificationPayload } from '@/utils/receiptEncoder';
import { COMPANY_OFFICIAL_INFO } from '@/types/officialContract';
import { createInvoicePresentation } from '@/utils/invoicePresentation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const invoiceLogo = readFile(join(process.cwd(), 'public', 'invoice-logo.jpg'))
  .then(image => `data:image/jpeg;base64,${image.toString('base64')}`);

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function text(
  value: string,
  x: number,
  y: number,
  size = 22,
  color = '#1c1917',
  weight = 400,
  anchor: 'start' | 'middle' | 'end' = 'start'
): string {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" direction="rtl" unicode-bidi="plaintext" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${escapeXml(value)}</text>`;
}

function wrapText(value: string, maxLength: number): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
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

function renderField(
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  height = 76
): string {
  const lines = wrapText(value, width > 500 ? 70 : 30);
  const valueLines = lines.slice(0, 2).map((line, index) =>
    `<tspan x="${x + width - 18}" dy="${index === 0 ? 0 : 26}">${escapeXml(line)}</tspan>`
  ).join('');

  return [
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" fill="#fafaf9" stroke="#e7e5e4" stroke-width="2"/>`,
    text(label, x + width - 18, y + 26, 17, '#78716c', 600),
    `<text x="${x + width - 18}" y="${y + 57}" text-anchor="start" direction="rtl" unicode-bidi="plaintext" font-family="Arial, sans-serif" font-size="21" font-weight="700" fill="#1c1917">${valueLines}</text>`
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

  const logo = await invoiceLogo;
  const presentation = createInvoicePresentation({
    ...payload,
    isFree: payload.paymentMethod === 'free' || payload.totalCost === 0
  });
  const { invoiceAmounts, receiptAmounts, isFree, remainingAmount, issueDate, formatMoney, paymentMethod } = presentation;
  const verificationUrl = request.url;
  const qr = QRCode.create(verificationUrl, { errorCorrectionLevel: 'M' });
  const qrModuleSize = Math.floor(220 / (qr.modules.size + 8));
  if (qrModuleSize < 2) {
    return new NextResponse('Receipt verification URL is too long to render.', { status: 422 });
  }

  const qrX = 710;
  const qrY = 1106;
  const qrQuietZone = 4;
  const qrSquares: string[] = [];
  for (let row = 0; row < qr.modules.size; row++) {
    for (let column = 0; column < qr.modules.size; column++) {
      if (qr.modules.get(row, column)) {
        qrSquares.push(
          `<rect x="${qrX + (column + qrQuietZone) * qrModuleSize}" y="${qrY + (row + qrQuietZone) * qrModuleSize}" width="${qrModuleSize}" height="${qrModuleSize}"/>`
        );
      }
    }
  }

  const left = 70;
  const right = 930;
  const cardWidth = 270;
  const cardGap = 25;
  const rightCardX = right - cardWidth;
  const middleCardX = rightCardX - cardGap - cardWidth;
  const leftCardX = left;
  const fields = [
    renderField('اسم العميل / المستأجر', payload.customerName, rightCardX, 365, cardWidth, 80),
    renderField('الرقم الضريبي للعميل', payload.customerVatNumber?.trim() || 'غير مسجل', middleCardX, 365, cardWidth, 80),
    renderField('رقم العقد', payload.contractNumber, leftCardX, 365, cardWidth, 80),
    renderField('رقم جوال العميل', payload.customerPhone, rightCardX, 456, cardWidth, 80),
    renderField('رقم الحاوية', payload.containerNumber, middleCardX, 456, cardWidth, 80),
    renderField('نوع العقد والحاوية', payload.contractType, leftCardX, 456, cardWidth, 80),
    renderField('تاريخ البداية', payload.startDate, rightCardX, 547, cardWidth, 80),
    renderField('تاريخ نهاية الإيجار', payload.endDate, middleCardX, 547, cardWidth, 80),
    renderField('حالة الفاتورة', isFree ? 'عقد مجاني' : remainingAmount > 0 ? 'دفعة جزئية' : 'مسدد بالكامل', leftCardX, 547, cardWidth, 80),
    ...(payload.locationAddress
      ? [renderField('موقع تنزيل الحاوية', payload.locationAddress, left, 638, right - left, 72)]
      : [])
  ].join('');
  const totalsY = payload.locationAddress ? 728 : 637;
  const hasNonTaxableAmount = invoiceAmounts.nonTaxableAmount > 0;
  const rowOffset = hasNonTaxableAmount ? 36 : 0;
  const totalRows = [
    ...(hasNonTaxableAmount ? [
      text('رصيد سابق غير خاضع للضريبة', right - 28, totalsY + 40, 18, '#57534e', 600),
      text(`${formatMoney(invoiceAmounts.nonTaxableAmount)} ر.س`, left + 28, totalsY + 40, 18, '#57534e', 600, 'end')
    ] : []),
    text('المبلغ قبل الضريبة', right - 28, totalsY + 45 + rowOffset, 20, '#44403c', 600),
    text(`${formatMoney(invoiceAmounts.subtotalAmount)} ر.س`, left + 28, totalsY + 45 + rowOffset, 20, '#44403c', 600, 'end'),
    text('ضريبة القيمة المضافة (15%)', right - 28, totalsY + 88 + rowOffset, 20, '#44403c', 600),
    text(`${formatMoney(invoiceAmounts.vatAmount)} ر.س`, left + 28, totalsY + 88 + rowOffset, 20, '#44403c', 600, 'end'),
    `<rect x="${left + 14}" y="${totalsY + 112 + rowOffset}" width="${right - left - 28}" height="55" rx="8" fill="#f6eedb"/>`,
    text('الإجمالي بعد الضريبة', right - 28, totalsY + 148 + rowOffset, 22, '#78571d', 700),
    text(`${formatMoney(invoiceAmounts.grossAmount)} ر.س`, left + 28, totalsY + 148 + rowOffset, 22, '#78571d', 700, 'end'),
    ...(!invoiceAmounts.isVatAware
      ? [text('قيمة عقد سابقة معروضة كما خُزنت دون إعادة احتساب الضريبة.', 500, totalsY + 190 + rowOffset, 15, '#78716c', 500, 'middle')]
      : [])
  ].join('');
  const paymentY = totalsY + 205 + rowOffset;
  const paymentDetails = !isFree ? [
    `<rect x="${left}" y="${paymentY}" width="${right - left}" height="62" rx="8" fill="#ffffff" stroke="#e7e5e4" stroke-width="2"/>`,
    text(`قبل الضريبة في الدفعة: ${formatMoney(receiptAmounts.subtotalAmount + receiptAmounts.nonTaxableAmount)} ر.س`, right - 18, paymentY + 25, 16, '#57534e', 600),
    text(`إجمالي الدفعة الحالية: ${formatMoney(receiptAmounts.grossAmount)} ر.س`, 500, paymentY + 25, 16, '#57534e', 600, 'middle'),
    text(`طريقة السداد: ${paymentMethod.label}`, left + 18, paymentY + 25, 16, '#57534e', 600, 'end')
  ].join('') : '';
  const footerY = 1090;
  const qrSize = (qr.modules.size + qrQuietZone * 2) * qrModuleSize;
  const stampX = left + 12;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1000 1414" preserveAspectRatio="xMidYMin meet" style="display:block;width:100vw;height:auto;max-width:100vw" role="img" aria-label="فاتورة ${escapeXml(payload.receiptNumber)}">
    <rect width="1000" height="1414" fill="#ffffff"/>
    <image href="${logo}" x="68" y="48" width="145" height="140" preserveAspectRatio="xMidYMid meet"/>
    ${text(issueDate, 140, 216, 16, '#171717', 700, 'middle')}
    ${text(COMPANY_OFFICIAL_INFO.nameArabic, 930, 76, 22, '#171717', 700)}
    ${text('تأجير الحاويات التجارية وعقود الإنشاءات', 930, 107, 15, '#57534e')}
    ${text(`الرقم الضريبي: ${COMPANY_OFFICIAL_INFO.vatNumber}  |  السجل التجاري: ${COMPANY_OFFICIAL_INFO.crNumber}`, 930, 136, 14, '#44403c', 600)}
    ${text('المملكة العربية السعودية', 930, 164, 15, '#57534e')}
    ${text(`${COMPANY_OFFICIAL_INFO.address.replace('المملكة العربية السعودية – ', '')}  |  هاتف: ${COMPANY_OFFICIAL_INFO.phone}`, 930, 192, 14, '#57534e')}
    <rect x="70" y="235" width="860" height="1" fill="#d6d3d1"/>
    ${text('فاتورة', 500, 284, 34, '#171717', 700, 'middle')}
    ${text(`رقم الفاتورة: ${payload.receiptNumber}`, 500, 319, 17, '#1c1917', 700, 'middle')}
    ${fields}
    <rect x="${left}" y="${totalsY}" width="${right - left}" height="${205 + rowOffset}" rx="10" fill="#ffffff" stroke="#e7e5e4" stroke-width="2"/>
    ${totalRows}
    ${paymentDetails}
    ${!isFree && remainingAmount > 0 ? text(`المتبقي من العقد: ${formatMoney(remainingAmount)} ر.س`, 500, paymentY + 82, 15, '#78716c', 600, 'middle') : ''}
    <rect x="${qrX - 10}" y="${qrY - 10}" width="${qrSize + 20}" height="${qrSize + 20}" rx="4" fill="#ffffff"/>
    <g fill="#000000" shape-rendering="crispEdges">${qrSquares.join('')}</g>
    ${text('✓ فاتورة إلكترونية موثقة', 500, footerY + 40, 20, '#292524', 700, 'middle')}
    ${text('امسح كود QR للتحقق من صحة الفاتورة', 500, footerY + 72, 16, '#57534e', 500, 'middle')}
    ${text(COMPANY_OFFICIAL_INFO.nameArabic, stampX + 120, footerY + 40, 16, '#171717', 700, 'middle')}
    <rect x="${stampX}" y="${footerY + 68}" width="240" height="1" fill="#78716c"/>
    ${text('الختم والتوقيع المعتمد', stampX + 120, footerY + 94, 14, '#57534e', 600, 'middle')}
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
