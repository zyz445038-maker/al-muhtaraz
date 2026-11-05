'use client';

import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import {
  decodeReceiptVerificationPayload,
  type PublicReceiptPayload,
  type PublicOfficialContractPayload,
  type PublicVerificationPayload
} from '@/utils/receiptEncoder';
import { 
  FIXED_CONTRACT_CLAUSES,
  CONTRACT_PLEDGE_TEXT,
  COMPANY_OFFICIAL_INFO,
  type OfficialContractData,
  type OfficialContractRecord
} from '@/types/officialContract';
import { PUBLIC_APP_ORIGIN } from '@/utils/publicAppUrl';
import { createReceiptVerificationUrl } from '@/lib/receiptVerification';
import { getDebrisContractTypeLabel } from '@/utils/rentalPricing';
import { generateContractClause1 } from '@/utils/contractGrammar';
import { createInvoicePresentation } from '@/utils/invoicePresentation';
import { ShieldCheck, CheckCircle2, FileText, Printer, Building2, Phone, MapPin, Calendar, Lock } from 'lucide-react';

function isOfficialContractData(value: unknown): value is OfficialContractData {
  if (!value || typeof value !== 'object') return false;

  const data = value as Record<string, unknown>;
  return typeof data.contractDate === 'string'
    && typeof data.approvalNumber === 'string'
    && typeof data.serialNumber === 'string'
    && typeof data.secondPartyName === 'string'
    && typeof data.containerCount === 'number'
    && typeof data.containerType === 'string'
    && typeof data.phoneNumber === 'string'
    && typeof data.plotNumber === 'string'
    && typeof data.planNumber === 'string'
    && typeof data.locationDescription === 'string'
    && typeof data.renovationLicenseYears === 'number'
    && typeof data.buildingLicenseYears === 'number'
    && typeof data.isSealed === 'boolean';
}

function isOfficialContractRecord(value: unknown): value is OfficialContractRecord {
  if (!value || typeof value !== 'object') return false;

  const record = value as Record<string, unknown>;
  return typeof record.id === 'string'
    && (record.status === 'pending_seal' || record.status === 'sealed')
    && isOfficialContractData(record.contractData)
    && typeof record.createdBy === 'string'
    && typeof record.createdAt === 'string';
}

