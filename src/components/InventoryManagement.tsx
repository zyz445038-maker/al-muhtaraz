'use client';

import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Layers, 
  Plus, 
  Zap, 
  Truck, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowUpRight,
  RotateCw,
  Search,
  Check,
  Building,
  HardHat,
  Trash2,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Container, ContainerStatus, ContainerType, Contract } from '@/types/database';

interface InventoryManagementProps {
  containers: Container[];
  contracts: Contract[];
  onBatchAddContainers: (newContainers: Partial<Container>[]) => Promise<boolean>;
  onUpdateContainerStatus: (containerId: string, status: ContainerStatus) => Promise<void>;
  onCompleteContractAndReturnToStock: (contractId: string, containerId: string) => Promise<void>;
  onDeleteContainer: (containerId: string) => Promise<void>;
  onOpenNewContract: (containerId: string) => void;
  onOpenExtendModal: (contract: Contract) => void;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  containers,
  contracts,
  onBatchAddContainers,
  onUpdateContainerStatus,
  onCompleteContractAndReturnToStock,
  onDeleteContainer,
  onOpenNewContract,
  onOpenExtendModal
}) => {
  // Batch Intake Form State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchType, setBatchType] = useState<ContainerType>('debris');
  const [batchPrefix, setBatchPrefix] = useState('D-');
  const [startNumber, setStartNumber] = useState(101);
  const [quantity, setQuantity] = useState(10);
  const [dailyRate, setDailyRate] = useState(150);
  const [monthlyRate, setMonthlyRate] = useState(3500);
  const [batchNotes, setBatchNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter & Search State
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'debris' | 'commercial'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ContainerStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Calculate Live Stock Metrics for Both Types
  const stockMetrics = useMemo(() => {
    const debris = containers.filter(c => c.type === 'debris');
    const commercial = containers.filter(c => c.type === 'commercial');

    const debrisTotal = debris.length;
    const debrisAvailable = debris.filter(c => c.status === 'available').length;
    const debrisRented = debris.filter(c => c.status === 'rented').length;
    const debrisMaintenance = debris.filter(c => c.status === 'maintenance').length;
    const debrisUtilRate = debrisTotal > 0 ? Math.round((debrisRented / debrisTotal) * 100) : 0;

    const commTotal = commercial.length;
    const commAvailable = commercial.filter(c => c.status === 'available').length;
    const commRented = commercial.filter(c => c.status === 'rented').length;
    const commMaintenance = commercial.filter(c => c.status === 'maintenance').length;
    const commUtilRate = commTotal > 0 ? Math.round((commRented / commTotal) * 100) : 0;

    return {
      debris: { total: debrisTotal, available: debrisAvailable, rented: debrisRented, maintenance: debrisMaintenance, utilRate: debrisUtilRate },
      commercial: { total: commTotal, available: commAvailable, rented: commRented, maintenance: commMaintenance, utilRate: commUtilRate }
    };
  }, [containers]);

  // Adjust default prefix and rates when batchType changes
  const handleBatchTypeChange = (type: ContainerType) => {
    setBatchType(type);
    if (type === 'debris') {
      setBatchPrefix('D-');
      setDailyRate(150);
    } else {
      setBatchPrefix('C-');
      setMonthlyRate(3500);
    }
  };

  // Preview generated batch container numbers
  const generatedNumbers = useMemo(() => {
    const list: string[] = [];
    for (let i = 0; i < quantity; i++) {
      list.push(`${batchPrefix}${startNumber + i}`);
    }
    return list;
  }, [batchPrefix, startNumber, quantity]);

  // Handle Batch Intake Submit
  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) return;

    setIsSubmitting(true);
    const newItems: Partial<Container>[] = generatedNumbers.map(num => ({
      container_number: num,
      type: batchType,
      status: 'available',
      daily_rate: batchType === 'debris' ? dailyRate : 0,
      monthly_rate: batchType === 'debris' ? (monthlyRate > 0 ? monthlyRate : 2000) : monthlyRate,
      notes: batchNotes || `دفعة توريد جديدة (${batchType === 'debris' ? 'أنقاض' : 'تجاري'})`
    }));

    const success = await onBatchAddContainers(newItems);
    setIsSubmitting(false);

    if (success) {
      setIsBatchModalOpen(false);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      setStartNumber(prev => prev + quantity);
    }
  };

  // Filtered List
  const filteredList = containers.filter(c => {
    if (inventoryFilter !== 'all' && c.type !== inventoryFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return c.container_number.toLowerCase().includes(q) || (c.notes && c.notes.toLowerCase().includes(q));
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontSize: '0.85rem', fontWeight: '700', marginBottom: '4px' }}>
            <Layers size={16} />
            <span>لوحة تحكم المدير العام</span>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff' }}>
            إدارة المخزون وتوريد أسطول الحاويات
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
            مراقبة المخزون اللحظي للنوعين (أنقاض وتجاري)، التوريد بالدفعات السريعة، والربط التلقائي بين المؤجر والمتاح
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => setIsBatchModalOpen(true)}
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', padding: '10px 20px', fontSize: '0.92rem' }}
        >
          <Zap size={18} />
          <span>⚡ توريد دفعة حاويات جديدة (Bulk Intake)</span>
        </button>
      </div>

      {/* 2 Live Stock Cards for the 2 Types */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* 🏗️ 1. Debris Stock Card */}
        <div className="glass-panel" style={{
          padding: '22px',
          borderRight: '5px solid #38bdf8',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HardHat size={22} color="#38bdf8" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff' }}>
                  مخزون حاويات الأنقاض 🏗️
                </h3>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>عقود تأجير يومية للبناء والترميم</span>
            </div>

            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>نسبة التشغيل الميداني</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#38bdf8' }}>
                {stockMetrics.debris.utilRate}%
              </div>
            </div>
          </div>

          {/* Grid Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '14px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>إجمالي الأسطول</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#ffffff' }}>
                {stockMetrics.debris.total}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#34d399' }}>متاح للتأجير 🟢</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#34d399' }}>
                {stockMetrics.debris.available}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#f87171' }}>مؤجر في الموقع 🔴</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#f87171' }}>
                {stockMetrics.debris.rented}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>في الصيانة 🛠️</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#fbbf24' }}>
                {stockMetrics.debris.maintenance}
              </div>
            </div>
          </div>
        </div>

        {/* 🏢 2. Commercial Stock Card */}
        <div className="glass-panel" style={{
          padding: '22px',
          borderRight: '5px solid #fbbf24',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={22} color="#fbbf24" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff' }}>
                  مخزون الحاويات التجارية 🏢
                </h3>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>عقود تأجير دورية (شهرية وسنوية للمنشآت)</span>
            </div>

            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>نسبة التشغيل الميداني</div>
              <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#fbbf24' }}>
                {stockMetrics.commercial.utilRate}%
              </div>
            </div>
          </div>

          {/* Grid Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '14px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>إجمالي الأسطول</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#ffffff' }}>
                {stockMetrics.commercial.total}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#34d399' }}>متاح للتأجير 🟢</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#34d399' }}>
                {stockMetrics.commercial.available}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#f87171' }}>مؤجر في الموقع 🔴</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#f87171' }}>
                {stockMetrics.commercial.rented}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>في الصيانة 🛠️</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#fbbf24' }}>
                {stockMetrics.commercial.maintenance}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Filter and Control Bar */}
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
            placeholder="بحث برقم الحاوية أو الملاحظات في المخزون..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <button
              onClick={() => setInventoryFilter('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: inventoryFilter === 'all' ? '#fbbf24' : 'transparent',
                color: inventoryFilter === 'all' ? '#050811' : '#94a3b8'
              }}
            >
              كافة المخزون ({containers.length})
            </button>
            <button
              onClick={() => setInventoryFilter('debris')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: inventoryFilter === 'debris' ? '#38bdf8' : 'transparent',
                color: inventoryFilter === 'debris' ? '#050811' : '#94a3b8'
              }}
            >
              الأنقاض ({stockMetrics.debris.total})
            </button>
            <button
              onClick={() => setInventoryFilter('commercial')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: inventoryFilter === 'commercial' ? '#fbbf24' : 'transparent',
                color: inventoryFilter === 'commercial' ? '#050811' : '#94a3b8'
              }}
            >
              التجاري ({stockMetrics.commercial.total})
            </button>
          </div>

          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{ width: 'auto', padding: '7px 12px', fontSize: '0.82rem' }}
          >
            <option value="all">كافة الحالات</option>
            <option value="available">المتاحة للتأجير 🟢</option>
            <option value="rented">المؤجرة في الميدان 🔴</option>
            <option value="maintenance">في الصيانة 🛠️</option>
          </select>
        </div>
      </div>

      {/* Containers Inventory Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <th style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>رقم الحاوية</th>
              <th style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>النوع والتصنيف</th>
              <th style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>حالة المخزون</th>
              <th style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>الارتباط التشغيلي والعميل</th>
              <th style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>السعر الافتراضي</th>
              <th style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>إجراءات المخزون</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((cont) => {
              const activeContract = contracts.find(c => c.container_id === cont.id && c.status !== 'completed' && c.status !== 'cancelled');
              const isDebris = cont.type === 'debris';

              return (
                <tr key={cont.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  
                  {/* Container Number */}
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Truck size={18} color={isDebris ? '#38bdf8' : '#fbbf24'} />
                      <strong style={{ fontSize: '1rem', color: '#ffffff' }}>{cont.container_number}</strong>
                    </div>
                  </td>

                  {/* Type */}
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: isDebris ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: isDebris ? '#38bdf8' : '#fbbf24',
                      border: `1px solid ${isDebris ? 'rgba(56, 189, 248, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                    }}>
                      {isDebris ? 'أنقاض ومخلفات 🏗️' : 'تجاري للمنشآت 🏢'}
                    </span>
                  </td>

                  {/* Stock Status Badge */}
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: cont.status === 'available' ? 'rgba(16, 185, 129, 0.15)' : cont.status === 'rented' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: cont.status === 'available' ? '#34d399' : cont.status === 'rented' ? '#f87171' : '#fbbf24',
                      border: `1px solid ${cont.status === 'available' ? 'rgba(16, 185, 129, 0.3)' : cont.status === 'rented' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                    }}>
                      {cont.status === 'available' ? 'متاح للتأجير 🟢' : cont.status === 'rented' ? 'مؤجر حالياً 🔴' : 'في الصيانة 🛠️'}
                    </span>
                  </td>

                  {/* Operational Link & Customer */}
                  <td style={{ padding: '16px 20px' }}>
                    {cont.status === 'rented' && activeContract ? (
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>
                          👤 {activeContract.customer?.name || 'العميل'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>
                          عقد: {activeContract.contract_number} (حتى {new Date(activeContract.expected_pickup_time || activeContract.end_date).toLocaleDateString('ar-SA')})
                        </div>
                      </div>
                    ) : cont.status === 'available' ? (
                      <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>جاهزة في المستودع</span>
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: '#fbbf24' }}>تحت الفحص والصيانة</span>
                    )}
                  </td>

                  {/* Rate */}
                  <td style={{ padding: '16px 20px', color: '#e2e8f0', fontSize: '0.88rem', fontWeight: 600 }}>
                    {isDebris ? `${cont.daily_rate} ر.س / يوم` : `${cont.monthly_rate} ر.س / شهر`}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      
                      {cont.status === 'available' ? (
                        /* Available: Rent action */
                        <button
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 700 }}
                          onClick={() => onOpenNewContract(cont.id)}
                        >
                          <span>📝 تأجير</span>
                        </button>
                      ) : cont.status === 'rented' && activeContract ? (
                        /* Rented: Return to stock or Extend */
                        <>
                          <button
                            className="btn-emerald"
                            style={{
                              padding: '6px 10px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              background: 'linear-gradient(135deg, #10b981, #059669)'
                            }}
                            onClick={() => {
                              if (confirm(`تأكيد استلام وسحب الحاوية (${cont.container_number}) وإنهاء العقد وإعادتها فوراً للمخزون المتاح 🟢؟`)) {
                                onCompleteContractAndReturnToStock(activeContract.id, cont.id);
                              }
                            }}
                            title="سحب الحاوية وإعادتها لمخزون المتاح فوراً"
                          >
                            <ArrowDownLeft size={13} />
                            <span>📥 استلام للمخزون</span>
                          </button>

                          <button
                            className="btn-secondary"
                            style={{ padding: '6px 8px', fontSize: '0.78rem', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                            onClick={() => onOpenExtendModal(activeContract)}
                            title="تمديد العقد"
                          >
                            <RotateCw size={13} />
                            <span>تمديد</span>
                          </button>
                        </>
                      ) : null}

                      {/* Delete Container */}
                      <button
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من حذف الحاوية (${cont.container_number}) من الأسطول؟`)) {
                            onDeleteContainer(cont.id);
                          }
                        }}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        title="حذف الحاوية"
                      >
                        <Trash2 size={13} />
                      </button>

                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bulk Intake Modal (توريد دفعات المخزون) */}
      {isBatchModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsBatchModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px', padding: '30px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={22} color="#10b981" />
                  <span>توريد دفعة حاويات جديدة للمخزون (Bulk Intake)</span>
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>
                  توليد وإدراج أسطول كامل بالترقيم التسلسلي بضغطة زر واحدة
                </p>
              </div>

              <button
                onClick={() => setIsBatchModalOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleBatchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Type Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#fbbf24' }}>
                  نوع الأسطول المورد:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div
                    onClick={() => handleBatchTypeChange('debris')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: `2px solid ${batchType === 'debris' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: batchType === 'debris' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <HardHat size={20} color={batchType === 'debris' ? '#38bdf8' : '#94a3b8'} style={{ margin: '0 auto 4px auto' }} />
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: batchType === 'debris' ? '#38bdf8' : '#ffffff' }}>
                      حاويات أنقاض ومخلفات 🏗️
                    </div>
                  </div>

                  <div
                    onClick={() => handleBatchTypeChange('commercial')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: `2px solid ${batchType === 'commercial' ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: batchType === 'commercial' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <Building size={20} color={batchType === 'commercial' ? '#fbbf24' : '#94a3b8'} style={{ margin: '0 auto 4px auto' }} />
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: batchType === 'commercial' ? '#fbbf24' : '#ffffff' }}>
                      حاويات تجارية للمنشآت 🏢
                    </div>
                  </div>
                </div>
              </div>

              {/* Numbering & Quantity Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '4px', color: '#e2e8f0' }}>
                    بادئة الرمز (Prefix):
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={batchPrefix}
                    onChange={(e) => setBatchPrefix(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '4px', color: '#e2e8f0' }}>
                    رقم البداية التسلسلي:
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={startNumber}
                    onChange={(e) => setStartNumber(Number(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '4px', color: '#10b981' }}>
                    عدد الحاويات المطلوبة:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="form-input"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    required
                    style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.08)', fontWeight: 800 }}
                  />
                </div>
              </div>

              {/* Rates */}
              {batchType === 'debris' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '4px', color: '#e2e8f0' }}>
                      السعر اليومي الافتراضي (ر.س):
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={dailyRate}
                      onChange={(e) => setDailyRate(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '4px', color: '#e2e8f0' }}>
                      السعر الشهري الافتراضي (ر.س):
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={monthlyRate}
                      onChange={(e) => setMonthlyRate(Number(e.target.value))}
                      placeholder="2000"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '4px', color: '#e2e8f0' }}>
                    السعر الشهري الافتراضي (ر.س):
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={monthlyRate}
                    onChange={(e) => setMonthlyRate(Number(e.target.value))}
                    required
                  />
                </div>
              )}

              {/* Preview Box */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '0.82rem'
              }}>
                <div style={{ color: '#94a3b8', marginBottom: '4px' }}>
                  معاينة الحاويات التي سيتم توليدها ({quantity} حاوية):
                </div>
                <div style={{ color: '#34d399', fontWeight: 700, maxHeight: '60px', overflowY: 'auto', lineHeight: 1.6 }}>
                  {generatedNumbers.join(' ، ')}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsBatchModalOpen(false)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                  style={{ minWidth: '220px' }}
                >
                  {isSubmitting ? 'جارٍ التوريد...' : `إدراج وتوريد (${quantity}) حاوية للمخزون`}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
