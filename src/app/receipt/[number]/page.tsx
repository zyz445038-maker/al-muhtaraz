'use client';

import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import { 
  decodeUtf8Base64, 
  PublicReceiptPayload, 
  PublicOfficialContractPayload, 
  PublicVerificationPayload 
} from '@/utils/receiptEncoder';
import { 
  FIXED_CONTRACT_CLAUSES, 
  CONTRACT_PLEDGE_TEXT, 
  COMPANY_OFFICIAL_INFO 
} from '@/types/officialContract';
import { generateContractClause1 } from '@/utils/contractGrammar';
import { ShieldCheck, CheckCircle2, FileText, Printer, Building2, Phone, MapPin, Calendar, Lock } from 'lucide-react';

// ─── Payment Method Label ─────────────────────────────────────────────────────
function paymentLabel(method: string): string {
  const map: Record<string, string> = {
    apple_pay: '🍎 Apple Pay',
    mada: '💳 بطاقة مدى',
    credit_card: '💳 Visa / Master',
    cash: '💵 نقدي كاش',
    pos: '🖥️ POS شبكة',
    bank_transfer: '🏦 تحويل بنكي',
    deferred: '⏳ آجل على الحساب',
    free: '🎁 معتمد رسمي'
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

export default function ReceiptPage({ params }: { params: Promise<{ number: string }> }) {
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
        setSelfUrl(window.location.href);
      }

      // 1. Check if encoded payload 'd' exists in query string
      try {
        if (typeof window !== 'undefined') {
          const search = new URLSearchParams(window.location.search);
          const encoded = search.get('d');
          const typeParam = search.get('type');

          if (encoded) {
            const parsed = decodeUtf8Base64(encoded);
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
        console.warn('URLSearchParams decode error:', e);
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
            const localOfficial = JSON.parse(localOfficialStr);
            if (Array.isArray(localOfficial)) {
              const matched = localOfficial.find((rec: any) => 
                rec?.contractData?.approvalNumber === rawNumber || 
                rec?.contractData?.serialNumber === rawNumber ||
                rec?.id === rawNumber
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
          const cust = recItem.customer || c.customer;
          const cont = c.container;
          setDocType('receipt');
          setReceiptData({
            type: 'receipt',
            receiptNumber: recItem.receipt_number,
            contractNumber: c.contract_number,
            customerName: cust?.name || 'عميل مؤسسة المحترز',
            customerPhone: cust?.phone || '-',
            containerNumber: cont?.container_number || '-',
            contractType: c.contract_type === 'commercial' ? 'حاوية تجارية للمنشآت' : (c.period_type === 'monthly' ? 'حاوية أنقاض (عقد شهري)' : 'حاوية أنقاض (عقد يومي)'),
            paidAmount: Number(recItem.amount || c.paid_amount || c.total_cost || 0),
            totalCost: Number(c.total_cost || 0),
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
            customerPhone: cust?.phone || '-',
            containerNumber: cont?.container_number || '-',
            contractType: c.contract_type === 'commercial' ? 'حاوية تجارية للمنشآت' : (c.period_type === 'monthly' ? 'حاوية أنقاض (عقد شهري)' : 'حاوية أنقاض (عقد يومي)'),
            paidAmount: Number(c.paid_amount || c.total_cost || 0),
            totalCost: Number(c.total_cost || 0),
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
          يرجى التأكد من مسح رمز الـ QR الصحيح الموجود على نسخة العقد أو السند الأصلي الصادر من مؤسسة المحترز للحاويات.
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
  // RENDER: 2. FINANCIAL RECEIPT / STANDARD VOUCHER VIEW (سند القبض المالي الرسمي)
  // ══════════════════════════════════════════════════════════════════════════
  const data = receiptData!;
  const remaining = Math.max(0, (data.totalCost || 0) - (data.paidAmount || 0));
  const issueDate = new Date(data.issueDate || Date.now());
  const isPartial = remaining > 0;
  const isFree = data.paymentMethod === 'free' || (data.paidAmount === 0 && data.totalCost === 0);

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
            <div className="receipt-badge">سند مالي وعقد رسمي موثق &nbsp;|&nbsp; OFFICIAL RECEIPT</div>
          </div>

          {/* ── BODY ── */}
          <div className="receipt-body">
            {/* Amount Box */}
            <div className="amount-box">
              <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '6px', fontWeight: 800 }}>
                {isFree ? 'سند تأجير رسمي معتمد' : 'المبلغ المقبوض والمسدد'}
              </div>
              <div>
                <span className="amount-number">{isFree ? '—' : data.paidAmount.toLocaleString('ar-SA')}</span>
                {!isFree && <span className="amount-sar">ر.س</span>}
              </div>
              {!isFree && <div className="amount-words">({toArabicWords(data.paidAmount)})</div>}
              <div className="payment-badge">{isFree ? 'معتمد رسمي ✓' : paymentLabel(data.paymentMethod)}</div>
            </div>

            {/* Partial Warning */}
            {isPartial && !isFree && (
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
                  <QRCodeSVG
                    value={selfUrl || `https://al-muhtaraz.vercel.app/receipt/${data.receiptNumber}`}
                    size={90}
                    level="M"
                    includeMargin={true}
                    fgColor="#000000"
                    bgColor="#ffffff"
                  />
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
