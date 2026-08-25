'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Stamp, 
  ShieldCheck, 
  Upload, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Printer, 
  Share2, 
  Search, 
  Trash2, 
  Eye, 
  Sparkles, 
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  Smartphone
} from 'lucide-react';
import { 
  OfficialContractRecord, 
  ContractSealSettings, 
  COMPANY_OFFICIAL_INFO 
} from '@/types/officialContract';
import { UserRole } from '@/types/database';
import confetti from 'canvas-confetti';

interface ContractAuthenticationHubProps {
  currentRole: UserRole;
  contracts: OfficialContractRecord[];
  onOpenContractForSealing: (record: OfficialContractRecord) => void;
  onPrintContract: (record: OfficialContractRecord) => void;
  onSendContractWhatsApp: (record: OfficialContractRecord) => void;
  onDeleteContractRecord?: (id: string) => void;
  sealSettings: ContractSealSettings;
  onSaveSealSettings: (settings: ContractSealSettings) => void;
}

export const ContractAuthenticationHub: React.FC<ContractAuthenticationHubProps> = ({
  currentRole,
  contracts,
  onOpenContractForSealing,
  onPrintContract,
  onSendContractWhatsApp,
  onDeleteContractRecord,
  sealSettings,
  onSaveSealSettings
}) => {
  const [sealPreview, setSealPreview] = useState<string | null>(sealSettings?.sealImageUrl || null);
  const [managerName, setManagerName] = useState<string>(sealSettings?.managerName || 'أبو ماجد (المدير العام)');
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'sealed'>('pending');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sealSettings?.sealImageUrl) {
      setSealPreview(sealSettings.sealImageUrl);
    }
  }, [sealSettings]);

  // Handle Seal Upload
  const handleSealFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة صالح (PNG أو JPG أو SVG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSealPreview(base64);
      onSaveSealSettings({
        sealImageUrl: base64,
        managerName,
        updatedAt: new Date().toISOString()
      });
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveManagerName = () => {
    onSaveSealSettings({
      sealImageUrl: sealPreview,
      managerName,
      updatedAt: new Date().toISOString()
    });
    alert('تم حفظ بيانات الاعتماد والختم بنجاح.');
  };

  // Filtered lists
  const pendingContracts = contracts.filter(c => c.status === 'pending_seal');
  const sealedContracts = contracts.filter(c => c.status === 'sealed').filter(c => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.contractData.secondPartyName?.toLowerCase().includes(term) ||
      c.contractData.serialNumber?.toLowerCase().includes(term) ||
      c.contractData.approvalNumber?.toLowerCase().includes(term) ||
      c.contractData.plotNumber?.toLowerCase().includes(term)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ── 1. MAIN HEADER & STATS ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #dc2626, #991b1b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)'
            }}>
              <Stamp size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                مركز توثيق العقود والختم الإلكتروني الإداري
              </h2>
              <p style={{ fontSize: '0.86rem', color: '#94a3b8', margin: 0 }}>
                اعتماد وتوثيق عقود رفع الأنقاض الرسمية وتثبيت الختم المعتمد للمدير العام
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{
            background: pendingContracts.length > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${pendingContracts.length > 0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '14px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Clock size={20} color={pendingContracts.length > 0 ? '#fbbf24' : '#94a3b8'} />
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>بحاجة إلى توثيق</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: pendingContracts.length > 0 ? '#fbbf24' : '#ffffff' }}>
                {pendingContracts.length} عقد
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '14px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <ShieldCheck size={20} color="#34d399" />
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>العقود الموثقة</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#34d399' }}>
                {sealedContracts.length} عقد
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. MANAGER SEAL SETUP CARD (لوحة إدارة الختم الإلكتروني للمدير) ── */}
      {currentRole === 'admin' && (
        <div className="glass-panel" style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(220, 38, 38, 0.3)',
          borderRadius: '18px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
            
            {/* Left Info: Seal Management */}
            <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', fontWeight: 800, fontSize: '0.95rem' }}>
                <Stamp size={18} />
                <span>إعداد الختم والتوقيع الرسمي للمؤسسة</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                ارفع صورة الختم الرسمي وتوقيع المدير العام (بصيغة PNG شفاف أو بخلفية بيضاء). سيتم دمجه تلقائياً في خانة الطرف الأول فور اعتماد وتوثيق أي عقد.
              </p>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
                <input
                  type="text"
                  className="form-input"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="اسم المعتمد / المدير العام"
                  style={{ maxWidth: '280px', height: '38px', fontSize: '0.85rem' }}
                />
                <button
                  type="button"
                  onClick={handleSaveManagerName}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: 800 }}
                >
                  حفظ الاسم
                </button>
              </div>
            </div>

            {/* Right: Upload Box & Preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleSealFileChange}
                accept="image/*"
                style={{ display: 'none' }}
              />

              {/* Upload Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed rgba(220, 38, 38, 0.4)',
                  borderRadius: '14px',
                  padding: '14px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'rgba(15, 23, 42, 0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  minWidth: '200px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Upload size={22} color="#f87171" />
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ffffff' }}>
                  {sealPreview ? 'تغيير صورة الختم' : 'رفع صورة الختم الرسمي'}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  PNG شفاف / JPG
                </span>
              </div>

              {/* Live Seal Preview Circle */}
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                border: '2px solid #dc2626',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 4px 15px rgba(220, 38, 38, 0.25)',
                position: 'relative'
              }}>
                {sealPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sealPreview}
                    alt="Official Seal"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626',
                    textAlign: 'center',
                    padding: '6px'
                  }}>
                    <ShieldCheck size={26} strokeWidth={2.4} />
                    <span style={{ fontSize: '0.55rem', fontWeight: 900, marginTop: '2px' }}>ختم افتراضي</span>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ── 3. TABS SWITCHER (Pending vs Sealed) ── */}
      <div style={{
        display: 'flex',
        gap: '12px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '12px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'pending' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'pending' ? '#050811' : '#94a3b8',
            fontSize: '0.9rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: activeTab === 'pending' ? '0 4px 15px rgba(245, 158, 11, 0.35)' : 'none'
          }}
        >
          <Clock size={17} />
          <span>عقود بحاجة إلى توثيق</span>
          {pendingContracts.length > 0 && (
            <span style={{
              background: activeTab === 'pending' ? '#050811' : '#f59e0b',
              color: activeTab === 'pending' ? '#f59e0b' : '#050811',
              borderRadius: '20px',
              padding: '2px 8px',
              fontSize: '0.75rem',
              fontWeight: 900
            }}>
              {pendingContracts.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sealed')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'sealed' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255, 255, 255, 0.05)',
            color: activeTab === 'sealed' ? '#ffffff' : '#94a3b8',
            fontSize: '0.9rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: activeTab === 'sealed' ? '0 4px 15px rgba(16, 185, 129, 0.35)' : 'none'
          }}
        >
          <CheckCircle2 size={17} />
          <span>العقود الموثقة المعتمدة ({sealedContracts.length})</span>
        </button>
      </div>

      {/* ── 4. CONTENT VIEW ── */}

      {/* TAB A: PENDING REVIEW QUEUE */}
      {activeTab === 'pending' && (
        <div>
          {pendingContracts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: '18px',
              border: '1px dashed rgba(255, 255, 255, 0.1)'
            }}>
              <CheckCircle2 size={48} color="#34d399" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
                لا توجد عقود بحاجة إلى توثيق حالياً
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '400px', margin: '0 auto' }}>
                جميع العقود المنشأة تم اعتمادها وختمها رسمياً أو لم يتم رفع عقود جديدة بعد.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {pendingContracts.map((record) => (
                <div
                  key={record.id}
                  className="glass-panel"
                  style={{
                    padding: '18px',
                    borderRadius: '16px',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px'
                  }}
                >
                  <div>
                    {/* Card Header: Serial & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '8px',
                        padding: '3px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 900
                      }}>
                        الرقم: {record.contractData.serialNumber || '0208'}
                      </span>

                      <span style={{
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#fbbf24',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '8px',
                        padding: '3px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <Clock size={13} />
                        <span>بانتظار ختم المدير</span>
                      </span>
                    </div>

                    {/* Party & Details */}
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', marginBottom: '6px' }}>
                      {record.contractData.secondPartyName || 'الطرف الثاني'}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div>رقم الموافقة: <strong style={{ color: '#e2e8f0' }}>{record.contractData.approvalNumber || '-'}</strong></div>
                      <div>رقم القطعة / المخطط: <strong style={{ color: '#e2e8f0' }}>{record.contractData.plotNumber || '-'} / {record.contractData.planNumber || '-'}</strong></div>
                      <div>أنشئ بواسطة: <strong style={{ color: '#38bdf8' }}>{record.createdBy || 'الموظف'}</strong> في {new Date(record.createdAt).toLocaleDateString('ar-SA')}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <button
                      type="button"
                      onClick={() => onOpenContractForSealing(record)}
                      style={{
                        flex: 1,
                        padding: '9px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #b91c1c, #dc2626)',
                        color: '#ffffff',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)'
                      }}
                    >
                      <Stamp size={16} />
                      <span>{currentRole === 'admin' ? 'معاينة ووضع الختم الرسمي 🔖' : 'معاينة تفاصيل العقد 👁️'}</span>
                    </button>

                    {onDeleteContractRecord && currentRole === 'admin' && (
                      <button
                        type="button"
                        onClick={() => onDeleteContractRecord(record.id)}
                        style={{
                          padding: '8px',
                          borderRadius: '10px',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#f87171',
                          cursor: 'pointer'
                        }}
                        title="حذف السجل"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB B: AUTHENTICATED & SEALED CONTRACTS ARCHIVE */}
      {activeTab === 'sealed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Search bar */}
          <div style={{ position: 'relative', maxWidth: '420px' }}>
            <input
              type="text"
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="البحث باسم الجهة، الرقم التسلسلي، أو رقم المخطط..."
              style={{ paddingRight: '36px', height: '40px', fontSize: '0.85rem' }}
            />
            <Search size={17} style={{ position: 'absolute', right: '12px', top: '12px', color: '#94a3b8' }} />
          </div>

          {sealedContracts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '50px 20px',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: '18px',
              border: '1px dashed rgba(255, 255, 255, 0.1)'
            }}>
              <FileText size={40} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
                لا توجد عقود موثقة مطابقة للبحث
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                العقود التي يتم اعتمادها وختمها ستظهر هنا جاهزة للطباعة والإرسال.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {sealedContracts.map((record) => (
                <div
                  key={record.id}
                  className="glass-panel"
                  style={{
                    padding: '18px',
                    borderRadius: '16px',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px'
                  }}
                >
                  <div>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{
                        background: 'rgba(220, 38, 38, 0.15)',
                        color: '#f87171',
                        border: '1px solid rgba(220, 38, 38, 0.3)',
                        borderRadius: '8px',
                        padding: '3px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 900
                      }}>
                        الرقم: {record.contractData.serialNumber || '0208'}
                      </span>

                      <span style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '8px',
                        padding: '3px 10px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <ShieldCheck size={14} />
                        <span>موثق ومختوم رسمياً ✓</span>
                      </span>
                    </div>

                    {/* Party & Details */}
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff', marginBottom: '6px' }}>
                      {record.contractData.secondPartyName || 'الطرف الثاني'}
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div>رقم الموافقة: <strong style={{ color: '#e2e8f0' }}>{record.contractData.approvalNumber || '-'}</strong></div>
                      <div>رقم القطعة / المخطط: <strong style={{ color: '#e2e8f0' }}>{record.contractData.plotNumber || '-'} / {record.contractData.planNumber || '-'}</strong></div>
                      <div>اعتمد بواسطة: <strong style={{ color: '#34d399' }}>{record.sealedBy || 'المدير العام'}</strong> في {record.sealedAt ? new Date(record.sealedAt).toLocaleDateString('ar-SA') : '-'}</div>
                    </div>
                  </div>

                  {/* Action Buttons: Print & WhatsApp */}
                  <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <button
                      type="button"
                      onClick={() => onPrintContract(record)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid #dc2626',
                        background: 'linear-gradient(135deg, #b91c1c, #dc2626)',
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <Printer size={15} />
                      <span>طباعة A4 PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenContractForSealing(record)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        background: 'rgba(15, 23, 42, 0.6)',
                        color: '#cbd5e1',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="معاينة العقد"
                    >
                      <Eye size={15} />
                      <span>معاينة</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
