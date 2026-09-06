'use client';

import React, { useState } from 'react';
import { 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Key, 
  Lock, 
  Building2, 
  FileText,
  DollarSign,
  Smartphone,
  Sparkles
} from 'lucide-react';
import { PaymentSettings as IPaymentSettings } from '@/types/database';

interface PaymentSettingsProps {
  settings: IPaymentSettings;
  onSaveSettings: (updated: IPaymentSettings) => Promise<boolean>;
}

export const PaymentSettings: React.FC<PaymentSettingsProps> = ({
  settings,
  onSaveSettings
}) => {
  const [isEnabled, setIsEnabled] = useState(settings.is_enabled ?? true);
  const [publishableKey, setPublishableKey] = useState(settings.publishable_key || '');
  const [secretKey, setSecretKey] = useState(settings.secret_key || '');
  const [applePayEnabled, setApplePayEnabled] = useState(settings.apple_pay_enabled ?? true);
  const [madaEnabled, setMadaEnabled] = useState(settings.mada_enabled ?? true);
  const [creditCardEnabled, setCreditCardEnabled] = useState(settings.credit_card_enabled ?? true);
  const [vatNumber, setVatNumber] = useState(settings.vat_number || '300099887700003');
  const [commercialReg, setCommercialReg] = useState(settings.company_commercial_reg || '1010889900');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const updated: IPaymentSettings = {
      ...settings,
      is_enabled: isEnabled,
      publishable_key: publishableKey,
      secret_key: secretKey,
      apple_pay_enabled: applePayEnabled,
      mada_enabled: madaEnabled,
      credit_card_enabled: creditCardEnabled,
      vat_number: vatNumber,
      company_commercial_reg: commercialReg,
      updated_at: new Date().toISOString()
    };

    const ok = await onSaveSettings(updated);
    setIsSaving(false);
    if (ok) {
      alert('تم حفظ إعدادات بوابة الدفع الإلكتروني بنجاح!');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header */}
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.85rem', fontWeight: '700', marginBottom: '4px' }}>
          <ShieldCheck size={16} />
          <span>خاص بالإدارة المالية</span>
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#ffffff' }}>
          إعدادات بوابة الدفع وسندات القبض (Moyasar Gateway)
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
          التحكم في تفعيل أو تعطيل السداد الإلكتروني وتخصيص بيانات الفواتير وسندات القبض الرسمية
        </p>
      </div>

      {/* Feature Toggle Banner */}
      <div className="glass-panel" style={{
        padding: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        borderRight: `4px solid ${isEnabled ? '#10b981' : '#f59e0b'}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: isEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${isEnabled ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
          }}>
            <CreditCard size={28} color={isEnabled ? '#34d399' : '#fbbf24'} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff' }}>
                حالة بوابة الدفع الإلكتروني (Moyasar):
              </h3>
              <span style={{
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 800,
                background: isEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                color: isEnabled ? '#34d399' : '#fbbf24',
                border: `1px solid ${isEnabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
              }}>
                {isEnabled ? '🟢 مفعلة (Apple Pay / مدى نشطة)' : '🟠 معطلة (اعتماد السداد اليدوي فقط)'}
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
              {isEnabled 
                ? 'تظهر أزرار توليد روابط الدفع الإلكتروني في بطاقات العقود وتتيح للعميل السداد الفوري عبر جواله.'
                : 'يتم إخفاء روابط الدفع الإلكتروني ويعتمد النظام بالكامل على السداد اليدوي (كاش / شبكة / تحويل) لمنع أي توقف.'}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(15, 23, 42, 0.7)',
          padding: '12px 18px',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ffffff' }}>مفتاح تفعيل البوابة</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>تشغيل / إيقاف الدفع الإلكتروني</div>
          </div>
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: '#10b981' }}
          />
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
        
        {/* Moyasar API Keys (Visible if enabled) */}
        {isEnabled && (
          <>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={18} />
              <span>مفاتيح الربط لبوابة Moyasar:</span>
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>
                  المفتاح العام (Publishable Key):
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={publishableKey}
                  onChange={(e) => setPublishableKey(e.target.value)}
                  placeholder="pk_live_..."
                  style={{ direction: 'ltr', textAlign: 'left' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>
                  المفتاح السري (Secret Key):
                </label>
                <input
                  type="password"
                  className="form-input"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="sk_live_..."
                  style={{ direction: 'ltr', textAlign: 'left' }}
                  required
                />
              </div>
            </div>

            {/* Methods Checkboxes */}
            <div style={{
              display: 'flex',
              gap: '24px',
              flexWrap: 'wrap',
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '16px 20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#ffffff', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={applePayEnabled}
                  onChange={(e) => setApplePayEnabled(e.target.checked)}
                  style={{ accentColor: '#10b981', width: '18px', height: '18px' }}
                />
                <span>🍏 تفعيل Apple Pay</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#ffffff', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={madaEnabled}
                  onChange={(e) => setMadaEnabled(e.target.checked)}
                  style={{ accentColor: '#10b981', width: '18px', height: '18px' }}
                />
                <span>💳 تفعيل بطاقات مدى (Mada)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#ffffff', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={creditCardEnabled}
                  onChange={(e) => setCreditCardEnabled(e.target.checked)}
                  style={{ accentColor: '#10b981', width: '18px', height: '18px' }}
                />
                <span>🌐 تفعيل البطاقات الائتمانية (Visa / MasterCard)</span>
              </label>
            </div>
          </>
        )}

        {/* Company & VAT Info (for Receipts) */}
        <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Building2 size={18} />
          <span>بيانات المنشأة في سندات القبض المطبوعة (Receipt Header):</span>
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>
              الرقم الضريبي للمنشأة (VAT Number):
            </label>
            <input
              type="text"
              className="form-input"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              placeholder="300099887700003"
              style={{ direction: 'ltr', textAlign: 'left' }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#e2e8f0' }}>
              رقم السجل التجاري (Commercial Reg):
            </label>
            <input
              type="text"
              className="form-input"
              value={commercialReg}
              onChange={(e) => setCommercialReg(e.target.value)}
              placeholder="1010889900"
              style={{ direction: 'ltr', textAlign: 'left' }}
              required
            />
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={isSaving}
            style={{ minWidth: '160px' }}
          >
            {isSaving ? 'جارٍ الحفظ...' : 'حفظ إعدادات الدفع'}
          </button>
        </div>

      </form>
    </div>
  );
};
