'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Truck, 
  FileText, 
  Users, 
  MapPin, 
  Phone, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  MessageCircle,
  Plus,
  RotateCw
} from 'lucide-react';
import { Container, Contract, Customer, NotificationLog, StaffPermissions, UserRole } from '@/types/database';

interface SmartSearchProps {
  containers: Container[];
  contracts: Contract[];
  customers: Customer[];
  notifications: NotificationLog[];
  userRole?: UserRole;
  permissions?: StaffPermissions;
  onOpenNewContractWithContainer?: (containerId: string) => void;
  onViewContract?: (contract: Contract) => void;
  onSendWhatsApp?: (phone: string, message: string) => void;
  onOpenReceipt?: (contract: Contract) => void;
  onOpenExtendModal?: (contract: Contract) => void;
  onOpenDriverDispatch?: (contract: Contract) => void;
  onConfirmCashPayment?: (contract: Contract) => Promise<void>;
  onSendSadadLink?: (contract: Contract) => Promise<void>;
}

export const SmartSearch: React.FC<SmartSearchProps> = ({
  containers,
  contracts,
  customers,
  notifications,
  userRole = 'admin',
  permissions,
  onOpenNewContractWithContainer,
  onViewContract,
  onSendWhatsApp,
  onOpenReceipt,
  onOpenExtendModal,
  onOpenDriverDispatch,
  onConfirmCashPayment,
  onSendSadadLink
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'commercial' | 'debris' | 'customers' | 'contracts'>('all');

  // Compute live statistics
  const stats = useMemo(() => {
    const totalContainers = containers.length;
    const availableContainers = containers.filter(c => c.status === 'available').length;
    const rentedContainers = containers.filter(c => c.status === 'rented').length;
    const maintenanceContainers = containers.filter(c => c.status === 'maintenance').length;
    
    const activeContracts = contracts.filter(c => c.status === 'active').length;
    const debrisContracts = contracts.filter(c => c.contract_type === 'debris' && c.status === 'active').length;
    const commercialContracts = contracts.filter(c => c.contract_type === 'commercial' && c.status === 'active').length;
    
    const totalRevenue = contracts.reduce((acc, curr) => acc + (Number(curr.paid_amount) || 0), 0);
    const pendingNotifications = notifications.filter(n => n.status === 'pending').length;

    return {
      totalContainers,
      availableContainers,
      rentedContainers,
      maintenanceContainers,
      activeContracts,
      debrisContracts,
      commercialContracts,
      totalRevenue,
      pendingNotifications
    };
  }, [containers, contracts, notifications]);

  // Filtered search results
  const filteredResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const matchedContainers = containers.filter(c => {
      if (activeFilter === 'commercial' && c.type !== 'commercial') return false;
      if (activeFilter === 'debris' && c.type !== 'debris') return false;
      if (activeFilter === 'customers' || activeFilter === 'contracts') return false;
      if (!q) return true;
      return (
        c.container_number.toLowerCase().includes(q) ||
        (c.notes && c.notes.toLowerCase().includes(q))
      );
    });

    const matchedContracts = contracts.filter(c => {
      if (activeFilter === 'commercial' && c.contract_type !== 'commercial') return false;
      if (activeFilter === 'debris' && c.contract_type !== 'debris') return false;
      if (activeFilter === 'customers') return false;
      if (!q) return activeFilter === 'contracts';
      return (
        c.contract_number.toLowerCase().includes(q) ||
        (c.customer?.name && c.customer.name.toLowerCase().includes(q)) ||
        (c.customer?.phone && c.customer.phone.includes(q)) ||
        (c.container?.container_number && c.container.container_number.toLowerCase().includes(q))
      );
    });

    const matchedCustomers = customers.filter(cust => {
      if (activeFilter === 'commercial' || activeFilter === 'debris' || activeFilter === 'contracts') return false;
      if (!q) return activeFilter === 'customers';
      return (
        cust.name.toLowerCase().includes(q) ||
        cust.phone.includes(q) ||
        (cust.notes && cust.notes.toLowerCase().includes(q))
      );
    });

    return {
      containers: matchedContainers,
      contracts: matchedContracts,
      customers: matchedCustomers
    };
  }, [searchQuery, activeFilter, containers, contracts, customers]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Hero Header & Search Bar */}
      <div className="glass-panel" style={{
        padding: '36px 28px',
        background: 'radial-gradient(ellipse at top, rgba(30, 58, 138, 0.3) 0%, rgba(15, 23, 42, 0.8) 70%)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            fontSize: '0.85rem',
            fontWeight: 700,
            padding: '6px 16px',
            borderRadius: '999px',
            marginBottom: '16px'
          }}>
            <Truck size={15} />
            <span>نظام البحث والاستعلام الفوري للحاويات والعقود</span>
          </div>

          <h2 style={{
            fontSize: '2rem',
            fontWeight: 900,
            color: '#ffffff',
            marginBottom: '12px'
          }}>
            ابحث عن أي <span style={{ color: 'var(--accent-gold)' }}>حاوية، عميل، أو عقد</span> بلمح البصر
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '24px' }}>
            متابعة فورية للحاويات التجارية (شهري/سنوي) وحاويات الأنقاض (يومي) ومواقعها الجغرافية
          </p>

          {/* Search Input Field */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.95)',
            borderRadius: '16px',
            border: '2px solid rgba(245, 158, 11, 0.4)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 25px rgba(245, 158, 11, 0.2)',
            padding: '6px 14px'
          }}>
            <Search size={22} color="#fbbf24" style={{ marginRight: '8px' }} />
            <input
              id="main-smart-search-input"
              type="text"
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="اكتب رقم الحاوية (مثال: C-101 أو D-201)، اسم العميل، رقم الجوال، أو رقم العقد..."
              style={{
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                fontSize: '1.05rem',
                padding: '12px 14px'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#94a3b8',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '20px',
            flexWrap: 'wrap'
          }}>
            {[
              { id: 'all', label: 'الكل' },
              { id: 'commercial', label: 'حاويات تجارية (شهري/سنوي)' },
              { id: 'debris', label: 'حاويات أنقاض (يومي)' },
              { id: 'contracts', label: 'العقود' },
              { id: 'customers', label: 'العملاء' }
            ].map(tab => (
              <button
                key={tab.id}
                id={`filter-${tab.id}`}
                onClick={() => setActiveFilter(tab.id as any)}
                style={{
                  padding: '7px 18px',
                  borderRadius: '999px',
                  border: '1px solid',
                  borderColor: activeFilter === tab.id ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.1)',
                  background: activeFilter === tab.id ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  color: activeFilter === tab.id ? '#fbbf24' : '#94a3b8',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        {/* Available Containers */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>الحاويات المتاحة</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={20} color="#34d399" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#34d399' }}>
            {stats.availableContainers} <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'normal' }}>من {stats.totalContainers}</span>
          </div>
        </div>

        {/* Rented Containers */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #0ea5e9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>الحاويات المؤجرة</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(14, 165, 233, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={20} color="#38bdf8" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#38bdf8' }}>
            {stats.rentedContainers} <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 'normal' }}>حاوية نشطة</span>
          </div>
        </div>

        {/* Active Contracts */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>العقود النشطة</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} color="#fbbf24" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#fbbf24' }}>
            {stats.activeContracts}
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'normal', marginRight: '6px' }}>
              ({stats.debrisContracts} أنقاض / {stats.commercialContracts} تجاري)
            </span>
          </div>
        </div>

        {/* Total Collected Revenue */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #6366f1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>إجمالي المبالغ المحصلة</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={20} color="#818cf8" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ffffff' }}>
            {userRole === 'admin' || permissions?.can_view_financials !== false ? (
              <>{stats.totalRevenue.toLocaleString('en-US')} <span style={{ fontSize: '0.85rem', color: '#fbbf24' }}>ر.س</span></>
            ) : (
              <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>محجوب 🔒</span>
            )}
          </div>
        </div>
      </div>

      {/* Search Results Display */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>نتائج الحاويات والعقود</span>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 'normal' }}>
            ({filteredResults.containers.length} حاويات | {filteredResults.contracts.length} عقود | {filteredResults.customers.length} عملاء)
          </span>
        </h3>

        {/* Containers Grid */}
        {filteredResults.containers.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px'
            }}>
              {filteredResults.containers.map(container => (
                <div 
                  key={container.id} 
                  className="glass-panel glass-card-interactive" 
                  style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: container.type === 'commercial' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Truck size={22} color={container.type === 'commercial' ? '#a5b4fc' : '#fbbf24'} />
                      </div>
                      <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff' }}>
                          حاوية {container.container_number}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className={`badge ${container.type === 'commercial' ? 'badge-commercial' : 'badge-debris'}`}>
                            {container.type === 'commercial' ? 'تجاري' : 'أنقاض'}
                          </span>
                          <span className={`badge ${
                            container.status === 'available' ? 'badge-available' :
                            container.status === 'rented' ? 'badge-rented' : 'badge-maintenance'
                          }`}>
                            {container.status === 'available' ? 'متاحة للتأجير' :
                             container.status === 'rented' ? 'مؤجرة حالياً' : 'تحت الصيانة'}
                          </span>

                          {/* Small Contract Review Icon for Rented Container in Search */}
                          {container.status === 'rented' && (() => {
                            const activeCont = contracts.find(c => c.container_id === container.id && c.status !== 'completed' && c.status !== 'cancelled');
                            return activeCont && onOpenReceipt ? (
                              <button
                                onClick={() => onOpenReceipt(activeCont)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.3))',
                                  color: '#fbbf24',
                                  border: '1px solid rgba(245, 158, 11, 0.5)',
                                  cursor: 'pointer'
                                }}
                                title="عرض ومراجعة العقد والسند"
                              >
                                <FileText size={11} />
                                <span>📜 العقد ({activeCont.contract_number})</span>
                              </button>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {container.notes && (
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      {container.notes}
                    </p>
                  )}

                  {/* Actions based on container status */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div style={{ fontSize: '0.88rem', color: '#e2e8f0' }}>
                      {container.type === 'debris' ? (
                        <span>السعر: <strong style={{ color: '#fbbf24' }}>{container.daily_rate || 150} ر.س/يوم {container.monthly_rate > 0 ? `| ${container.monthly_rate} ر.س/شهر` : ''}</strong></span>
                      ) : (
                        <span>السعر: <strong style={{ color: '#a5b4fc' }}>{container.monthly_rate || 3500} ر.س/شهر</strong></span>
                      )}
                    </div>

                    {container.status === 'available' && onOpenNewContractWithContainer && (
                      <button
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: 700 }}
                        onClick={() => onOpenNewContractWithContainer(container.id)}
                      >
                        <Plus size={14} />
                        <span>📝 تأجير الحاوية</span>
                      </button>
                    )}

                    {container.status === 'rented' && (() => {
                      const activeCont = contracts.find(c => c.container_id === container.id && c.status !== 'completed' && c.status !== 'cancelled');
                      return activeCont ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {onOpenReceipt && (
                            <button
                              style={{
                                padding: '6px 10px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                borderRadius: '8px',
                                border: '1px solid rgba(245, 158, 11, 0.45)',
                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(217, 119, 6, 0.25))',
                                color: '#fbbf24',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              onClick={() => onOpenReceipt(activeCont)}
                              title="عرض ومراجعة العقد والسند"
                            >
                              <FileText size={13} />
                              <span>📜 مراجعة العقد</span>
                            </button>
                          )}
                          {onOpenExtendModal && (
                            <button
                              className="btn-emerald"
                              style={{
                                padding: '6px 10px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                background: 'linear-gradient(135deg, #0284c7, #0369a1)'
                              }}
                              onClick={() => onOpenExtendModal(activeCont)}
                            >
                              <RotateCw size={13} />
                              <span>🔄 تمديد</span>
                            </button>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Contracts Results */}
        {filteredResults.contracts.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#e2e8f0', marginBottom: '12px' }}>
              العقود المطابقة
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '16px'
            }}>
              {filteredResults.contracts.map(contract => (
                <div key={contract.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '800', color: '#fbbf24' }}>عقد #{contract.contract_number}</span>
                    <span className={`badge ${contract.contract_type === 'commercial' ? 'badge-commercial' : 'badge-debris'}`}>
                      {contract.contract_type === 'commercial' ? 'تجاري' : (contract.period_type === 'monthly' ? 'أنقاض (شهري)' : 'أنقاض (يومي)')}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>
                    <strong>العميل:</strong> {contract.customer?.name || 'غير محدد'} ({contract.customer?.phone})
                  </div>

                  {contract.google_maps_url && (
                    <a
                      href={contract.google_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#38bdf8',
                        fontSize: '0.85rem',
                        textDecoration: 'none'
                      }}
                    >
                      <MapPin size={15} />
                      <span>عرض الموقع على خرائط Google</span>
                      <ExternalLink size={13} />
                    </a>
                  )}

                  {/* Responsible Driver */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    color: '#34d399',
                    background: 'rgba(16, 185, 129, 0.08)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}>
                    <Truck size={13} />
                    <span>المسؤول الميداني: <strong>{contract.assigned_employee?.full_name || 'سعد الدوسري (سائق 🚛)'}</strong></span>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                  }}>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                      {userRole === 'admin' || permissions?.can_view_financials !== false ? (
                        <>
                          التكلفة: <strong style={{ color: '#ffffff' }}>{contract.total_cost} ر.س</strong>
                          {' '}| المتبقي: <strong style={{ color: (contract.total_cost - contract.paid_amount) > 0 ? '#f87171' : '#34d399' }}>{(contract.total_cost - contract.paid_amount)} ر.س</strong>
                        </>
                      ) : (
                        <span>المبالغ المالية: <strong>*** ر.س 🔒</strong></span>
                      )}
                    </span>

                    {/* Simple Payment Actions + Extension + Driver WhatsApp Dispatch */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {onOpenDriverDispatch && (
                        <button
                          className="btn-emerald"
                          style={{
                            padding: '6px 8px',
                            fontSize: '0.75rem',
                            background: 'rgba(16, 185, 129, 0.2)',
                            borderColor: '#10b981',
                            color: '#34d399'
                          }}
                          onClick={() => onOpenDriverDispatch(contract)}
                          title="إرسال أمر المهمة الميدانية إلى جوال السائق بالواتساب"
                        >
                          <span>📲 للسائق</span>
                        </button>
                      )}

                      {(contract.total_cost - contract.paid_amount) <= 0 || contract.payment_status === 'paid' ? (
                        <>
                          {onOpenReceipt && (userRole === 'admin' || permissions?.can_collect_payments !== false) && (
                            <button
                              className="btn-emerald"
                              style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                              onClick={() => onOpenReceipt(contract)}
                            >
                              <span>📄 سند القبض</span>
                            </button>
                          )}
                          {onOpenExtendModal && (userRole === 'admin' || permissions?.can_extend_contracts !== false) && (
                            <button
                              className="btn-secondary"
                              style={{ padding: '6px 8px', fontSize: '0.78rem', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                              onClick={() => onOpenExtendModal(contract)}
                              title="تمديد العقد"
                            >
                              <span>🔄 تمديد</span>
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          {onConfirmCashPayment && (userRole === 'admin' || permissions?.can_collect_payments !== false) && (
                            <button
                              className="btn-emerald"
                              style={{ padding: '6px 10px', fontSize: '0.78rem', fontWeight: 800 }}
                              onClick={() => onConfirmCashPayment(contract)}
                            >
                              <span>💵 كاش</span>
                            </button>
                          )}
                          {onSendSadadLink && (userRole === 'admin' || permissions?.can_send_payment_links !== false) && (
                            <button
                              className="btn-primary"
                              style={{ padding: '6px 10px', fontSize: '0.78rem', fontWeight: 800 }}
                              onClick={() => onSendSadadLink(contract)}
                            >
                              <span>💳 سداد</span>
                            </button>
                          )}
                          {onOpenExtendModal && (userRole === 'admin' || permissions?.can_extend_contracts !== false) && (
                            <button
                              className="btn-secondary"
                              style={{ padding: '6px 8px', fontSize: '0.78rem', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                              onClick={() => onOpenExtendModal(contract)}
                              title="تمديد العقد"
                            >
                              <span>🔄</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty Search State */}
        {filteredResults.containers.length === 0 && filteredResults.contracts.length === 0 && filteredResults.customers.length === 0 && (
          <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <Search size={40} color="#64748b" style={{ margin: '0 auto 12px auto' }} />
            <h4 style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: '6px' }}>لا توجد نتائج مطابقة لبحثك</h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>جرب كتابة رقم حاوية مختلف أو اسم عميل أو تنظيف حقل البحث.</p>
          </div>
        )}
      </div>
    </div>
  );
};
