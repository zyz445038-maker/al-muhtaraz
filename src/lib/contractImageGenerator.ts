import QRCode from 'qrcode';
import { COMPANY_OFFICIAL_INFO } from '@/types/officialContract';
import { createInvoicePresentation } from '@/utils/invoicePresentation';

export interface GenerateContractCardParams {
  contractNumber: string;
  receiptNumber?: string;
  customerName: string;
  customerVatNumber?: string;
  customerPhone: string;
  containerNumber: string;
  contractType: string;
  totalCost: number;
  paidAmount: number;
  nonTaxableAmount?: number;
  subtotalAmount?: number;
  vatAmount?: number;
  receiptNonTaxableAmount?: number;
  receiptSubtotalAmount?: number;
  receiptVatAmount?: number;
  remainingAmount: number;
  paymentMethod: string;
  startDate: string;
  endDate: string;
  locationAddress?: string;
  verificationUrl?: string;
  isFree?: boolean;
  issueDate?: string;
}

export async function generateContractVoucherImage(params: GenerateContractCardParams): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('generateContractVoucherImage must be called in browser environment');
  }

  if (document.fonts) await document.fonts.ready;

  const width = 900;
  const height = 1273;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  const logo = await loadImage('/invoice-logo.jpg');
  const presentation = createInvoicePresentation({
    type: 'receipt',
    receiptNumber: params.receiptNumber || params.contractNumber,
    contractNumber: params.contractNumber,
    customerName: params.customerName,
    customerVatNumber: params.customerVatNumber,
    customerPhone: params.customerPhone,
    containerNumber: params.containerNumber,
    contractType: params.contractType,
    totalCost: params.totalCost,
    contractPaidAmount: Math.max(0, params.totalCost - params.remainingAmount),
    paidAmount: params.paidAmount,
    nonTaxableAmount: params.nonTaxableAmount,
    subtotalAmount: params.subtotalAmount,
    vatAmount: params.vatAmount,
    receiptNonTaxableAmount: params.receiptNonTaxableAmount,
    receiptSubtotalAmount: params.receiptSubtotalAmount,
    receiptVatAmount: params.receiptVatAmount,
    paymentMethod: params.paymentMethod,
    startDate: params.startDate,
    endDate: params.endDate,
    locationAddress: params.locationAddress || '',
    issueDate: params.issueDate || new Date().toISOString(),
    isFree: params.isFree,
    remainingAmount: params.remainingAmount
  });
  const { invoiceAmounts, receiptAmounts, issueDate, formatMoney } = presentation;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.direction = 'rtl';
  ctx.textBaseline = 'alphabetic';

  drawContainedImage(ctx, logo, 48, 48, 136, 124);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 16px "Cairo", "Tajawal", sans-serif';
  ctx.fillText(issueDate, 116, 190);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#171717';
  ctx.font = 'bold 22px "Cairo", "Tajawal", sans-serif';
  ctx.fillText(COMPANY_OFFICIAL_INFO.nameArabic, 910, 72, 430);
  ctx.fillStyle = '#57534e';
  ctx.font = '500 15px "Cairo", "Tajawal", sans-serif';
  ctx.fillText('تأجير الحاويات التجارية وعقود الإنشاءات', 910, 99, 430);
  ctx.font = '600 13px "Cairo", "Tajawal", sans-serif';
  ctx.fillText(`الرقم الضريبي: ${COMPANY_OFFICIAL_INFO.vatNumber}  |  السجل التجاري: ${COMPANY_OFFICIAL_INFO.crNumber}`, 910, 126, 430);
  ctx.font = '500 15px "Cairo", "Tajawal", sans-serif';
  ctx.fillText('المملكة العربية السعودية', 910, 153, 430);
  ctx.fillText(`${COMPANY_OFFICIAL_INFO.address.replace('المملكة العربية السعودية – ', '')}  |  هاتف: ${COMPANY_OFFICIAL_INFO.phone}`, 910, 180, 430);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#171717';
  ctx.font = 'bold 32px "Cairo", "Tajawal", sans-serif';
  ctx.fillText('فاتورة', width / 2, 258);
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 16px "Cairo", "Tajawal", sans-serif';
  ctx.fillText(`رقم الفاتورة: ${params.receiptNumber || 'غير صادر بعد'}`, width / 2, 286);
  ctx.fillStyle = '#d6d3d1';
  ctx.fillRect(48, 210, width - 96, 1);

  const margin = 48;
  const gap = 10;
  const cardWidth = (width - margin * 2 - gap * 2) / 3;
  const cardHeight = 70;
  const infoTop = 322;
  const fieldRows = [
    [
      { label: 'اسم العميل / المستأجر', value: params.customerName },
      { label: 'الرقم الضريبي للعميل', value: params.customerVatNumber?.trim() || 'غير مسجل' },
      { label: 'رقم العقد', value: params.contractNumber }
    ],
    [
      { label: 'رقم جوال العميل', value: params.customerPhone || '-' },
      { label: 'رقم الحاوية', value: params.containerNumber || '-' },
      { label: 'نوع العقد والحاوية', value: params.contractType }
    ],
    [
      { label: 'تاريخ البداية', value: params.startDate },
      { label: 'تاريخ نهاية الإيجار', value: params.endDate },
      { label: 'حالة الفاتورة', value: params.isFree ? 'عقد مجاني' : params.remainingAmount > 0 ? 'دفعة جزئية' : 'مسدد بالكامل' }
    ]
  ];
  fieldRows.forEach((row, rowIndex) => {
    row.forEach((field, columnIndex) => {
      const x = width - margin - cardWidth - columnIndex * (cardWidth + gap);
      drawInfoCard(ctx, x, infoTop + rowIndex * (cardHeight + 8), cardWidth, cardHeight, field.label, field.value);
    });
  });
  const locationY = infoTop + fieldRows.length * (cardHeight + 8);
  if (params.locationAddress) {
    drawInfoCard(ctx, margin, locationY, width - margin * 2, 62, 'موقع تنزيل الحاوية', params.locationAddress);
  }

  const totalsY = params.locationAddress ? 638 : 626;
  const totalsHeight = 236;
  ctx.fillStyle = '#fafaf9';
  roundRect(ctx, margin, totalsY, width - margin * 2, totalsHeight, 12);
  ctx.fill();
  ctx.strokeStyle = '#e7e5e4';
  ctx.lineWidth = 2;
  ctx.stroke();

  const totals = [
    ...(invoiceAmounts.nonTaxableAmount > 0
      ? [['رصيد سابق غير خاضع للضريبة', `${formatMoney(invoiceAmounts.nonTaxableAmount)} ر.س`]]
      : []),
    ['المبلغ قبل الضريبة', `${formatMoney(invoiceAmounts.subtotalAmount)} ر.س`],
    ['ضريبة القيمة المضافة (15%)', `${formatMoney(invoiceAmounts.vatAmount)} ر.س`]
  ];
  totals.forEach(([label, amount], index) => {
    const y = totalsY + 42 + index * 42;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#44403c';
    ctx.font = '600 19px "Cairo", "Tajawal", sans-serif';
    ctx.fillText(label, width - margin - 24, y);
    ctx.textAlign = 'left';
    ctx.fillText(amount, margin + 24, y);
  });

  ctx.fillStyle = '#f6eedb';
  roundRect(ctx, margin + 14, totalsY + 132, width - margin * 2 - 28, 56, 8);
  ctx.fill();
  ctx.textAlign = 'right';
  ctx.fillStyle = '#78571d';
  ctx.font = 'bold 21px "Cairo", "Tajawal", sans-serif';
  ctx.fillText('الإجمالي بعد الضريبة', width - margin - 28, totalsY + 168);
  ctx.textAlign = 'left';
  ctx.font = 'bold 23px "Cairo", "Tajawal", sans-serif';
  ctx.fillText(`${formatMoney(invoiceAmounts.grossAmount)} ر.س`, margin + 28, totalsY + 168);

  if (!params.isFree) {
    const paymentY = totalsY + totalsHeight + 12;
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, margin, paymentY, width - margin * 2, 64, 8);
    ctx.fill();
    ctx.strokeStyle = '#e7e5e4';
    ctx.stroke();
    ctx.fillStyle = '#57534e';
    ctx.font = '600 14px "Cairo", "Tajawal", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`قبل الضريبة في الدفعة: ${formatMoney(receiptAmounts.subtotalAmount + receiptAmounts.nonTaxableAmount)} ر.س`, width - margin - 16, paymentY + 25, 250);
    ctx.textAlign = 'center';
    ctx.fillText(`إجمالي الدفعة الحالية: ${formatMoney(receiptAmounts.grossAmount)} ر.س`, width / 2, paymentY + 25, 265);
    ctx.textAlign = 'left';
    ctx.fillText(`طريقة السداد: ${presentation.paymentMethod.label || 'آجل'}`, margin + 16, paymentY + 25, 250);
  }

  const verifyUrl = params.verificationUrl || `https://al-muhtaraz.vercel.app/receipt/${params.receiptNumber || params.contractNumber}`;
  const qr = QRCode.create(verifyUrl, { errorCorrectionLevel: 'M' });
  const qrModuleSize = Math.floor(220 / (qr.modules.size + 8));
  if (qrModuleSize < 3) {
    throw new Error('Verification link is too long to render a reliably readable QR code.');
  }

  const qrSize = (qr.modules.size + 8) * qrModuleSize;
  const qrX = width - margin - qrSize;
  const qrY = 1040;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16);
  ctx.fillStyle = '#000000';
  for (let row = 0; row < qr.modules.size; row++) {
    for (let column = 0; column < qr.modules.size; column++) {
      if (qr.modules.get(row, column)) {
        ctx.fillRect(
          qrX + (column + 4) * qrModuleSize,
          qrY + (row + 4) * qrModuleSize,
          qrModuleSize,
          qrModuleSize
        );
      }
    }
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#292524';
  ctx.font = 'bold 18px "Cairo", "Tajawal", sans-serif';
  ctx.fillText('✓ فاتورة إلكترونية موثقة', 470, 1100, 250);
  ctx.fillStyle = '#57534e';
  ctx.font = '500 15px "Cairo", "Tajawal", sans-serif';
  ctx.fillText('امسح كود QR للتحقق من صحة الفاتورة', 470, 1130, 250);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#171717';
  ctx.font = 'bold 16px "Cairo", "Tajawal", sans-serif';
  ctx.fillText(COMPANY_OFFICIAL_INFO.nameArabic, 48, 1092, 250);
  ctx.fillStyle = '#78716c';
  ctx.font = '600 14px "Cairo", "Tajawal", sans-serif';
  ctx.fillText('الختم والتوقيع المعتمد', 48, 1150, 250);
  ctx.strokeStyle = '#78716c';
  ctx.beginPath();
  ctx.moveTo(48, 1132);
  ctx.lineTo(298, 1132);
  ctx.stroke();

  if (presentation.remainingAmount > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#78716c';
    ctx.font = '500 13px "Cairo", "Tajawal", sans-serif';
    ctx.fillText(`المتبقي من العقد: ${formatMoney(presentation.remainingAmount)} ر.س`, width / 2, 1022, 300);
  }

  return canvas.toDataURL('image/jpeg', 0.96);
}

function drawInfoCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string
) {
  ctx.fillStyle = '#fafaf9';
  roundRect(ctx, x, y, width, height, 8);
  ctx.fill();
  ctx.strokeStyle = '#e7e5e4';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textAlign = 'right';
  ctx.fillStyle = '#78716c';
  ctx.font = '600 13px "Cairo", "Tajawal", sans-serif';
  ctx.fillText(label, x + width - 12, y + 23);
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 16px "Cairo", "Tajawal", sans-serif';
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > width - 24) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  lines.slice(0, 2).forEach((valueLine, index) => {
    ctx.fillText(valueLine, x + width - 12, y + 46 + index * 17, width - 24);
  });
}

function drawContainedImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load invoice logo: ${src}`));
    image.src = src;
  });
}
