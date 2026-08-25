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
    newEndDate: string,
    paidAmount?: number,
    discountAmount?: number,
    downPayment?: number
  ) => Promise<boolean>;
}

export const ExtendContractModal: React.FC<ExtendContractModalProps> = ({
  isOpen,
  onClose,
  contract,
  onConfirmExtension
}) => {
  const [extendMode, setExtendMode] = useState<'days' | 'months'>('days');
  const [additionalDays, setAdditionalDays] = useState(1);
  const [additionalMonths, setAdditionalMonths] = useState(1);
  const [baseExtensionCost, setBaseExtensionCost] = useState(150);
  const [discountAmount, setDiscountAmount] = useState(0); // خصم
  const [downPayment, setDownPayment] = useState(0); // دفعة على الحساب
  const [newEndDate, setNewEndDate] = useState('');
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDebris = contract?.contract_type === 'debris';

  // Initialize extendMode based on contract's period_type
  useEffect(() => {
    if (contract) {
      if (contract.period_type === 'monthly' || contract.contract_type === 'commercial') {
        setExtendMode('months');
      } else {
        setExtendMode('days');
      }
    }
  }, [contract]);

  // Calculate new end date and base cost whenever inputs change
  useEffect(() => {
    if (!contract) return;

    const baseEnd = new Date(contract.expected_pickup_time || contract.end_date || new Date());

    if (extendMode === 'days') {
      const dailyRate = contract.container?.daily_rate > 0 ? contract.container.daily_rate : 150;
      const cost = dailyRate * additionalDays;
      setBaseExtensionCost(cost);

      const nextDate = new Date(baseEnd.getTime() + additionalDays * 24 * 60 * 60 * 1000);
      setNewEndDate(nextDate.toISOString().slice(0, 16));
    } else {
      let monthlyRate = contract.container?.monthly_rate || 0;
      if (monthlyRate <= 0) {
        monthlyRate = contract.container?.daily_rate > 0 ? contract.container.daily_rate * 25 : 2000;
      }
      const cost = monthlyRate * additionalMonths;
      setBaseExtensionCost(cost);

      const nextDate = new Date(baseEnd);
      nextDate.setMonth(nextDate.getMonth() + additionalMonths);
      setNewEndDate(nextDate.toISOString().slice(0, 16));
    }
  }, [contract, additionalDays, additionalMonths, extendMode]);

  if (!isOpen || !contract) return null;

  // Derived Financial Calculations
  const netExtensionCost = Math.max(0, baseExtensionCost - (discountAmount || 0));
  const effectivePaidAmount = paymentChoice === 'cash'
    ? (downPayment > 0 ? downPayment : netExtensionCost)
    : (downPayment > 0 ? downPayment : 0);
  const remainingExtensionAmount = Math.max(0, netExtensionCost - effectivePaidAmount);

  // Overall Contract Impact
  const newContractTotal = (contract.total_cost || 0) + netExtensionCost;
  const newContractPaid = (contract.paid_amount || 0) + effectivePaidAmount;
  const newContractRemaining = Math.max(0, newContractTotal - newContractPaid);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const daysToAdd = isDebris ? additionalDays : (additionalMonths * 30);
    const success = await onConfirmExtension(
      contract.id,
      daysToAdd,
      netExtensionCost,
      paymentChoice,
      new Date(newEndDate).toISOString(),
      effectivePaidAmount,
      discountAmount,
      downPayment
    );

    setIsSubmitting(false);
    if (success) {
      onClose();
      setAdditionalDays(1);
      setAdditionalMonths(1);
      setDiscountAmount(0);
      setDownPayment(0);
      setPaymentChoice('cash');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px', padding: '26px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RotateCw size={22} color="var(--accent-gold)" />
              <span>تمديد عقد الحاوية ({contract.contract_number})</span>
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
              تأجيل موعد السحب، تطبيق الخصومات والدفعات، وتوثيق السداد
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
          padding: '12px 16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          marginBottom: '16px'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>العميل / المقاول</div>
            <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#ffffff' }}>
              {contract.customer?.name || 'العميل'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>رقم الحاوية</div>
            <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#fbbf24' }}>
              {contract.container?.container_number || '-'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>الموعد الحالي للسحب</div>
            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#f87171' }}>
              {new Date(contract.expected_pickup_time || contract.end_date).toLocaleDateString('ar-SA')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>المدفوع سابقاً</div>
            <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#34d399' }}>
              {contract.paid_amount || 0} ر.س
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* 1. Duration Extension Picker */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              {/* Mode Toggle for Debris */}
              {isDebris && (
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setExtendMode('days')}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: extendMode === 'days' ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: extendMode === 'days' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                      color: extendMode === 'days' ? '#38bdf8' : '#94a3b8',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    📅 تمديد بالأيام
                  </button>
                  <button
                    type="button"
                    onClick={() => setExtendMode('months')}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: extendMode === 'months' ? '2px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: extendMode === 'months' ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
                      color: extendMode === 'months' ? '#f472b6' : '#94a3b8',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    📆 تمديد بالأشهر
                  </button>
                </div>
              )}

              {extendMode === 'days' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>
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
                          padding: '6px 0',
                          borderRadius: '8px',
                          border: `1px solid ${additionalDays === num ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                          background: additionalDays === num ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                          color: additionalDays === num ? '#38bdf8' : '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.82rem',
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
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>
                    الأشهر الإضافية للتجديد:
                  </label>
                  <select
                    className="form-select"
                    value={additionalMonths}
                    onChange={(e) => setAdditionalMonths(Number(e.target.value))}
                  >
                    <option value={1}>+ شهر واحد (1)</option>
                    <option value={2}>+ شهرين (2)</option>
                    <option value={3}>+ 3 أشهر</option>
                    <option value={6}>+ 6 أشهر (نصف سنوي)</option>
                    <option value={12}>+ 12 شهر (سنة كاملة)</option>
                  </select>
                </div>
              )}
            </div>

            {/* New Pickup Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '6px', color: '#34d399' }}>
                موعد السحب الجديد بعد التمديد:
              </label>
              <input
                type="datetime-local"
                className="form-input"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                required
                style={{ borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.08)', height: '38px' }}
              />
            </div>
          </div>

          {/* 2. Financial Summary Strip (4 Columns + Discount Strip) */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '14px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            
            {/* 4-Column Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              textAlign: 'center'
            }}>
              {/* 1. قيمة التمديد (إجمالي المبلغ) */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '8px 4px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: '2px', fontWeight: 700 }}>
                  إجمالي المبلغ
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fbbf24' }}>
                  {netExtensionCost} <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>ر.س</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                    الأصل: {baseExtensionCost} ر.س
                  </div>
                )}
              </div>

              {/* 2. دفعة على الحساب */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '10px',
                padding: '6px 4px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#38bdf8', marginBottom: '2px', fontWeight: 700 }}>
                  دفعة على الحساب
                </label>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                  <input
                    type="number"
                    min="0"
                    max={netExtensionCost}
                    className="form-input"
                    style={{
                      height: '28px',
                      padding: '2px 4px',
                      fontSize: '0.9rem',
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
                      const val = Math.max(0, Math.min(netExtensionCost, Number(e.target.value) || 0));
                      setDownPayment(val);
                    }}
                  />
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>ر.س</span>
                </div>
              </div>

              {/* 3. المبلغ المدفوع */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '10px',
                padding: '8px 4px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <div style={{ fontSize: '0.74rem', color: '#34d399', marginBottom: '2px', fontWeight: 700 }}>
                  المبلغ المدفوع
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#34d399' }}>
                  {effectivePaidAmount} <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>ر.س</span>
                </div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                  {paymentChoice === 'cash' && downPayment === 0 ? 'سداد كامل' : downPayment > 0 ? 'دفعة تمديد' : 'غير مسدد'}
                </div>
              </div>

              {/* 4. المبلغ المتبقي */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: `1px solid ${remainingExtensionAmount > 0 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
                borderRadius: '10px',
                padding: '8px 4px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <div style={{ fontSize: '0.74rem', color: remainingExtensionAmount > 0 ? '#f87171' : '#34d399', marginBottom: '2px', fontWeight: 700 }}>
                  المبلغ المتبقي
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: remainingExtensionAmount > 0 ? '#f87171' : '#34d399' }}>
                  {remainingExtensionAmount} <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>ر.س</span>
                </div>
                <div style={{ fontSize: '0.65rem', color: remainingExtensionAmount > 0 ? '#fca5a5' : '#86efac' }}>
                  {remainingExtensionAmount > 0 ? 'متبقي للتمديد' : 'مسدد بالكامل ✅'}
                </div>
              </div>
            </div>

            {/* Discount Strip */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#e2e8f0' }}>
                  خصم:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '110px' }}>
                  <input
                    type="number"
                    min="0"
                    max={baseExtensionCost}
                    className="form-input"
                    style={{
                      height: '28px',
                      padding: '2px 6px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      color: '#fbbf24',
                      background: 'rgba(245, 158, 11, 0.08)',
                      borderColor: 'rgba(245, 158, 11, 0.3)'
                    }}
                    value={discountAmount === 0 ? '' : discountAmount}
                    placeholder="0"
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(baseExtensionCost, Number(e.target.value) || 0));
                      setDiscountAmount(val);
                    }}
                  />
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>ر.س</span>
                </div>
              </div>

              {/* Quick Discount Chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {[0, 20, 50, 100].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDiscountAmount(amt)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: `1px solid ${discountAmount === amt ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: discountAmount === amt ? 'rgba(245, 158, 11, 0.2)' : 'rgba(15, 23, 42, 0.5)',
                      color: discountAmount === amt ? '#fbbf24' : '#94a3b8',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {amt === 0 ? 'بدون خصم' : `خصم ${amt} ر.س`}
                  </button>
                ))}
              </div>
            </div>

            {/* Overall Contract Status Bar */}
            <div style={{
              fontSize: '0.76rem',
              color: '#94a3b8',
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: '6px'
            }}>
              <span>إجمالي العقد التراكمي: <b style={{ color: '#ffffff' }}>{newContractTotal} ر.س</b></span>
              <span>المسدد الكلي: <b style={{ color: '#34d399' }}>{newContractPaid} ر.س</b></span>
              <span>المتبقي الكلي: <b style={{ color: newContractRemaining > 0 ? '#f87171' : '#34d399' }}>{newContractRemaining} ر.س</b></span>
            </div>

          </div>

          {/* 3. Payment Method Choice Matrix for Extension */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.9)',
            border: '2px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '14px',
            padding: '12px 16px'
          }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '800', color: '#fbbf24', marginBottom: '8px' }}>
              طريقة سداد قيمة التمديد (+{netExtensionCost} ر.س):
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
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: paymentChoice === 'cash' ? '#34d399' : '#ffffff' }}>
                  💵 كاش (مستلم)
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
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
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: paymentChoice === 'sadad' ? '#fbbf24' : '#ffffff' }}>
                  💳 سداد (إلكتروني)
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
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
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: paymentChoice === 'postpaid' ? '#38bdf8' : '#ffffff' }}>
                  ⏳ آجل (على الحساب)
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  تحصيل عند السحب النهائي
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
