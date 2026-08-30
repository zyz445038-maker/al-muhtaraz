'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Printer, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  Truck, 
  Calendar, 
  FileCode2, 
  Building2, 
  MapPin, 
  Phone, 
  Hash, 
  Eye, 
  Stamp, 
  Download, 
  Sparkles,
  Send,
  Lock,
  ArrowRight
} from 'lucide-react';
import { 
  OfficialContractData, 
  OfficialContractRecord,
  ContractSealSettings,
  FIXED_CONTRACT_CLAUSES, 
  CONTRACT_PLEDGE_TEXT, 
  COMPANY_OFFICIAL_INFO 
} from '@/types/officialContract';
import { generateContractClause1 } from '@/utils/contractGrammar';
import { encodeUtf8Base64 } from '@/utils/receiptEncoder';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';

interface OfficialContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<OfficialContractData>;
  initialRecord?: OfficialContractRecord | null;
  userRole?: string;
  sealSettings?: ContractSealSettings;
  onSubmitForSealing?: (data: OfficialContractData) => Promise<boolean>;
  onSealContractByManager?: (recordId: string, data: OfficialContractData) => Promise<boolean>;
  onSaveContract?: (data: OfficialContractData) => Promise<boolean>;
}

export const OfficialContractModal: React.FC<OfficialContractModalProps> = ({
  isOpen,
  onClose,
  initialData,
  initialRecord,
  userRole = 'admin',
  sealSettings,
  onSubmitForSealing,
  onSealContractByManager,
  onSaveContract
}) => {
  // Form State
  const [contractDate, setContractDate] = useState(
    initialRecord?.contractData?.contractDate || initialData?.contractDate || new Date().toISOString().split('T')[0]
  );
  const [approvalNumber, setApprovalNumber] = useState(
    initialRecord?.contractData?.approvalNumber || initialData?.approvalNumber || `APP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [serialNumber, setSerialNumber] = useState(
    initialRecord?.contractData?.serialNumber || initialData?.serialNumber || '0208'
  );
  const [secondPartyName, setSecondPartyName] = useState(
    initialRecord?.contractData?.secondPartyName || initialData?.secondPartyName || ''
  );
  const [containerCount, setContainerCount] = useState<number>(
    initialRecord?.contractData?.containerCount || initialData?.containerCount || 1
  );
  const [containerType, setContainerType] = useState(
    initialRecord?.contractData?.containerType || initialData?.containerType || 'حاوية مخلفات وأنقاض 20 ياردة'
  );
  const [phoneNumber, setPhoneNumber] = useState(
    initialRecord?.contractData?.phoneNumber || initialData?.phoneNumber || ''
  );
  const [plotNumber, setPlotNumber] = useState(
    initialRecord?.contractData?.plotNumber || initialData?.plotNumber || ''
  );
  const [planNumber, setPlanNumber] = useState(
    initialRecord?.contractData?.planNumber || initialData?.planNumber || ''
  );
  const [locationDescription, setLocationDescription] = useState(
    initialRecord?.contractData?.locationDescription || initialData?.locationDescription || ''
  );
  const [renovationLicenseYears, setRenovationLicenseYears] = useState<number>(
    initialRecord?.contractData?.renovationLicenseYears ?? initialData?.renovationLicenseYears ?? 1
  );
  const [buildingLicenseYears, setBuildingLicenseYears] = useState<number>(
    initialRecord?.contractData?.buildingLicenseYears ?? initialData?.buildingLicenseYears ?? 2
  );
  const [isSealed, setIsSealed] = useState<boolean>(
    initialRecord?.status === 'sealed' || initialRecord?.contractData?.isSealed || (userRole === 'admin' && (initialData?.isSealed ?? false))
  );

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>(
    initialRecord ? 'preview' : 'editor'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Sync when initialRecord changes
  useEffect(() => {
    if (initialRecord) {
      setContractDate(initialRecord.contractData.contractDate);
      setApprovalNumber(initialRecord.contractData.approvalNumber);
      setSerialNumber(initialRecord.contractData.serialNumber);
      setSecondPartyName(initialRecord.contractData.secondPartyName);
      setContainerCount(initialRecord.contractData.containerCount);
      setContainerType(initialRecord.contractData.containerType);
      setPhoneNumber(initialRecord.contractData.phoneNumber);
      setPlotNumber(initialRecord.contractData.plotNumber);
      setPlanNumber(initialRecord.contractData.planNumber);
      setLocationDescription(initialRecord.contractData.locationDescription);
      setRenovationLicenseYears(initialRecord.contractData.renovationLicenseYears);
      setBuildingLicenseYears(initialRecord.contractData.buildingLicenseYears);
      setIsSealed(initialRecord.status === 'sealed' || initialRecord.contractData.isSealed);
      setActiveTab('preview');
    }
  }, [initialRecord]);

  // Dynamic Clause 1
  const dynamicClause1 = generateContractClause1(renovationLicenseYears, buildingLicenseYears);

  // Build contract data object
  const getCurrentContractData = (): OfficialContractData => ({
    contractDate,
    approvalNumber,
    serialNumber,
    secondPartyName: secondPartyName.trim() || 'الطرف الثاني',
    containerCount,
    containerType,
    phoneNumber,
    plotNumber,
    planNumber,
    locationDescription,
    renovationLicenseYears,
    buildingLicenseYears,
    isSealed,
    sealedBy: isSealed ? (sealSettings?.managerName || 'المدير العام - شركة المحترز') : undefined,
    sealedAt: isSealed ? new Date().toISOString() : undefined,
    sealImageUrl: isSealed ? (sealSettings?.sealImageUrl || undefined) : undefined
  });

  // Print Handler
  const handlePrint = () => {
    if (!isSealed && userRole !== 'admin') {
      alert('عفواً: لا يمكن طباعة العقد قبل اعتماده وختمه رسمياً من المدير العام.');
      return;
    }

    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;

    const win = window.open('', '_blank', 'width=950,height=1100');
    if (!win) return;

    win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>عقد تأجير حاوية - ${approvalNumber}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Amiri:wght@400;700&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
  <style>
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
      background: #ffffff; 
      color: #0f172a; 
      width: 100%;
      height: 100%;
    }
    .a4-page {
      width: 210mm;
      min-height: 297mm;
      padding: 15mm 18mm;
      margin: 0 auto;
      background: #ffffff;
      position: relative;
    }
    @media print {
      @page {
        size: A4 portrait;
        margin: 10mm 12mm;
      }
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .a4-page {
        padding: 0 !important;
        width: 100% !important;
        min-height: auto !important;
      }
    }
  </style>
</head>
<body>
  <div class="a4-page">
    ${printContent}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`);
    win.document.close();
  };

  // Submit for Sealing (Employee Action)
  const handleSubmitForSealing = async () => {
    if (!secondPartyName.trim()) {
      alert('يرجى كتابة اسم الطرف الثاني (الجهة أو الشخص) قبل الإرسال للتوثيق.');
      return;
    }

    const data = getCurrentContractData();
    data.isSealed = false;

    setIsProcessing(true);
    if (onSubmitForSealing) {
      const success = await onSubmitForSealing(data);
      setIsProcessing(false);
      if (success) {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        onClose();
      }
    } else {
      setIsProcessing(false);
      alert('تم إرسال العقد بنجاح إلى مركز توثيق العقود بانتظار ختم المدير.');
      onClose();
    }
  };

  // Manager Direct Sealing Action (Floating Button Trigger)
  const handleManagerStampAndSeal = async () => {
    setIsSealed(true);
    const data = getCurrentContractData();
    data.isSealed = true;
    data.sealedBy = sealSettings?.managerName || 'أبو ماجد (المدير العام)';
    data.sealedAt = new Date().toISOString();
    data.sealImageUrl = sealSettings?.sealImageUrl || undefined;

    setIsProcessing(true);
    if (initialRecord?.id && onSealContractByManager) {
      await onSealContractByManager(initialRecord.id, data);
    } else if (onSaveContract) {
      await onSaveContract(data);
    } else if (onSubmitForSealing) {
      await onSubmitForSealing(data);
    }
    setIsProcessing(false);

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    setActiveTab('preview');
  };

  // Save modifications for already existing/sealed contracts
  const handleSaveExistingContract = async () => {
    if (!secondPartyName.trim()) {
      alert('يرجى كتابة اسم الطرف الثاني قبل الحفظ.');
      return;
    }
    const data = getCurrentContractData();
    setIsProcessing(true);
    if (initialRecord?.id && onSealContractByManager && isSealed) {
      await onSealContractByManager(initialRecord.id, data);
    } else if (onSaveContract) {
      await onSaveContract(data);
    } else if (onSubmitForSealing) {
      await onSubmitForSealing(data);
    }
    setIsProcessing(false);
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    alert('تم حفظ بيانات وتعديلات العقد بنجاح.');
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '1240px', 
          width: '96vw', 
          maxHeight: '94vh', 
          padding: '0', 
          display: 'flex', 
          flexDirection: 'column',
          background: '#0a0f1d',
          border: '1px solid rgba(220, 38, 38, 0.3)',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '16px 24px',
          background: 'linear-gradient(135deg, rgba(185, 28, 28, 0.25) 0%, rgba(15, 23, 42, 0.95) 100%)',
          borderBottom: '1px solid rgba(220, 38, 38, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #b91c1c, #dc2626)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)'
            }}>
              <FileCode2 size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  عقد رفع أنقاض موثق (A4)
                </h2>
                {isSealed ? (
                  <span style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    borderRadius: '8px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 900
                  }}>
                    ✓ موثق ومختوم رسمياً
                  </span>
                ) : (
                  <span style={{
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    borderRadius: '8px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 900
                  }}>
                    ⏳ بانتظار توثيق المدير
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: 0 }}>
                مطابق للنموذج المعتمد — توليد لغوي تلقائي للمدد وتوثيق إداري فوري
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.6)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeTab === 'editor' ? '#dc2626' : 'transparent',
                  color: activeTab === 'editor' ? '#ffffff' : '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ✏️ إدخال البيانات
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activeTab === 'preview' ? '#dc2626' : 'transparent',
                  color: activeTab === 'preview' ? '#ffffff' : '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                👁️ المعاينة المباشرة A4
              </button>
            </div>

            <button 
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#94a3b8',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: Split Screen */}
        <div 
          className="official-modal-split"
          style={{ 
            display: 'flex', 
            flex: 1, 
            overflow: 'hidden', 
            minHeight: '680px', 
            position: 'relative' 
          }}
        >
          <style>{`
            @media (max-width: 900px) {
              .official-modal-split {
                flex-direction: column !important;
                min-height: 0 !important;
                max-height: 82vh !important;
              }
              .official-editor-panel {
                display: ${activeTab === 'editor' ? 'flex' : 'none'} !important;
                width: 100% !important;
                max-width: 100% !important;
                flex: 1 1 auto !important;
                border-left: none !important;
                padding: 16px 14px !important;
              }
              .official-preview-panel {
                display: ${activeTab === 'preview' ? 'flex' : 'none'} !important;
                width: 100% !important;
                flex: 1 1 auto !important;
                padding: 12px 8px 110px 8px !important;
              }
              .official-a4-paper {
                padding: 14px 10px !important;
                min-height: auto !important;
                font-size: 0.78rem !important;
                border-radius: 6px !important;
              }
              .official-signature-row {
                flex-wrap: wrap !important;
                gap: 14px !important;
                justify-content: space-around !important;
              }
              .official-floating-seal-bar {
                position: fixed !important;
                bottom: 16px !important;
                left: 12px !important;
                right: 12px !important;
                transform: none !important;
                width: auto !important;
                max-width: 100% !important;
                padding: 10px 16px !important;
                justify-content: space-between !important;
              }
            }
          `}</style>
          
          {/* ── LEFT PANEL: Form Editor ── */}
          <div 
            className="official-editor-panel"
            style={{
              flex: activeTab === 'editor' ? '1 1 450px' : '0 0 380px',
              maxWidth: activeTab === 'editor' ? '100%' : '420px',
              padding: '20px 24px',
              overflowY: 'auto',
              borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              background: 'rgba(15, 23, 42, 0.4)'
            }}
          >

            {/* Section 1: بيانات العقد الرسمية */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(220, 38, 38, 0.2)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 800, fontSize: '0.86rem' }}>
                <Hash size={16} />
                <span>1. بيانات ترويسة العقد والرقم المرجعي</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    التاريخ:
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={contractDate}
                    onChange={(e) => setContractDate(e.target.value)}
                    style={{ height: '36px', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    الرقم التسلسلي (الأحمر):
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="0208"
                    style={{ height: '36px', fontSize: '0.82rem', color: '#ef4444', fontWeight: 800 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                  رقم الموافقة / الترخيص:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={approvalNumber}
                  onChange={(e) => setApprovalNumber(e.target.value)}
                  placeholder="مثال: APP-2026-8812 أو رقم موافقة البلدية"
                  style={{ height: '36px', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#e2e8f0', marginBottom: '4px', fontWeight: 800 }}>
                  اسم الطرف الثاني (الجهة أو الشخص):
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={secondPartyName}
                  onChange={(e) => setSecondPartyName(e.target.value)}
                  placeholder="اسم الشخص أو اسم المؤسسة / الجهة الحكومية"
                  style={{ height: '38px', fontSize: '0.88rem', borderColor: 'rgba(220, 38, 38, 0.4)', fontWeight: 700 }}
                  required
                />
              </div>
            </div>

            {/* Section 2: بيانات الحاوية والموقع */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 800, fontSize: '0.86rem' }}>
                <Truck size={16} />
                <span>2. بيانات الحاوية والموقع (الجدول)</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    عدد الحاويات:
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={containerCount}
                    onChange={(e) => setContainerCount(Math.max(1, Number(e.target.value)))}
                    style={{ height: '36px', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    رقم الجوال (اختياري):
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="05XXXXXXXX"
                    style={{ height: '36px', fontSize: '0.82rem', direction: 'ltr', textAlign: 'right' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                  نوع الحاوية:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={containerType}
                  onChange={(e) => setContainerType(e.target.value)}
                  placeholder="حاوية مخلفات وأنقاض 20 ياردة"
                  style={{ height: '36px', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    رقم القطعة:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={plotNumber}
                    onChange={(e) => setPlotNumber(e.target.value)}
                    placeholder="مثال: 140 / أ"
                    style={{ height: '36px', fontSize: '0.82rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    رقم المخطط:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={planNumber}
                    onChange={(e) => setPlanNumber(e.target.value)}
                    placeholder="مثال: 1258 / ج"
                    style={{ height: '36px', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                  وصف الموقع التفصيلي (الحي / الشارع):
                </label>
                <textarea
                  className="form-input"
                  value={locationDescription}
                  onChange={(e) => setLocationDescription(e.target.value)}
                  placeholder="مثال: حي الشفاء — بجوار مدرسة اليرموك — شارع 20"
                  style={{ height: '54px', fontSize: '0.82rem', resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Section 3: مدة الرخص */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '12px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontWeight: 800, fontSize: '0.86rem' }}>
                <Sparkles size={16} />
                <span>3. مدة رخص البناء والترميم (البند الأول الذكي)</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    سنوات رخصة الترميم:
                  </label>
                  <select
                    className="form-select"
                    value={renovationLicenseYears}
                    onChange={(e) => setRenovationLicenseYears(Number(e.target.value))}
                    style={{ height: '36px', fontSize: '0.82rem' }}
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(y => (
                      <option key={y} value={y}>{y === 0 ? 'بدون رخصة ترميم' : `${y} (${y === 1 ? 'سنة' : y === 2 ? 'سنتان' : `${y} سنوات`})`}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    سنوات رخصة البناء:
                  </label>
                  <select
                    className="form-select"
                    value={buildingLicenseYears}
                    onChange={(e) => setBuildingLicenseYears(Number(e.target.value))}
                    style={{ height: '36px', fontSize: '0.82rem' }}
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(y => (
                      <option key={y} value={y}>{y === 0 ? 'بدون رخصة بناء' : `${y} (${y === 1 ? 'سنة' : y === 2 ? 'سنتان' : `${y} سنوات`})`}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 4: حالة التوثيق والختم */}
            <div style={{
              background: isSealed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              border: `1px solid ${isSealed ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Stamp size={20} color={isSealed ? '#34d399' : '#fbbf24'} />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff' }}>
                    {isSealed ? 'العقد موثق ومختوم رسمياً ✓' : 'العقد بانتظار توثيق المدير ⏳'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    {isSealed ? `اعتمد بواسطة: ${sealSettings?.managerName || 'المدير العام'}` : 'يجب إرساله لمركز التوثيق لوضع الختم الرسمي'}
                  </div>
                </div>
              </div>
            </div>

            {/* Editor Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ flex: '1 1 120px', padding: '10px', fontSize: '0.82rem', fontWeight: 800, justifyContent: 'center' }}
                onClick={() => setActiveTab('preview')}
              >
                <Eye size={16} />
                <span>معاينة A4</span>
              </button>

              {!isSealed && userRole === 'admin' && (
                <>
                  <button
                    type="button"
                    onClick={handleSubmitForSealing}
                    disabled={isProcessing}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      background: 'rgba(245, 158, 11, 0.12)',
                      color: '#fbbf24',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Send size={15} />
                    <span>مسودة</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleManagerStampAndSeal}
                    disabled={isProcessing}
                    style={{
                      flex: '1 1 150px',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #b91c1c, #dc2626)',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: 900,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)'
                    }}
                  >
                    <ShieldCheck size={16} />
                    <span>{isProcessing ? 'جارٍ الختم...' : 'اعتماد وختم العقد 🔖'}</span>
                  </button>
                </>
              )}

              {!isSealed && userRole !== 'admin' && (
                <button
                  type="button"
                  onClick={handleSubmitForSealing}
                  disabled={isProcessing}
                  style={{
                    flex: '1 1 180px',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#050811',
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 15px rgba(245, 158, 11, 0.35)'
                  }}
                >
                  <Send size={16} />
                  <span>{isProcessing ? 'جارٍ الإرسال...' : 'حفظ وإرسال للتوثيق الإداري 📤'}</span>
                </button>
              )}

              {isSealed && (
                <button
                  type="button"
                  onClick={handleSaveExistingContract}
                  disabled={isProcessing}
                  style={{
                    flex: '1 1 150px',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{isProcessing ? 'جارٍ الحفظ...' : 'حفظ التعديلات 💾'}</span>
                </button>
              )}
            </div>

          </div>

          {/* ── RIGHT PANEL: Live A4 Visual Canvas ── */}
          <div 
            className="official-preview-panel"
            style={{
              flex: activeTab === 'preview' ? '1 1 100%' : '1 1 650px',
              display: 'flex',
              flexDirection: 'column',
              background: '#1e293b',
              overflowY: 'auto',
              padding: '24px 24px 100px 24px', // Extra bottom padding for floating button
              alignItems: 'center',
              position: 'relative'
            }}
          >

            {/* Toolbar above preview */}
            <div style={{
              width: '100%',
              maxWidth: '800px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              background: 'rgba(15, 23, 42, 0.8)',
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 700 }}>
                <span>📜 ورقة العقد الرسمية (A4 Portrait - 300 DPI Vector)</span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={!isSealed && userRole !== 'admin'}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: isSealed ? '1px solid #dc2626' : '1px solid #64748b',
                    background: isSealed ? 'linear-gradient(135deg, #b91c1c, #dc2626)' : 'rgba(255, 255, 255, 0.1)',
                    color: isSealed ? '#ffffff' : '#94a3b8',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: isSealed || userRole === 'admin' ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: isSealed ? '0 2px 8px rgba(220, 38, 38, 0.4)' : 'none'
                  }}
                  title={!isSealed ? 'تتطلب الطباعة اعتماد وختم المدير أولاً' : 'طباعة أو حفظ PDF'}
                >
                  <Printer size={15} />
                  <span>{isSealed ? 'طباعة أو حفظ PDF' : 'طباعة (بانتظار الختم 🔒)'}</span>
                </button>
              </div>
            </div>

            {/* ── THE A4 PAPER DOCUMENT ── */}
            <div 
              ref={printRef}
              className="official-a4-paper"
              style={{
                width: '100%',
                maxWidth: '780px',
                minHeight: '1040px',
                background: '#ffffff',
                color: '#0f172a',
                padding: '28px 34px',
                borderRadius: '4px',
                boxShadow: '0 12px 35px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                fontFamily: "'Cairo', 'Tajawal', sans-serif",
                position: 'relative'
              }}
            >
              <div>

                {/* ── 1. HEADER ── */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  paddingBottom: '12px'
                }}>
                  {/* Right Header */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#dc2626', lineHeight: 1.1 }}>
                      شركة
                    </div>
                    <div style={{ fontSize: '1.12rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                      {COMPANY_OFFICIAL_INFO.nameArabic}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginTop: '1px' }}>
                      {COMPANY_OFFICIAL_INFO.activity}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginTop: '1px' }}>
                      س.ت: <span style={{ fontFamily: 'sans-serif' }}>{COMPANY_OFFICIAL_INFO.crNumber}</span>
                    </div>
                  </div>

                  {/* Center Header: Logo & English */}
                  <div style={{ textAlign: 'center', paddingTop: '2px' }}>
                    <div style={{
                      width: '64px',
                      height: '48px',
                      margin: '0 auto 4px auto',
                      background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      boxShadow: '0 4px 10px rgba(220, 38, 38, 0.35)',
                      border: '1.5px solid #7f1d1d'
                    }}>
                      <Truck size={30} strokeWidth={2.2} />
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#dc2626', letterSpacing: '2px', fontFamily: 'sans-serif' }}>
                      {COMPANY_OFFICIAL_INFO.nameEnglish}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginTop: '1px' }}>
                      {COMPANY_OFFICIAL_INFO.subNameArabic}
                    </div>
                  </div>

                  {/* Left Header */}
                  <div style={{ textAlign: 'left', direction: 'ltr', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700, width: '100%', textAlign: 'right', direction: 'rtl' }}>
                      <span style={{ color: '#475569' }}>التاريخ: </span>
                      <strong>{contractDate || '-'} م</strong>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: 700, width: '100%', textAlign: 'right', direction: 'rtl', marginTop: '2px' }}>
                      <span style={{ color: '#475569' }}>رقم الموافقة: </span>
                      <strong>{approvalNumber || '-'}</strong>
                    </div>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: 900,
                      color: '#dc2626',
                      marginTop: '6px',
                      letterSpacing: '3px',
                      fontFamily: 'sans-serif',
                      textAlign: 'center',
                      width: '100%'
                    }}>
                      {serialNumber || '0208'}
                    </div>
                  </div>
                </div>

                {/* ── 2. CONTRACT TITLE ── */}
                <div style={{ textAlign: 'center', margin: '10px 0 14px 0' }}>
                  <h1 style={{
                    fontSize: '1.45rem',
                    fontWeight: 900,
                    color: '#0f172a',
                    display: 'inline-block',
                    padding: '0 12px'
                  }}>
                    عقد تأجير حاوية
                  </h1>
                  <div style={{ width: '220px', height: '2px', background: '#dc2626', margin: '4px auto 2px auto' }} />
                  <div style={{ width: '170px', height: '1px', background: '#dc2626', margin: '0 auto' }} />
                </div>

                {/* ── 3. PARTIES ── */}
                <div style={{
                  fontSize: '0.92rem',
                  lineHeight: 1.8,
                  marginBottom: '10px',
                  color: '#0f172a'
                }}>
                  <div style={{ fontWeight: 800 }}>
                    <span style={{ color: '#dc2626' }}>الطرف الأول: </span>
                    <span>{COMPANY_OFFICIAL_INFO.nameArabic} ({COMPANY_OFFICIAL_INFO.subNameArabic})</span>
                  </div>
                  <div style={{ fontWeight: 800, marginTop: '2px' }}>
                    <span style={{ color: '#dc2626' }}>الطرف الثاني: </span>
                    <span style={{ borderBottom: '1px dashed #94a3b8', paddingBottom: '1px', color: '#0f172a' }}>
                      {secondPartyName || '...........................................................................................'}
                    </span>
                  </div>
                </div>

                {/* ── 4. CONTAINER & SITE DATA TABLE (4 Columns) ── */}
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  marginBottom: '12px',
                  border: '2px solid #dc2626',
                  fontSize: '0.85rem'
                }}>
                  <thead>
                    <tr style={{ background: '#fef2f2', borderBottom: '2px solid #dc2626' }}>
                      <th style={{ padding: '7px 8px', borderLeft: '1.5px solid #dc2626', width: '14%', textAlign: 'center', fontWeight: 900, color: '#991b1b' }}>
                        عدد الحاويات
                      </th>
                      <th style={{ padding: '7px 8px', borderLeft: '1.5px solid #dc2626', width: '24%', textAlign: 'center', fontWeight: 900, color: '#991b1b' }}>
                        النوع
                      </th>
                      <th style={{ padding: '7px 8px', borderLeft: '1.5px solid #dc2626', width: '20%', textAlign: 'center', fontWeight: 900, color: '#991b1b' }}>
                        الجوال
                      </th>
                      <th style={{ padding: '7px 8px', width: '42%', textAlign: 'center', fontWeight: 900, color: '#991b1b' }}>
                        وصف الموقع
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '10px 8px', borderLeft: '1.5px solid #dc2626', textAlign: 'center', fontWeight: 800, fontSize: '1rem' }}>
                        {containerCount}
                      </td>

                      <td style={{ padding: '10px 8px', borderLeft: '1.5px solid #dc2626', textAlign: 'center', fontWeight: 700 }}>
                        {containerType || 'أنقاض 20 ياردة'}
                      </td>

                      <td style={{ padding: '10px 8px', borderLeft: '1.5px solid #dc2626', textAlign: 'center', fontWeight: 700, direction: 'ltr' }}>
                        {phoneNumber || '-'}
                      </td>

                      <td style={{ padding: '8px 10px', lineHeight: 1.6, fontWeight: 700 }}>
                        <div>1- رقم القطعة: <strong style={{ color: '#0f172a' }}>{plotNumber || '—'}</strong></div>
                        <div>2- رقم المخطط: <strong style={{ color: '#0f172a' }}>{planNumber || '—'}</strong></div>
                        {locationDescription && (
                          <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '2px' }}>
                            {locationDescription}
                          </div>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* ── 5. PLEDGE BOX ── */}
                <div style={{
                  border: '2px solid #dc2626',
                  borderRadius: '4px',
                  padding: '7px 12px',
                  marginBottom: '12px',
                  background: '#ffffff',
                  textAlign: 'center',
                  fontWeight: 900,
                  fontSize: '0.83rem',
                  color: '#991b1b',
                  lineHeight: 1.4
                }}>
                  {CONTRACT_PLEDGE_TEXT}
                </div>

                {/* ── 6. TERMS AND CONDITIONS (البنود من 1 إلى 8) ── */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#dc2626', marginBottom: '4px' }}>
                    شروط العقد:
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.80rem', lineHeight: 1.45, color: '#1e293b' }}>
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

              </div>

              {/* ── 7. SIGNATURES & STAMPS (Bottom section) ── */}
              <div>
                <div 
                  className="official-signature-row"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: '12px 16px 6px 16px',
                    marginTop: '10px'
                  }}
                >
                  {/* الطرف الأول (يمين) - مكان الختم والتوقيع الرسمي */}
                  <div style={{ textAlign: 'center', width: '220px', position: 'relative' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#dc2626' }}>
                      الطرف الأول
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                      {COMPANY_OFFICIAL_INFO.nameArabic}
                    </div>

                    {/* Official Stamp Rendering */}
                    {isSealed ? (
                      <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'center' }}>
                        {sealSettings?.sealImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={sealSettings.sealImageUrl}
                            alt="Official Stamp"
                            style={{
                              width: '95px',
                              height: '95px',
                              objectFit: 'contain',
                              transform: 'rotate(-4deg)'
                            }}
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
                      <div style={{
                        height: '80px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94a3b8',
                        fontSize: '0.75rem',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '8px',
                        marginTop: '6px',
                        background: '#f8fafc'
                      }}>
                        <Lock size={16} color="#94a3b8" />
                        <span style={{ marginTop: '2px' }}>(بانتظار ختم واعتماد المدير)</span>
                      </div>
                    )}
                  </div>

                  {/* رمز الـ QR للتوثيق والتحقق الإلكتروني (في المنتصف) - يصدر فقط بعد الختم */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '0 8px',
                    minWidth: '120px'
                  }}>
                    {isSealed ? (
                      <>
                        <div style={{
                          padding: '3px',
                          background: '#ffffff',
                          border: '1.5px solid #dc2626',
                          borderRadius: '8px',
                          boxShadow: '0 2px 8px rgba(220, 38, 38, 0.15)',
                          display: 'inline-flex'
                        }}>
                          {(() => {
                            const payload = {
                              type: 'official_contract',
                              approvalNumber,
                              serialNumber,
                              contractDate,
                              secondPartyName: secondPartyName.trim() || 'الطرف الثاني',
                              containerCount,
                              containerType: containerType || 'أنقاض 20 ياردة',
                              phoneNumber: phoneNumber || '',
                              plotNumber: plotNumber || '',
                              planNumber: planNumber || '',
                              locationDescription: locationDescription || '',
                              renovationLicenseYears,
                              buildingLicenseYears,
                              isSealed: true,
                              sealedBy: sealSettings?.managerName || 'المدير العام',
                              sealedAt: initialRecord?.sealedAt || new Date().toISOString(),
                              sealImageUrl: sealSettings?.sealImageUrl || undefined,
                              timestamp: new Date().toISOString()
                            };
                            const encoded = encodeUtf8Base64(payload);
                            const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://al-muhtaraz.vercel.app';
                            const verifyUrl = `${origin}/receipt/${encodeURIComponent(approvalNumber || serialNumber || '0208')}?d=${encoded}&type=official`;

                            return (
                              <QRCodeSVG
                                value={verifyUrl}
                                size={78}
                                level="M"
                                includeMargin={true}
                                fgColor="#000000"
                                bgColor="#ffffff"
                              />
                            );
                          })()}
                        </div>
                        <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#dc2626', marginTop: '4px', letterSpacing: '0.2px' }}>
                          رمز التوثيق الإلكتروني
                        </div>
                        <div style={{ fontSize: '0.54rem', fontWeight: 700, color: '#059669' }}>
                          معتمد ومختوم رسمياً ✓
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{
                          width: '84px',
                          height: '84px',
                          padding: '6px',
                          background: '#f8fafc',
                          border: '1.5px dashed #cbd5e1',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94a3b8'
                        }}>
                          <Lock size={20} color="#94a3b8" />
                          <span style={{ fontSize: '0.50rem', fontWeight: 700, marginTop: '4px', textAlign: 'center', lineHeight: 1.2 }}>
                            بانتظار الختم
                          </span>
                        </div>
                        <div style={{ fontSize: '0.60rem', fontWeight: 800, color: '#64748b', marginTop: '4px' }}>
                          رمز التوثيق
                        </div>
                        <div style={{ fontSize: '0.50rem', fontWeight: 600, color: '#94a3b8' }}>
                          يصدر فور ختم المدير
                        </div>
                      </>
                    )}
                  </div>

                  {/* الطرف الثاني (يسار) */}
                  <div style={{ textAlign: 'center', width: '220px' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#dc2626' }}>
                      الطرف الثاني
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                      {secondPartyName || '........................................'}
                    </div>

                    <div style={{ height: '70px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', color: '#64748b', fontSize: '0.75rem', borderBottom: '1px dotted #94a3b8', margin: '10px auto 0 auto', width: '160px' }}>
                      التوقيع / الختم
                    </div>
                  </div>
                </div>

                {/* ── 8. FOOTER BAR ── */}
                <div style={{ marginTop: '10px' }}>
                  <div style={{ height: '2px', background: '#dc2626', width: '100%', marginBottom: '6px' }} />
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#475569',
                    flexWrap: 'wrap',
                    gap: '4px'
                  }}>
                    <div>{COMPANY_OFFICIAL_INFO.address}</div>
                    <div style={{ direction: 'ltr' }}>جوال: <strong style={{ color: '#0f172a' }}>{COMPANY_OFFICIAL_INFO.phone}</strong></div>
                    <div>{COMPANY_OFFICIAL_INFO.email}</div>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* ── 🌟 FIXED MODAL ACTION FOOTER BAR (شريط الإجراءات والحفظ السفلي الثابت) ── */}
        <div style={{
          padding: '12px 24px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(20, 27, 45, 0.98))',
          borderTop: '1px solid rgba(220, 38, 38, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          zIndex: 110
        }}>
          {/* Status Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: isSealed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isSealed ? '#34d399' : '#fbbf24'
            }}>
              {isSealed ? <CheckCircle2 size={20} /> : <Stamp size={20} />}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: isSealed ? '#34d399' : '#fbbf24' }}>
                {isSealed ? 'عقد موثق ومختوم رسمياً ✓' : 'عقد بانتظار الختم والاعتماد ⏳'}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                رقم الموافقة: {approvalNumber} | السيريال: {serialNumber}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Toggle View Button */}
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'editor' ? 'preview' : 'editor')}
              style={{
                padding: '9px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(255, 255, 255, 0.06)',
                color: '#e2e8f0',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {activeTab === 'editor' ? <Eye size={15} /> : <FileText size={15} />}
              <span>{activeTab === 'editor' ? 'معاينة A4' : 'تعديل البيانات'}</span>
            </button>

            {/* Print Button (if sealed) */}
            {isSealed && (
              <button
                type="button"
                onClick={handlePrint}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)'
                }}
              >
                <Printer size={15} />
                <span>طباعة أو حفظ PDF</span>
              </button>
            )}

            {/* If Sealed: Save Modifications */}
            {isSealed && (
              <button
                type="button"
                onClick={handleSaveExistingContract}
                disabled={isProcessing}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                }}
              >
                <CheckCircle2 size={15} />
                <span>{isProcessing ? 'جارٍ الحفظ...' : 'حفظ التعديلات 💾'}</span>
              </button>
            )}

            {/* If NOT sealed & Employee: Submit for Sealing */}
            {!isSealed && userRole !== 'admin' && (
              <button
                type="button"
                onClick={handleSubmitForSealing}
                disabled={isProcessing}
                style={{
                  padding: '9px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#050811',
                  fontSize: '0.88rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)'
                }}
              >
                <Send size={16} />
                <span>{isProcessing ? 'جارٍ الإرسال...' : 'حفظ وإرسال للتوثيق الإداري 📤'}</span>
              </button>
            )}

            {/* If NOT sealed & Admin: Direct Stamp & Seal OR Save Draft */}
            {!isSealed && userRole === 'admin' && (
              <>
                <button
                  type="button"
                  onClick={handleSubmitForSealing}
                  disabled={isProcessing}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    background: 'rgba(245, 158, 11, 0.1)',
                    color: '#fbbf24',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Send size={15} />
                  <span>حفظ كمسودة 📤</span>
                </button>

                <button
                  type="button"
                  onClick={handleManagerStampAndSeal}
                  disabled={isProcessing}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #b91c1c, #dc2626)',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 18px rgba(220, 38, 38, 0.5)'
                  }}
                >
                  <ShieldCheck size={16} />
                  <span>{isProcessing ? 'جارٍ الختم والتوثيق...' : 'اعتماد وختم العقد رسمياً 🔖'}</span>
                </button>
              </>
            )}

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#94a3b8',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              إلغاء
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
