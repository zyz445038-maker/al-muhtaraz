'use client';

import React, { useState, useMemo } from 'react';
import { Truck, Search, Plus, Edit3, Trash2, Wrench, AlertTriangle, CheckCircle, Smartphone, Calendar } from 'lucide-react';
import { TransportVehicle, Profile } from '@/types/database';

interface VehiclesManagementProps {
  vehicles: TransportVehicle[];
  staffList: Profile[];
  onAddVehicle: (vehicle: Partial<TransportVehicle>) => void;
  onEditVehicle: (vehicle: TransportVehicle) => void;
  onDeleteVehicle: (id: string) => void;
  onSendWhatsApp: (phone: string, message: string) => void;
}

export const VehiclesManagement: React.FC<VehiclesManagementProps> = ({
  vehicles,
  staffList,
  onAddVehicle,
  onEditVehicle,
  onDeleteVehicle,
  onSendWhatsApp
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<TransportVehicle | null>(null);

  // Form State
  const [plateNumber, setPlateNumber] = useState('');
  const [brandModel, setBrandModel] = useState('');
  const [assignedDriverId, setAssignedDriverId] = useState('');
  const [lastOilDate, setLastOilDate] = useState('');
  const [nextOilKm, setNextOilKm] = useState<number | ''>('');
  const [currentKm, setCurrentKm] = useState<number | ''>('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [insuranceDate, setInsuranceDate] = useState('');
  const [status, setStatus] = useState<TransportVehicle['status']>('excellent');

  const drivers = useMemo(() => staffList.filter(s => s.role === 'employee' && s.full_name.includes('سائق')), [staffList]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => 
      v.plate_number.includes(searchTerm) || 
      v.brand_model.includes(searchTerm)
    );
  }, [vehicles, searchTerm]);

  const getStatusColor = (s: TransportVehicle['status']) => {
    switch(s) {
      case 'excellent': return '#10b981'; // Green
      case 'needs_maintenance': return '#f59e0b'; // Yellow
      case 'in_maintenance': return '#3b82f6'; // Blue
      case 'broken': return '#ef4444'; // Red
      default: return '#94a3b8';
    }
  };

  const getStatusText = (s: TransportVehicle['status']) => {
    switch(s) {
      case 'excellent': return 'ممتازة 🟢';
      case 'needs_maintenance': return 'تحتاج صيانة 🟡';
      case 'in_maintenance': return 'في الصيانة 🔵';
      case 'broken': return 'معطلة 🔴';
      default: return 'غير محدد';
    }
  };

  const openAddModal = () => {
    setEditingVehicle(null);
    setPlateNumber('');
    setBrandModel('');
    setAssignedDriverId('');
    setLastOilDate('');
    setNextOilKm('');
    setCurrentKm('');
    setInspectionDate('');
    setInsuranceDate('');
    setStatus('excellent');
    setIsModalOpen(true);
  };

  const openEditModal = (v: TransportVehicle) => {
    setEditingVehicle(v);
    setPlateNumber(v.plate_number);
    setBrandModel(v.brand_model);
    setAssignedDriverId(v.assigned_driver_id || '');
    setLastOilDate(v.last_oil_change_date || '');
    setNextOilKm(v.next_oil_change_km || '');
    setCurrentKm(v.current_km || '');
    setInspectionDate(v.periodic_inspection_date || '');
    setInsuranceDate(v.insurance_expiry_date || '');
    setStatus(v.status);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const data: Partial<TransportVehicle> = {
      plate_number: plateNumber,
      brand_model: brandModel,
      assigned_driver_id: assignedDriverId,
      last_oil_change_date: lastOilDate,
      next_oil_change_km: Number(nextOilKm) || 0,
      current_km: Number(currentKm) || 0,
      periodic_inspection_date: inspectionDate,
      insurance_expiry_date: insuranceDate,
      status
    };

    if (editingVehicle) {
      onEditVehicle({ ...editingVehicle, ...data } as TransportVehicle);
    } else {
      onAddVehicle(data);
    }
    setIsModalOpen(false);
  };

  const sendMaintenanceAlert = (v: TransportVehicle) => {
    const driver = staffList.find(s => s.id === v.assigned_driver_id);
    if (!driver || !driver.phone) {
      alert("لا يوجد رقم هاتف مخصص لهذا السائق.");
      return;
    }
    const message = `تنبيه صيانة 🛠️\nأخي السائق (${driver.full_name})، السيارة رقم اللوحة (${v.plate_number}) - (${v.brand_model}) بحاجة إلى فحص أو تغيير زيت قريباً. يرجى مراجعة الورشة والمتابعة مع الإدارة.`;
    onSendWhatsApp(driver.phone, message);
  };

  return (
    <div style={{ padding: '20px', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Truck size={28} color="#38bdf8" />
          <span>إدارة سيارات النقل 🚛</span>
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="ابحث برقم اللوحة أو الموديل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingRight: '36px' }}
            />
          </div>
          <button onClick={openAddModal} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} />
            <span>إضافة سيارة</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {filteredVehicles.map(v => {
          const driver = staffList.find(s => s.id === v.assigned_driver_id);
          const needsMaintenance = v.status === 'needs_maintenance' || (v.current_km >= v.next_oil_change_km && v.next_oil_change_km > 0);

          return (
            <div key={v.id} style={{
              background: 'linear-gradient(145deg, #0f172a 0%, #050811 100%)',
              border: `1px solid ${needsMaintenance ? 'rgba(245, 158, 11, 0.4)' : 'rgba(56, 189, 248, 0.2)'}`,
              borderRadius: '16px',
              padding: '20px',
              position: 'relative',
              boxShadow: needsMaintenance ? '0 0 15px rgba(245, 158, 11, 0.15)' : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 4px 0', color: '#e0f2fe' }}>{v.plate_number}</h3>
                  <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{v.brand_model}</span>
                </div>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  background: `${getStatusColor(needsMaintenance ? 'needs_maintenance' : v.status)}20`,
                  color: getStatusColor(needsMaintenance ? 'needs_maintenance' : v.status),
                  border: `1px solid ${getStatusColor(needsMaintenance ? 'needs_maintenance' : v.status)}50`
                }}>
                  {getStatusText(needsMaintenance ? 'needs_maintenance' : v.status)}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><Calendar size={14} style={{ display: 'inline', marginRight: '4px' }}/> الفحص الدوري:</span>
                  <span style={{ fontWeight: 700 }}>{v.periodic_inspection_date || 'غير محدد'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><Wrench size={14} style={{ display: 'inline', marginRight: '4px' }}/> الكيلومترات (الحالي/القادم):</span>
                  <span style={{ fontWeight: 700, color: needsMaintenance ? '#f87171' : '#34d399' }}>
                    {v.current_km} / {v.next_oil_change_km}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>السائق المعين:</span>
                  <span style={{ fontWeight: 700, color: '#38bdf8' }}>{driver?.full_name || 'غير محدد'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                <button
                  onClick={() => sendMaintenanceAlert(v)}
                  style={{
                    flex: 1,
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#34d399',
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  disabled={!driver?.phone}
                >
                  <Smartphone size={16} />
                  تنبيه واتساب
                </button>
                <button
                  onClick={() => openEditModal(v)}
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => onDeleteVehicle(v.id)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
        {filteredVehicles.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            لا توجد سيارات مسجلة تطابق بحثك.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 6, 23, 0.88)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '16px',
          direction: 'rtl'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #0f172a 0%, #050811 100%)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '26px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8)',
            position: 'relative'
          }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '20px', color: '#fff' }}>
              {editingVehicle ? 'تعديل سيارة' : 'إضافة سيارة نقل جديدة 🚛'}
            </h3>
            
            <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label" style={{ color: '#e0f2fe' }}>رقم اللوحة</label>
                <input required type="text" className="form-input" value={plateNumber} onChange={e => setPlateNumber(e.target.value)} placeholder="مثال: أ ب ج 1234" />
              </div>
              <div>
                <label className="form-label" style={{ color: '#e0f2fe' }}>النوع والموديل</label>
                <input required type="text" className="form-input" value={brandModel} onChange={e => setBrandModel(e.target.value)} placeholder="مثال: ايسوزو 2022" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ color: '#e0f2fe' }}>السائق المخصص</label>
                <select className="form-input" value={assignedDriverId} onChange={e => setAssignedDriverId(e.target.value)}>
                  <option value="">بدون سائق</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" style={{ color: '#e0f2fe' }}>تاريخ الفحص الدوري</label>
                <input type="date" className="form-input" value={inspectionDate} onChange={e => setInspectionDate(e.target.value)} />
              </div>
              <div>
                <label className="form-label" style={{ color: '#e0f2fe' }}>تاريخ انتهاء التأمين</label>
                <input type="date" className="form-input" value={insuranceDate} onChange={e => setInsuranceDate(e.target.value)} />
              </div>
              <div>
                <label className="form-label" style={{ color: '#e0f2fe' }}>تاريخ آخر تغيير زيت</label>
                <input type="date" className="form-input" value={lastOilDate} onChange={e => setLastOilDate(e.target.value)} />
              </div>
              <div>
                <label className="form-label" style={{ color: '#e0f2fe' }}>قراءة العداد (الكم) الحالي</label>
                <input type="number" className="form-input" value={currentKm} onChange={e => setCurrentKm(Number(e.target.value))} />
              </div>
              <div>
                <label className="form-label" style={{ color: '#e0f2fe' }}>تغيير الزيت القادم عند (كم)</label>
                <input type="number" className="form-input" value={nextOilKm} onChange={e => setNextOilKm(Number(e.target.value))} />
              </div>
              <div>
                <label className="form-label" style={{ color: '#e0f2fe' }}>حالة السيارة</label>
                <select className="form-input" value={status} onChange={e => setStatus(e.target.value as any)}>
                  <option value="excellent">ممتازة</option>
                  <option value="needs_maintenance">تحتاج صيانة</option>
                  <option value="in_maintenance">في الصيانة</option>
                  <option value="broken">معطلة</option>
                </select>
              </div>
              
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>إلغاء</button>
                <button type="submit" className="btn-primary">حفظ السيارة 💾</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
