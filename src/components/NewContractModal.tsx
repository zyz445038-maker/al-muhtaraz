'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Navigation, 
  Calendar, 
  Clock, 
  Truck, 
  User, 
  Phone, 
  DollarSign, 
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  CreditCard,
  Banknote,
  Hourglass,
  Sun,
  Sunset,
  Moon,
  Zap,
  Plus,
  Minus,
  Sparkles,
  Sliders
} from 'lucide-react';
import { Container, ContractPeriodType, ContainerType, Profile, PaymentMethod } from '@/types/database';
import { SaudiPhoneInput } from './SaudiPhoneInput';

export type PaymentChoice = 'cash' | 'sadad' | 'postpaid';

// Date Helpers
const pad = (n: number) => (n < 10 ? '0' + n : `${n}`);

const toLocalIso = (date: Date) => {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
};

const formatArabicDateTime = (isoStr: string) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  
  const dayName = days[d.getDay()];
  const dayNum = d.getDate();
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();
  
  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? 'م' : 'ص';
  hours = hours % 12 || 12;
  const formattedHours = pad(hours);
  
  return `${dayName}، ${dayNum} ${monthName} ${year} — ${formattedHours}:${minutes} ${ampm}`;
};

interface NewContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  containers: Container[];
  staffList?: Profile[];
  preSelectedContainerId?: string;
  onSaveContract: (contractData: any) => Promise<boolean>;
}

