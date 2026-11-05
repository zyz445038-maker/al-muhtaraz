'use client';

import React, { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  createReceiptNumberVerificationUrl,
  createReceiptVerificationUrl
} from '@/lib/receiptVerification';
import { generateContractVoucherImage } from '@/lib/contractImageGenerator';
import { printHtmlDocument } from '@/lib/printHtmlDocument';
import {
  X,
  Printer,
  Share2,
  CheckCircle2,
  ShieldCheck,
  FileText,
  MapPin
} from 'lucide-react';
import { Contract, Receipt } from '@/types/database';
import { COMPANY_OFFICIAL_INFO } from '@/types/officialContract';
import { getDebrisContractTypeLabel } from '@/utils/rentalPricing';
import { createInvoicePresentation } from '@/utils/invoicePresentation';
import type { PublicReceiptPayload } from '@/utils/receiptEncoder';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  receipt?: Receipt | null;
  onSendWhatsAppReceipt?: (
    phone: string,
    message: string,
    imageBase64: string
  ) => Promise<{ success: boolean; error?: string }>;
}

// ─── Component ───────────────────────────────────────────────────────────────
export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  contract,
  receipt,
  onSendWhatsAppReceipt
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptUrlError, setReceiptUrlError] = useState('');
  const [receiptImage, setReceiptImage] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  // ── Derived values (safe to compute even when contract is null) ────────────
  const receiptNumber = (receipt?.receipt_number
    || contract?.receipt_number
    || `RCP-${new Date().getFullYear()}-${(contract?.contract_number || '').replace(/[^0-9]/g, '') || '0001'}`);

  const paidAmount    = Number(receipt?.amount ?? contract?.paid_amount ?? contract?.total_cost ?? 0);
  const receiptHasVatData = receipt?.subtotal_amount != null && receipt.vat_amount != null;
  const totalCost     = Number(receipt && !receiptHasVatData ? receipt.amount : contract?.total_cost ?? paidAmount);
  const contractPaidAmount = Number(receipt && !receiptHasVatData ? paidAmount : contract?.paid_amount ?? 0);
  const remaining = receipt && !receiptHasVatData
    ? 0
    : Math.max(0, Number(contract?.remaining_amount ?? totalCost - contractPaidAmount));
  const paymentMethod = receipt?.payment_method || contract?.payment_method || 'mada';
  const customerVatNumber = receipt
    ? receipt.customer_vat_number || ''
    : contract?.customer_vat_number || '';
  const issueDate     = receipt?.issued_at
    ? new Date(receipt.issued_at)
    : new Date(contract?.updated_at || contract?.created_at || Date.now());
  const isFree = contract?.is_free || contract?.payment_method === 'free';
  const invoicePayload: PublicReceiptPayload = {
    type: 'receipt',
    receiptNumber,
    contractNumber: contract?.contract_number || '',
    customerName: contract?.customer?.name || '-',
    customerVatNumber,
    customerPhone: contract?.customer?.phone || '-',
    containerNumber: contract?.container?.container_number || '-',
    contractType: contract?.contract_type === 'commercial'
      ? 'تجاري مغلق'
      : getDebrisContractTypeLabel(contract?.period_type || 'daily', contract?.duration_days || 7),
    totalCost,
    contractPaidAmount,
    paidAmount,
    ...(contract && (!receipt || receiptHasVatData) ? {
      nonTaxableAmount: contract.non_taxable_amount ?? undefined,
      subtotalAmount: contract.subtotal_amount ?? undefined,
      vatAmount: contract.vat_amount ?? undefined
    } : {}),
    ...(receipt ? {
      receiptNonTaxableAmount: receipt.non_taxable_amount ?? undefined,
      receiptSubtotalAmount: receipt.subtotal_amount ?? undefined,
      receiptVatAmount: receipt.vat_amount ?? undefined
    } : contract?.subtotal_amount != null && contract.vat_amount != null ? {
      receiptNonTaxableAmount: contract.non_taxable_paid_amount ?? undefined,
      receiptSubtotalAmount: contract.subtotal_paid_amount ?? undefined,
      receiptVatAmount: contract.vat_paid_amount ?? undefined
    } : {}),
    paymentMethod,
    startDate: contract?.start_date ? new Date(contract.start_date).toLocaleDateString('ar-SA') : '-',
    endDate: contract?.end_date ? new Date(contract.end_date).toLocaleDateString('ar-SA') : '-',
    locationAddress: contract?.location_address || '',
    issueDate: issueDate.toISOString()
  };
  const presentation = createInvoicePresentation({
    ...invoicePayload,
    isFree,
    remainingAmount: remaining
  });
  const { invoiceAmounts, receiptAmounts, paymentMethod: methodInfo, formatMoney } = presentation;
  const contractType  = contract?.contract_type === 'commercial'
    ? 'تجاري مغلق'
    : getDebrisContractTypeLabel(contract?.period_type || 'daily', contract?.duration_days || 7);
  const startDate     = contract?.start_date ? new Date(contract.start_date).toLocaleDateString('ar-SA') : '-';
  const endDate       = contract?.end_date   ? new Date(contract.end_date).toLocaleDateString('ar-SA')   : '-';

  // ── Build QR URL (needs window, so inside useEffect) ─────────────────────
  useEffect(() => {
    if (!isOpen || !contract) {
      setReceiptUrl('');
      setReceiptUrlError('');
      setReceiptImage('');
      return;
    }

    let cancelled = false;
    setReceiptUrl('');
    setReceiptUrlError('');
    setReceiptImage('');
    void (async () => {
      try {
        const verificationUrl = receipt?.public_verification_token
          ? createReceiptVerificationUrl(receipt.public_verification_token)
          : contract.public_verification_token
            ? createReceiptVerificationUrl(contract.public_verification_token)
            : createReceiptNumberVerificationUrl(receiptNumber);
        const image = await generateContractVoucherImage({
          contractNumber: contract.contract_number,
          receiptNumber,
          customerName: contract.customer?.name || '-',
          customerVatNumber,
          customerPhone: contract.customer?.phone || '-',
          containerNumber: contract.container?.container_number || '-',
          contractType,
          totalCost,
          paidAmount,
          nonTaxableAmount: invoiceAmounts.nonTaxableAmount,
          subtotalAmount: invoiceAmounts.subtotalAmount,
          vatAmount: invoiceAmounts.vatAmount,
          receiptNonTaxableAmount: receiptAmounts.nonTaxableAmount,
          receiptSubtotalAmount: receiptAmounts.subtotalAmount,
          receiptVatAmount: receiptAmounts.vatAmount,
          remainingAmount: remaining,
          paymentMethod: methodInfo.label,
          startDate,
          endDate,
          locationAddress: contract.location_address || '',
          verificationUrl,
          isFree,
          issueDate: issueDate.toISOString()
        });
        if (!cancelled) {
          setReceiptUrl(verificationUrl);
          setReceiptImage(image);
        }
      } catch (error) {
        console.error('Could not create receipt verification link:', error);
        if (!cancelled) setReceiptUrlError('تعذر تجهيز صورة الفاتورة ورمز QR. تحقق من الاتصال ثم أعد فتح الفاتورة.');
      }
    })();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    contract?.id,
    contract?.contract_number,
    contract?.customer?.name,
    customerVatNumber,
    contract?.customer?.phone,
    contract?.container?.container_number,
    contract?.contract_type,
    contract?.start_date,
    contract?.end_date,
    contract?.location_address,
    contract?.notes,
    contract?.updated_at,
    contract?.created_at,
    receipt?.notes,
    receipt?.issued_at,
    receiptNumber,
    paidAmount,
    totalCost,
    contract?.non_taxable_amount,
    contract?.subtotal_amount,
    contract?.vat_amount,
    contract?.non_taxable_paid_amount,
    contract?.subtotal_paid_amount,
    contract?.vat_paid_amount,
    contract?.paid_amount,
    contract?.remaining_amount,
    receipt?.amount,
    receipt?.non_taxable_amount,
    receipt?.subtotal_amount,
    receipt?.vat_amount,
    receipt?.customer_vat_number,
    receipt?.public_verification_token,
    contract?.customer_vat_number,
    contract?.public_verification_token,
    paymentMethod,
    isFree
  ]);

  // ── Early return after all hooks ─────────────────────────────────────────
  if (!isOpen || !contract) return null;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handlePrint = async () => {
    const logoUrl = new URL('/invoice-logo.jpg', window.location.origin).href;
    const rawContent = printRef.current?.innerHTML;
    if (!rawContent) return;
    const content = rawContent.replaceAll('src="/invoice-logo.jpg"', `src="${logoUrl}"`);
    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>فاتورة - ${receiptNumber}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
  <style>
    * { 
      box-sizing: border-box; 
      margin: 0; 
      padding: 0; 
      direction: rtl !important;
      text-align: right;
      font-family: 'Cairo', 'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    html, body { 
      background: #fff; 
      color: #0f172a; 
      direction: rtl !important; 
      text-align: right;
      width: 100%;
    }
    .receipt-paper {
      width: 194mm;
      min-height: 281mm;
      margin: 0 auto; 
      padding: 7mm;
      direction: rtl !important;
    }
    .invoice-header { display: flex; flex-direction: column; gap: 0; }
    .invoice-meta, .invoice-details, .invoice-totals, .invoice-footer { page-break-inside: avoid; break-inside: avoid; }
    .invoice-customer { min-width: 0; overflow-wrap: anywhere; }
    .invoice-sheet { width: 100%; }
    table { 
      border-collapse: collapse; 
      width: 100%;
      direction: rtl !important;
    }
    td, th { 
      direction: rtl !important;
      text-align: right;
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 12mm;
      }
      body {
        width: 186mm;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .receipt-paper { width: 186mm !important; min-height: 273mm !important; padding: 0 !important; }
      .invoice-sheet { min-height: 273mm !important; }
      .no-print { display: none !important; }
      tr, .invoice-meta, .invoice-details, .invoice-totals, .invoice-footer { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="receipt-paper" data-logo-url="${logoUrl}">${content}</div>
</body>
</html>`;
    try {
      await printHtmlDocument(html);
    } catch (error) {
      console.error('Could not print receipt:', error);
      alert('تعذر فتح الطباعة. تحقق من إعدادات الطابعة ثم حاول مرة أخرى.');
    }
  };

  const handleShare = async () => {
    if (!contract.customer?.phone || !onSendWhatsAppReceipt || isSharing) return;
    if (!receiptUrl || !receiptImage) {
      alert(receiptUrlError || 'جارٍ تجهيز رمز QR، يرجى المحاولة بعد لحظات.');
      return;
    }

    setIsSharing(true);
    try {
      const customerName = contract.customer.name || 'عزيزنا العميل';
      const message = isFree
        ? `مرحباً ${customerName}، مرفق صورة الفاتورة رقم (${receiptNumber}) للعقد (${contract.contract_number}). امسح رمز QR في الصورة لفتحها مباشرة.\n\nشكراً لتعاملكم مع ${COMPANY_OFFICIAL_INFO.nameArabic} 🏗️`
        : `مرحباً ${customerName}، مرفق صورة الفاتورة رقم (${receiptNumber}) للعقد (${contract.contract_number}).\n💰 المبلغ: ${formatMoney(paidAmount)} ر.س\n💳 طريقة الدفع: ${methodInfo.label}\n📅 تاريخ الفاتورة: ${presentation.issueDate}\n\nامسح رمز QR في الصورة لفتحها مباشرة.\nشكراً لتعاملكم مع ${COMPANY_OFFICIAL_INFO.nameArabic} 🏗️`;
      const result = await onSendWhatsAppReceipt(contract.customer.phone, message, receiptImage);
      if (!result.success) {
        throw new Error(result.error || 'تعذر إرسال صورة الفاتورة عبر واتساب.');
      }
    } catch (error) {
      console.error('Could not send receipt image with embedded QR:', error);
      alert(error instanceof Error ? error.message : 'تعذر إرسال صورة الفاتورة مع رمز QR.');
    } finally {
      setIsSharing(false);
    }
  };

  /* ─── Shared cell styles ─────────────────────────────────────────────────── */
  const rowLabel: React.CSSProperties = {
    padding: '6px 10px',
    background: '#f8fafc',
    fontWeight: 700,
    color: '#475569',
    fontSize: '0.83rem',
    borderLeft: '3px solid #e2e8f0',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap'
  };
  const rowValue: React.CSSProperties = {
    padding: '6px 10px',
    color: '#0f172a',
    fontSize: '0.88rem',
    verticalAlign: 'middle'
  };

  return (
    <>
      {/* ── BACKDROP ────────────────────────────────────────────────────── */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.78)',
          backdropFilter: 'blur(6px)',
          zIndex: 9000,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '12px',
          overflowY: 'auto'
        }}
      >
        {/* ── MODAL CARD ──────────────────────────────────────────────── */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '760px',
            background: '#0a0f1d',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.85)',
            overflow: 'hidden',
            marginTop: '8px',
            marginBottom: '32px',
            flexShrink: 0
          }}
        >
          {/* ── ACTION BAR ──────────────────────────────────────────── */}
          <div style={{
            padding: '12px 16px',
            background: 'rgba(15,23,42,0.98)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#fbbf24" />
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>
                فاتورة مالية رسمية
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={handlePrint} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '8px',
                background: '#10b981', border: 'none',
                color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
              }}>
                <Printer size={14} /> طباعة
              </button>
              {contract.customer?.phone && (
                <button onClick={handleShare} disabled={isSharing || !receiptUrl} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '8px',
                  background: 'rgba(14,165,233,0.18)',
                  border: '1px solid rgba(14,165,233,0.4)',
                  color: '#38bdf8', fontWeight: 700, fontSize: '0.82rem', cursor: isSharing || !receiptUrl ? 'wait' : 'pointer',
                  opacity: isSharing || !receiptUrl ? 0.6 : 1
                }}>
                  <Share2 size={14} /> {isSharing ? 'جارٍ إرسال صورة الفاتورة...' : 'إرسال صورة الفاتورة عبر واتساب'}
                </button>
              )}
              <button onClick={onClose} style={{
                width: '34px', height: '34px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.08)', border: 'none',
                color: '#94a3b8', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── RECEIPT LINK BANNER (shows URL for QR) ──────────────── */}
          {receiptUrl && (
            <div style={{
              padding: '8px 16px',
              background: 'rgba(14,165,233,0.08)',
              borderBottom: '1px solid rgba(14,165,233,0.15)',
              display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: '0.72rem', color: '#7dd3fc' }}>🔗 رابط الفاتورة الإلكتروني (مضمّن في QR):</span>
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.68rem', color: '#38bdf8', wordBreak: 'break-all', textDecoration: 'underline' }}
              >
                {receiptUrl.length > 80 ? receiptUrl.slice(0, 80) + '...' : receiptUrl}
              </a>
            </div>
          )}

          {/* ── PRINTABLE RECEIPT BODY ──────────────────────────────── */}
          <div
            ref={printRef}
            className="invoice-sheet"
            style={{
              width: '100%',
              minHeight: '297mm',
              padding: '9mm',
              margin: '0 auto',
              background: '#ffffff',
              color: '#0f172a',
              fontFamily: "'Cairo', 'Tajawal', sans-serif",
              direction: 'rtl'
            }}
          >
            {/* HEADER */}
            <div className="invoice-header" style={{ paddingBottom: '8px' }}>
              <div style={{
                display: 'flex',
                direction: 'rtl',
                flexDirection: 'row-reverse',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                minHeight: '120px',
                paddingBottom: '8px',
                borderBottom: '1px solid #d6d3d1'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '130px' }}>
                  <img
                    src="/invoice-logo.jpg"
                    alt={`شعار ${COMPANY_OFFICIAL_INFO.nameArabic}`}
                    style={{ width: '124px', height: '104px', objectFit: 'contain' }}
                  />
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1c1917' }}>{presentation.issueDate}</div>
                </div>
                <div style={{ minWidth: 0, textAlign: 'right', lineHeight: 1.55, marginLeft: 'auto' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                    {COMPANY_OFFICIAL_INFO.nameArabic}
                  </h2>
                  <div style={{ fontSize: '0.68rem', color: '#475569' }}>تأجير الحاويات التجارية وعقود الإنشاءات</div>
                  <div style={{ fontSize: '0.66rem', color: '#475569' }}>
                    الرقم الضريبي: <strong>{COMPANY_OFFICIAL_INFO.vatNumber}</strong>
                    {' | '}السجل التجاري: <strong>{COMPANY_OFFICIAL_INFO.crNumber}</strong>
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#475569' }}>المملكة العربية السعودية</div>
                  <div style={{ fontSize: '0.66rem', color: '#475569' }}>
                    {COMPANY_OFFICIAL_INFO.address.replace('المملكة العربية السعودية – ', '')} {' | '} هاتف: <strong>{COMPANY_OFFICIAL_INFO.phone}</strong>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'center', paddingTop: '6px' }}>
                <div style={{ fontSize: '1.55rem', fontWeight: 900, color: '#0f172a' }}>فاتورة</div>
                <div style={{ color: '#1c1917', fontSize: '0.76rem', fontWeight: 800, marginTop: '2px' }}>
                  رقم الفاتورة: {receiptNumber}
                </div>
              </div>
            </div>

            {/* META STRIP */}
            <div className="invoice-meta" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '6px',
              padding: '4px 0 10px',
              fontSize: '0.76rem'
            }}>
              {[
                ['اسم العميل / المستأجر', contract.customer?.name || 'العميل'],
                ['الرقم الضريبي للعميل', customerVatNumber.trim() || 'غير مسجل'],
                ['رقم العقد', contract.contract_number],
                ['رقم جوال العميل', contract.customer?.phone || '-'],
                ['رقم الحاوية', contract.container?.container_number || '-'],
                ['نوع العقد والحاوية', contractType],
                ['تاريخ البداية', startDate],
                ['تاريخ نهاية الإيجار', endDate],
                ['حالة الفاتورة', isFree ? 'عقد مجاني' : remaining > 0 ? 'دفعة جزئية' : 'مسدد بالكامل'],
                ['موقع تنزيل الحاوية', contract.location_address || '-']
              ].map(([label, value]) => (
                <div key={label} style={{
                  minWidth: 0,
                  minHeight: '52px',
                  padding: '6px 8px',
                  border: '1px solid #e7e5e4',
                  borderRadius: '6px',
                  background: '#fafaf9',
                  overflowWrap: 'anywhere'
                }}>
                  <span style={{ display: 'block', color: '#78716c', fontSize: '0.66rem', fontWeight: 700, marginBottom: '2px' }}>{label}:</span>
                  <strong style={{ color: '#1c1917', fontSize: '0.76rem' }}>{value}</strong>
                </div>
              ))}
            </div>

            {/* MAIN TABLE */}
            <div className="invoice-details" style={{ border: '1px solid #e7e5e4', borderRadius: '6px', overflow: 'hidden', marginBottom: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', tableLayout: 'fixed' }}>
                <tbody>
                  {invoiceAmounts.nonTaxableAmount > 0 && (
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={rowLabel}>رصيد سابق غير خاضع للضريبة:</td>
                      <td style={rowValue}>{formatMoney(invoiceAmounts.nonTaxableAmount)} ر.س</td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={rowLabel}>المبلغ قبل الضريبة:</td>
                    <td style={rowValue}>{formatMoney(invoiceAmounts.subtotalAmount)} ر.س</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={rowLabel}>ضريبة القيمة المضافة (15%):</td>
                    <td style={rowValue}>{formatMoney(invoiceAmounts.vatAmount)} ر.س</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#fbf6e8' }}>
                    <td style={{ ...rowLabel, background: '#fbf6e8', color: '#854d0e', borderLeftColor: '#d6b766' }}>
                      الإجمالي بعد الضريبة:
                    </td>
                    <td style={{ ...rowValue, color: '#854d0e', fontSize: '1rem', fontWeight: 900 }}>
                      {formatMoney(invoiceAmounts.grossAmount)} ر.س
                    </td>
                  </tr>
                  {!invoiceAmounts.isVatAware && (
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td colSpan={2} style={{ ...rowValue, color: '#78716c', fontSize: '0.72rem' }}>
                        قيمة عقد سابقة معروضة كما خُزنت دون إعادة احتساب الضريبة.
                      </td>
                    </tr>
                  )}
                  <tr style={{ borderBottom: (!isFree && remaining > 0) || contract.google_maps_url ? '1px solid #e2e8f0' : undefined }}>
                    <td style={rowLabel}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={13} /> سداداً عن:
                      </span>
                    </td>
                    <td style={{ ...rowValue, lineHeight: 1.6 }}>
                      {isFree ? 'تأجير حاوية' : 'قيمة تأجير حاوية'} ({contractType}) رقم ({contract.container?.container_number || '-'})
                      {contract.location_address && <span> بموقع ({contract.location_address})</span>}
                      {' '}للفترة من ({startDate}) إلى ({endDate}).
                    </td>
                  </tr>
                  {!isFree && remaining > 0 && (
                    <tr style={{ borderBottom: contract.google_maps_url ? '1px solid #e2e8f0' : undefined }}>
                      <td style={rowLabel}>ملاحظات مالية:</td>
                      <td style={rowValue}>
                        <span style={{ color: '#b45309', fontWeight: 700 }}>
                          ⚠️ إجمالي العقد: {formatMoney(invoiceAmounts.grossAmount)} ر.س &nbsp;|&nbsp;
                          المسدد: {formatMoney(contractPaidAmount)} ر.س &nbsp;|&nbsp;
                          المتبقي: {formatMoney(remaining)} ر.س
                        </span>
                      </td>
                    </tr>
                  )}
                  {contract.google_maps_url && (
                    <tr>
                      <td style={rowLabel}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={13} /> الموقع:
                        </span>
                      </td>
                      <td style={rowValue}>
                        <span style={{ color: '#0284c7', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                          {contract.google_maps_url}
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {!isFree && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                border: '1px solid #e7e5e4',
                borderRadius: '6px',
                marginBottom: '10px',
                fontSize: '0.76rem',
                color: '#44403c'
              }}>
                <div style={{ padding: '8px 10px', borderLeft: '1px solid #d6d3d1' }}>
                  قبل الضريبة في الدفعة:
                  <strong style={{ display: 'block', marginTop: '3px' }}>
                    {formatMoney(receiptAmounts.subtotalAmount + receiptAmounts.nonTaxableAmount)} ر.س
                  </strong>
                </div>
                <div style={{ padding: '8px 10px', borderLeft: '1px solid #d6d3d1' }}>
                  إجمالي الدفعة الحالية:
                  <strong style={{ display: 'block', marginTop: '3px' }}>
                    {formatMoney(receiptAmounts.grossAmount)} ر.س
                  </strong>
                </div>
                <div style={{ padding: '8px 10px' }}>
                  طريقة السداد:
                  <strong style={{ display: 'block', marginTop: '3px' }}>{methodInfo.label}</strong>
                </div>
              </div>
            )}

            {/* FOOTER: QR + Stamp */}
            <div className="invoice-footer" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              alignItems: 'center',
              paddingTop: '8px',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '4px', border: '1px solid #d6d3d1',
                  borderRadius: '5px', background: '#fff',
                  display: 'inline-block', lineHeight: 0
                }}>
                  {receiptUrl ? (
                    <QRCodeSVG
                      value={receiptUrl}
                      size={160}
                      level="M"
                      marginSize={4}
                      fgColor="#000000"
                      bgColor="#ffffff"
                      style={{ width: '160px', height: '160px', shapeRendering: 'crispEdges' }}
                    />
                  ) : (
                    <div style={{ width: 104, height: 104, display: 'flex', alignItems: 'center', justifyContent: 'center', color: receiptUrlError ? '#b91c1c' : '#94a3b8', fontSize: '0.65rem', textAlign: 'center', padding: '8px' }}>
                      {receiptUrlError || 'جارٍ تجهيز الرمز...'}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#475569', lineHeight: 1.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#059669', fontWeight: 800, marginBottom: '4px' }}>
                  <CheckCircle2 size={12} />
                  <span>فاتورة معتمدة إلكترونياً</span>
                </div>
                <div>امسح الرمز للتحقق من صحة الفاتورة</div>
              </div>

              <div style={{ textAlign: 'center', minWidth: '180px' }}>
                <div style={{ fontSize: '0.7rem', color: '#1e293b', fontWeight: 800, marginBottom: '24px' }}>
                  {COMPANY_OFFICIAL_INFO.nameArabic}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.68rem', color: '#64748b', marginBottom: '6px' }}>
                  <ShieldCheck size={12} color="#059669" />
                  <span>الختم والتوقيع المعتمد</span>
                </div>
                <div style={{ borderTop: '1px solid #78716c', paddingTop: '4px', fontSize: '0.7rem', color: '#475569' }}>
                  التوقيع المعتمد
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};
