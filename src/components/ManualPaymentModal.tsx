'use client';

import React, { useEffect, useState } from 'react';
import { 
  X, 
  DollarSign, 
  CheckCircle2, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Building2,
  FileCheck
} from 'lucide-react';
import { Contract, PaymentMethod } from '@/types/database';

interface ManualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  initialPaymentMethod?: PaymentMethod;
  onConfirmPayment: (contractId: string, amount: number, method: PaymentMethod, notes?: string) => Promise<boolean>;
}

export const ManualPaymentModal: React.FC<ManualPaymentModalProps> = ({
  isOpen,
  onClose,
  contract,
  initialPaymentMethod = 'cash',
  onConfirmPayment
}) => {
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialPaymentMethod);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remaining = contract
    ? Number(contract.remaining_amount ?? (contract.total_cost - contract.paid_amount))
    : 0;

  useEffect(() => {
    if (!isOpen || !contract) return;
    setPaymentAmount(Math.max(0, remaining));
    setPaymentMethod(initialPaymentMethod);
    setNotes('');
  }, [contract?.id, initialPaymentMethod, isOpen, remaining]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || paymentAmount <= 0 || paymentAmount > remaining) {
      alert('يرجى إدخال مبلغ صحيح لا يتجاوز المبلغ المتبقي.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onConfirmPayment(contract.id, paymentAmount, paymentMethod, notes);
      if (success) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !contract) return null;

  return (
    <div className="modal-backdrop" onClick={isSubmitting ? undefined : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: '28px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Banknote size={22} color="#10b981" />
              <span>تسجيل سداد يدوي (كاش / شبكة / تحويل)</span>
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
              العقد: <strong style={{ color: '#fbbf24' }}>{contract.contract_number}</strong> — العميل: {contract.customer?.name}
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
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

        {/* Contract Finance Summary */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>إجمالي العقد</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>{contract.total_cost} ر.س</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>المدفوع سابقاً</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8' }}>{contract.paid_amount} ر.س</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>المتبقي المطلوب</div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: remaining > 0 ? '#f87171' : '#34d399' }}>
              {remaining} ر.س
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Amount Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', marginBottom: '6px', color: '#fbbf24' }}>
              المبلغ المستلم الآن (ريال سعودي):
            </label>
            <input
              type="number"
              min="1"
              max={remaining}
              step="0.01"
              className="form-input"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
              style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}
              required
            />
          </div>

          {/* Payment Method Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '700', marginBottom: '8px', color: '#e2e8f0' }}>
              طريقة الاستلام والسداد:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              
              {/* Cash */}
              <div
                onClick={() => setPaymentMethod('cash')}
                style={{
                  padding: '12px 10px',
                  borderRadius: '10px',
                  border: `2px solid ${paymentMethod === 'cash' ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}`,
                  background: paymentMethod === 'cash' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <Banknote size={20} color={paymentMethod === 'cash' ? '#34d399' : '#94a3b8'} style={{ margin: '0 auto 4px auto' }} />
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: paymentMethod === 'cash' ? '#34d399' : '#ffffff' }}>
                  نقدي (كاش)
                </div>
              </div>

              {/* POS / Mada machine */}
              <div
                onClick={() => setPaymentMethod('pos')}
                style={{
                  padding: '12px 10px',
                  borderRadius: '10px',
                  border: `2px solid ${paymentMethod === 'pos' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                  background: paymentMethod === 'pos' ? 'rgba(14, 165, 233, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <CreditCard size={20} color={paymentMethod === 'pos' ? '#38bdf8' : '#94a3b8'} style={{ margin: '0 auto 4px auto' }} />
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: paymentMethod === 'pos' ? '#38bdf8' : '#ffffff' }}>
                  شبكة (POS)
                </div>
              </div>

              {/* Bank Transfer */}
              <div
                onClick={() => setPaymentMethod('bank_transfer')}
                style={{
                  padding: '12px 10px',
                  borderRadius: '10px',
                  border: `2px solid ${paymentMethod === 'bank_transfer' ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)'}`,
                  background: paymentMethod === 'bank_transfer' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <Building2 size={20} color={paymentMethod === 'bank_transfer' ? '#fbbf24' : '#94a3b8'} style={{ margin: '0 auto 4px auto' }} />
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: paymentMethod === 'bank_transfer' ? '#fbbf24' : '#ffffff' }}>
                  تحويل بنكي
                </div>
              </div>

            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#94a3b8' }}>
              ملاحظات أو رقم الحوالة (اختياري):
            </label>
            <input
              type="text"
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={paymentMethod === 'bank_transfer' ? 'مثال: رقم مرجع الحوالة أو اسم البنك' : 'أدخل تفاصيل التحصيل'}
            />
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
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
              className="btn-emerald"
              disabled={isSubmitting}
              style={{ minWidth: '160px' }}
            >
              <FileCheck size={16} />
              <span>{isSubmitting ? 'جارٍ الحفظ...' : 'تأكيد وإصدار الفاتورة'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
