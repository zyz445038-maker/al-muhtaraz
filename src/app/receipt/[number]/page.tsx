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
    500: 'خمسمائة ريال سعودي فقط لا غير',
    1000: 'ألف ريال سعودي فقط لا غير',
    1500: 'ألف وخمسمائة ريال سعودي فقط لا غير',
    2000: 'ألفا ريال سعودي فقط لا غير',
    3000: 'ثلاثة آلاف ريال سعودي فقط لا غير',
    3500: 'ثلاثة آلاف وخمسمائة ريال سعودي فقط لا غير',
    5000: 'خمسة آلاف ريال سعودي فقط لا غير',
    7000: 'سبعة آلاف ريال سعودي فقط لا غير',
    10000: 'عشرة آلاف ريال سعودي فقط لا غير',
    21000: 'واحد وعشرون ألف ريال سعودي فقط لا غير',
  };
  return table[Math.floor(amount)] ?? `${amount.toLocaleString('ar-SA')} ريالاً سعودياً فقط لا غير`;
}

export default function ReceiptPage({ params }: { params: { number: string } }) {
  const [data, setData] = useState<ReceiptData | null>(null);
  const [error, setError] = useState(false);
  const [selfUrl, setSelfUrl] = useState('');

  useEffect(() => {
    setSelfUrl(window.location.href);
    try {
      const search = new URLSearchParams(window.location.search);
      const encoded = search.get('d');
      if (!encoded) { setError(true); return; }
      const json = JSON.parse(atob(decodeURIComponent(encoded)));
      setData(json);
    } catch {
      setError(true);
    }
  }, []);

  /* ── Loading ── */
  if (!data && !error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0f1d', color: '#f59e0b', fontFamily: 'Cairo, sans-serif',
        flexDirection: 'column', gap: '16px'
      }}>
        <div style={{ fontSize: '2rem' }}>⏳</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>جاري تحميل السند...</div>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !data) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0f1d', color: '#ef4444', fontFamily: 'Cairo, sans-serif',
        flexDirection: 'column', gap: '16px', padding: '24px', textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem' }}>❌</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>رابط السند غير صالح</div>
        <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          يرجى التواصل مع مؤسسة المحترز للحاويات
        </div>
      </div>
    );
  }

  const remaining = Math.max(0, (data.totalCost || 0) - (data.paidAmount || 0));
  const issueDate = new Date(data.issueDate);
  const isPartial = remaining > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { font-family: 'Cairo', 'Tajawal', sans-serif; background: #0a0f1d; direction: rtl; }
        .receipt-page { min-height: 100vh; background: linear-gradient(160deg, #0a0f1d 0%, #0f172a 100%); padding: 16px; display: flex; flex-direction: column; align-items: center; }
        .receipt-card { width: 100%; max-width: 680px; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 32px 80px rgba(0,0,0,0.6); }
        .receipt-header { background: linear-gradient(135deg, #d97706, #b45309); padding: 24px 20px; color: #fff; text-align: center; }
        .receipt-header h1 { font-size: 1.35rem; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 4px; }
        .receipt-header .sub { font-size: 0.8rem; opacity: 0.85; }
        .receipt-badge { display: inline-block; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); border-radius: 20px; padding: 4px 16px; font-size: 0.78rem; font-weight: 700; margin-top: 10px; letter-spacing: 1px; }
        .receipt-body { padding: 24px 20px; background: #fff; }
        .amount-box { background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 2px solid #86efac; border-radius: 14px; padding: 18px; text-align: center; margin-bottom: 20px; }
        .amount-number { font-size: 2.2rem; font-weight: 900; color: #059669; line-height: 1; }
        .amount-sar { font-size: 1rem; color: #059669; margin-right: 6px; }
        .amount-words { font-size: 0.82rem; color: #374151; margin-top: 6px; font-style: italic; }
        .payment-badge { display: inline-flex; align-items: center; gap: 6px; background: #1e293b; color: #f8fafc; padding: 6px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: 700; margin-top: 8px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
        .info-cell { background: #f8fafc; border-radius: 10px; padding: 10px 12px; border: 1px solid #e2e8f0; }
        .info-cell .label { font-size: 0.7rem; color: #94a3b8; display: block; margin-bottom: 3px; }
        .info-cell .value { font-size: 0.85rem; font-weight: 700; color: #0f172a; word-break: break-word; }
        .info-cell.full { grid-column: 1 / -1; }
        .divider { border: none; border-top: 1.5px dashed #cbd5e1; margin: 16px 0; }
        .footer-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding-top: 6px; }
        .qr-box { display: flex; align-items: center; gap: 12px; }
        .qr-img { padding: 6px; border: 2px solid #0f172a; border-radius: 10px; background: #fff; line-height: 0; }
        .qr-label { font-size: 0.7rem; color: #475569; max-width: 130px; line-height: 1.5; }
        .verified-badge { display: inline-flex; align-items: center; gap: 4px; color: #059669; font-weight: 800; font-size: 0.75rem; margin-bottom: 4px; }
        .stamp-box { text-align: center; min-width: 150px; }
        .stamp-line { border-top: 1.5px solid #0f172a; padding-top: 4px; font-size: 0.7rem; color: #475569; margin-top: 36px; }
        .legal-bar { background: #fffbeb; border-top: 1px solid #fde68a; padding: 10px 16px; font-size: 0.67rem; color: #92400e; line-height: 1.6; text-align: center; }
        .partial-warning { background: #fff7ed; border: 1.5px solid #fed7aa; border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; font-size: 0.82rem; color: #9a3412; font-weight: 600; }
        .print-btn { margin: 16px auto; display: block; background: linear-gradient(135deg,#d97706,#b45309); color: #fff; border: none; border-radius: 12px; padding: 12px 32px; font-size: 1rem; font-weight: 800; cursor: pointer; font-family: 'Cairo', sans-serif; }
        @media print {
          body { background: #fff; }
          .receipt-page { padding: 0; background: #fff; }
          .receipt-card { box-shadow: none; border-radius: 0; max-width: 100%; }
          .print-btn, .no-print { display: none !important; }
        }
        @media (max-width: 480px) {
          .info-grid { grid-template-columns: 1fr; }
          .amount-number { font-size: 1.7rem; }
          .footer-row { justify-content: center; }
        }
      `}</style>

      <div className="receipt-page">
        {/* Print Button */}
        <button className="print-btn no-print" onClick={() => window.print()}>
          🖨️ طباعة / حفظ PDF
        </button>

        <div className="receipt-card">
          {/* ── HEADER ── */}
          <div className="receipt-header">
            <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🏗️</div>
            <h1>مؤسسة المحترز للحاويات</h1>
            <div className="sub">تأجير الحاويات التجارية وعقود الأنقاض — الرياض، المملكة العربية السعودية</div>
            <div className="receipt-badge">سند قبض رسمي &nbsp;|&nbsp; OFFICIAL RECEIPT</div>
          </div>

          {/* ── BODY ── */}
          <div className="receipt-body">

            {/* Amount Box */}
            <div className="amount-box">
              <div style={{ fontSize: '0.82rem', color: '#374151', marginBottom: '6px', fontWeight: 700 }}>
                المبلغ المسدد
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
                ⚠️ دفعة جزئية — إجمالي العقد: {data.totalCost.toLocaleString('ar-SA')} ر.س &nbsp;|&nbsp; المتبقي: {remaining.toLocaleString('ar-SA')} ر.س
              </div>
            )}

            {/* Info Grid */}
            <div className="info-grid">
              <div className="info-cell">
                <span className="label">رقم السند</span>
                <span className="value" style={{ color: '#0284c7' }}>{data.receiptNumber}</span>
              </div>
              <div className="info-cell">
                <span className="label">رقم العقد</span>
                <span className="value">{data.contractNumber}</span>
              </div>
              <div className="info-cell">
                <span className="label">اسم العميل</span>
                <span className="value">{data.customerName}</span>
              </div>
              <div className="info-cell">
                <span className="label">رقم الجوال</span>
                <span className="value" style={{ direction: 'ltr', textAlign: 'right' }}>{data.customerPhone}</span>
              </div>
              <div className="info-cell">
                <span className="label">رقم الحاوية</span>
                <span className="value">{data.containerNumber}</span>
              </div>
              <div className="info-cell">
                <span className="label">نوع العقد</span>
                <span className="value">{data.contractType}</span>
              </div>
              <div className="info-cell">
                <span className="label">تاريخ البداية</span>
                <span className="value">{data.startDate}</span>
              </div>
              <div className="info-cell">
                <span className="label">تاريخ الانتهاء</span>
                <span className="value">{data.endDate}</span>
              </div>
              {data.locationAddress && (
                <div className="info-cell full">
                  <span className="label">📍 الموقع</span>
                  <span className="value">{data.locationAddress}</span>
                </div>
              )}
              <div className="info-cell full">
                <span className="label">📅 تاريخ وساعة إصدار السند</span>
                <span className="value">
                  {issueDate.toLocaleDateString('ar-SA')} — {issueDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {data.notes && (
                <div className="info-cell full">
                  <span className="label">ملاحظات</span>
                  <span className="value">{data.notes}</span>
                </div>
              )}
            </div>

            {/* Purpose Statement */}
            <div style={{
              background: '#f1f5f9', borderRadius: '10px',
              padding: '10px 14px', fontSize: '0.82rem', color: '#334155',
              lineHeight: 1.7, marginBottom: '16px', borderRight: '4px solid #d97706'
            }}>
              <strong>وذلك سداداً عن: </strong>
              قيمة تأجير حاوية ({data.contractType}) رقم ({data.containerNumber})
              {data.locationAddress ? ` بموقع (${data.locationAddress})` : ''}
              {' '}للفترة من ({data.startDate}) إلى ({data.endDate}).
            </div>

            <hr className="divider" />

            {/* Footer: QR + Stamp */}
            <div className="footer-row">
              {/* Self QR — scans to the same page */}
              <div className="qr-box">
                <div className="qr-img">
                  {selfUrl && (
                    <QRCodeSVG
                      value={selfUrl}
                      size={80}
                      level="M"
                      fgColor="#0f172a"
                      bgColor="#ffffff"
                    />
                  )}
                </div>
                <div className="qr-label">
                  <div className="verified-badge">✅ سند معتمد إلكترونياً</div>
                  <div>امسح للتحقق من السند</div>
                  <div style={{ color: '#94a3b8', marginTop: '2px' }}>ضريبي: 300099887700003</div>
                </div>
              </div>

              {/* Stamp */}
              <div className="stamp-box">
                <div className="stamp-line">
                  قسم المالية والمحاسبة<br />مؤسسة المحترز للحاويات
                </div>
              </div>
            </div>
          </div>

          {/* ── LEGAL BAR ── */}
          <div className="legal-bar">
            هذا السند صادر إلكترونياً وهو ملزم قانونياً وفق أنظمة التجارة الإلكترونية السعودية.
            جميع المبالغ شاملة ضريبة القيمة المضافة 15% | ت.ض: 300099887700003 | س.ت: 1010889900
          </div>
        </div>

        <div className="no-print" style={{ textAlign: 'center', color: '#475569', fontSize: '0.75rem', marginTop: '16px', paddingBottom: '24px' }}>
          مؤسسة المحترز للحاويات — الرياض | 📞 920001234
        </div>
      </div>
    </>
  );
}
