'use client';

import React, { useRef, useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Printer,
  Share2,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  CreditCard,
  Building2,
  FileText,
  DollarSign,
  MapPin,
  User,
  Truck
} from 'lucide-react';
import { Contract, Receipt, PaymentMethod } from '@/types/database';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  receipt?: Receipt | null;
  onSendWhatsAppReceipt?: (phone: string, message: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function numberToArabicWords(amount: number): string {
  const num = Math.floor(amount);
  if (num === 0) return 'صفر ريال';
  const table: Record<number, string> = {
    150: 'مائة وخمسون ريالاً سعودياً فقط لا غير',
    300: 'ثلاثمائة ريال سعودي فقط لا غير',
    450: 'أربعمائة وخمسون ريالاً سعودياً فقط لا غير',
    500: 'خمسمائة ريال سعودي فقط لا غير',
    750: 'سبعمائة وخمسون ريالاً سعودياً فقط لا غير',
    1000: 'ألف ريال سعودي فقط لا غير',
    1500: 'ألف وخمسمائة ريال سعودي فقط لا غير',
    2000: 'ألفا ريال سعودي فقط لا غير',
    2500: 'ألفان وخمسمائة ريال سعودي فقط لا غير',
    3000: 'ثلاثة آلاف ريال سعودي فقط لا غير',
    3500: 'ثلاثة آلاف وخمسمائة ريال سعودي فقط لا غير',
    4000: 'أربعة آلاف ريال سعودي فقط لا غير',
    5000: 'خمسة آلاف ريال سعودي فقط لا غير',
    7000: 'سبعة آلاف ريال سعودي فقط لا غير',
    10000: 'عشرة آلاف ريال سعودي فقط لا غير',
    21000: 'واحد وعشرون ألف ريال سعودي فقط لا غير',
    42000: 'اثنان وأربعون ألف ريال سعودي فقط لا غير',
  };
  return table[num] ?? `${num.toLocaleString('ar-SA')} ريالاً سعودياً فقط لا غير`;
}

function getPaymentMethodLabel(method?: PaymentMethod): { label: string; icon: string } {
  switch (method) {
    case 'apple_pay':   return { label: 'Apple Pay', icon: '🍎' };
    case 'mada':        return { label: 'بطاقة مدى', icon: '💳' };
    case 'credit_card': return { label: 'Visa / Master', icon: '💳' };
    case 'cash':        return { label: 'نقدي كاش', icon: '💵' };
    case 'pos':         return { label: 'نقاط البيع POS', icon: '🖥️' };
    case 'bank_transfer': return { label: 'تحويل بنكي', icon: '🏦' };
    default:            return { label: 'سداد إلكتروني', icon: '💳' };
  }
}

function encodeUtf8Base64(data: any): string {
  try {
    const jsonStr = JSON.stringify(data);
    const bytes = new TextEncoder().encode(jsonStr);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return encodeURIComponent(btoa(binary));
  } catch (e) {
    return '';
  }
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

  // ── Derived values (safe to compute even when contract is null) ────────────
  const receiptNumber = (receipt?.receipt_number
    || contract?.receipt_number
    || `RCP-${new Date().getFullYear()}-${(contract?.contract_number || '').replace(/[^0-9]/g, '') || '0001'}`);

  const paidAmount    = Number(receipt?.amount ?? contract?.paid_amount ?? contract?.total_cost ?? 0);
  const totalCost     = Number(contract?.total_cost ?? paidAmount);
  const remaining     = Math.max(0, totalCost - paidAmount);
  const paymentMethod = receipt?.payment_method || contract?.payment_method || 'mada';
  const methodInfo    = getPaymentMethodLabel(paymentMethod);
  const arabicWords   = numberToArabicWords(paidAmount);
  const issueDate     = receipt?.issued_at
    ? new Date(receipt.issued_at)
    : new Date(contract?.updated_at || contract?.created_at || Date.now());
  const contractType  = contract?.contract_type === 'commercial' ? 'تجاري مغلق' : 'أنقاض يومي';
  const startDate     = contract?.start_date ? new Date(contract.start_date).toLocaleDateString('ar-SA') : '-';
  const endDate       = contract?.end_date   ? new Date(contract.end_date).toLocaleDateString('ar-SA')   : '-';

  // ── Build QR URL (needs window, so inside useEffect) ─────────────────────
  useEffect(() => {
    if (!isOpen || !contract) { setReceiptUrl(''); return; }
    const receiptData = {
      receiptNumber,
      contractNumber: contract.contract_number,
      customerName: contract.customer?.name || '-',
      customerPhone: contract.customer?.phone || '-',
      containerNumber: contract.container?.container_number || '-',
      contractType,
      paidAmount,
      totalCost,
      paymentMethod,
      startDate,
      endDate,
      locationAddress: contract.location_address || '',
      issueDate: issueDate.toISOString(),
      notes: receipt?.notes || ''
    };
    try {
      const encoded = encodeUtf8Base64(receiptData);
      setReceiptUrl(`${window.location.origin}/receipt/${receiptNumber}?d=${encoded}`);
    } catch {
      setReceiptUrl(window.location.origin);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contract?.id, receiptNumber]);

  // ── Early return after all hooks ─────────────────────────────────────────
  if (!isOpen || !contract) return null;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>سند قبض - ${receiptNumber}</title>
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
      max-width: 760px; 
      margin: 0 auto; 
      padding: 24px; 
      direction: rtl !important;
    }
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
        margin: 10mm;
      }
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-paper">${content}</div>
  <script>
    if (document.fonts) {
      document.fonts.ready.then(() => {
        window.print();
        setTimeout(() => window.close(), 1000);
      });
    } else {
      window.onload = () => {
        window.print();
        setTimeout(() => window.close(), 1000);
      };
    }
  <\/script>
</body>
</html>`);
    win.document.close();
  };

  const handleShare = () => {
    if (contract.customer?.phone && onSendWhatsAppReceipt) {
      const msg = `مرحباً ${contract.customer.name || 'عزيزنا العميل'}،\nمرفق سند القبض الرسمي رقم (${receiptNumber}) الخاص بعقد الحاوية (${contract.contract_number}).\n\n💰 المبلغ المسدد: ${paidAmount.toLocaleString('ar-SA')} ر.س\n(${arabicWords})\n💳 طريقة الدفع: ${methodInfo.label}\n📅 تاريخ السند: ${issueDate.toLocaleDateString('ar-SA')}\n\n📱 اضغط للاطلاع على السند الإلكتروني:\n${receiptUrl}\n\nشكراً لتعاملكم مع مؤسسة المحترز للحاويات 🏗️`;
      onSendWhatsAppReceipt(contract.customer.phone, msg);
    }
  };

  /* ─── Shared cell styles ─────────────────────────────────────────────────── */
  const rowLabel: React.CSSProperties = {
    padding: '9px 14px',
    background: '#f8fafc',
    fontWeight: 700,
    color: '#475569',
    fontSize: '0.83rem',
    borderLeft: '3px solid #e2e8f0',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap'
  };
  const rowValue: React.CSSProperties = {
    padding: '9px 14px',
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
                سند قبض مالي رسمي
              </span>
              <span style={{
                fontSize: '0.72rem', fontWeight: 700,
                background: 'rgba(16,185,129,0.15)',
                color: '#34d399', padding: '2px 8px',
                borderRadius: '20px', border: '1px solid rgba(52,211,153,0.3)'
              }}>
                {receiptNumber}
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
                <button onClick={handleShare} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '8px',
                  background: 'rgba(14,165,233,0.18)',
                  border: '1px solid rgba(14,165,233,0.4)',
                  color: '#38bdf8', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
                }}>
                  <Share2 size={14} /> واتساب
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
              <span style={{ fontSize: '0.72rem', color: '#7dd3fc' }}>🔗 رابط السند الإلكتروني (مضمّن في QR):</span>
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
            style={{
              padding: '28px 24px',
              background: '#ffffff',
              color: '#0f172a',
              fontFamily: "'Cairo', 'Tajawal', sans-serif",
              direction: 'rtl'
            }}
          >
            {/* HEADER */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              paddingBottom: '18px',
              borderBottom: '2px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '10px',
                    background: 'linear-gradient(135deg,#d97706,#b45309)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Truck size={22} color="#fff" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                      مؤسسة المحترز للحاويات
                    </h2>
                    <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                      تأجير الحاويات التجارية وعقود الأنقاض
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.6 }}>
                  الرقم الضريبي: <strong>300099887700003</strong> &nbsp;|&nbsp; السجل التجاري: <strong>1010889900</strong><br />
                  الرياض – المملكة العربية السعودية &nbsp;|&nbsp; 📞 920001234
                </div>
              </div>
              <div style={{
                background: '#f8fafc', border: '2px solid #e2e8f0',
                borderRadius: '10px', padding: '10px 16px',
                textAlign: 'center', minWidth: '160px'
              }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#d97706', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                  PAYMENT RECEIPT
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', margin: '2px 0' }}>
                  سند قبض
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0284c7' }}>{receiptNumber}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                  {issueDate.toLocaleDateString('ar-SA')} — {issueDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* META STRIP */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '10px',
              background: '#f1f5f9', borderRadius: '8px',
              padding: '12px 14px', margin: '16px 0', fontSize: '0.8rem'
            }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>رقم العقد:</span>
                <strong style={{ color: '#0f172a' }}>{contract.contract_number}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>نوع العقد:</span>
                <strong style={{ color: '#0f172a' }}>{contractType}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>الحاوية:</span>
                <strong style={{ color: '#0f172a' }}>{contract.container?.container_number || '-'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>فترة العقد:</span>
                <strong style={{ color: '#0f172a' }}>{startDate} → {endDate}</strong>
              </div>
            </div>

            {/* MAIN TABLE */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '18px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ ...rowLabel, width: '36%' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={13} /> استلمنا من:
                      </span>
                    </td>
                    <td style={rowValue}>
                      <strong>{contract.customer?.name || 'العميل'}</strong>
                      {contract.customer?.phone && (
                        <span style={{ color: '#64748b', fontSize: '0.8rem', marginRight: '8px' }}>
                          📞 {contract.customer.phone}
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f0fdf4' }}>
                    <td style={{ ...rowLabel, borderLeftColor: '#bbf7d0' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <DollarSign size={13} /> مبلغ وقدره:
                      </span>
                    </td>
                    <td style={rowValue}>
                      <span style={{
                        fontSize: '1.3rem', fontWeight: 900, color: '#059669',
                        background: '#dcfce7', padding: '2px 12px', borderRadius: '6px',
                        display: 'inline-block', marginBottom: '4px'
                      }}>
                        {paidAmount.toLocaleString('ar-SA')} ر.س
                      </span>
                      <div style={{ fontSize: '0.78rem', color: '#374151', fontStyle: 'italic' }}>
                        ({arabicWords})
                      </div>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={rowLabel}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CreditCard size={13} /> طريقة السداد:
                      </span>
                    </td>
                    <td style={rowValue}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '4px 12px', borderRadius: '6px', fontWeight: 700,
                        background: '#f1f5f9', border: '1px solid #cbd5e1'
                      }}>
                        {methodInfo.icon} {methodInfo.label}
                      </span>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: remaining > 0 || contract.google_maps_url ? '1px solid #e2e8f0' : undefined }}>
                    <td style={rowLabel}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={13} /> سداداً عن:
                      </span>
                    </td>
                    <td style={{ ...rowValue, lineHeight: 1.6 }}>
                      قيمة تأجير حاوية ({contractType}) رقم ({contract.container?.container_number || '-'})
                      {contract.location_address && <span> بموقع ({contract.location_address})</span>}
                      {' '}للفترة من ({startDate}) إلى ({endDate}).
                    </td>
                  </tr>
                  {remaining > 0 && (
                    <tr style={{ borderBottom: contract.google_maps_url ? '1px solid #e2e8f0' : undefined }}>
                      <td style={rowLabel}>ملاحظات مالية:</td>
                      <td style={rowValue}>
                        <span style={{ color: '#b45309', fontWeight: 700 }}>
                          ⚠️ إجمالي العقد: {totalCost.toLocaleString('ar-SA')} ر.س &nbsp;|&nbsp;
                          المسدد: {paidAmount.toLocaleString('ar-SA')} ر.س &nbsp;|&nbsp;
                          المتبقي: {remaining.toLocaleString('ar-SA')} ر.س
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

            {/* FOOTER: QR + Stamp */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              paddingTop: '14px',
              borderTop: '2px dashed #cbd5e1',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              {/* QR Code — points to receipt page */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  padding: '6px', border: '2px solid #0f172a',
                  borderRadius: '10px', background: '#fff',
                  display: 'inline-block', lineHeight: 0
                }}>
                  {receiptUrl ? (
                    <QRCodeSVG
                      value={receiptUrl}
                      size={92}
                      level="M"
                      includeMargin={false}
                      fgColor="#0f172a"
                      bgColor="#ffffff"
                    />
                  ) : (
                    <div style={{ width: 92, height: 92, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.65rem' }}>
                      جارٍ التوليد...
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#475569', maxWidth: '160px', lineHeight: 1.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#059669', fontWeight: 800, marginBottom: '4px' }}>
                    <CheckCircle2 size={12} />
                    <span>سند معتمد إلكترونياً</span>
                  </div>
                  <div>امسح الرمز لعرض السند الرسمي كاملاً على هاتفك</div>
                  <div style={{ marginTop: '4px', color: '#94a3b8' }}>ت.ض: 300099887700003</div>
                </div>
              </div>
              {/* Stamp */}
              <div style={{ textAlign: 'center', minWidth: '180px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.7rem', color: '#64748b', marginBottom: '28px' }}>
                  <ShieldCheck size={12} color="#059669" />
                  <span>التوقيع المعتمد &amp; الختم الرسمي</span>
                </div>
                <div style={{ borderTop: '1.5px solid #0f172a', paddingTop: '4px', fontSize: '0.72rem', color: '#475569' }}>
                  قسم المالية والمحاسبة – المحترز للحاويات
                </div>
              </div>
            </div>

            {/* LEGAL BAR */}
            <div style={{
              marginTop: '16px', padding: '8px 14px',
              background: '#fffbeb', border: '1px solid #fde68a',
              borderRadius: '6px', fontSize: '0.7rem', color: '#92400e',
              display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap'
            }}>
              <Building2 size={12} />
              <span>
                هذا السند صادر إلكترونياً وهو ملزم قانونياً. جميع المبالغ شاملة ضريبة القيمة المضافة 15%.
                ت.ض: 300099887700003 | س.ت: 1010889900
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
