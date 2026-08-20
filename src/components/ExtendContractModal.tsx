'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  RotateCw, 
  Calendar, 
  Clock, 
  Truck, 
  User, 
  DollarSign, 
  CreditCard, 
  Banknote, 
  Hourglass,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Contract } from '@/types/database';
import { PaymentChoice } from './NewContractModal';

interface ExtendContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  onConfirmExtension: (
    contractId: string, 
    additionalDays: number, 
    additionalCost: number, 
    paymentChoice: PaymentChoice, 
    newEndDate: string
  ) => Promise<boolean>;
}

export const ExtendContractModal: React.FC<ExtendContractModalProps> = ({
  isOpen,
  onClose,
  contract,
  onConfirmExtension
}) => {
  const [additionalDays, setAdditionalDays] = useState(1);
  const [additionalMonths, setAdditionalMonths] = useState(1);
  const [additionalCost, setAdditionalCost] = useState(150);
  const [newEndDate, setNewEndDate] = useState('');
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDebris = contract?.contract_type === 'debris';

  // Calculate new end date and additional cost whenever inputs change
  useEffect(() => {
    if (!contract) return;

    const baseEnd = new Date(contract.expected_pickup_time || contract.end_date || new Date());

    if (isDebris) {
      const dailyRate = contract.container?.daily_rate || 150;
      const cost = dailyRate * additionalDays;
      setAdditionalCost(cost);

      const nextDate = new Date(baseEnd.getTime() + additionalDays * 24 * 60 * 60 * 1000);
      setNewEndDate(nextDate.toISOString().slice(0, 16));
    } else {
      const monthlyRate = contract.container?.monthly_rate || 3500;
      const cost = monthlyRate * additionalMonths;
      setAdditionalCost(cost);

      const nextDate = new Date(baseEnd);
      nextDate.setMonth(nextDate.getMonth() + additionalMonths);
      setNewEndDate(nextDate.toISOString().slice(0, 16));
    }
  }, [contract, additionalDays, additionalMonths, isDebris]);

  if (!isOpen || !contract) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const daysToAdd = isDebris ? additionalDays : (additionalMonths * 30);
    const success = await onConfirmExtension(
      contract.id,
      daysToAdd,
      additionalCost,
      paymentChoice,
      new Date(newEndDate).toISOString()
    );

    setIsSubmitting(false);
    if (success) {
      onClose();
      setAdditionalDays(1);
      setAdditionalMonths(1);
      setPaymentChoice('cash');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', padding: '30px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RotateCw size={22} color="var(--accent-gold)" />
              <span>تمديد عقد الحاوية ({contract.contract_number})</span>
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '2px' }}>
              تأجيل موعد السحب، احتساب التكلفة الإضافية، وتوثيق السداد
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '34px',
              height: '34px',
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
            <X size={18} />
          </button>
        </div>

        {/* Current Info Card */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '14px 18px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '18px'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>العميل / المقاول</div>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff' }}>
              {contract.customer?.name || 'العميل'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>رقم الحاوية</div>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fbbf24' }}>
              {contract.container?.container_number || '-'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>الموعد الحالي للسحب</div>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#f87171' }}>
              {new Date(contract.expected_pickup_time || contract.end_date).toLocaleDateString('ar-SA')}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* 1. Duration Extension Picker */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {isDebris ? (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>
                  عدد الأيام الإضافية المطلوبة:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {[1, 2, 3, 5, 7, 10, 15].map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => setAdditionalDays(num)}
                      style={{
                        flex: '1 0 calc(25% - 6px)',
                        padding: '8px 0',
                        borderRadius: '8px',
                        border: `1px solid ${additionalDays === num ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                        background: additionalDays === num ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                        color: additionalDays === num ? '#38bdf8' : '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      +{num} يوم
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>
                  الأشهر الإضافية للتجديد:
                </label>
                <select
                  className="form-select"
                  value={additionalMonths}
                  onChange={(e) => setAdditionalMonths(Number(e.target.value))}
                >
                  <option value={1}>+ شهر واحد (1)</option>
                  <option value={3}>+ 3 أشهر</option>
                  <option value={6}>+ 6 أشهر (نصف سنوي)</option>
                  <option value={12}>+ 12 شهر (سنة كاملة)</option>
                </select>
              </div>
            )}

            {/* New Pickup Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#34d399' }}>
                موعد السحب الجديد بعد التمديد:
              </label>
              <input
                type="datetime-local"
                className="form-input"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                required
                style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.08)' }}
              />
            </div>
          </div>

          {/* 2. Financial Summary Strip */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>التكلفة السابقة</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#e2e8f0' }}>
                {contract.total_cost} ر.س
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#fbbf24' }}>قيمة التمديد الإضافي</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fbbf24' }}>
                +{additionalCost} ر.س
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#34d399' }}>إجمالي العقد الجديد</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#34d399' }}>
                {contract.total_cost + additionalCost} ر.س
              </div>
            </div>
          </div>

          {/* 3. Payment Method Choice Matrix for Extension */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.9)',
            border: '2px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '14px',
            padding: '14px 18px'
          }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '800', color: '#fbbf24', marginBottom: '8px' }}>
              طريقة سداد قيمة التمديد (+{additionalCost} ر.س):
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              
              {/* Cash */}
              <div
                onClick={() => setPaymentChoice('cash')}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: `2px solid ${paymentChoice === 'cash' ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}`,
                  background: paymentChoice === 'cash' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(2, 6, 23, 0.6)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <Banknote size={20} color={paymentChoice === 'cash' ? '#34d399' : '#94a3b8'} style={{ margin: '0 auto 2px auto' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: paymentChoice === 'cash' ? '#34d399' : '#ffffff' }}>
                  💵 كاش (مستلم)
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  سند قبض تمديد فوري
                </div>
              </div>

              {/* Sadad */}
              <div
                onClick={() => setPaymentChoice('sadad')}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: `2px solid ${paymentChoice === 'sadad' ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)'}`,
                  background: paymentChoice === 'sadad' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(2, 6, 23, 0.6)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <CreditCard size={20} color={paymentChoice === 'sadad' ? '#fbbf24' : '#94a3b8'} style={{ margin: '0 auto 2px auto' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: paymentChoice === 'sadad' ? '#fbbf24' : '#ffffff' }}>
                  💳 سداد (إلكتروني)
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  إرسال رابط بالواتساب
                </div>
              </div>

              {/* Postpaid */}
              <div
                onClick={() => setPaymentChoice('postpaid')}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: `2px solid ${paymentChoice === 'postpaid' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                  background: paymentChoice === 'postpaid' ? 'rgba(14, 165, 233, 0.2)' : 'rgba(2, 6, 23, 0.6)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <Hourglass size={20} color={paymentChoice === 'postpaid' ? '#38bdf8' : '#94a3b8'} style={{ margin: '0 auto 2px auto' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: paymentChoice === 'postpaid' ? '#38bdf8' : '#ffffff' }}>
                  ⏳ آجل (على الحساب)
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  تحصيل عند السحب النهائي
                </div>
              </div>

            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '6px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              إلغاء
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              style={{ minWidth: '220px', padding: '10px 20px', fontSize: '0.92rem' }}
            >
              {isSubmitting ? 'جارٍ التمديد...' : 'تأكيد التمديد وتحديث الموعد'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
