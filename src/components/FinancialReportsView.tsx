'use client';

import React, { useMemo } from 'react';
import { CalendarDays, CreditCard, FileText, TrendingUp, Wallet } from 'lucide-react';
import type { Contract, Receipt } from '@/types/database';

interface FinancialReportsViewProps {
  contracts: Contract[];
  receipts: Receipt[];
  isLoading: boolean;
}

function getSaudiDateKey(value: string | Date): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function getWeekStart(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - date.getUTCDay());
  return date.toISOString().slice(0, 10);
}

function sumAmounts(receipts: Receipt[], method?: Receipt['payment_method']): number {
  return receipts.reduce((total, receipt) => {
    if (method && receipt.payment_method !== method) return total;
    return total + Math.max(0, Number(receipt.amount) || 0);
  }, 0);
}

export const FinancialReportsView: React.FC<FinancialReportsViewProps> = ({
  contracts,
  receipts,
  isLoading
}) => {
  const report = useMemo(() => {
    const today = getSaudiDateKey(new Date());
    const [year, month] = today.split('-').map(Number);
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonthStart = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
    const weekStart = getWeekStart(today);
    const weekEnd = new Date(`${weekStart}T00:00:00Z`);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    const weekEndKey = weekEnd.toISOString().slice(0, 10);

    const datedReceipts = receipts.flatMap(receipt => {
      const date = receipt.issued_at || receipt.created_at;
      return date ? [{ receipt, dateKey: getSaudiDateKey(date) }] : [];
    });
    const weeklyReceipts = datedReceipts
      .filter(item => item.dateKey >= weekStart && item.dateKey <= weekEndKey)
      .map(item => item.receipt);
    const monthlyReceipts = datedReceipts
      .filter(item => item.dateKey >= monthStart && item.dateKey < nextMonthStart)
      .map(item => item.receipt);
    const monthlyContracts = contracts.filter(contract => {
      if (!contract.created_at || contract.is_free || contract.payment_method === 'free') return false;
      const date = getSaudiDateKey(contract.created_at);
      return date >= monthStart && date < nextMonthStart;
    });

    const unpaidBalance = contracts.reduce((total, contract) => {
      if (contract.is_free || contract.payment_method === 'free') return total;
      const remaining = Number(contract.remaining_amount ?? (contract.total_cost - contract.paid_amount));
      return total + Math.max(0, Number.isFinite(remaining) ? remaining : 0);
    }, 0);

    return {
      today,
      weekStart,
      weekEnd: weekEndKey,
      monthStart,
      weeklyReceipts,
      monthlyReceipts,
      monthlyContractValue: monthlyContracts.reduce((total, contract) => total + (Number(contract.total_cost) || 0), 0),
      unpaidBalance
    };
  }, [contracts, receipts]);

  const formatCurrency = (amount: number) => `${amount.toLocaleString('ar-SA')} ر.س`;
  const periodLabel = (start: string, end: string) => `${start} — ${end}`;

  const cards = [
    {
      title: 'المحصّل هذا الأسبوع',
      amount: sumAmounts(report.weeklyReceipts),
      detail: `من ${periodLabel(report.weekStart, report.weekEnd)}`,
      icon: CalendarDays,
      color: '#38bdf8'
    },
    {
      title: 'المحصّل هذا الشهر',
      amount: sumAmounts(report.monthlyReceipts),
      detail: `من ${report.monthStart} حتى ${report.today}`,
      icon: TrendingUp,
      color: '#34d399'
    },
    {
      title: 'قيمة العقود المنشأة هذا الشهر',
      amount: report.monthlyContractValue,
      detail: 'قيمة العقود الجديدة خلال الشهر الحالي',
      icon: FileText,
      color: '#fbbf24'
    },
    {
      title: 'المتبقي غير المحصّل',
      amount: report.unpaidBalance,
      detail: 'رصيد العقود المتبقي والمرحّل حتى اليوم',
      icon: Wallet,
      color: '#fb7185'
    }
  ];

  return (
    <section dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#fbbf24', fontSize: '0.82rem', fontWeight: 800 }}>
            <CreditCard size={17} />
            <span>ملخص الإيرادات والتحصيلات</span>
          </div>
          <h1 style={{ margin: '7px 0 0', color: '#fff', fontSize: '1.65rem', fontWeight: 900 }}>
            التقارير المالية
          </h1>
          <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
            أرقام إرشادية من العقود والفواتير المسجلة، والرصيد المتبقي ينتقل ضمن الإجمالي حتى تحصيله.
          </p>
        </div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 13px',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(15,23,42,0.65)',
          color: '#cbd5e1',
          fontSize: '0.82rem',
          fontWeight: 700
        }}>
          <CalendarDays size={16} color="#fbbf24" />
          {report.today}
        </div>
      </header>

      {isLoading ? (
        <div role="status" style={{
          padding: 22,
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(15,23,42,0.65)',
          color: '#cbd5e1',
          textAlign: 'center'
        }}>
          جارٍ تحميل بيانات التقارير المالية...
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 16
          }}>
            {cards.map(({ title, amount, detail, icon: Icon, color }) => (
              <article key={title} style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '20px 21px',
                minHeight: 145,
                borderRadius: 18,
                border: `1px solid ${color}35`,
                background: 'linear-gradient(145deg, rgba(15,23,42,0.96), rgba(8,12,20,0.9))',
                boxShadow: '0 12px 30px rgba(0,0,0,0.18)'
              }}>
                <div style={{
                  position: 'absolute',
                  top: -33,
                  left: -25,
                  width: 105,
                  height: 105,
                  borderRadius: '50%',
                  background: `${color}12`,
                  filter: 'blur(3px)'
                }} />
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <div style={{ color: '#cbd5e1', fontSize: '0.86rem', fontWeight: 700 }}>{title}</div>
                    <div style={{ marginTop: 15, color, fontSize: '1.55rem', fontWeight: 900, lineHeight: 1.2 }}>
                      {formatCurrency(amount)}
                    </div>
                    <div style={{ marginTop: 9, color: '#94a3b8', fontSize: '0.74rem', lineHeight: 1.5 }}>{detail}</div>
                  </div>
                  <span style={{
                    width: 39,
                    height: 39,
                    flex: '0 0 auto',
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 12,
                    background: `${color}18`,
                    color
                  }}>
                    <Icon size={20} />
                  </span>
                </div>
              </article>
            ))}
          </div>

          <div style={{
            padding: '15px 18px',
            borderRadius: 14,
            border: '1px solid rgba(148,163,184,0.16)',
            background: 'rgba(15,23,42,0.48)',
            color: '#94a3b8',
            fontSize: '0.78rem',
            lineHeight: 1.8
          }}>
            <strong style={{ color: '#cbd5e1' }}>طريقة القراءة:</strong>{' '}
            المحصّل يُحسب حسب تاريخ إصدار الفاتورة. قيمة العقود تخص العقود المنشأة هذا الشهر، أما المتبقي فهو الرصيد الحالي غير المحصّل على العقود، ويشمل الأرصدة المرحلة من أشهر سابقة.
          </div>
        </>
      )}
    </section>
  );
};
