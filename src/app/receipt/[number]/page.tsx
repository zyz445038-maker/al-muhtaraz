'use client';

import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReceiptData {
  receiptNumber: string;
  contractNumber: string;
  customerName: string;
  customerPhone: string;
  containerNumber: string;
  contractType: string;
  paidAmount: number;
  totalCost: number;
  paymentMethod: string;
  startDate: string;
  endDate: string;
  locationAddress: string;
  issueDate: string;
  notes?: string;
}

// ─── Payment Method Label ─────────────────────────────────────────────────────
function paymentLabel(method: string): string {
  const map: Record<string, string> = {
    apple_pay: '🍎 Apple Pay',
    mada: '💳 بطاقة مدى',
    credit_card: '💳 Visa / Master',
    cash: '💵 نقدي كاش',
    pos: '🖥️ POS شبكة',
    bank_transfer: '🏦 تحويل بنكي',
  };
  return map[method] || '💳 سداد إلكتروني';
}

// ─── Arabic Amount Words ──────────────────────────────────────────────────────
function toArabicWords(amount: number): string {
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
  return table[Math.floor(amount)] ?? `${amount.toLocaleString('ar-SA')} ريالاً سعودياً فقط لا غير`;
}

// ─── UTF-8 Safe Base64 Decoder (Fixes Arabic Mojibake / Garbled Characters) ───
function decodeUtf8Base64(encodedStr: string): ReceiptData | null {
  try {
    const raw = decodeURIComponent(encodedStr);
    
    // Method 1: Decode via TextDecoder (Best modern UTF-8 support)
    try {
      const binaryString = atob(raw);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const text = new TextDecoder('utf-8').decode(bytes);
      return JSON.parse(text);
    } catch {
      // Method 2: Decode via URI component escape
      try {
        const text = decodeURIComponent(escape(atob(raw)));
        return JSON.parse(text);
      } catch {
        // Method 3: Standard atob
        const text = atob(raw);
        return JSON.parse(text);
      }
    }
  } catch (err) {
    console.error('UTF-8 Safe Decoder Error:', err);
    return null;
  }
}