export default function ReceiptPage({
  params
}: {
  params: Promise<{ number: string }>;
}) {
  const [docType, setDocType] = useState<'receipt' | 'official_contract' | null>(null);
  const [receiptData, setReceiptData] = useState<PublicReceiptPayload | null>(null);
  const [officialData, setOfficialData] = useState<PublicOfficialContractPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selfUrl, setSelfUrl] = useState('');

  useEffect(() => {
    async function loadDocument() {
      setIsLoading(true);
      if (typeof window !== 'undefined') {
        const verificationData = new URLSearchParams(window.location.search).get('d');
        setSelfUrl(verificationData
          ? `${PUBLIC_APP_ORIGIN}/api/receipts/image?d=${encodeURIComponent(verificationData)}`
          : window.location.href);
      }

      // 1. Check if encoded payload 'd' exists in query string
      try {
        if (typeof window !== 'undefined') {
          const search = new URLSearchParams(window.location.search);
          const verificationToken = search.get('t');
          const encoded = search.get('d');
          const typeParam = search.get('type');

          if (verificationToken) {
            const response = await fetch(
              `/api/receipts/verify?token=${encodeURIComponent(verificationToken)}`,
              { cache: 'no-store' }
            );
            const result = await response.json() as { payload?: PublicReceiptPayload };
            if (!response.ok || result.payload?.type !== 'receipt' || !result.payload.receiptNumber) {
              throw new Error('Public receipt verification could not be completed.');
            }
            setDocType('receipt');
            setReceiptData(result.payload);
            setSelfUrl(createReceiptVerificationUrl(verificationToken));
            setIsLoading(false);
            return;
          }

          if (encoded) {
            const parsed = await decodeReceiptVerificationPayload(encoded);
            if (parsed) {
              if (typeParam === 'official' || parsed.type === 'official_contract' || ('secondPartyName' in parsed && 'approvalNumber' in parsed)) {
                setDocType('official_contract');
                setOfficialData(parsed as PublicOfficialContractPayload);
                setIsLoading(false);
                return;
              }

              if (parsed.type === 'receipt' || ('receiptNumber' in parsed && 'customerName' in parsed)) {
                setDocType('receipt');
                setReceiptData(parsed as PublicReceiptPayload);
                setIsLoading(false);
                return;
              }
            }
          }
        }
      } catch (e) {
        console.error('Receipt verification link could not be loaded:', e);
        setError(true);
        setIsLoading(false);
        return;
      }

      // 2. Resolve param number
      let rawNumber = '';
      try {
        const resolved = await Promise.resolve(params);
        rawNumber = decodeURIComponent(resolved?.number || '').trim();
      } catch (err) {
        console.warn('Params resolve error:', err);
      }

      if (!rawNumber) {
        setError(true);
        setIsLoading(false);
        return;
      }

      // 3. Check localStorage for official contract records
      try {
        if (typeof window !== 'undefined') {
          const localOfficialStr = localStorage.getItem('almuhtaraz_official_contracts');
          if (localOfficialStr) {
            const localOfficial: unknown = JSON.parse(localOfficialStr);
            if (Array.isArray(localOfficial)) {
              const matched = localOfficial.find((rec: unknown): rec is OfficialContractRecord =>
                isOfficialContractRecord(rec) && (
                rec?.contractData?.approvalNumber === rawNumber || 
                rec?.contractData?.serialNumber === rawNumber ||
                rec?.id === rawNumber
                )
              );
              if (matched && matched.contractData) {
                setDocType('official_contract');
                setOfficialData({
                  type: 'official_contract',
                  ...matched.contractData,
                  isSealed: matched.status === 'sealed' || matched.contractData.isSealed,
                  sealImageUrl: matched.sealImageUrl || matched.contractData.sealImageUrl
                });
                setIsLoading(false);
                return;
              }
            }
          }
        }
      } catch (e) {
        console.warn('LocalStorage check error:', e);
      }

      // 4. Query Supabase directly
      try {
        // A) Query receipts table
        const { data: recItem } = await supabase
          .from('receipts')
          .select('*, contract:contracts(*, customer:customers(*), container:containers(*)), customer:customers(*)')
          .eq('receipt_number', rawNumber)
          .maybeSingle();

        if (recItem && recItem.contract) {
          const c = recItem.contract;
          const receiptHasVatData = recItem.subtotal_amount != null && recItem.vat_amount != null;
          const cust = recItem.customer || c.customer;
          const cont = c.container;
          setDocType('receipt');
          setReceiptData({
            type: 'receipt',
            receiptNumber: recItem.receipt_number,
            contractNumber: c.contract_number,
            customerName: cust?.name || 'عميل مؤسسة المحترز',
            customerVatNumber: recItem.customer_vat_number || '',
            customerPhone: cust?.phone || '-',
            containerNumber: cont?.container_number || '-',
            contractType: c.contract_type === 'commercial' ? 'حاوية تجارية للمنشآت' : getDebrisContractTypeLabel(c.period_type, c.duration_days),
            paidAmount: Number(recItem.amount ?? c.paid_amount ?? c.total_cost ?? 0),
            totalCost: receiptHasVatData ? Number(c.total_cost || 0) : Number(recItem.amount || 0),
            contractPaidAmount: receiptHasVatData ? Number(c.paid_amount || 0) : Number(recItem.amount || 0),
            ...(receiptHasVatData ? {
              nonTaxableAmount: c.non_taxable_amount,
              subtotalAmount: c.subtotal_amount,
              vatAmount: c.vat_amount
            } : {}),
            receiptNonTaxableAmount: recItem.non_taxable_amount,
            receiptSubtotalAmount: recItem.subtotal_amount,
            receiptVatAmount: recItem.vat_amount,
            paymentMethod: recItem.payment_method || c.payment_method || 'mada',
            startDate: c.start_date ? new Date(c.start_date).toLocaleDateString('ar-SA') : '-',
            endDate: c.end_date ? new Date(c.end_date).toLocaleDateString('ar-SA') : '-',
            locationAddress: c.location_address || 'الموقع المحدد بالعقد',
            issueDate: recItem.created_at || c.created_at || new Date().toISOString(),
            notes: recItem.notes || c.notes || ''
          });
          setIsLoading(false);
          return;
        }

        // B) Query contracts table fallback
        const { data: contractItem } = await supabase
          .from('contracts')
          .select('*, customer:customers(*), container:containers(*)')
          .or(`receipt_number.eq.${rawNumber},contract_number.eq.${rawNumber}`)
          .maybeSingle();

        if (contractItem) {
          const c = contractItem;
          const cust = c.customer;
          const cont = c.container;
          setDocType('receipt');
          setReceiptData({
            type: 'receipt',
            receiptNumber: c.receipt_number || rawNumber,
            contractNumber: c.contract_number,
            customerName: cust?.name || 'عميل مؤسسة المحترز',
            customerVatNumber: c.customer_vat_number || '',
            customerPhone: cust?.phone || '-',
            containerNumber: cont?.container_number || '-',
            contractType: c.contract_type === 'commercial' ? 'حاوية تجارية للمنشآت' : getDebrisContractTypeLabel(c.period_type, c.duration_days),
            paidAmount: Number(c.paid_amount || c.total_cost || 0),
            totalCost: Number(c.total_cost || 0),
            contractPaidAmount: Number(c.paid_amount || 0),
            nonTaxableAmount: c.non_taxable_amount,
            subtotalAmount: c.subtotal_amount,
            vatAmount: c.vat_amount,
            receiptNonTaxableAmount: c.non_taxable_paid_amount,
            receiptSubtotalAmount: c.subtotal_paid_amount,
            receiptVatAmount: c.vat_paid_amount,
            paymentMethod: c.payment_method || 'mada',
            startDate: c.start_date ? new Date(c.start_date).toLocaleDateString('ar-SA') : '-',
            endDate: c.end_date ? new Date(c.end_date).toLocaleDateString('ar-SA') : '-',
            locationAddress: c.location_address || 'الموقع المحدد بالعقد',
            issueDate: c.created_at || new Date().toISOString(),
            notes: c.notes || ''
          });
          setIsLoading(false);
          return;
        }

        setError(true);
      } catch (err) {
        console.error('Supabase fetch error:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    }

    loadDocument();
  }, [params]);

  /* ── Loading ── */
  if (isLoading) {
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
        <div style={{ fontSize: '2.8rem' }}>⏳</div>
        <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>جاري توثيق واستعراض الوثيقة إلكترونياً...</div>
      </div>
    );
  }

  /* ── Error ── */
  if (error || (!receiptData && !officialData)) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0f1d',
        color: '#f8fafc',
        fontFamily: "'Cairo', 'Tajawal', sans-serif",
        flexDirection: 'column',
        gap: '16px',
        padding: '24px',
        textAlign: 'center',
        direction: 'rtl'
      }}>
        <div style={{ fontSize: '3.5rem' }}>📄</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ef4444' }}>
          عفواً، لم يتم العثور على وثيقة مطابقة
        </div>
        <div style={{ color: '#94a3b8', fontSize: '0.95rem', maxWidth: '420px', lineHeight: 1.6 }}>
          يرجى التأكد من مسح رمز الـ QR الصحيح الموجود على نسخة العقد أو الفاتورة الأصلية الصادرة من {COMPANY_OFFICIAL_INFO.nameArabic}.
        </div>
        <a 
          href="tel:0532643000" 
          style={{
            marginTop: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#2563eb',
            color: '#fff',
            padding: '10px 24px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 800,
            fontSize: '0.9rem'
          }}
        >
          <Phone size={16} />
          <span>الاتصال بخدمة العملاء: 0532643000</span>
        </a>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER: 1. OFFICIAL CONTRACT VIEW (عقد تأجير الحاويات الرسمي المعتمد)
  // ══════════════════════════════════════════════════════════════════════════
  if (docType === 'official_contract' && officialData) {
    const dynamicClause1 = generateContractClause1(
      officialData.renovationLicenseYears || 1, 
      officialData.buildingLicenseYears || 2
    );

    return (
      <>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Amiri:wght@400;700&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet" />

        <style>{`
          * { 
            box-sizing: border-box; 
            margin: 0; 
            padding: 0; 
            direction: rtl !important;
            text-align: right;
            font-family: 'Cairo', 'Tajawal', 'Amiri', -apple-system, BlinkMacSystemFont, sans-serif !important;
            -webkit-font-smoothing: antialiased;
          }
          html, body { 
            background: #0f172a; 
            color: #0f172a; 
            width: 100%; 
            min-height: 100vh;
          }
          .public-contract-container {
            min-height: 100vh;
            background: linear-gradient(160deg, #090d16 0%, #1e293b 100%);
            padding: 24px 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .contract-sheet {
            width: 100%;
            max-width: 860px;
            background: #ffffff;
            border-radius: 18px;
            box-shadow: 0 25px 70px rgba(0, 0, 0, 0.5);
            padding: 28px 32px;
            border: 2px solid #e2e8f0;
            position: relative;
          }
          .print-action-bar {
            width: 100%;
            max-width: 860px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            gap: 12px;
            flex-wrap: wrap;
          }
          .print-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #dc2626, #991b1b);
            color: #ffffff;
            border: none;
            border-radius: 12px;
            padding: 12px 24px;
            font-size: 0.95rem;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4);
            transition: transform 0.15s;
          }
          .print-btn:hover {
            transform: translateY(-2px);
          }
          .badge-verified {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #059669;
            color: #ffffff;
            padding: 8px 16px;
            border-radius: 12px;
            font-size: 0.85rem;
            font-weight: 800;
          }
          @media print {
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            body { 
              background: #ffffff !important; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .public-contract-container { 
              padding: 0 !important; 
              background: #ffffff !important; 
            }
            .contract-sheet { 
              box-shadow: none !important; 
              border: none !important;
              border-radius: 0 !important; 
              max-width: 100% !important; 
              padding: 0 !important;
            }
            .no-print { 
              display: none !important; 
            }
          }
        `}</style>

        <div className="public-contract-container">
          {/* Action Bar */}
          <div className="print-action-bar no-print">
            <div className="badge-verified">
              <ShieldCheck size={18} />
              <span>وثيقة عقد رسمية موثقة إلكترونياً</span>
            </div>
            <button className="print-btn" onClick={() => window.print()}>
              <Printer size={18} />
              <span>طباعة العقد أو حفظ PDF</span>
            </button>
          </div>

          {/* Official A4 Sheet */}
          <div className="contract-sheet">
            {/* 1. Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2.5px solid #dc2626', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#dc2626' }}>
                  {COMPANY_OFFICIAL_INFO.nameArabic}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {COMPANY_OFFICIAL_INFO.subNameArabic}
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>
                  {COMPANY_OFFICIAL_INFO.activity}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '3px' }}>
                  سجل تجاري: <strong style={{ color: '#0f172a' }}>{COMPANY_OFFICIAL_INFO.crNumber}</strong>
                </div>
              </div>

              {/* Center Title Badge */}
              <div style={{ textAlign: 'center', padding: '0 12px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                  color: '#ffffff',
                  padding: '8px 24px',
                  borderRadius: '10px',
                  fontWeight: 900,
                  fontSize: '1.15rem',
                  letterSpacing: '0.5px',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
                }}>
                  عقد تأجير حاوية
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <CheckCircle2 size={14} />
                  <span>معتمد ومسجل إلكترونياً</span>
                </div>
              </div>

              {/* Left Info */}
              <div style={{ textAlign: 'left', direction: 'ltr' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#dc2626', letterSpacing: '1px' }}>
                  {COMPANY_OFFICIAL_INFO.nameEnglish}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#dc2626', marginTop: '4px' }}>
                  رقم: <span style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>{officialData.serialNumber || '0208'}</span>
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginTop: '2px' }}>
                  الموافق: <span style={{ direction: 'rtl' }}>{officialData.contractDate || new Date().toISOString().split('T')[0]}</span>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
                  موافقة: {officialData.approvalNumber || '-'}
                </div>
              </div>
            </div>

            {/* 2. Preamble */}
            <div style={{ fontSize: '0.88rem', lineHeight: 1.7, color: '#1e293b', marginBottom: '14px', textAlign: 'justify' }}>
              بعون الله وتوفيقه تم الاتفاق في يوم <strong style={{ color: '#0f172a' }}>{officialData.contractDate || '-'}</strong> بين كل من:
              <br />
              <strong style={{ color: '#dc2626' }}>الطرف الأول:</strong> {COMPANY_OFFICIAL_INFO.nameArabic} ({COMPANY_OFFICIAL_INFO.subNameArabic}) سجل تجاري رقم ({COMPANY_OFFICIAL_INFO.crNumber}).
              <br />
              <strong style={{ color: '#dc2626' }}>الطرف الثاني:</strong> <strong style={{ color: '#0f172a', textDecoration: 'underline' }}>{officialData.secondPartyName || 'الطرف الثاني'}</strong> هاتف رقم (<span dir="ltr">{officialData.phoneNumber || '-'}</span>).
            </div>

            {/* 3. Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #dc2626', marginBottom: '14px', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#fef2f2', borderBottom: '1.5px solid #dc2626' }}>
                  <th style={{ padding: '8px', borderLeft: '1.5px solid #dc2626', width: '14%', textAlign: 'center', fontWeight: 900, color: '#991b1b' }}>العدد</th>
                  <th style={{ padding: '8px', borderLeft: '1.5px solid #dc2626', width: '24%', textAlign: 'center', fontWeight: 900, color: '#991b1b' }}>النوع</th>
                  <th style={{ padding: '8px', borderLeft: '1.5px solid #dc2626', width: '22%', textAlign: 'center', fontWeight: 900, color: '#991b1b' }}>الجوال</th>
                  <th style={{ padding: '8px', width: '40%', textAlign: 'center', fontWeight: 900, color: '#991b1b' }}>الموقع والمخطط</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '10px', borderLeft: '1.5px solid #dc2626', textAlign: 'center', fontWeight: 900, fontSize: '1.1rem', color: '#dc2626' }}>
                    {officialData.containerCount || 1}
                  </td>
                  <td style={{ padding: '10px', borderLeft: '1.5px solid #dc2626', textAlign: 'center', fontWeight: 800 }}>
                    {officialData.containerType || 'أنقاض 20 ياردة'}
                  </td>
                  <td style={{ padding: '10px', borderLeft: '1.5px solid #dc2626', textAlign: 'center', fontWeight: 800, direction: 'ltr' }}>
                    {officialData.phoneNumber || '-'}
                  </td>
                  <td style={{ padding: '10px', lineHeight: 1.6, fontWeight: 700 }}>
                    <div>القطعة: <strong style={{ color: '#0f172a' }}>{officialData.plotNumber || '—'}</strong> | المخطط: <strong style={{ color: '#0f172a' }}>{officialData.planNumber || '—'}</strong></div>
                    {officialData.locationDescription && (
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                        {officialData.locationDescription}
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 4. Pledge */}
            <div style={{
              border: '2px solid #dc2626',
              borderRadius: '8px',
              padding: '9px 14px',
              marginBottom: '14px',
              background: '#fef2f2',
              textAlign: 'center',
              fontWeight: 900,
              fontSize: '0.84rem',
              color: '#991b1b',
              lineHeight: 1.5
            }}>
              {CONTRACT_PLEDGE_TEXT}
            </div>

            {/* 5. Terms */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#dc2626', marginBottom: '6px' }}>
                شروط وبنود العقد الرسمية:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem', lineHeight: 1.5, color: '#1e293b' }}>
                <div style={{ fontWeight: 800, color: '#0f172a' }}>
                  {dynamicClause1}
                </div>
                {FIXED_CONTRACT_CLAUSES.map((clause, idx) => (
                  <div key={idx} style={{ textAlign: 'justify' }}>
                    {clause}
                  </div>
                ))}
              </div>
            </div>

            {/* 6. Signatures & Stamp */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderTop: '2px dashed #cbd5e1',
              paddingTop: '16px',
              marginTop: '12px'
            }}>
              {/* Party 1 & Stamp */}
              <div style={{ textAlign: 'center', width: '220px' }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#dc2626' }}>
                  الطرف الأول
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {COMPANY_OFFICIAL_INFO.nameArabic}
                </div>
                {officialData.isSealed ? (
                  <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center' }}>
                    {officialData.sealImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={officialData.sealImageUrl}
                        alt="Official Stamp"
                        style={{ width: '95px', height: '95px', objectFit: 'contain', transform: 'rotate(-4deg)' }}
                      />
                    ) : (
                      <div style={{
                        display: 'inline-flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px dashed #dc2626',
                        borderRadius: '50%',
                        width: '90px',
                        height: '90px',
                        padding: '4px',
                        color: '#dc2626',
                        background: 'rgba(254, 242, 242, 0.6)',
                        transform: 'rotate(-4deg)'
                      }}>
                        <div style={{ fontSize: '0.55rem', fontWeight: 900 }}>معتمد رسمياً</div>
                        <ShieldCheck size={20} strokeWidth={2.4} />
                        <div style={{ fontSize: '0.55rem', fontWeight: 800 }}>المحترز للحاويات</div>
                        <div style={{ fontSize: '0.48rem', fontFamily: 'sans-serif' }}>{COMPANY_OFFICIAL_INFO.crNumber}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '20px' }}>
                    (التوقيع والختم المعتمد)
                  </div>
                )}
              </div>

              {/* QR Verification Center */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 8px' }}>
                <div style={{
                  padding: '4px',
                  background: '#ffffff',
                  border: '1.5px solid #dc2626',
                  borderRadius: '10px',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.15)',
                  display: 'inline-flex'
                }}>
                  <QRCodeSVG
                    value={selfUrl || `https://al-muhtaraz.vercel.app/receipt/${officialData.approvalNumber || officialData.serialNumber}`}
                    size={84}
                    level="M"
                    includeMargin={true}
                    fgColor="#000000"
                    bgColor="#ffffff"
                  />
                </div>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
                  رمز التوثيق الإلكتروني
                </div>
                <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#64748b' }}>
                  امسح للتحقق من صحة العقد
                </div>
              </div>

              {/* Party 2 */}
              <div style={{ textAlign: 'center', width: '220px' }}>
                <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#dc2626' }}>
                  الطرف الثاني
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                  {officialData.secondPartyName || '........................................'}
                </div>
                <div style={{ height: '70px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', color: '#64748b', fontSize: '0.75rem', borderBottom: '1px dotted #94a3b8', margin: '10px auto 0 auto', width: '160px' }}>
                  التوقيع / الختم
                </div>
              </div>
            </div>

            {/* Address Footer */}
            <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '8px', fontSize: '0.68rem', color: '#64748b', textAlign: 'center' }}>
              {COMPANY_OFFICIAL_INFO.address} &nbsp;|&nbsp; هاتف: {COMPANY_OFFICIAL_INFO.phone} &nbsp;|&nbsp; بريد: {COMPANY_OFFICIAL_INFO.email}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER: 2. FINANCIAL RECEIPT / STANDARD VOUCHER VIEW (الفاتورة المالية الرسمية)
  // ══════════════════════════════════════════════════════════════════════════
  const data = receiptData!;
  const presentation = createInvoicePresentation({
    ...data,
    isFree: data.paymentMethod === 'free' || (data.paidAmount === 0 && data.totalCost === 0)
  });
  const {
    invoiceAmounts,
    receiptAmounts,
    remainingAmount,
    isPartial,
    isFree,
    paymentMethod,
    issueDate,
    formatMoney
  } = presentation;

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
        }
        html, body { background: #f5f5f4; color: #1c1917; direction: rtl !important; width: 100%; min-height: 100vh; }
        .receipt-page { min-height: 100vh; background: #f5f5f4; padding: 24px 16px; display: flex; flex-direction: column; align-items: center; }
        .receipt-card { width: 100%; max-width: 210mm; min-height: 297mm; background: #fff; overflow: hidden; box-shadow: 0 10px 34px rgba(28,25,23,0.12); direction: rtl !important; }
        .receipt-header { display: flex; flex-direction: column; gap: 8px; padding: 14px 18px 10px; background: #fff; }
        .receipt-header-top { display: flex; flex-direction: row-reverse; justify-content: space-between; align-items: center; gap: 16px; min-height: 126px; padding-bottom: 8px; border-bottom: 1px solid #d6d3d1; }
        .brand-info { display: flex; direction: rtl; align-items: center; gap: 8px; min-width: 0; }
        .company-meta { min-width: 0; color: #57534e; font-size: 0.65rem; line-height: 1.55; overflow-wrap: anywhere; }
        .company-meta h1 { color: #171717; font-size: 0.92rem; font-weight: 900; line-height: 1.35; }
        .invoice-title { text-align: center; padding: 0 0 2px; }
        .invoice-title h1 { color: #171717; font-size: 1.7rem; font-weight: 900; text-align: center; }
        .invoice-title div { color: #1c1917; font-size: 0.78rem; text-align: center; margin-top: 2px; font-weight: 800; }
        .large-logo-group { display: flex; flex-direction: column; align-items: center; justify-self: start; gap: 2px; min-width: 145px; }
        .large-logo { width: 132px; height: 112px; object-fit: contain; }
        .header-receipt-number { color: #1c1917; font-size: 0.72rem; font-weight: 800; text-align: center; }
        .receipt-body { padding: 12px 18px; background: #fff; }
        .amount-box { background: #fff; border: 1px solid #e7e5e4; border-radius: 7px; padding: 9px 13px; margin-bottom: 10px; }
        .total-row { display: flex; justify-content: space-between; gap: 12px; padding: 7px 5px; border-bottom: 1px solid #f1f0ee; font-size: 0.82rem; }
        .total-row strong { white-space: nowrap; font-variant-numeric: tabular-nums; }
        .legacy-tax-note { padding: 5px; color: #78716c; font-size: 0.68rem; }
        .amount-final { background: #fbf6e8; color: #78571d; border: 0; border-radius: 5px; margin: 5px 0; padding: 9px; font-size: 0.95rem; font-weight: 900; }
        .amount-number { font-size: 1rem; font-weight: 900; color: #78571d; }
        .payment-detail { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0 0 10px; border: 1px solid #e7e5e4; border-radius: 6px; color: #57534e; font-size: 0.76rem; }
        .payment-detail > span { min-width: 0; padding: 8px 10px; border-left: 1px solid #d6d3d1; }
        .payment-detail > span:last-child { border-left: 0; }
        .payment-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 4px; background: #f5f5f4; color: #44403c; font-size: 0.75rem; font-weight: 700; }
        .info-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-bottom: 10px; }
        .info-cell { min-width: 0; background: #fafaf9; border-radius: 5px; padding: 6px 8px; border: 1px solid #e7e5e4; break-inside: avoid; }
        .info-cell .label { font-size: 0.65rem; color: #78716c; display: block; margin-bottom: 2px; font-weight: 700; }
        .info-cell .value { font-size: 0.78rem; font-weight: 800; color: #1c1917; overflow-wrap: anywhere; }
        .info-cell.full { grid-column: 1 / -1; }
        .divider { border: 0; margin: 8px 0; }
        .footer-row { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; gap: 12px; padding-top: 4px; break-inside: avoid; direction: rtl; }
        .qr-box { display: flex; align-items: center; justify-content: flex-start; }
        .verified-box { text-align: center; }
        .qr-img { padding: 4px; border: 1px solid #d6d3d1; border-radius: 5px; background: #fff; line-height: 0; }
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
        .stamp-line { border-top: 1px solid #78716c; padding-top: 4px; font-size: 0.68rem; color: #57534e; margin-top: 24px; font-weight: 700; }
        .partial-warning { 
          background: #fff7ed; 
          border: 1.5px solid #fed7aa; 
          border-radius: 12px; 
          padding: 7px 10px;
          margin-bottom: 8px;
          font-size: 0.76rem;
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
          @page { size: A4 portrait; margin: 12mm; }
          body { 
            background: #ffffff !important; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .receipt-page { 
            padding: 0 !important;
            min-height: 0 !important;
            background: #ffffff !important; 
          }
          .receipt-card { 
            box-shadow: none !important; 
            width: 186mm !important;
            max-width: 186mm !important;
            min-height: 273mm !important;
          }
          .receipt-header { padding: 5mm 4mm 3mm !important; }
          .receipt-header-top { min-height: 31mm; }
          .receipt-body { padding: 4mm !important; }
          .print-btn, .no-print { 
            display: none !important; 
          }
          .info-grid, .amount-box, .footer-row, .info-cell { break-inside: avoid; page-break-inside: avoid; }
        }
        @media screen and (max-width: 480px) {
          .receipt-header-top { align-items: flex-start; gap: 8px; }
          .brand-info { gap: 0; }
          .company-meta { font-size: 0.55rem; }
          .company-meta h1 { font-size: 0.7rem; }
          .large-logo-group { min-width: 80px; }
          .large-logo { width: 72px; height: 62px; }
          .header-receipt-number { font-size: 0.55rem; }
          .payment-detail { grid-template-columns: 1fr; }
          .payment-detail > span { border-left: 0; border-bottom: 1px solid #d6d3d1; }
          .payment-detail > span:last-child { border-bottom: 0; }
          .info-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .footer-row { grid-template-columns: 1fr 1fr; }
          .verified-box { grid-column: 1 / -1; grid-row: 1; }
          .stamp-box { grid-column: 1; }
          .qr-box { grid-column: 2; grid-row: 2; justify-content: flex-end; }
        }
      `}</style>

      <div className="receipt-page">
        {/* Print / Save PDF Button */}
        <button className="print-btn no-print" onClick={() => window.print()}>
          <span>🖨️ طباعة أو حفظ الفاتورة PDF</span>
        </button>

        <div className="receipt-card">
          {/* ── HEADER ── */}
          <div className="receipt-header">
            <div className="receipt-header-top">
              <div className="large-logo-group">
                <img className="large-logo" src="/invoice-logo.jpg" alt={`شعار ${COMPANY_OFFICIAL_INFO.nameArabic}`} />
                <div className="header-receipt-number">{issueDate}</div>
              </div>
              <div className="brand-info">
                <div className="company-meta">
                  <h1>{COMPANY_OFFICIAL_INFO.nameArabic}</h1>
                  <div>تأجير الحاويات التجارية وعقود الإنشاءات</div>
                  <div>الرقم الضريبي: <strong>{COMPANY_OFFICIAL_INFO.vatNumber}</strong> &nbsp; | &nbsp; السجل التجاري: <strong>{COMPANY_OFFICIAL_INFO.crNumber}</strong></div>
                  <div>المملكة العربية السعودية</div>
                  <div>{COMPANY_OFFICIAL_INFO.address.replace('المملكة العربية السعودية – ', '')} &nbsp; | &nbsp; هاتف: <strong>{COMPANY_OFFICIAL_INFO.phone}</strong></div>
                </div>
              </div>
            </div>
            <div className="invoice-title">
              <h1>فاتورة</h1>
              <div>رقم الفاتورة: {data.receiptNumber}</div>
            </div>
          </div>

          {/* ── BODY ── */}
          <div className="receipt-body">
            {/* Info Grid */}
            <div className="info-grid">
              <div className="info-cell">
                <span className="label">اسم العميل / المستأجر:</span>
                <span className="value">{data.customerName}</span>
              </div>
              <div className="info-cell">
                <span className="label">الرقم الضريبي للعميل:</span>
                <span className="value">{data.customerVatNumber?.trim() || 'غير مسجل'}</span>
              </div>
              <div className="info-cell">
                <span className="label">رقم العقد:</span>
                <span className="value">{data.contractNumber}</span>
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
                <span className="label">حالة الفاتورة:</span>
                <span className="value" style={{ color: '#059669' }}>
                  {isFree ? 'عقد مجاني' : isPartial ? 'دفعة جزئية' : 'مسدد بالكامل'}
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
                  <span className="label">ملاحظات وبيانات الفاتورة:</span>
                  <span className="value">{data.notes}</span>
                </div>
              )}
            </div>

            <div className="amount-box">
              <div className="total-row">
                <span>المبلغ قبل الضريبة</span>
                <strong>{formatMoney(invoiceAmounts.subtotalAmount)} ر.س</strong>
              </div>
              {invoiceAmounts.nonTaxableAmount > 0 && (
                <div className="total-row">
                  <span>رصيد سابق غير خاضع للضريبة</span>
                  <strong>{formatMoney(invoiceAmounts.nonTaxableAmount)} ر.س</strong>
                </div>
              )}
              <div className="total-row">
                <span>ضريبة القيمة المضافة (15%)</span>
                <strong>{formatMoney(invoiceAmounts.vatAmount)} ر.س</strong>
              </div>
              {!invoiceAmounts.isVatAware && (
                <div className="legacy-tax-note">
                  قيمة عقد سابقة معروضة كما خُزنت دون إعادة احتساب الضريبة.
                </div>
              )}
              <div className="total-row amount-final">
                <span>الإجمالي بعد الضريبة</span>
                <strong className="amount-number">{formatMoney(invoiceAmounts.grossAmount)} ر.س</strong>
              </div>
            </div>

            {!isFree && (
              <div className="payment-detail">
                <span>قبل الضريبة في الدفعة: <strong>{formatMoney(receiptAmounts.subtotalAmount + receiptAmounts.nonTaxableAmount)} ر.س</strong></span>
                <span>إجمالي الدفعة الحالية: <strong>{formatMoney(receiptAmounts.grossAmount)} ر.س</strong></span>
                <span>طريقة السداد: <span className="payment-badge">{paymentMethod.label}</span></span>
              </div>
            )}

            {isPartial && !isFree && (
              <div className="partial-warning">
                ⚠️ دفعة جزئية على الحساب — إجمالي العقد: {formatMoney(invoiceAmounts.grossAmount)} ر.س &nbsp;|&nbsp; المتبقي: {formatMoney(remainingAmount)} ر.س
              </div>
            )}

            {/* Footer Row */}
            <div className="footer-row">
              <div className="qr-box">
                <div className="qr-img">
                  <QRCodeSVG
                    value={selfUrl || `https://al-muhtaraz.vercel.app/receipt/${data.receiptNumber}`}
                    size={160}
                    level="M"
                    includeMargin={true}
                    shapeRendering="crispEdges"
                    fgColor="#000000"
                    bgColor="#ffffff"
                  />
                </div>
              </div>

              <div className="verified-box">
                <div className="verified-badge">
                  <span>✓ فاتورة إلكترونية موثقة</span>
                </div>
                <div className="qr-label">
                  امسح كود الـ QR للتحقق من صحة الفاتورة إلكترونياً
                </div>
              </div>

              <div className="stamp-box">
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>
                  {COMPANY_OFFICIAL_INFO.nameArabic}
                </div>
                <div className="stamp-line">الختم والتوقيع المعتمد</div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </>
  );
}
