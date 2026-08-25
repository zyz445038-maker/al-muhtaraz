'use client';

import React, { useState, useMemo, useRef } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Download, 
  Upload, 
  RefreshCw, 
  Send, 
  Phone, 
  MessageSquare, 
  Building2, 
  User, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet, 
  Filter, 
  Sparkles, 
  Tag, 
  Trash2, 
  Edit3, 
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  Megaphone,
  Radio,
  Play,
  Pause,
  X
} from 'lucide-react';
import { 
  MarketingCustomer, 
  CustomerCategory, 
  DEFAULT_CAMPAIGN_TEMPLATES, 
  CampaignTemplate 
} from '@/types/customerMarketing';
import { UserRole } from '@/types/database';
import { isRealCallablePhone } from '@/components/SaudiPhoneInput';
import confetti from 'canvas-confetti';

interface CustomersDirectoryViewProps {
  customers: MarketingCustomer[];
  userRole: UserRole;
  onSaveCustomer: (customer: MarketingCustomer) => void;
  onDeleteCustomer: (id: string) => void;
  onSyncCustomersFromContracts: () => number;
  onSendSingleWhatsApp: (phone: string, message: string) => void;
  onBulkSendCampaign: (recipients: { name: string; phone: string }[], messageTemplate: string, onProgress: (sent: number, total: number) => void) => Promise<void>;
}

