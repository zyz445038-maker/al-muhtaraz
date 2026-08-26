'use client';

import React, { useState } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  RotateCw,
  FilePlus,
  FileText,
  User,
  Phone
} from 'lucide-react';
import { Container, ContainerStatus, ContainerType, UserRole, Contract, StaffPermissions } from '@/types/database';

interface ContainersViewProps {
  containers: Container[];
  contracts?: Contract[];
  userRole: UserRole;
  permissions?: StaffPermissions;
  onUpdateStatus: (containerId: string, status: ContainerStatus) => Promise<void>;
  onAddContainer: (containerData: Partial<Container>) => Promise<boolean>;
  onDeleteContainer: (containerId: string) => Promise<void>;
  onOpenRentModal: (containerId: string) => void;
  onOpenExtendModal?: (contract: Contract) => void;
  onOpenReceipt?: (contract: Contract) => void;
}

export const ContainersView: React.FC<ContainersViewProps> = ({
  containers,
  contracts = [],
  userRole,
  permissions,
  onUpdateStatus,
  onAddContainer,
  onDeleteContainer,
  onOpenRentModal,
  onOpenExtendModal,
  onOpenReceipt
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | ContainerType>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | ContainerStatus>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Container Form State
  const [containerNumber, setContainerNumber] = useState('');
  const [newType, setNewType] = useState<ContainerType>('debris');
  const [dailyRate, setDailyRate] = useState(150);
  const [monthlyRate, setMonthlyRate] = useState(3500);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredContainers = containers.filter(c => {
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (!searchTerm.trim()) return true;
    
    const query = searchTerm.toLowerCase();
    return (
      c.container_number.toLowerCase().includes(query) ||
      (c.notes && c.notes.toLowerCase().includes(query))
    );
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!containerNumber.trim()) return;

    setIsSubmitting(true);
    const success = await onAddContainer({
      container_number: containerNumber,
      type: newType,
      status: 'available',
      daily_rate: newType === 'debris' ? dailyRate : 0,
      monthly_rate: newType === 'debris' ? (monthlyRate > 0 ? monthlyRate : 2000) : monthlyRate,
      notes: notes
    });
    setIsSubmitting(false);

    if (success) {
      setIsAddModalOpen(false);
      setContainerNumber('');
      setNotes('');
    }
  };

  const getStatusBadge = (status: ContainerStatus) => {
    switch (status) {
      case 'available':
        return { label: 'متاحة للتأجير 🟢', bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 'rented':
        return { label: 'مؤجرة حالياً 🔴', bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
      case 'maintenance':
        return { label: 'في الصيانة 🛠️', bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* View Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff' }}>
            أسطول الحاويات وإدارة المخزون
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
            تتبع الحاويات، التأجير المباشر للمتاحة [📝 تأجير]، والتمديد الفوري للمؤجرة [🔄 تمديد]
          </p>
        </div>

        {userRole === 'admin' && (
          <button
            className="btn-primary"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus size={18} />
            <span>إضافة حاوية جديدة للأسطول</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingRight: '40px' }}
            placeholder="بحث برقم الحاوية أو الملاحظات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              onClick={() => setFilterStatus('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: filterStatus === 'all' ? '#fbbf24' : 'transparent',
                color: filterStatus === 'all' ? '#050811' : '#94a3b8'
              }}
            >
              الكل ({containers.length})
            </button>
            <button
              onClick={() => setFilterStatus('available')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: filterStatus === 'available' ? '#10b981' : 'transparent',
                color: filterStatus === 'available' ? '#ffffff' : '#94a3b8'
              }}
            >
              المتاحة ({containers.filter(c => c.status === 'available').length})
            </button>
            <button
              onClick={() => setFilterStatus('rented')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: filterStatus === 'rented' ? '#ef4444' : 'transparent',
                color: filterStatus === 'rented' ? '#ffffff' : '#94a3b8'
              }}
            >
              المؤجرة ({containers.filter(c => c.status === 'rented').length})
            </button>
          </div>

          {/* Type Filter */}
          <select
            className="form-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            style={{ width: 'auto', padding: '7px 12px', fontSize: '0.82rem' }}
          >
            <option value="all">كافة الأنواع</option>
            <option value="commercial">تجاري للمنشآت</option>
            <option value="debris">أنقاض ومخلفات</option>
          </select>
        </div>
      </div>

      {/* Containers Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {filteredContainers.map((container) => {
          const badge = getStatusBadge(container.status);
          const isDebris = container.type === 'debris';

          // Find active contract if container is rented
          const activeContract = contracts.find(c => 
            c.container_id === container.id && c.status !== 'completed' && c.status !== 'cancelled'
          );

          return (
            <div
              key={container.id}
              className="glass-panel"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                borderRight: `4px solid ${container.status === 'available' ? '#10b981' : container.status === 'rented' ? '#ef4444' : '#f59e0b'}`
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Truck size={20} color={isDebris ? '#38bdf8' : '#fbbf24'} />
                    <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff' }}>
                      {container.container_number}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                    {isDebris ? 'حاوية أنقاض ومخلفات 🏗️' : 'حاوية تجارية للمنشآت 🏢'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Small Contract Review Icon / Button if Rented */}
                  {container.status === 'rented' && activeContract && (
                    <button
                      onClick={() => onOpenReceipt && onOpenReceipt(activeContract)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 9px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(217, 119, 6, 0.3))',
                        color: '#fbbf24',
                        border: '1px solid rgba(245, 158, 11, 0.55)',
                        cursor: 'pointer',
                        boxShadow: '0 0 12px rgba(245, 158, 11, 0.25)',
                        transition: 'transform 0.15s'
                      }}
                      title="عرض ومراجعة العقد والسند الإلكتروني"
                    >
                      <FileText size={13} />
                      <span>📜 العقد</span>
                    </button>
                  )}

                  {container.status === 'rented' && (activeContract?.is_free || activeContract?.payment_method === 'free') && (
                    <span style={{
                      padding: '4px 9px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.35))',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.5)',
                      boxShadow: '0 0 10px rgba(16, 185, 129, 0.25)'
                    }}>
                      🎁 مجاناً
                    </span>
                  )}

                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: badge.bg,
                    color: badge.text,
                    border: `1px solid ${badge.border}`
                  }}>
                    {badge.label}
                  </span>
                </div>
              </div>

              {/* Rented Container Info (إذا كانت مؤجرة) */}
              {container.status === 'rented' && activeContract && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
                      👤 {activeContract.customer?.name || 'العميل'}
                    </span>
                    <button
                      onClick={() => onOpenReceipt && onOpenReceipt(activeContract)}
                      style={{
                        fontSize: '0.75rem',
                        color: '#fbbf24',
                        fontWeight: 800,
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '6px',
                        padding: '2px 7px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="انقر لمراجعة العقد والسند"
                    >
                      <FileText size={11} />
                      <span>{activeContract.contract_number}</span>
                    </button>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#f87171' }}>
                    موعد السحب: {new Date(activeContract.expected_pickup_time || activeContract.end_date).toLocaleDateString('ar-SA')}
                  </div>
                </div>
              )}

              {/* Rates */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '10px 14px',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.85rem'
              }}>
                <span style={{ color: '#94a3b8' }}>سعر التأجير:</span>
                <strong style={{ color: '#ffffff' }}>
                  {userRole === 'admin' || permissions?.can_view_financials !== false ? (
                    isDebris ? (
                      <span>
                        {container.daily_rate > 0 ? `${container.daily_rate} ر.س / يوم` : ''}
                        {container.daily_rate > 0 && container.monthly_rate > 0 ? ' | ' : ''}
                        {container.monthly_rate > 0 ? `${container.monthly_rate} ر.س / شهر` : ''}
                      </span>
                    ) : `${container.monthly_rate} ر.س / شهر`
                  ) : (
                    <span style={{ color: '#94a3b8' }}>*** ر.س 🔒</span>
                  )}
                </strong>
              </div>

              {/* Notes */}
              {container.notes && (
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                  {container.notes}
                </p>
              )}

              {/* ⚡ Functional Action Buttons */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                {container.status === 'available' ? (
                  /* Available: 📝 تأجير الحاوية */
                  (userRole === 'admin' || permissions?.can_create_contracts !== false) && (
                    <button
                      className="btn-primary"
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem', fontWeight: 700, justifyContent: 'center' }}
                      onClick={() => onOpenRentModal(container.id)}
                    >
                      <FilePlus size={15} />
                      <span>📝 تأجير الحاوية (عقد جديد)</span>
                    </button>
                  )
                ) : container.status === 'rented' && activeContract ? (
                  /* Rented: 📜 مراجعة العقد + 🔄 تمديد العقد */
                  <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                    <button
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        borderRadius: '8px',
                        border: '1px solid rgba(245, 158, 11, 0.45)',
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(217, 119, 6, 0.25))',
                        color: '#fbbf24',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                      onClick={() => onOpenReceipt && onOpenReceipt(activeContract)}
                      title="عرض ومراجعة العقد والسند المالي الرسمي"
                    >
                      <FileText size={14} />
                      <span>📜 مراجعة العقد</span>
                    </button>

                    {(userRole === 'admin' || permissions?.can_extend_contracts !== false) && (
                      <button
                        className="btn-emerald"
                        style={{
                          padding: '8px 10px',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, #0284c7, #0369a1)'
                        }}
                        onClick={() => onOpenExtendModal && onOpenExtendModal(activeContract)}
                        title="تمديد مدة العقد"
                      >
                        <RotateCw size={14} />
                        <span>🔄 تمديد</span>
                      </button>
                    )}
                  </div>
                ) : null}

                {/* Status Switcher Dropdown (Admin or if has inventory permissions) */}
                {(userRole === 'admin' || permissions?.can_manage_inventory !== false) && (
                  <select
                    value={container.status}
                    onChange={(e) => onUpdateStatus(container.id, e.target.value as ContainerStatus)}
                    style={{
                      background: '#0f172a',
                      color: '#f8fafc',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      padding: '6px 8px',
                      fontSize: '0.78rem',
                      fontFamily: 'inherit',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="available">متاحة 🟢</option>
                    <option value="rented">مؤجرة 🔴</option>
                    <option value="maintenance">صيانة 🛠️</option>
                  </select>
                )}

                {/* Delete Container (Admin Only) */}
                {userRole === 'admin' && (
                  <button
                    title="حذف الحاوية من الأسطول"
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من حذف الحاوية (${container.container_number})؟`)) {
                        onDeleteContainer(container.id);
                      }
                    }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      width: '32px',
                      height: '32px',
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

            </div>
          );
        })}
      </div>

      {/* Add Container Modal */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', marginBottom: '6px' }}>
              إضافة حاوية جديدة للأسطول
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '20px' }}>
              أدخل رقم الحاوية ونوعها لتنضم تلقائياً إلى مخزون الحاويات المتاحة
            </p>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>
                  رقم الحاوية (كود التتبع):
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={containerNumber}
                  onChange={(e) => setContainerNumber(e.target.value)}
                  placeholder="مثال: D-204 أو C-105"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>
                  نوع الحاوية:
                </label>
                <select
                  className="form-select"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as ContainerType)}
                >
                  <option value="debris">حاوية أنقاض ومخلفات (يومي) 🏗️</option>
                  <option value="commercial">حاوية تجارية للمنشآت (شهري/سنوي) 🏢</option>
                </select>
              </div>

              {newType === 'debris' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>
                      السعر اليومي (ر.س):
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={dailyRate}
                      onChange={(e) => setDailyRate(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>
                      السعر الشهري (ر.س):
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={monthlyRate}
                      onChange={(e) => setMonthlyRate(Number(e.target.value))}
                      placeholder="2000"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>
                    السعر الشهري (ر.س):
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={monthlyRate}
                    onChange={(e) => setMonthlyRate(Number(e.target.value))}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>
                  ملاحظات أو مواصفات الحاوية:
                </label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '70px', resize: 'vertical' }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: حاوية 20 ياردة مخصصة للمخلفات الثقيلة..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'جارٍ الحفظ...' : 'إضافة للأسطول'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
