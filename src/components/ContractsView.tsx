'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  MapPin, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  MessageCircle, 
  Calendar,
  AlertTriangle,
  Trash2,
  Phone,
  DollarSign,
  CreditCard,
  Banknote,
  Receipt as ReceiptIcon,
  Truck,
  UserCheck,
  RotateCw
} from 'lucide-react';
import { Contract, ContractStatus, UserRole, PaymentSettings, StaffPermissions } from '@/types/database';

interface ContractsViewProps {
  contracts: Contract[];
  userRole: UserRole;
  paymentSettings: PaymentSettings;
  permissions?: StaffPermissions;
  onUpdateContractStatus: (contractId: string, status: ContractStatus) => Promise<void>;
  onDeleteContract: (contractId: string) => Promise<void>;
  onSendWhatsApp: (phone: string, message: string) => void;
  onOpenReceipt: (contract: Contract) => void;
  onOpenExtendModal: (contract: Contract) => void;
  onOpenDriverDispatch?: (contract: Contract) => void;
  onConfirmCashPayment: (contract: Contract) => Promise<void>;
  onSendSadadLink: (contract: Contract) => Promise<void>;
}

export const ContractsView: React.FC<ContractsViewProps> = ({
  contracts,
  userRole,
  paymentSettings,
  permissions,
  onUpdateContractStatus,
  onDeleteContract,
  onSendWhatsApp,
  onOpenReceipt,
  onOpenExtendModal,
  onOpenDriverDispatch,
  onConfirmCashPayment,
  onSendSadadLink
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'commercial' | 'debris'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | ContractStatus>('all');
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  const filteredContracts = contracts.filter(c => {
    if (filterType !== 'all' && c.contract_type !== filterType) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (!searchTerm.trim()) return true;
    
    const q = searchTerm.toLowerCase();
    return (
      c.contract_number.toLowerCase().includes(q) ||
      (c.customer?.name && c.customer.name.toLowerCase().includes(q)) ||
      (c.customer?.phone && c.customer.phone.includes(q)) ||
      (c.container?.container_number && c.container.container_number.toLowerCase().includes(q))
    );
  });

  const calculateRemainingTimeText = (contract: Contract) => {
    const end = new Date(contract.expected_pickup_time || contract.end_date);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    
    if (contract.status === 'completed') {
      return { text: 'مكتمل ومستلم ✅', color: '#34d399', isUrgent: false };
    }
    
    if (diffMs < 0) {
      return { text: 'منتهي الصلاحية (مستحق السحب أو التمديد)', color: '#f87171', isUrgent: true };
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours <= 6) {
      return { text: `متبقي ${diffHours} ساعة فقط على موعد السحب ⚠️`, color: '#f59e0b', isUrgent: true };
    }
    if (diffDays === 0) {
      return { text: `ينتهي اليوم (متبقي ${diffHours} ساعة)`, color: '#fbbf24', isUrgent: true };
    }
    if (diffDays <= 7) {
      return { text: `متبقي ${diffDays} أيام على التجديد`, color: '#a5b4fc', isUrgent: false };
    }
    return { text: `متبقي ${diffDays} يوماً`, color: '#94a3b8', isUrgent: false };
  };

  const handleCashClick = async (contract: Contract) => {
    const remaining = Number(contract.remaining_amount ?? (contract.total_cost - contract.paid_amount));
    if (confirm(`تأكيد استلام مبلغ (${remaining} ر.س) كاش وتصفير العقد وإصدار سند القبض فوراً؟`)) {
      setLoadingActionId(`cash-${contract.id}`);
      await onConfirmCashPayment(contract);
      setLoadingActionId(null);
    }
  };

  const handleSadadClick = async (contract: Contract) => {
    setLoadingActionId(`sadad-${contract.id}`);
    await onSendSadadLink(contract);
    setLoadingActionId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff' }}>
            سجل العقود والتأجير والتحصيل
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
            متابعة العقود، مواعيد السحب، التمديد الفوري [🔄 تمديد]، السداد (كاش أو سداد)، وسندات القبض
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingRight: '40px' }}
            placeholder="بحث برقم العقد، اسم العميل، الجوال، أو رقم الحاوية..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              onClick={() => setFilterType('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: filterType === 'all' ? '#fbbf24' : 'transparent',
                color: filterType === 'all' ? '#050811' : '#94a3b8'
              }}
            >
              الكل ({contracts.length})
            </button>
            <button
              onClick={() => setFilterType('commercial')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: filterType === 'commercial' ? '#fbbf24' : 'transparent',
                color: filterType === 'commercial' ? '#050811' : '#94a3b8'
              }}
            >
              تجاري
            </button>
            <button
              onClick={() => setFilterType('debris')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: filterType === 'debris' ? '#fbbf24' : 'transparent',
                color: filterType === 'debris' ? '#050811' : '#94a3b8'
              }}
            >
              أنقاض
            </button>
          </div>

          <select
            className="form-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            style={{ width: 'auto', padding: '7px 12px', fontSize: '0.82rem' }}
          >
            <option value="all">كافة الحالات</option>
            <option value="active">العقود النشطة</option>
            <option value="extended">الممددة 🔄</option>
            <option value="completed">المكتملة والمستلمة</option>
            <option value="cancelled">الملغاة</option>
          </select>
        </div>
      </div>

      {/* Contracts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(370px, 1fr))',
        gap: '20px'
      }}>
        {filteredContracts.map((contract) => {
          const timing = calculateRemainingTimeText(contract);
          const remainingAmount = Number(contract.remaining_amount ?? (contract.total_cost - contract.paid_amount));
          const isPaid = remainingAmount <= 0 || contract.payment_status === 'paid';
          const driverName = contract.assigned_employee?.full_name || 'سعد الدوسري (سائق 🚛)';

          return (
            <div
              key={contract.id}
              className="glass-panel"
              style={{
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                borderRight: `4px solid ${contract.status === 'extended' ? '#10b981' : contract.contract_type === 'commercial' ? 'var(--accent-gold)' : '#38bdf8'}`
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#ffffff' }}>
                      {contract.contract_number}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: contract.contract_type === 'commercial' 
                        ? 'rgba(245, 158, 11, 0.15)' 
                        : (contract.period_type === 'monthly' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(56, 189, 248, 0.15)'),
                      color: contract.contract_type === 'commercial' 
                        ? '#fbbf24' 
                        : (contract.period_type === 'monthly' ? '#f472b6' : '#38bdf8'),
                      border: `1px solid ${contract.contract_type === 'commercial' 
                        ? 'rgba(245, 158, 11, 0.3)' 
                        : (contract.period_type === 'monthly' ? 'rgba(236, 72, 153, 0.3)' : 'rgba(56, 189, 248, 0.3)')}`
                    }}>
                      {contract.contract_type === 'commercial' 
                        ? 'تجاري' 
                        : (contract.period_type === 'monthly' ? 'أنقاض شهري 📆' : 'أنقاض يومي 📅')}
                    </span>
                    {contract.status === 'extended' && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.4)'
                      }}>
                        ممدد 🔄
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                    حاوية: <strong style={{ color: '#ffffff' }}>{contract.container?.container_number || 'غير محددة'}</strong>
                  </div>
                </div>

                {userRole === 'admin' && (
                  <button
                    title="حذف العقد (للمدير)"
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من حذف العقد (${contract.contract_number})؟`)) {
                        onDeleteContract(contract.id);
                      }
                    }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Customer */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '12px',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ffffff' }}>
                    {contract.customer?.name || 'العميل'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', direction: 'ltr', textAlign: 'right' }}>
                    {contract.customer?.phone}
                  </div>
                </div>

                {contract.customer?.phone && (userRole === 'admin' || permissions?.can_send_whatsapp !== false) && (
                  <button
                    className="btn-emerald"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => onSendWhatsApp(
                      contract.customer!.phone,
                      `مرحباً ${contract.customer?.name}، نود تذكيركم بخصوص عقد الحاوية رقم (${contract.contract_number}) لدى المحترز للحاويات.`
                    )}
                  >
                    <MessageCircle size={14} />
                    <span>مراسلة</span>
                  </button>
                )}
              </div>

              {/* Responsible Driver Badge & WhatsApp Task Dispatch Button */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                fontSize: '0.82rem',
                color: '#34d399'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={15} />
                  <span>السائق الميداني: <strong>{driverName}</strong></span>
                </div>

                {onOpenDriverDispatch && (
                  <button
                    onClick={() => onOpenDriverDispatch(contract)}
                    style={{
                      background: 'rgba(16, 185, 129, 0.2)',
                      border: '1px solid #10b981',
                      color: '#34d399',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease'
                    }}
                    title="إرسال أمر تفويض ومهمة تشغيلية (إنزال/سحب) إلى جوال السائق بالواتساب مع اللوكيشن ورقم العميل والتحصيل"
                  >
                    <span>📲 إرسال المهمة للسائق</span>
                  </button>
                )}
              </div>

              {/* Timing */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
                color: timing.color,
                background: timing.isUrgent ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                padding: '8px 12px',
                borderRadius: '8px',
                border: timing.isUrgent ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={15} />
                  <span style={{ fontWeight: 600 }}>{timing.text}</span>
                </div>

                {/* 🔄 Quick Extension Button */}
                {contract.status !== 'completed' && (userRole === 'admin' || permissions?.can_extend_contracts !== false) && (
                  <button
                    onClick={() => onOpenExtendModal(contract)}
                    style={{
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="تمديد فترة العقد وتأجيل موعد السحب"
                  >
                    <RotateCw size={12} />
                    <span>تمديد</span>
                  </button>
                )}
              </div>

              {/* Location Google Maps */}
              {contract.google_maps_url ? (
                <a
                  href={contract.google_maps_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#38bdf8',
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                    background: 'rgba(145, 165, 233, 0.08)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(14, 165, 233, 0.2)'
                  }}
                >
                  <MapPin size={15} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {contract.location_address || 'فتح الموقع على خرائط Google'}
                  </span>
                  <ExternalLink size={13} />
                </a>
              ) : null}

              {/* Cost & Payment Details */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                fontSize: '0.85rem'
              }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>التكلفة:</span>{' '}
                  <strong>
                    {userRole === 'admin' || permissions?.can_view_financials !== false ? `${contract.total_cost} ر.س` : <span style={{ color: '#94a3b8' }}>*** 🔒</span>}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>المتبقي:</span>{' '}
                  <strong>
                    {userRole === 'admin' || permissions?.can_view_financials !== false ? (
                      <span style={{ color: remainingAmount > 0 ? '#f87171' : '#34d399' }}>
                        {remainingAmount} ر.س
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>*** 🔒</span>
                    )}
                  </strong>
                </div>

                <select
                  value={contract.status}
                  onChange={(e) => onUpdateContractStatus(contract.id, e.target.value as ContractStatus)}
                  style={{
                    background: '#0f172a',
                    color: '#f8fafc',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    fontSize: '0.78rem',
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  <option value="active">نشط</option>
                  <option value="extended">ممدد 🔄</option>
                  <option value="completed">مكتمل ومستلم</option>
                  <option value="cancelled">ملغي</option>
                </select>
              </div>

              {/* Simple Payment & Extension Actions */}
              <div style={{
                display: 'flex',
                gap: '10px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                {isPaid ? (
                  /* When Paid: Show Receipt PDF Button + Extend Option */
                  <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                    {(userRole === 'admin' || permissions?.can_collect_payments !== false) && (
                      <button
                        onClick={() => onOpenReceipt(contract)}
                        className="btn-emerald"
                        style={{ flex: 1, padding: '9px 12px', fontSize: '0.85rem', justifyContent: 'center' }}
                      >
                        <ReceiptIcon size={16} />
                        <span>📄 سند القبض</span>
                      </button>
                    )}

                    {(userRole === 'admin' || permissions?.can_extend_contracts !== false) && (
                      <button
                        onClick={() => onOpenExtendModal(contract)}
                        className="btn-secondary"
                        style={{ padding: '9px 14px', fontSize: '0.85rem', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                        title="تمديد العقد لفترة إضافية"
                      >
                        <RotateCw size={15} />
                        <span>🔄 تمديد</span>
                      </button>
                    )}
                  </div>
                ) : (
                  /* When Unpaid: Clean Direct Options based on permissions */
                  <>
                    {/* Option 1: Cash */}
                    {(userRole === 'admin' || permissions?.can_collect_payments !== false) && (
                      <button
                        onClick={() => handleCashClick(contract)}
                        disabled={loadingActionId === `cash-${contract.id}`}
                        className="btn-emerald"
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          fontSize: '0.88rem',
                          fontWeight: 800,
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, #10b981, #059669)'
                        }}
                      >
                        <Banknote size={17} />
                        <span>{loadingActionId === `cash-${contract.id}` ? 'جارٍ السداد...' : '💵 كاش'}</span>
                      </button>
                    )}

                    {/* Option 2: Sadad Electronic Link */}
                    {(userRole === 'admin' || permissions?.can_send_payment_links !== false) && (
                      <button
                        onClick={() => handleSadadClick(contract)}
                        disabled={loadingActionId === `sadad-${contract.id}`}
                        className="btn-primary"
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          fontSize: '0.88rem',
                          fontWeight: 800,
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)'
                        }}
                        title="إرسال رابط سداد إلكتروني مع Apple Pay ومدى بالواتساب"
                      >
                        <CreditCard size={17} />
                        <span>{loadingActionId === `sadad-${contract.id}` ? 'جارٍ الإرسال...' : '💳 سداد'}</span>
                      </button>
                    )}

                    {/* Option 3: Extend */}
                    {(userRole === 'admin' || permissions?.can_extend_contracts !== false) && (
                      <button
                        onClick={() => onOpenExtendModal(contract)}
                        className="btn-secondary"
                        style={{ padding: '9px 12px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                        title="تمديد العقد"
                      >
                        <RotateCw size={16} />
                      </button>
                    )}
                  </>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {filteredContracts.length === 0 && (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <FileText size={40} color="#64748b" style={{ margin: '0 auto 12px auto' }} />
          <h4 style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: '4px' }}>لا توجد عقود مسجلة بهذا الفلتر</h4>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>يمكنك إضافة عقد جديد بضغطة زر من الأعلى.</p>
        </div>
      )}
    </div>
  );
};