export const NewContractModal: React.FC<NewContractModalProps> = ({
  isOpen,
  onClose,
  containers,
  staffList = [],
  preSelectedContainerId,
  onSaveContract
}) => {
  // Form State
  const [contractType, setContractType] = useState<ContainerType>('debris');
  const [periodType, setPeriodType] = useState<ContractPeriodType>('daily');
  const [selectedContainerId, setSelectedContainerId] = useState<string>('');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<string>('');
  
  // Mandatory Payment Choice: 'cash' (نقدي فوري) | 'sadad' (إلكتروني Apple Pay/مدى) | 'postpaid' (آجل لاحقاً)
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('cash');

  // Customer
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+9665');
  
  // Dates & Durations Quick Selection State
  const [startDatePreset, setStartDatePreset] = useState<'today' | 'tomorrow' | 'after_tomorrow' | 'custom'>('today');
  const [startTimePreset, setStartTimePreset] = useState<'now' | 'morning' | 'noon' | 'afternoon' | 'evening' | 'custom'>('morning');
  const [showAdvancedDateTime, setShowAdvancedDateTime] = useState(false);

  const [durationDays, setDurationDays] = useState(3); // Default 3 days (most popular)
  const [startDate, setStartDate] = useState(toLocalIso(new Date()));
  const [pickupDate, setPickupDate] = useState('');
  
  // Location
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  
  // Pricing & Financial Calculations
  const [baseCost, setBaseCost] = useState(150);
  const [discountAmount, setDiscountAmount] = useState(0); // خصم
  const [downPayment, setDownPayment] = useState(0); // دفعة على الحساب
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Derived Financial Amounts
  const totalCost = Math.max(0, baseCost - (discountAmount || 0));
  const effectivePaidAmount = paymentChoice === 'cash'
    ? (downPayment > 0 ? downPayment : totalCost)
    : (downPayment > 0 ? downPayment : 0);
  const remainingAmount = Math.max(0, totalCost - effectivePaidAmount);

  // Helper: Apply Date Preset
  const applyDatePreset = (preset: 'today' | 'tomorrow' | 'after_tomorrow') => {
    setStartDatePreset(preset);
    const target = new Date();
    if (preset === 'tomorrow') target.setDate(target.getDate() + 1);
    if (preset === 'after_tomorrow') target.setDate(target.getDate() + 2);

    // Keep current time from existing startDate
    const current = new Date(startDate);
    target.setHours(current.getHours(), current.getMinutes(), 0, 0);
    setStartDate(toLocalIso(target));
  };

  // Helper: Apply Time Slot Preset
  const applyTimePreset = (preset: 'now' | 'morning' | 'noon' | 'afternoon' | 'evening') => {
    setStartTimePreset(preset);
    const target = new Date(startDate);
    if (preset === 'now') {
      const now = new Date();
      target.setHours(now.getHours(), now.getMinutes(), 0, 0);
    } else if (preset === 'morning') {
      target.setHours(8, 0, 0, 0); // 8:00 ص
    } else if (preset === 'noon') {
      target.setHours(12, 0, 0, 0); // 12:00 م
    } else if (preset === 'afternoon') {
      target.setHours(16, 0, 0, 0); // 4:00 م
    } else if (preset === 'evening') {
      target.setHours(20, 0, 0, 0); // 8:00 م
    }
    setStartDate(toLocalIso(target));
  };

  const [durationMonths, setDurationMonths] = useState(1);

  // Filter available containers based on type
  const availableContainers = containers.filter(c => 
    c.status === 'available' && c.type === contractType
  );

  // Filter drivers / staff for selector
  const activeStaff = staffList.filter(s => s.is_active);

  // Default select first driver if available
  useEffect(() => {
    if (activeStaff.length > 0 && !assignedEmployeeId) {
      const driver = activeStaff.find(s => s.full_name.includes('سائق')) || activeStaff[0];
      if (driver) setAssignedEmployeeId(driver.id);
    }
  }, [activeStaff, assignedEmployeeId]);

  // Set pre-selected container if provided
  useEffect(() => {
    if (preSelectedContainerId) {
      const found = containers.find(c => c.id === preSelectedContainerId);
      if (found) {
        setContractType(found.type);
        setSelectedContainerId(found.id);
        if (found.type === 'debris') {
          if (periodType === 'monthly') {
            const cost = (found.monthly_rate || 2000) * durationMonths;
            setBaseCost(cost);
          } else {
            const cost = (found.daily_rate || 150) * durationDays;
            setBaseCost(cost);
          }
        } else {
          setPeriodType('monthly');
          const cost = found.monthly_rate || 3500;
          setBaseCost(cost);
        }
      }
    }
  }, [preSelectedContainerId, containers, periodType, durationDays, durationMonths]);

  // Adjust duration & pickup date default when startDate, periodType, or duration changes
  useEffect(() => {
    if (periodType === 'daily') {
      const start = new Date(startDate);
      const end = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
      setPickupDate(end.toISOString().slice(0, 16));
    } else {
      const start = new Date(startDate);
      let months = durationMonths || 1;
      if (periodType === 'semi_annual') months = 6;
      if (periodType === 'annual') months = 12;
      const end = new Date(start);
      end.setMonth(end.getMonth() + months);
      setPickupDate(end.toISOString().slice(0, 16));
    }
  }, [contractType, periodType, durationDays, durationMonths, startDate]);

  // Auto calculate base cost on container/period change
  useEffect(() => {
    const cont = containers.find(c => c.id === selectedContainerId);
    if (cont) {
      let cost = 150;
      if (contractType === 'debris') {
        if (periodType === 'monthly') {
          const monthly = cont.monthly_rate > 0 ? cont.monthly_rate : (cont.daily_rate > 0 ? cont.daily_rate * 25 : 2000);
          cost = monthly * durationMonths;
        } else {
          cost = (cont.daily_rate || 150) * durationDays;
        }
      } else {
        const monthly = cont.monthly_rate || 3500;
        let mult = durationMonths || 1;
        if (periodType === 'semi_annual') mult = 6;
        if (periodType === 'annual') mult = 12;
        cost = monthly * mult;
      }
      setBaseCost(cost);
    }
  }, [selectedContainerId, contractType, periodType, durationDays, durationMonths, containers]);

  // Handle Payment Choice Change
  const handlePaymentChoiceChange = (choice: PaymentChoice) => {
    setPaymentChoice(choice);
  };

  // Fetch Current Device GPS Location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم تحديد الموقع الجغرافي.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
        setGoogleMapsUrl(mapsUrl);
        setLocationAddress(`إحداثيات الموقع المباشر: (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        alert('تعذر تحديد الموقع الجغرافي: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleContractTypeChange = (type: ContainerType) => {
    setContractType(type);
    setSelectedContainerId('');
    setDiscountAmount(0);
    setDownPayment(0);
    if (type === 'debris') {
      setPeriodType('daily');
      setDurationDays(3);
      setBaseCost(450);
    } else {
      setPeriodType('monthly');
      setBaseCost(3500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContainerId) {
      alert('يرجى اختيار الحاوية المطلوبة.');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('يرجى إدخال اسم العميل ورقم الجوال.');
      return;
    }

    setIsSaving(true);
    const contractNumber = `CTR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const finalTotalCost = Math.max(0, baseCost - discountAmount);
    const finalPaid = effectivePaidAmount;
    const finalRemaining = Math.max(0, finalTotalCost - finalPaid);

    let notesWithFinancials = notes;
    const financialNotes = [];
    if (discountAmount > 0) financialNotes.push(`خصم: ${discountAmount} ر.س`);
    if (downPayment > 0) financialNotes.push(`دفعة على الحساب: ${downPayment} ر.س`);
    if (financialNotes.length > 0) {
      notesWithFinancials = notesWithFinancials ? `${notesWithFinancials} | ${financialNotes.join(' - ')}` : financialNotes.join(' - ');
    }

    const contractPayload = {
      contract_number: contractNumber,
      container_id: selectedContainerId,
      assigned_employee_id: assignedEmployeeId || null,
      customer_name: customerName,
      customer_phone: customerPhone,
      contract_type: contractType,
      period_type: periodType,
      duration_days: durationDays,
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(pickupDate).toISOString(),
      expected_pickup_time: new Date(pickupDate).toISOString(),
      location_latitude: latitude,
      location_longitude: longitude,
      google_maps_url: googleMapsUrl,
      location_address: locationAddress,
      total_cost: finalTotalCost,
      paid_amount: finalPaid,
      remaining_amount: finalRemaining,
      payment_choice: paymentChoice,
      notes: notesWithFinancials
    };

    const success = await onSaveContract(contractPayload);
    setIsSaving(false);

    if (success) {
      onClose();
      // Reset form
      setCustomerName('');
      setCustomerPhone('+9665');
      setSelectedContainerId('');
      setGoogleMapsUrl('');
      setLocationAddress('');
      setPaymentChoice('cash');
      setDiscountAmount(0);
      setDownPayment(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', padding: '32px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={24} color="var(--accent-gold)" />
              <span>توثيق وحجز عقد حاوية جديد</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>
              إدخال بيانات العقد، تحديد السائق، واختيار طريقة السداد المعتمدة
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* 1. Contract Type Selector (Commercial vs Debris Only) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', marginBottom: '8px', color: '#e2e8f0' }}>
              1. نوع الحاوية والعقد المطلوب:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Debris Daily */}
              <div
                onClick={() => handleContractTypeChange('debris')}
                style={{
                  padding: '14px',
                  borderRadius: '14px',
                  border: `2px solid ${contractType === 'debris' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                  background: contractType === 'debris' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1rem', fontWeight: '800', color: contractType === 'debris' ? '#38bdf8' : '#ffffff' }}>
                    حاوية أنقاض ومخلفات 🏗️
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: '#38bdf8', color: '#050811', fontWeight: 800 }}>
                    عقد يومي
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                  تأجير يومي للبناء والترميم، مع تنبيه آلي قبل 4 ساعات من السحب.
                </div>
              </div>

              {/* Commercial Recurring */}
              <div
                onClick={() => handleContractTypeChange('commercial')}
                style={{
                  padding: '14px',
                  borderRadius: '14px',
                  border: `2px solid ${contractType === 'commercial' ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)'}`,
                  background: contractType === 'commercial' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1rem', fontWeight: '800', color: contractType === 'commercial' ? '#fbbf24' : '#ffffff' }}>
                    حاوية تجارية للمنشآت 🏢
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: '#f59e0b', color: '#050811', fontWeight: 800 }}>
                    شهري / سنوي
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                  عقود دورية للمنشآت، مع تنبيهات تجديد قبل 7 أيام ويومين.
                </div>
              </div>
            </div>
          </div>

          {/* 2. Container Selector & Responsible Staff / Driver Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Container */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>
                2. الحاوية المتاحة للتأجير:
              </label>
              <select
                className="form-select"
                value={selectedContainerId}
                onChange={(e) => setSelectedContainerId(e.target.value)}
                required
              >
                <option value="">-- اختر حاوية ({availableContainers.length} متاحة) --</option>
                {availableContainers.map(cont => (
                  <option key={cont.id} value={cont.id}>
                    {cont.container_number} — {contractType === 'debris' ? `${cont.daily_rate} ر.س/يوم` : `${cont.monthly_rate} ر.س/شهر`}
                  </option>
                ))}
              </select>
            </div>

            {/* Responsible Driver / Staff Dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#34d399' }}>
                3. المسؤول (سائق التوصيل 🚛 / موظف المتابعة 👷):
              </label>
              <select
                className="form-select"
                value={assignedEmployeeId}
                onChange={(e) => setAssignedEmployeeId(e.target.value)}
                style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.08)' }}
              >
                <option value="">-- اختر السائق أو الموظف --</option>
                {activeStaff.map(staff => (
                  <option key={staff.id} value={staff.id}>
                    {staff.full_name} ({staff.phone})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Customer Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>
                اسم العميل أو المقاول:
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#94a3b8" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingRight: '36px' }}
                  placeholder="مثال: مؤسسة صروح البناء / أحمد العتيبي"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>
            </div>

            <SaudiPhoneInput
              label="رقم جوال العميل (للواتساب والسداد):"
              value={customerPhone}
              onChange={(val) => setCustomerPhone(val)}
              required
            />
          </div>

          {/* 3.5. Driver Assignment System (اختيار السائق وإشعاره بالواتساب) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={18} color="#38bdf8" />
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#38bdf8' }}>
                  🚚 تعيين السائق المسؤول عن التنزيل (إشعار واتساب تلقائي):
                </span>
              </div>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                سيتم إرسال تفاصيل المهمة وموقع GPS تلقائياً لجوال السائق
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
                  اختر السائق من فريق العمل:
                </label>
                <select
                  className="form-select"
                  value={assignedEmployeeId}
                  onChange={(e) => setAssignedEmployeeId(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', fontSize: '0.88rem' }}
                >
                  <option value="">-- بدون تحديد سائق حالياً (لاحقاً) --</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.role === 'admin' ? '👑' : '👷'} {staff.full_name} ({staff.role === 'admin' ? 'الإدارة' : 'سائق / موظف'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
                  حالة جوال السائق للإشعار:
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(30, 41, 59, 0.65)',
                  padding: '9px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  minHeight: '44px'
                }}>
                  {assignedEmployeeId ? (
                    (() => {
                      const selStaff = staffList.find(s => s.id === assignedEmployeeId);
                      const hasPhone = !!selStaff?.phone && selStaff.phone.replace(/\D/g, '').length >= 9;
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
                          <span style={{ fontSize: '0.82rem', color: '#e2e8f0' }}>
                            📱 <strong style={{ color: '#38bdf8' }}>{selStaff?.phone || 'غير مسجل'}</strong>
                          </span>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: hasPhone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: hasPhone ? '#34d399' : '#f87171',
                            border: `1px solid ${hasPhone ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`
                          }}>
                            {hasPhone ? 'جاهز للإشعار 🟢' : 'لا يوجد رقم ⚠️'}
                          </span>
                        </div>
                      );
                    })()
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      ⚪ سيتم تخطي إشعار السائق لعدم التعيين
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Dates, Time & Duration Fast Quick-Select System */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '18px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="#fbbf24" />
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fbbf24' }}>
                  4. اختيار التاريخ والوقت والمدة بنقرة سريعة ⚡
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvancedDateTime(!showAdvancedDateTime)}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Sliders size={13} />
                <span>{showAdvancedDateTime ? 'إخفاء التعديل المخصص' : 'تخصيص يدوي دقيق ⚙️'}</span>
              </button>
            </div>

            {/* A. Quick Date Selection (اليوم / غداً / بعد غد) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
                📅 يوم التنزيل:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => applyDatePreset('today')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: `1px solid ${startDatePreset === 'today' ? '#f59e0b' : 'rgba(255, 255, 255, 0.1)'}`,
                    background: startDatePreset === 'today' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                    color: startDatePreset === 'today' ? '#fbbf24' : '#e2e8f0',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Zap size={14} />
                  <span>اليوم (فوري)</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyDatePreset('tomorrow')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: `1px solid ${startDatePreset === 'tomorrow' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                    background: startDatePreset === 'tomorrow' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                    color: startDatePreset === 'tomorrow' ? '#38bdf8' : '#e2e8f0',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Sun size={14} />
                  <span>غداً</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyDatePreset('after_tomorrow')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: `1px solid ${startDatePreset === 'after_tomorrow' ? '#a78bfa' : 'rgba(255, 255, 255, 0.1)'}`,
                    background: startDatePreset === 'after_tomorrow' ? 'rgba(167, 139, 250, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                    color: startDatePreset === 'after_tomorrow' ? '#c4b5fd' : '#e2e8f0',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  <Calendar size={14} />
                  <span>بعد غد</span>
                </button>
              </div>
            </div>

            {/* B. Quick Time Slot Selection (فترة العمل / الوقت) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
                ⏰ وقت وفترة التنزيل الميداني:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => applyTimePreset('now')}
                  style={{
                    padding: '7px 4px',
                    borderRadius: '10px',
                    border: `1px solid ${startTimePreset === 'now' ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}`,
                    background: startTimePreset === 'now' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.4)',
                    color: startTimePreset === 'now' ? '#34d399' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <Zap size={13} />
                  <span>الآن فوراً</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTimePreset('morning')}
                  style={{
                    padding: '7px 4px',
                    borderRadius: '10px',
                    border: `1px solid ${startTimePreset === 'morning' ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)'}`,
                    background: startTimePreset === 'morning' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(30, 41, 59, 0.4)',
                    color: startTimePreset === 'morning' ? '#fbbf24' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <Sun size={13} />
                  <span>صباحاً 8:00ص</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTimePreset('noon')}
                  style={{
                    padding: '7px 4px',
                    borderRadius: '10px',
                    border: `1px solid ${startTimePreset === 'noon' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                    background: startTimePreset === 'noon' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.4)',
                    color: startTimePreset === 'noon' ? '#38bdf8' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <Sun size={13} />
                  <span>ظهراً 12:00م</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTimePreset('afternoon')}
                  style={{
                    padding: '7px 4px',
                    borderRadius: '10px',
                    border: `1px solid ${startTimePreset === 'afternoon' ? '#f97316' : 'rgba(255, 255, 255, 0.1)'}`,
                    background: startTimePreset === 'afternoon' ? 'rgba(249, 115, 22, 0.2)' : 'rgba(30, 41, 59, 0.4)',
                    color: startTimePreset === 'afternoon' ? '#fb923c' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <Sunset size={13} />
                  <span>عصراً 4:00م</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyTimePreset('evening')}
                  style={{
                    padding: '7px 4px',
                    borderRadius: '10px',
                    border: `1px solid ${startTimePreset === 'evening' ? '#a78bfa' : 'rgba(255, 255, 255, 0.1)'}`,
                    background: startTimePreset === 'evening' ? 'rgba(167, 139, 250, 0.2)' : 'rgba(30, 41, 59, 0.4)',
                    color: startTimePreset === 'evening' ? '#c4b5fd' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <Moon size={13} />
                  <span>مساءً 8:00م</span>
                </button>
              </div>
            </div>

            {/* C. Quick Duration Selection (الأيام / الشهور) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>
                  ⏳ مدة بقاء الحاوية عند العميل:
                </label>
                {contractType === 'debris' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setDurationDays(d => Math.max(1, d - 1))}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        color: '#ffffff',
                        width: '26px',
                        height: '26px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fbbf24', minWidth: '55px', textAlign: 'center' }}>
                      {durationDays} {durationDays === 1 ? 'يوم' : durationDays === 2 ? 'يومان' : durationDays <= 10 ? 'أيام' : 'يوماً'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDurationDays(d => d + 1)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        color: '#ffffff',
                        width: '26px',
                        height: '26px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>

              {contractType === 'debris' ? (
                <div>
                  {/* Period Mode Selector: Daily vs Monthly */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setPeriodType('daily');
                        setDurationDays(3);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: periodType === 'daily' ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: periodType === 'daily' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.4)',
                        color: periodType === 'daily' ? '#38bdf8' : '#94a3b8',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      📅 تأجير يومي (بالأيام)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPeriodType('monthly');
                        setDurationMonths(1);
                        setDurationDays(30);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: periodType === 'monthly' ? '2px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: periodType === 'monthly' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(30, 41, 59, 0.4)',
                        color: periodType === 'monthly' ? '#f472b6' : '#94a3b8',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      📆 تأجير شهري (بالأشهر)
                    </button>
                  </div>

                  {periodType === 'daily' ? (
                    /* Debris Quick Days Chips */
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {[
                        { days: 1, label: '1 يوم' },
                        { days: 2, label: '2 يوم' },
                        { days: 3, label: '3 أيام ⭐' },
                        { days: 4, label: '4 أيام' },
                        { days: 5, label: '5 أيام' },
                        { days: 7, label: '7 أيام (أسبوع)' },
                        { days: 10, label: '10 أيام' },
                        { days: 15, label: '15 يوم' },
                        { days: 20, label: '20 يوم' },
                      ].map(item => {
                        const isSelected = durationDays === item.days;
                        return (
                          <button
                            key={item.days}
                            type="button"
                            onClick={() => setDurationDays(item.days)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: `1px solid ${isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                              background: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(30, 41, 59, 0.5)',
                              color: isSelected ? '#38bdf8' : '#e2e8f0',
                              fontWeight: isSelected ? 800 : 600,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Debris Quick Months Chips */
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                      {[
                        { months: 1, label: '1 شهر (30 يوم)' },
                        { months: 2, label: 'شهرين (60 يوم)' },
                        { months: 3, label: '3 أشهر' },
                        { months: 6, label: '6 أشهر (نصف سنوي)' },
                        { months: 12, label: '12 شهر (سنوي)' },
                      ].map(item => {
                        const isSelected = durationMonths === item.months;
                        return (
                          <button
                            key={item.months}
                            type="button"
                            onClick={() => {
                              setDurationMonths(item.months);
                              setDurationDays(item.months * 30);
                            }}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: `1px solid ${isSelected ? '#ec4899' : 'rgba(255, 255, 255, 0.1)'}`,
                              background: isSelected ? 'rgba(236, 72, 153, 0.25)' : 'rgba(30, 41, 59, 0.5)',
                              color: isSelected ? '#f472b6' : '#e2e8f0',
                              fontWeight: isSelected ? 800 : 600,
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Commercial Quick Period Chips */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { type: 'monthly', label: '1 شهر (30 يوم)' },
                    { type: 'semi_annual', label: '6 أشهر (نصف سنوي)' },
                    { type: 'annual', label: '12 شهر (سنوي كامل)' },
                  ].map(item => {
                    const isSelected = periodType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setPeriodType(item.type as ContractPeriodType)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: `1px solid ${isSelected ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)'}`,
                          background: isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(30, 41, 59, 0.5)',
                          color: isSelected ? '#fbbf24' : '#e2e8f0',
                          fontWeight: isSelected ? 800 : 600,
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* D. Live Arabic Schedule Summary Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                  🚛 <strong style={{ color: '#38bdf8' }}>توقيت التنزيل:</strong> {formatArabicDateTime(startDate)}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                  📦 <strong style={{ color: '#fbbf24' }}>موعد السحب المتوقع:</strong> {formatArabicDateTime(pickupDate)}
                </div>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>✨ نظام التنبيه: سيرسل النظام إشعار تذكير آلي للعميل وسائق الرافعة قبل 4 ساعات من موعد السحب.</span>
              </div>
            </div>

            {/* E. Optional Advanced Native Datetime Inputs (Hidden by default) */}
            {showAdvancedDateTime && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                paddingTop: '8px',
                borderTop: '1px dashed rgba(255, 255, 255, 0.1)'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '4px', color: '#94a3b8' }}>
                    تعديل تاريخ ووقت التنزيل يدوياً:
                  </label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setStartDatePreset('custom');
                      setStartTimePreset('custom');
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '4px', color: '#94a3b8' }}>
                    تعديل موعد السحب يدوياً:
                  </label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                  />
                </div>
              </div>
            )}

          </div>

          {/* 5. GPS Location & Google Maps */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#e2e8f0' }}>
                الموقع الجغرافي ورابط خرائط Google:
              </label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  color: '#38bdf8',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Navigation size={13} className={isLocating ? 'animate-spin' : ''} />
                <span>{isLocating ? 'جارٍ التحديد...' : 'تحديد موقعي الحالي عبر GPS'}</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="رابط خرائط جوجل (Google Maps URL)..."
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                style={{ direction: 'ltr', textAlign: 'left' }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="وصف الحي أو العنوان (مثال: حي الملقا - شارع 15)"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
              />
            </div>
          </div>

          {/* 6. Pricing & Financial Calculation Strip (إجمالي المبلغ | دفعة على الحساب | المبلغ المدفوع | المبلغ المتبقي + خصم) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            
            {/* Top 4-Column Row: إجمالي المبلغ | دفعة على الحساب | المبلغ المدفوع | المبلغ المتبقي */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px',
              textAlign: 'center'
            }}>
              {/* 1. إجمالي المبلغ */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '10px 6px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                  إجمالي المبلغ
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fbbf24' }}>
                  {totalCost} <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>ر.س</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', textDecoration: 'line-through', marginTop: '2px' }}>
                    الأصل: {baseCost} ر.س
                  </div>
                )}
              </div>

              {/* 2. دفعة على الحساب */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '12px',
                padding: '8px 6px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <label style={{ display: 'block', fontSize: '0.76rem', color: '#38bdf8', marginBottom: '4px', fontWeight: 700 }}>
                  دفعة على الحساب
                </label>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                  <input
                    type="number"
                    min="0"
                    max={totalCost}
                    className="form-input"
                    style={{
                      height: '32px',
                      padding: '2px 4px',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      textAlign: 'center',
                      color: '#38bdf8',
                      borderColor: 'rgba(56, 189, 248, 0.4)',
                      background: 'rgba(56, 189, 248, 0.08)',
                      width: '100%'
                    }}
                    value={downPayment === 0 ? '' : downPayment}
                    placeholder="0"
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(totalCost, Number(e.target.value) || 0));
                      setDownPayment(val);
                    }}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>ر.س</span>
                </div>
              </div>

              {/* 3. المبلغ المدفوع */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '12px',
                padding: '10px 6px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <div style={{ fontSize: '0.76rem', color: '#34d399', marginBottom: '4px', fontWeight: 700 }}>
                  المبلغ المدفوع
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#34d399' }}>
                  {effectivePaidAmount} <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>ر.س</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                  {paymentChoice === 'cash' && downPayment === 0 ? 'سداد كامل' : downPayment > 0 ? 'دفعة مسددة' : 'آجل / رابط'}
                </div>
              </div>

              {/* 4. المبلغ المتبقي */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: `1px solid ${remainingAmount > 0 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
                borderRadius: '12px',
                padding: '10px 6px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <div style={{ fontSize: '0.76rem', color: remainingAmount > 0 ? '#f87171' : '#34d399', marginBottom: '4px', fontWeight: 700 }}>
                  المبلغ المتبقي
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: remainingAmount > 0 ? '#f87171' : '#34d399' }}>
                  {remainingAmount} <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>ر.س</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: remainingAmount > 0 ? '#fca5a5' : '#86efac', marginTop: '2px' }}>
                  {remainingAmount > 0 ? 'متبقي للتحصيل' : 'مسدد بالكامل ✅'}
                </div>
              </div>
            </div>

            {/* Bottom Row: خصم */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#e2e8f0' }}>
                  خصم:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '130px' }}>
                  <input
                    type="number"
                    min="0"
                    max={baseCost}
                    className="form-input"
                    style={{
                      height: '32px',
                      padding: '2px 8px',
                      fontSize: '0.92rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      color: '#fbbf24',
                      background: 'rgba(245, 158, 11, 0.08)',
                      borderColor: 'rgba(245, 158, 11, 0.3)'
                    }}
                    value={discountAmount === 0 ? '' : discountAmount}
                    placeholder="0"
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(baseCost, Number(e.target.value) || 0));
                      setDiscountAmount(val);
                    }}
                  />
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>ر.س</span>
                </div>
              </div>

              {/* Quick Discount Chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {[0, 20, 50, 100].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDiscountAmount(amt)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '6px',
                      border: `1px solid ${discountAmount === amt ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: discountAmount === amt ? 'rgba(245, 158, 11, 0.2)' : 'rgba(15, 23, 42, 0.5)',
                      color: discountAmount === amt ? '#fbbf24' : '#94a3b8',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {amt === 0 ? 'بدون خصم' : `خصم ${amt} ر.س`}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* 7. Mandatory Payment Method Matrices (تحت القيمة الإجمالية والمتبقي وقبل التوثيق) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.9)',
            border: '2px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '16px',
            padding: '16px 20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ fontSize: '0.92rem', fontWeight: '800', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DollarSign size={18} />
                <span>طريقة وآلية السداد المعتمدة للعقد (حدد قبل التوثيق):</span>
              </label>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontWeight: 700 }}>
                مطلوب
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              
              {/* Choice 1: Cash */}
              <div
                onClick={() => handlePaymentChoiceChange('cash')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: `2px solid ${paymentChoice === 'cash' ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}`,
                  background: paymentChoice === 'cash' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(2, 6, 23, 0.6)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <Banknote size={24} color={paymentChoice === 'cash' ? '#34d399' : '#94a3b8'} style={{ margin: '0 auto 4px auto' }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: paymentChoice === 'cash' ? '#34d399' : '#ffffff' }}>
                  💵 كاش (سداد فوري)
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                  مدفوع بالكامل + إصدار سند
                </div>
              </div>

              {/* Choice 2: Sadad Electronic Link */}
              <div
                onClick={() => handlePaymentChoiceChange('sadad')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: `2px solid ${paymentChoice === 'sadad' ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)'}`,
                  background: paymentChoice === 'sadad' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(2, 6, 23, 0.6)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <CreditCard size={24} color={paymentChoice === 'sadad' ? '#fbbf24' : '#94a3b8'} style={{ margin: '0 auto 4px auto' }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: paymentChoice === 'sadad' ? '#fbbf24' : '#ffffff' }}>
                  💳 سداد (إلكتروني)
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                  رابط Apple Pay / مدى بالواتساب
                </div>
              </div>

              {/* Choice 3: Postpaid / Later */}
              <div
                onClick={() => handlePaymentChoiceChange('postpaid')}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: `2px solid ${paymentChoice === 'postpaid' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                  background: paymentChoice === 'postpaid' ? 'rgba(14, 165, 233, 0.2)' : 'rgba(2, 6, 23, 0.6)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <Hourglass size={24} color={paymentChoice === 'postpaid' ? '#38bdf8' : '#94a3b8'} style={{ margin: '0 auto 4px auto' }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: paymentChoice === 'postpaid' ? '#38bdf8' : '#ffffff' }}>
                  ⏳ آجل (تحصيل لاحقاً)
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                  دفع عند التنزيل أو السحب
                </div>
              </div>

            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              إلغاء
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving}
              style={{ minWidth: '220px', padding: '10px 24px', fontSize: '0.95rem' }}
            >
              {isSaving ? 'جارٍ توثيق العقد...' : `توثيق العقد (${paymentChoice === 'cash' ? 'كاش وسند فوري' : paymentChoice === 'sadad' ? 'إرسال رابط سداد' : 'تسجيل كآجل'})`}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
