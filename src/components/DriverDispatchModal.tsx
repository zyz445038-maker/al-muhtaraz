'use client';

import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Send, 
  MapPin, 
  Phone, 
  DollarSign, 
  CheckCircle2, 
  X, 
  MessageSquare,
  FileText,
  Clock
} from 'lucide-react';
import { Contract, Profile } from '@/types/database';
import { formatDriverWhatsAppMessage, DriverTaskType } from '@/utils/driverDispatch';
import { isRealCallablePhone } from './SaudiPhoneInput';

interface DriverDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  drivers: Profile[];
  onSendViaApi: (phone: string, message: string) => Promise<boolean>;
}

export const DriverDispatchModal: React.FC<DriverDispatchModalProps> = ({
  isOpen,
  onClose,
  contract,
  drivers,
  onSendViaApi
}) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [taskType, setTaskType] = useState<DriverTaskType>('delivery');
  const [customNotes, setCustomNotes] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Available drivers only
  const driverList = drivers.filter(d => d.full_name.includes('سائق') || d.role === 'employee');

  useEffect(() => {
    if (contract) {
      // Default to contract assigned employee if driver, else first driver
      if (contract.assigned_employee_id) {
        setSelectedDriverId(contract.assigned_employee_id);
      } else if (driverList.length > 0) {
        setSelectedDriverId(driverList[0].id);
      }

      // Default task type: if contract is active & expired/close to end -> pickup, else delivery
      if (contract.status === 'active' && (contract.expected_pickup_time || contract.container_units?.length)) {
        const activeUnitDates = contract.container_units
          ?.filter(unit => unit.status === 'active')
          .map(unit => new Date(unit.end_date).getTime()) || [];
        const pickupDate = new Date(activeUnitDates.length
          ? Math.min(...activeUnitDates)
          : contract.expected_pickup_time || contract.end_date);
        if (pickupDate.getTime() - Date.now() < 24 * 3600 * 1000) {
          setTaskType('pickup');
        } else {
          setTaskType('delivery');
        }
      } else {
        setTaskType('delivery');
      }

      setSendSuccess(false);
      setSendError(null);
    }
  }, [contract, drivers]);

  if (!isOpen || !contract) return null;

  const selectedDriver = driverList.find(d => d.id === selectedDriverId) || driverList[0];
  const driverPhone = selectedDriver?.phone || '';

  const messageText = formatDriverWhatsAppMessage({
    contract,
    taskType,
    customNotes
  });

  const handleSendApi = async () => {
    if (!isRealCallablePhone(driverPhone)) {
      setSendError('سجّل رقم جوال سعوديًا صالحًا للسائق من إدارة الموظفين قبل إرسال المهمة.');
      return;
    }

    setIsSending(true);
    setSendError(null);
    try {
      const ok = await onSendViaApi(driverPhone, messageText);
      if (ok) {
        setSendSuccess(true);
        setTimeout(() => {
          setSendSuccess(false);
          onClose();
        }, 1800);
      } else {
        setSendError('تعذر تأكيد الإرسال عبر خادم واتساب المركزي. راجع تنبيه الإرسال قبل المحاولة مجددًا لتجنب التكرار.');
      }
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'تعذر إرسال أمر المهمة.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', padding: '26px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(16, 185, 129, 0.4)'
            }}>
              <Truck size={22} color="#34d399" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff' }}>
                إرسال أمر مهمة للسائق عبر الواتساب
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
                تصل السائق رسالة واتساب شاملة الموقع ورقم العميل وتفاصيل التحصيل المالي دون الحاجة لتطبيق
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
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

        {/* Task Type Switcher */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#fbbf24', marginBottom: '6px' }}>
            نوع المهمة الميدانية المطلوبة:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setTaskType('delivery')}
              style={{
                padding: '10px',
                borderRadius: '10px',
                border: `2px solid ${taskType === 'delivery' ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}`,
                background: taskType === 'delivery' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                color: taskType === 'delivery' ? '#34d399' : '#94a3b8',
                fontFamily: 'inherit',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>📥 إنزال وتثبيت حاوية (توصيل)</span>
            </button>

            <button
              type="button"
              onClick={() => setTaskType('pickup')}
              style={{
                padding: '10px',
                borderRadius: '10px',
                border: `2px solid ${taskType === 'pickup' ? '#0ea5e9' : 'rgba(255, 255, 255, 0.1)'}`,
                background: taskType === 'pickup' ? 'rgba(14, 165, 233, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                color: taskType === 'pickup' ? '#38bdf8' : '#94a3b8',
                fontFamily: 'inherit',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <span>📤 سحب وتحميل حاوية (استرجاع)</span>
            </button>
          </div>
        </div>

        {/* Driver Selection */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '6px' }}>
            تحديد السائق المستلم:
          </label>
          <select
            className="form-input"
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
            style={{ fontWeight: 700 }}
          >
            {driverList.map(driver => (
              <option key={driver.id} value={driver.id}>
                🚛 {driver.full_name} — ({driver.phone})
              </option>
            ))}
          </select>
        </div>

        {/* Custom Notes */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
            ملاحظات إضافية للسائق (اختياري):
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="مثال: البوابة الخلفية للمشروع، أو التواصل مع الحارس"
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
          />
        </div>

        {/* Live WhatsApp Message Preview */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={14} />
              معاينة رسالة الواتساب التي ستصل لجوال السائق:
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              إلى: {driverPhone}
            </span>
          </div>

          <pre style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            padding: '14px',
            fontSize: '0.8rem',
            color: '#f8fafc',
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
            lineHeight: 1.6,
            maxHeight: '220px',
            overflowY: 'auto',
            margin: 0
          }}>
            {messageText}
          </pre>
        </div>

        {/* Success Alert */}
        {sendSuccess && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid #10b981',
            borderRadius: '8px',
            padding: '10px',
            color: '#34d399',
            fontSize: '0.88rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <CheckCircle2 size={18} />
            <span>تم إرسال أمر المهمة لجوال السائق بنجاح عبر الواتساب! 🚚</span>
          </div>
        )}
        {sendError && (
          <div role="alert" style={{
            background: 'rgba(239, 68, 68, 0.16)',
            border: '1px solid rgba(248, 113, 113, 0.6)',
            borderRadius: '8px',
            padding: '10px',
            color: '#fecaca',
            fontSize: '0.88rem',
            marginBottom: '16px'
          }}>
            {sendError}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            إلغاء
          </button>

          <button
            type="button"
            className="btn-emerald"
            onClick={handleSendApi}
            disabled={isSending || !isRealCallablePhone(driverPhone)}
            style={{ fontWeight: 800 }}
          >
            <Send size={16} />
            <span>{isSending ? 'جارٍ الإرسال...' : 'إرسال المهمة للسائق الآن 🚀'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