export const CustomersDirectoryView: React.FC<CustomersDirectoryViewProps> = ({
  customers,
  userRole,
  onSaveCustomer,
  onDeleteCustomer,
  onSyncCustomersFromContracts,
  onSendSingleWhatsApp,
  onBulkSendCampaign
}) => {
  // Main Tab: 'directory' | 'campaign'
  const [activeMainTab, setActiveMainTab] = useState<'directory' | 'campaign'>('directory');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | CustomerCategory>('all');
  const [onlyOptedIn, setOnlyOptedIn] = useState(false);

  // Table selection
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<MarketingCustomer | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Form State for Add / Edit
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCategory, setFormCategory] = useState<CustomerCategory>('individual');
  const [formAddress, setFormAddress] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formOptIn, setFormOptIn] = useState(true);

  // Campaign State
  const [campaignTarget, setCampaignTarget] = useState<'all' | 'selected' | 'companies' | 'individuals'>('all');
  const [campaignMessage, setCampaignMessage] = useState(DEFAULT_CAMPAIGN_TEMPLATES[0].message);
  const [isCampaignSending, setIsCampaignSending] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState({ sent: 0, total: 0 });

  // Open Edit
  const handleOpenEdit = (c: MarketingCustomer) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormCategory(c.category);
    setFormAddress(c.address || '');
    setFormTags(c.tags?.join(', ') || '');
    setFormNotes(c.notes || '');
    setFormOptIn(c.marketing_opt_in);
    setIsAddModalOpen(true);
  };

  // Open New
  const handleOpenNew = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormCategory('individual');
    setFormAddress('');
    setFormTags('');
    setFormNotes('');
    setFormOptIn(true);
    setIsAddModalOpen(true);
  };

  // Save Customer Handler
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      alert('يرجى كتابة اسم العميل ورقم الجوال.');
      return;
    }

    const tagsArray = formTags
      .split(/[,،]+/)
      .map(t => t.trim())
      .filter(Boolean);

    const updated: MarketingCustomer = {
      id: editingCustomer?.id || `cust-${Date.now()}`,
      name: formName.trim(),
      phone: formPhone.trim(),
      category: formCategory,
      address: formAddress.trim() || undefined,
      tags: tagsArray,
      notes: formNotes.trim() || undefined,
      total_contracts: editingCustomer?.total_contracts || 0,
      last_deal_date: editingCustomer?.last_deal_date,
      marketing_opt_in: formOptIn,
      source: editingCustomer?.source || 'manual',
      created_at: editingCustomer?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onSaveCustomer(updated);
    setIsAddModalOpen(false);
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
  };

  // Sync Customers from existing contracts
  const handleSyncContracts = () => {
    const addedCount = onSyncCustomersFromContracts();
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    alert(`تم فحص ومزامنة العقود بنجاح! تم استخراج وإضافة (${addedCount}) عميل جديد إلى قاعدة البيانات.`);
  };

  // Filtered Customers List
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(term);
        const matchesPhone = c.phone.toLowerCase().includes(term);
        const matchesTags = c.tags?.some(t => t.toLowerCase().includes(term));
        const matchesAddress = c.address?.toLowerCase().includes(term);
        if (!matchesName && !matchesPhone && !matchesTags && !matchesAddress) return false;
      }
      // Category
      if (selectedCategory !== 'all' && c.category !== selectedCategory) {
        return false;
      }
      // Opt In
      if (onlyOptedIn && !c.marketing_opt_in) {
        return false;
      }
      return true;
    });
  }, [customers, searchTerm, selectedCategory, onlyOptedIn]);

  // Select all / Deselect all
  const handleToggleSelectAll = () => {
    if (selectedCustomerIds.size === filteredCustomers.length) {
      setSelectedCustomerIds(new Set());
    } else {
      setSelectedCustomerIds(new Set(filteredCustomers.map(c => c.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedCustomerIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCustomerIds(next);
  };

  // Export to CSV / Excel File
  const handleExportCSV = () => {
    if (customers.length === 0) {
      alert('قاعدة بيانات العملاء فارغة حالياً.');
      return;
    }

    const headers = ['الاسم', 'الجوال', 'التصنيف', 'الوسوم', 'عدد العقود', 'آخر تعامل', 'مشترك بالرسائل', 'العنوان', 'ملاحظات'];
    const rows = customers.map(c => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      c.category === 'company' ? 'شركة' : c.category === 'contractor' ? 'مقاول' : c.category === 'government' ? 'جهة حكومية' : c.category === 'vip' ? 'VIP' : 'فرد',
      `"${(c.tags || []).join(', ')}"`,
      c.total_contracts || 0,
      c.last_deal_date || '-',
      c.marketing_opt_in ? 'نعم' : 'لا',
      `"${(c.address || '').replace(/"/g, '""')}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `دليل_عملاء_المحترز_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy Phone Numbers List
  const handleCopyPhoneNumbers = () => {
    const phones = filteredCustomers
      .map(c => `${c.name}: ${c.phone}`)
      .join('\n');

    if (!phones) {
      alert('لا توجد أرقام لنسخها.');
      return;
    }

    navigator.clipboard.writeText(phones);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // Import Text Parser (Format: "Name, 05XXXXXXXX" or "05XXXXXXXX")
  const handleImportTextSubmit = () => {
    const lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      alert('يرجى لصق أرقام أو أسماء في المربع.');
      return;
    }

    let added = 0;
    lines.forEach((line, idx) => {
      const parts = line.split(/[,;\t|]+/);
      let name = `عميل ${Date.now()}-${idx + 1}`;
      let phone = '';

      if (parts.length >= 2) {
        name = parts[0].trim();
        phone = parts[1].trim();
      } else {
        phone = parts[0].trim();
      }

      phone = phone.replace(/[^0-9+]/g, '');
      if (phone.length >= 9) {
        const newCust: MarketingCustomer = {
          id: `imp-${Date.now()}-${idx}`,
          name,
          phone,
          category: 'individual',
          total_contracts: 0,
          marketing_opt_in: true,
          tags: ['مستورد'],
          source: 'import',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        onSaveCustomer(newCust);
        added++;
      }
    });

    setIsImportModalOpen(false);
    setImportText('');
    confetti({ particleCount: 60, spread: 60 });
    alert(`تم استيراد (${added}) جهة اتصال بنجاح إلى قاعدة البيانات!`);
  };

  // Calculate campaign recipients
  const campaignRecipients = useMemo(() => {
    let list = customers.filter(c => c.marketing_opt_in);
    if (campaignTarget === 'selected') {
      list = list.filter(c => selectedCustomerIds.has(c.id));
    } else if (campaignTarget === 'companies') {
      list = list.filter(c => c.category === 'company' || c.category === 'contractor');
    } else if (campaignTarget === 'individuals') {
      list = list.filter(c => c.category === 'individual');
    }
    return list.map(c => ({ name: c.name, phone: c.phone }));
  }, [customers, campaignTarget, selectedCustomerIds]);

  // Launch Campaign
  const handleLaunchCampaign = async () => {
    if (campaignRecipients.length === 0) {
      alert('لا يوجد عملاء مستهدفين للحملة (تأكد من تحديد عملاء مفعلين لخيار استلام الرسائل).');
      return;
    }
    if (!campaignMessage.trim()) {
      alert('يرجى كتابة نص الرسالة الترويجية.');
      return;
    }

    if (!confirm(`هل أنت متأكد من إطلاق الحملة الترويجية لعدد (${campaignRecipients.length}) عميل عبر خادم الواتساب؟`)) {
      return;
    }

    setIsCampaignSending(true);
    setCampaignProgress({ sent: 0, total: campaignRecipients.length });

    await onBulkSendCampaign(campaignRecipients, campaignMessage, (sent, total) => {
      setCampaignProgress({ sent, total });
    });

    setIsCampaignSending(false);
    confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    alert('تم اكتمال إرسال الحملة الترويجية بنجاح إلى جميع العملاء المستهدفين! 🚀');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── 1. MAIN HEADER & STATS ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 15px rgba(14, 165, 233, 0.4)'
            }}>
              <Users size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.55rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                دليل العملاء وقاعدة بيانات الحملات الترويجية
              </h2>
              <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: 0 }}>
                إدارة أرقام العملاء، التصدير والاستيراد، وإطلاق رسائل الواتساب التسويقية الجماعية
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleSyncContracts}
            className="btn-secondary"
            style={{
              padding: '8px 14px',
              fontSize: '0.82rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderColor: 'rgba(56, 189, 248, 0.4)',
              color: '#38bdf8'
            }}
            title="سحب كافة أرقام العملاء المسجلين في العقود تلقائياً وتحديثهم"
          >
            <RefreshCw size={15} />
            <span>سحب وتجميع أرقام العقود ⚡</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="btn-secondary"
            style={{
              padding: '8px 14px',
              fontSize: '0.82rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            title="تنزيل ملف Excel / CSV كامل"
          >
            <FileSpreadsheet size={15} color="#34d399" />
            <span>تصدير Excel / CSV 📤</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="btn-secondary"
            style={{
              padding: '8px 14px',
              fontSize: '0.82rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Upload size={15} color="#fbbf24" />
            <span>استيراد أرقام 📥</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNew}
            className="btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #0284c7, #0ea5e9)'
            }}
          >
            <Plus size={16} />
            <span>إضافة عميل جديد</span>
          </button>
        </div>
      </div>

      {/* ── 2. STATS CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="glass-panel" style={{ padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>إجمالي العملاء المسجلين</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8', marginTop: '2px' }}>
            {customers.length} عميل
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>الشركات والمقاولون</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#a78bfa', marginTop: '2px' }}>
            {customers.filter(c => c.category === 'company' || c.category === 'contractor').length} جهة
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>الأفراد والملاك</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fbcfe8', marginTop: '2px' }}>
            {customers.filter(c => c.category === 'individual').length} فرد
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>المشتركون في رسائل الواتساب</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#34d399', marginTop: '2px' }}>
            {customers.filter(c => c.marketing_opt_in).length} رقم نشط
          </div>
        </div>
      </div>

      {/* ── 3. TABS SWITCHER (Directory vs Campaign Launcher) ── */}
      <div style={{
        display: 'flex',
        gap: '12px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '12px'
      }}>
        <button
          type="button"
          onClick={() => setActiveMainTab('directory')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 22px',
            borderRadius: '12px',
            border: 'none',
            background: activeMainTab === 'directory' ? 'linear-gradient(135deg, #0284c7, #0ea5e9)' : 'rgba(255, 255, 255, 0.05)',
            color: activeMainTab === 'directory' ? '#ffffff' : '#94a3b8',
            fontSize: '0.9rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: activeMainTab === 'directory' ? '0 4px 15px rgba(14, 165, 233, 0.35)' : 'none'
          }}
        >
          <Users size={17} />
          <span>سجل وقاعدة بيانات العملاء ({customers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('campaign')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 22px',
            borderRadius: '12px',
            border: 'none',
            background: activeMainTab === 'campaign' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255, 255, 255, 0.05)',
            color: activeMainTab === 'campaign' ? '#ffffff' : '#94a3b8',
            fontSize: '0.9rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: activeMainTab === 'campaign' ? '0 4px 15px rgba(16, 185, 129, 0.35)' : 'none'
          }}
        >
          <Megaphone size={17} />
          <span>إطلاق حملة ترويجية بالواتساب 📢</span>
        </button>
      </div>

      {/* ── TAB 1: CUSTOMERS DIRECTORY TABLE ── */}
      {activeMainTab === 'directory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Controls Bar: Search & Category Filter */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '12px 16px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '400px' }}>
              <input
                type="text"
                className="form-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="البحث بالاسم، الجوال، الوسم، أو العنوان..."
                style={{ paddingRight: '36px', height: '38px', fontSize: '0.85rem' }}
              />
              <Search size={16} style={{ position: 'absolute', right: '12px', top: '11px', color: '#94a3b8' }} />
            </div>

            {/* Category Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'الكل' },
                { id: 'company', label: 'شركات' },
                { id: 'contractor', label: 'مقاولون' },
                { id: 'individual', label: 'أفراد' },
                { id: 'vip', label: 'VIP' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id as any)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: selectedCategory === tab.id ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    color: selectedCategory === tab.id ? '#38bdf8' : '#94a3b8',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Copy numbers button */}
            <button
              type="button"
              onClick={handleCopyPhoneNumbers}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: copiedNotification ? '#34d399' : '#cbd5e1',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {copiedNotification ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedNotification ? 'تم نسخ الأرقام!' : 'نسخ الأرقام المعروضة'}</span>
            </button>
          </div>

          {/* Table Container */}
          <div className="glass-panel" style={{
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            overflow: 'hidden'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <th style={{ padding: '12px 16px', width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={filteredCustomers.length > 0 && selectedCustomerIds.size === filteredCustomers.length}
                        onChange={handleToggleSelectAll}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '12px 16px', fontWeight: 800, color: '#94a3b8' }}>اسم العميل / الجهة</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800, color: '#94a3b8' }}>رقم الجوال</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800, color: '#94a3b8' }}>التصنيف</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800, color: '#94a3b8' }}>الوسوم</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800, color: '#94a3b8', textAlign: 'center' }}>العقود</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800, color: '#94a3b8' }}>الحالة</th>
                    <th style={{ padding: '12px 16px', fontWeight: 800, color: '#94a3b8', textAlign: 'center' }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                        لا توجد جهات اتصال مطابقة. انقر على «سحب وتجميع أرقام العقود» أو «إضافة عميل جديد».
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map(cust => (
                      <tr 
                        key={cust.id}
                        style={{
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                          background: selectedCustomerIds.has(cust.id) ? 'rgba(14, 165, 233, 0.08)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedCustomerIds.has(cust.id)}
                            onChange={() => handleToggleSelectOne(cust.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>

                        {/* Name */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 800, color: '#ffffff' }}>{cust.name}</div>
                          {cust.address && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                              {cust.address}
                            </div>
                          )}
                        </td>

                        {/* Phone */}
                        <td style={{ padding: '12px 16px', direction: 'ltr', textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'sans-serif' }}>
                            {cust.phone}
                          </span>
                        </td>

                        {/* Category */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 800,
                            background: cust.category === 'company' ? 'rgba(167, 139, 250, 0.15)' : cust.category === 'contractor' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                            color: cust.category === 'company' ? '#c084fc' : cust.category === 'contractor' ? '#fbbf24' : '#38bdf8'
                          }}>
                            {cust.category === 'company' ? 'شركة' : cust.category === 'contractor' ? 'مقاول' : cust.category === 'government' ? 'حكومي' : cust.category === 'vip' ? 'VIP' : 'فرد'}
                          </span>
                        </td>

                        {/* Tags */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {(cust.tags || []).slice(0, 2).map((t, idx) => (
                              <span key={idx} style={{ background: 'rgba(255, 255, 255, 0.06)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', color: '#cbd5e1' }}>
                                #{t}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Contracts count */}
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#e2e8f0' }}>
                          {cust.total_contracts || 0}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            color: cust.marketing_opt_in ? '#34d399' : '#94a3b8'
                          }}>
                            {cust.marketing_opt_in ? '✓ مشترك' : '🚫 ملغي'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => onSendSingleWhatsApp(cust.phone, `مرحباً ${cust.name}، شركة المحترز للحاويات ترحب بكم 🏗️.`)}
                              style={{
                                padding: '6px',
                                borderRadius: '8px',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                background: 'rgba(34, 197, 94, 0.15)',
                                color: '#4ade80',
                                cursor: 'pointer'
                              }}
                              title="إرسال رسالة واتساب مباشرة"
                            >
                              <MessageSquare size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(cust)}
                              style={{
                                padding: '6px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: '#94a3b8',
                                cursor: 'pointer'
                              }}
                              title="تعديل العميل"
                            >
                              <Edit3 size={14} />
                            </button>

                            {userRole === 'admin' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`هل أنت متأكد من حذف (${cust.name})؟`)) {
                                    onDeleteCustomer(cust.id);
                                  }
                                }}
                                style={{
                                  padding: '6px',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  color: '#f87171',
                                  cursor: 'pointer'
                                }}
                                title="حذف العميل"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ── TAB 2: WHATSAPP CAMPAIGN LAUNCHER ── */}
      {activeMainTab === 'campaign' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
          
          {/* Campaign Builder */}
          <div className="glass-panel" style={{
            padding: '24px',
            borderRadius: '18px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}>
                <Megaphone size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                  منصة إطلاق الرسائل التسويقية الموحدة
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                  إرسال عروض وخصومات ورسائل ترويجية بضغطة زر واحدة عبر بوابة الواتساب
                </p>
              </div>
            </div>

            {/* Target Audience Select */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#e2e8f0', marginBottom: '8px' }}>
                1. تحديد الفئة المستهدفة من العملاء:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                {[
                  { id: 'all', label: `جميع المشتركين (${customers.filter(c => c.marketing_opt_in).length})` },
                  { id: 'companies', label: 'الشركات والمقاولون فقط' },
                  { id: 'individuals', label: 'الأفراد فقط' },
                  { id: 'selected', label: `العملاء المحددين (${selectedCustomerIds.size})` }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCampaignTarget(opt.id as any)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: campaignTarget === opt.id ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: campaignTarget === opt.id ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                      color: campaignTarget === opt.id ? '#34d399' : '#94a3b8',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 800, color: '#e2e8f0', marginBottom: '8px' }}>
                2. اختيار قالب رسالة جاهز:
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {DEFAULT_CAMPAIGN_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setCampaignMessage(tpl.message)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#cbd5e1',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {tpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Composer */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#e2e8f0' }}>
                  3. نص الرسالة الترويجية:
                </label>
                <button
                  type="button"
                  onClick={() => setCampaignMessage(prev => prev + ' {الاسم} ')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'rgba(56, 189, 248, 0.2)',
                    color: '#38bdf8',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  + إدراج وسم {'{الاسم}'}
                </button>
              </div>

              <textarea
                className="form-input"
                rows={7}
                value={campaignMessage}
                onChange={(e) => setCampaignMessage(e.target.value)}
                placeholder="اكتب نص الرسالة الترويجية هنا..."
                style={{ fontSize: '0.88rem', lineHeight: 1.6, resize: 'vertical' }}
              />
            </div>

            {/* Launch Action */}
            <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              {isCampaignSending ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, color: '#34d399' }}>
                    <span>جارٍ إرسال الحملة بأمان عبر الواتساب...</span>
                    <span>{campaignProgress.sent} من {campaignProgress.total}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(campaignProgress.sent / (campaignProgress.total || 1)) * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #10b981, #34d399)',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleLaunchCampaign}
                  disabled={campaignRecipients.length === 0}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    background: campaignRecipients.length > 0 ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255, 255, 255, 0.1)',
                    color: campaignRecipients.length > 0 ? '#ffffff' : '#64748b',
                    fontSize: '0.95rem',
                    fontWeight: 900,
                    cursor: campaignRecipients.length > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: campaignRecipients.length > 0 ? '0 4px 20px rgba(16, 185, 129, 0.4)' : 'none'
                  }}
                >
                  <Send size={18} />
                  <span>إطلاق الحملة الآن إلى ({campaignRecipients.length}) عميل 🚀</span>
                </button>
              )}
            </div>

          </div>

          {/* Live WhatsApp Bubble Preview */}
          <div className="glass-panel" style={{
            padding: '20px',
            borderRadius: '18px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            height: 'fit-content',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={16} color="#22c55e" />
              <span>معاينة الرسالة لدى العميل في الواتساب</span>
            </div>

            {/* WhatsApp Bubble */}
            <div style={{
              background: '#075e54',
              borderRadius: '14px',
              padding: '12px',
              border: '1px solid rgba(37, 211, 102, 0.3)'
            }}>
              <div style={{
                background: '#0b141a',
                borderRadius: '10px',
                padding: '12px',
                color: '#e9edef',
                fontSize: '0.82rem',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                fontFamily: 'sans-serif'
              }}>
                {campaignMessage.replace(/{الاسم}/g, 'أحمد المنصور')}
              </div>
              <div style={{ textAlign: 'left', direction: 'ltr', fontSize: '0.65rem', color: '#8696a0', marginTop: '4px' }}>
                12:45 PM ✓✓
              </div>
            </div>

            <div style={{ fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.5, background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '10px' }}>
              ℹ️ <strong>حماية وأمان:</strong> يتم الإرسال بفاصل زمني تلقائي (1.5 إلى 2.5 ثانية) بين كل رسالة ورسالة لتفادي أي حظر من واتساب.
            </div>
          </div>

        </div>
      )}

      {/* ── MODAL: ADD / EDIT CUSTOMER ── */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد إلى قاعدة البيانات'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                  اسم العميل أو الجهة:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: شركة دار الإعمار أو محمد السالم"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    رقم الجوال:
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    style={{ direction: 'ltr', textAlign: 'right' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                    التصنيف:
                  </label>
                  <select
                    className="form-select"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                  >
                    <option value="individual">فرد / مالك</option>
                    <option value="company">شركة ومؤسسة</option>
                    <option value="contractor">مقاول</option>
                    <option value="government">جهة حكومية</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                  الوسوم (مفصولة بفاصلة):
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="مثال: حاويات شهرية، رخصة ترميم، عميل دائم"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px', fontWeight: 700 }}>
                  العنوان / الموقع:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="مثال: سكاكا — حي المروج"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="optin-check"
                  checked={formOptIn}
                  onChange={(e) => setFormOptIn(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <label htmlFor="optin-check" style={{ fontSize: '0.82rem', color: '#e2e8f0', cursor: 'pointer', fontWeight: 700 }}>
                  الموافقة على استلام رسائل العروض والحملات الترويجية بالواتساب
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '10px', fontSize: '0.88rem', fontWeight: 800 }}>
                  حفظ العميل
                </button>
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn-secondary" style={{ padding: '10px 16px' }}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: IMPORT CONTACTS FROM TEXT ── */}
      {isImportModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsImportModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', margin: 0 }}>
                استيراد أرقام وعملاء دفعة واحدة 📥
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5, margin: '0 0 10px 0' }}>
              الصق قائمة الأرقام والأسماء (كل عميل في سطر جديد).
              <br/>الصيغة المدعومة: <code>الاسم, 05XXXXXXXX</code> أو رقم الجوال مباشرة في سطر منفصل.
            </p>

            <textarea
              className="form-input"
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="مثال:
شركة الإعمار, 0501234567
محمد السالم, 0559876543
0532643000"
              style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button
                type="button"
                onClick={handleImportTextSubmit}
                className="btn-primary"
                style={{ flex: 1, padding: '10px', fontSize: '0.88rem', fontWeight: 800 }}
              >
                بدء الاستيراد والإضافة
              </button>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="btn-secondary"
                style={{ padding: '10px 16px' }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