export default function ReceiptPage({ params }: { params: Promise<{ number: string }> }) {
  const [data, setData] = useState<ReceiptData | null>(null);
  const [error, setError] = useState(false);
  const [selfUrl, setSelfUrl] = useState('');

  useEffect(() => {
    setSelfUrl(window.location.href);
    try {
      const search = new URLSearchParams(window.location.search);
      const encoded = search.get('d');
      if (!encoded) {
        setError(true);
        return;
      }
      const parsed = decodeUtf8Base64(encoded);
      if (parsed && parsed.receiptNumber) {
        setData(parsed);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
  }, []);

  /* ── Loading ── */
  if (!data && !error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0f1d',
        color: '#f59e0b',
        fontFamily: "'Cairo', 'Tajawal', sans-serif",
        flexDirection: 'column',
        gap: '16px',
        direction: 'rtl'
      }}>
        <div style={{ fontSize: '2.5rem' }}>⏳</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>جاري تحميل وتوثيق السند...</div>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !data) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0f1d',
        color: '#ef4444',
        fontFamily: "'Cairo', 'Tajawal', sans-serif",
        flexDirection: 'column',
        gap: '16px',
        padding: '24px',
        textAlign: 'center',
        direction: 'rtl'
      }}>
        <div style={{ fontSize: '3rem' }}>❌</div>
        <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>رابط السند غير صالح أو منتهي الصلاحية</div>
        <div style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
          يرجى التحقق من الرابط أو مراجعة إدارة مؤسسة المحترز للحاويات
        </div>
      </div>
    );
  }

  const remaining = Math.max(0, (data.totalCost || 0) - (data.paidAmount || 0));
  const issueDate = new Date(data.issueDate);
  const isPartial = remaining > 0;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet" />

      <style>{`
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
          background: #0a0f1d; 
          color: #0f172a; 
          direction: rtl !important; 
          text-align: right;
          width: 100%;
          min-height: 100vh;
        }
        .receipt-page { 
          min-height: 100vh; 
          background: linear-gradient(160deg, #0a0f1d 0%, #0f172a 100%); 
          padding: 24px 16px; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
        }
        .receipt-card { 
          width: 100%; 
          max-width: 680px; 
          background: #ffffff; 
          border-radius: 24px; 
          overflow: hidden; 
          box-shadow: 0 32px 80px rgba(0,0,0,0.6); 
          direction: rtl !important;
        }
        .receipt-header { 
          background: linear-gradient(135deg, #d97706, #b45309); 
          padding: 26px 20px; 
          color: #ffffff; 
          text-align: center; 
        }
        .receipt-header h1 { 
          font-size: 1.45rem; 
          font-weight: 900; 
          letter-spacing: -0.5px; 
          margin-bottom: 4px; 
          text-align: center;
        }
        .receipt-header .sub { 
          font-size: 0.82rem; 
          opacity: 0.9; 
          text-align: center;
        }
        .receipt-badge { 
          display: inline-block; 
          background: rgba(255,255,255,0.22); 
          border: 1px solid rgba(255,255,255,0.4); 
          border-radius: 20px; 
          padding: 5px 18px; 
          font-size: 0.8rem; 
          font-weight: 800; 
          margin-top: 12px; 
          letter-spacing: 0.5px; 
        }
        .receipt-body { 
          padding: 26px 22px; 
          background: #ffffff; 
        }
        .amount-box { 
          background: linear-gradient(135deg, #f0fdf4, #dcfce7); 
          border: 2px solid #86efac; 
          border-radius: 16px; 
          padding: 20px; 
          text-align: center; 
          margin-bottom: 20px; 
        }
        .amount-number { 
          font-size: 2.3rem; 
          font-weight: 900; 
          color: #059669; 
          line-height: 1; 
        }
        .amount-sar { 
          font-size: 1.1rem; 
          color: #059669; 
          margin-right: 6px; 
        }
        .amount-words { 
          font-size: 0.85rem; 
          color: #374151; 
          margin-top: 6px; 
          font-weight: 700;
          text-align: center;
        }
        .payment-badge { 
          display: inline-flex; 
          align-items: center; 
          gap: 6px; 
          background: #1e293b; 
          color: #f8fafc; 
          padding: 6px 16px; 
          border-radius: 20px; 
          font-size: 0.85rem; 
          font-weight: 800; 
          margin-top: 10px; 
        }
        .info-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 12px; 
          margin-bottom: 18px; 
        }
        .info-cell { 
          background: #f8fafc; 
          border-radius: 12px; 
          padding: 12px 14px; 
          border: 1px solid #e2e8f0; 
        }
        .info-cell .label { 
          font-size: 0.72rem; 
          color: #64748b; 
          display: block; 
          margin-bottom: 4px; 
          font-weight: 700;
        }
        .info-cell .value { 
          font-size: 0.9rem; 
          font-weight: 800; 
          color: #0f172a; 
          word-break: break-word; 
        }
        .info-cell.full { 
          grid-column: 1 / -1; 
        }
        .divider { 
          border: none; 
          border-top: 1.5px dashed #cbd5e1; 
          margin: 18px 0; 
        }
        .footer-row { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          flex-wrap: wrap; 
          gap: 14px; 
          padding-top: 6px; 
        }
        .qr-box { 
          display: flex; 
          align-items: center; 
          gap: 14px; 
        }
        .qr-img { 
          padding: 8px; 
          border: 2px solid #0f172a; 
          border-radius: 12px; 
          background: #ffffff; 
          line-height: 0; 
        }
        .qr-label { 
          font-size: 0.72rem; 
          color: #475569; 
          max-width: 140px; 
          line-height: 1.5; 
        }
        .verified-badge { 
          display: inline-flex; 
          align-items: center; 
          gap: 4px; 
          color: #059669; 
          font-weight: 800; 
          font-size: 0.78rem; 
          margin-bottom: 4px; 
        }
        .stamp-box { 
          text-align: center; 
          min-width: 150px; 
        }
        .stamp-line { 
          border-top: 1.5px solid #0f172a; 
          padding-top: 6px; 
          font-size: 0.72rem; 
          color: #475569; 
          margin-top: 36px; 
          font-weight: 700;
        }
        .legal-bar { 
          background: #fffbeb; 
          border-top: 1px solid #fde68a; 
          padding: 12px 18px; 
          font-size: 0.72rem; 
          color: #92400e; 
          line-height: 1.6; 
          text-align: center; 
        }
        .partial-warning { 
          background: #fff7ed; 
          border: 1.5px solid #fed7aa; 
          border-radius: 12px; 
          padding: 12px 16px; 
          margin-bottom: 16px; 
          font-size: 0.85rem; 
          color: #9a3412; 
          font-weight: 700; 
        }
        .print-btn { 
          margin: 0 auto 20px auto; 
          display: inline-flex; 
          align-items: center; 
          gap: 8px;
          background: linear-gradient(135deg, #d97706, #b45309); 
          color: #ffffff; 
          border: none; 
          border-radius: 14px; 
          padding: 12px 28px; 
          font-size: 0.95rem; 
          font-weight: 800; 
          cursor: pointer; 
          box-shadow: 0 4px 14px rgba(217, 119, 6, 0.4);
          transition: transform 0.15s;
        }
        .print-btn:hover {
          transform: translateY(-2px);
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body { 
            background: #ffffff !important; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .receipt-page { 
            padding: 0 !important; 
            background: #ffffff !important; 
          }
          .receipt-card { 
            box-shadow: none !important; 
            border-radius: 0 !important; 
            max-width: 100% !important; 
          }
          .print-btn, .no-print { 
            display: none !important; 
          }
        }
        @media (max-width: 480px) {
          .info-grid { grid-template-columns: 1fr; }
          .amount-number { font-size: 1.8rem; }
          .footer-row { justify-content: center; }
        }
      `}</style>

      <div className="receipt-page">
        {/* Print / Save PDF Button */}
        <button className="print-btn no-print" onClick={() => window.print()}>
          <span>🖨️ طباعة أو حفظ السند PDF</span>
        </button>

        <div className="receipt-card">
          {/* ── HEADER ── */}
          <div className="receipt-header">
            <div style={{ fontSize: '2.2rem', marginBottom: '6px' }}>🏗️</div>
            <h1>مؤسسة المحترز للحاويات</h1>
            <div className="sub">تأجير الحاويات التجارية وعقود الأنقاض — الرياض، المملكة العربية السعودية</div>
            <div className="receipt-badge">سند قبض مالي رسمي &nbsp;|&nbsp; OFFICIAL RECEIPT</div>
          </div>

          {/* ── BODY ── */}
          <div className="receipt-body">

            {/* Amount Box */}
            <div className="amount-box">
              <div style={{ fontSize: '0.85rem', color: '#374151', marginBottom: '6px', fontWeight: 800 }}>
                المبلغ المقبوض والمسدد
              </div>
              <div>
                <span className="amount-number">{data.paidAmount.toLocaleString('ar-SA')}</span>
                <span className="amount-sar">ر.س</span>
              </div>
              <div className="amount-words">({toArabicWords(data.paidAmount)})</div>
              <div className="payment-badge">{paymentLabel(data.paymentMethod)}</div>
            </div>

            {/* Partial Warning */}
            {isPartial && (
              <div className="partial-warning">
                ⚠️ دفعة جزئية على الحساب — إجمالي العقد: {data.totalCost.toLocaleString('ar-SA')} ر.س &nbsp;|&nbsp; المتبقي: {remaining.toLocaleString('ar-SA')} ر.س
              </div>
            )}

            {/* Info Grid */}
            <div className="info-grid">
              <div className="info-cell">
                <span className="label">رقم السند المالي:</span>
                <span className="value" style={{ color: '#0284c7' }}>{data.receiptNumber}</span>
              </div>
              <div className="info-cell">
                <span className="label">رقم العقد:</span>
                <span className="value">{data.contractNumber}</span>
              </div>

              <div className="info-cell">
                <span className="label">اسم العميل / المستأجر:</span>
                <span className="value">{data.customerName}</span>
              </div>
              <div className="info-cell">
                <span className="label">رقم جوال العميل:</span>
                <span className="value" dir="ltr" style={{ textAlign: 'right' }}>{data.customerPhone}</span>
              </div>

              <div className="info-cell">
                <span className="label">رقم الحاوية:</span>
                <span className="value" style={{ color: '#b45309' }}>{data.containerNumber}</span>
              </div>
              <div className="info-cell">
                <span className="label">نوع العقد والحاوية:</span>
                <span className="value">{data.contractType}</span>
              </div>

              <div className="info-cell">
                <span className="label">تاريخ البداية:</span>
                <span className="value">{data.startDate}</span>
              </div>
              <div className="info-cell">
                <span className="label">تاريخ نهاية الإيجار:</span>
                <span className="value">{data.endDate}</span>
              </div>

              <div className="info-cell">
                <span className="label">تاريخ وتوقيت الإصدار:</span>
                <span className="value">
                  {issueDate.toLocaleDateString('ar-SA')} — {issueDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="info-cell">
                <span className="label">حالة السند:</span>
                <span className="value" style={{ color: '#059669' }}>
                  {isPartial ? 'دفعة مسددة جزئياً 🟡' : 'مسدد بالكامل رسمياً 🟢'}
                </span>
              </div>

              {data.locationAddress && (
                <div className="info-cell full">
                  <span className="label">موقع تنزيل الحاوية:</span>
                  <span className="value">📍 {data.locationAddress}</span>
                </div>
              )}

              {data.notes && (
                <div className="info-cell full">
                  <span className="label">ملاحظات وبيانات السند:</span>
                  <span className="value">{data.notes}</span>
                </div>
              )}
            </div>

            <hr className="divider" />

            {/* Footer Row */}
            <div className="footer-row">
              {/* QR Verification */}
              <div className="qr-box">
                <div className="qr-img">
                  {selfUrl && (
                    <QRCodeSVG
                      value={selfUrl}
                      size={80}
                      level="M"
                      includeMargin={false}
                    />
                  )}
                </div>
                <div>
                  <div className="verified-badge">
                    <span>✓ سند إلكتروني موثق</span>
                  </div>
                  <div className="qr-label">
                    امسح كود الـ QR للتحقق من صحة السند إلكترونياً
                  </div>
                </div>
              </div>

              {/* Official Stamp Box */}
              <div className="stamp-box">
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>
                  مؤسسة المحترز للحاويات
                </div>
                <div className="stamp-line">
                  الختم والتوقيع المعتمد
                </div>
              </div>
            </div>

          </div>

          {/* Legal Bar */}
          <div className="legal-bar">
            يعتبر هذا السند إشعاراً مالياً رسمياً صادراً من النظام السحابي لمؤسسة المحترز للحاويات ومسجلاً برقم فريد.
          </div>
        </div>
      </div>
    </>
  );
}
