import QRCode from 'qrcode';

export interface GenerateContractCardParams {
  contractNumber: string;
  receiptNumber?: string;
  customerName: string;
  customerPhone: string;
  containerNumber: string;
  contractType: string;
  totalCost: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: string;
  startDate: string;
  endDate: string;
  locationAddress?: string;
  verificationUrl?: string;
}

/**
 * Generates an ultra-high-definition Luxury Digital Contract Voucher Card (JPEG Base64)
 * Runs purely on HTML5 Canvas in the browser. Zero server overhead.
 */
export async function generateContractVoucherImage(params: GenerateContractCardParams): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('generateContractVoucherImage must be called in browser environment');
  }

  // Ensure Arabic fonts are loaded for crisp glyphs
  try {
    if (document.fonts) {
      await document.fonts.ready;
    }
  } catch (e) {}

  const width = 900;
  const height = 1200;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // 1. Background Gradient (Luxury Dark Slate Navy)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#0a0f1d');
  bgGrad.addColorStop(0.5, '#0f172a');
  bgGrad.addColorStop(1, '#080c14');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Outer Border (Gold Glow)
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, width - 32, height - 32);

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(22, 22, width - 44, height - 44);

  // 3. Top Header Box
  const headerGrad = ctx.createLinearGradient(30, 30, width - 60, 160);
  headerGrad.addColorStop(0, '#d97706');
  headerGrad.addColorStop(1, '#b45309');
  ctx.fillStyle = headerGrad;
  roundRect(ctx, 32, 32, width - 64, 150, 18);
  ctx.fill();

  // Header Text
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px "Cairo", "Tajawal", sans-serif';
  ctx.fillText('مؤسسة المحترز للحاويات', width / 2, 85);

  ctx.font = '600 18px "Cairo", "Tajawal", sans-serif';
  ctx.fillStyle = '#fef3c7';
  ctx.fillText('تأجير الحاويات التجارية وعقود الأنقاض — الرياض، المملكة العربية السعودية', width / 2, 118);

  // Sub Badge
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  roundRect(ctx, width / 2 - 180, 134, 360, 34, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "Cairo", "Tajawal", sans-serif';
  ctx.fillText('📄 سند وعقد تأجير إلكتروني معتمد 📄', width / 2, 157);

  // 4. Main Financial Amount Box
  const isPaidFull = params.remainingAmount === 0;
  const isPartial = params.paidAmount > 0 && params.remainingAmount > 0;
  
  const amountGrad = ctx.createLinearGradient(40, 200, width - 80, 320);
  if (isPaidFull) {
    amountGrad.addColorStop(0, 'rgba(16, 185, 129, 0.15)');
    amountGrad.addColorStop(1, 'rgba(5, 150, 105, 0.25)');
  } else if (isPartial) {
    amountGrad.addColorStop(0, 'rgba(245, 158, 11, 0.15)');
    amountGrad.addColorStop(1, 'rgba(217, 119, 6, 0.25)');
  } else {
    amountGrad.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
    amountGrad.addColorStop(1, 'rgba(37, 99, 235, 0.25)');
  }

  ctx.fillStyle = amountGrad;
  roundRect(ctx, 40, 200, width - 80, 140, 16);
  ctx.fill();
  ctx.strokeStyle = isPaidFull ? '#10b981' : isPartial ? '#f59e0b' : '#3b82f6';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '700 18px "Cairo", "Tajawal", sans-serif';
  ctx.fillText('المبلغ الإجمالي للعقد', width / 2, 235);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 48px "Cairo", "Tajawal", sans-serif';
  ctx.fillText(`${params.totalCost.toLocaleString('ar-SA')} ريال سعودي`, width / 2, 290);

  ctx.font = 'bold 16px "Cairo", "Tajawal", sans-serif';
  ctx.fillStyle = isPaidFull ? '#34d399' : isPartial ? '#fbbf24' : '#60a5fa';
  const payStatusText = isPaidFull 
    ? '✓ تم السداد بالكامل رسمياً' 
    : isPartial 
      ? `دفعة مسددة: ${params.paidAmount} ر.س | المتبقي: ${params.remainingAmount} ر.س` 
      : 'آجل / في انتظار السداد';
  ctx.fillText(payStatusText, width / 2, 324);

  // 5. Contract Info Grid (Two Columns)
  const startY = 365;
  const colWidth = (width - 100) / 2;
  const rowHeight = 70;
  const gap = 16;

  const infoFields = [
    { label: 'رقم العقد:', value: params.contractNumber, color: '#fbbf24' },
    { label: 'رقم السند المالي:', value: params.receiptNumber || 'سند آجل', color: '#38bdf8' },
    { label: 'اسم العميل / المستأجر:', value: params.customerName, color: '#ffffff' },
    { label: 'رقم الجوال:', value: params.customerPhone, color: '#ffffff' },
    { label: 'رقم الحاوية:', value: params.containerNumber, color: '#34d399' },
    { label: 'نوع العقد والحاوية:', value: params.contractType, color: '#ffffff' },
    { label: 'تاريخ بداية التأجير:', value: params.startDate, color: '#ffffff' },
    { label: 'موعد السحب وانتهاء العقد:', value: params.endDate, color: '#f87171' },
  ];

  infoFields.forEach((field, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = col === 0 ? 50 + colWidth + gap : 50; // RTL (Right is col 0)
    const y = startY + row * (rowHeight + gap);

    // Box
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    roundRect(ctx, x, y, colWidth, rowHeight, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Text RTL
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 14px "Cairo", "Tajawal", sans-serif';
    ctx.fillText(field.label, x + colWidth - 14, y + 26);

    ctx.fillStyle = field.color;
    ctx.font = 'bold 18px "Cairo", "Tajawal", sans-serif';
    ctx.fillText(field.value, x + colWidth - 14, y + 54);
  });

  // Location Box (Full Width)
  if (params.locationAddress) {
    const locY = startY + 4 * (rowHeight + gap);
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    roundRect(ctx, 50, locY, width - 100, 60, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 13px "Cairo", "Tajawal", sans-serif';
    ctx.fillText('موقع تنزيل الحاوية:', width - 65, locY + 22);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Cairo", "Tajawal", sans-serif';
    ctx.fillText(`📍 ${params.locationAddress}`, width - 65, locY + 46);
  }

  // 6. Bottom Footer & Verification QR Code
  const footerY = height - 260;
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(50, footerY);
  ctx.lineTo(width - 50, footerY);
  ctx.stroke();

  // Generate QR Code onto Image
  const verifyUrl = params.verificationUrl || `https://al-muhtaraz.vercel.app/receipt/${params.receiptNumber || params.contractNumber}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 140,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    });

    const qrImg = await loadImage(qrDataUrl);
    // Draw white container for QR
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, 60, footerY + 25, 150, 150, 12);
    ctx.fill();
    ctx.drawImage(qrImg, 65, footerY + 30, 140, 140);
  } catch (e) {
    console.warn('QR generation error:', e);
  }

  // Verification text next to QR
  ctx.textAlign = 'right';
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 20px "Cairo", "Tajawal", sans-serif';
  ctx.fillText('✓ وثيقة إلكترونية موثقة', width - 260, footerY + 60);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 15px "Cairo", "Tajawal", sans-serif';
  ctx.fillText('امسح كود الـ QR للتحقق من صحة العقد والسند عبر النظام السحابي', width - 260, footerY + 90);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 13px "Cairo", "Tajawal", sans-serif';
  ctx.fillText('الختم والتوقيع معتمد إلكترونياً من مؤسسة المحترز للحاويات', width - 260, footerY + 115);

  // Official Stamp Box on the Left
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  roundRect(ctx, width - 240, footerY + 30, 180, 140, 12);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 16px "Cairo", "Tajawal", sans-serif';
  ctx.fillText('مؤسسة المحترز', width - 150, footerY + 65);
  ctx.fillText('للحاويات', width - 150, footerY + 90);
  ctx.font = '600 12px "Cairo", "Tajawal", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('الختم والاعتماد الرسمي', width - 150, footerY + 140);

  // Bottom Notice
  ctx.fillStyle = '#64748b';
  ctx.font = '500 13px "Cairo", "Tajawal", sans-serif';
  ctx.fillText('هذا الإشعار صادر آلياً من نظام إدارة الحاويات ويعد مستنداً رسمياً ملزماً لطرفي العقد.', width / 2, height - 35);

  // Convert Canvas to High-Quality JPEG DataURL
  return canvas.toDataURL('image/jpeg', 0.92);
}

// ─── Helper Functions ────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}
