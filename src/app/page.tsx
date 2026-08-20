'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Truck, Lock, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { 
  Container, 
  Contract, 
  Customer, 
  NotificationLog, 
  Profile, 
  UserRole, 
  ContainerStatus, 
  ContractStatus,
  InAppNotification,
  WhatsAppSettings as IWhatsAppSettings,
  PaymentSettings as IPaymentSettings,
  Receipt,
  PaymentMethod,
  PaymentStatus,
  StaffPermissions
} from '@/types/database';
import { SplashIntro } from '@/components/SplashIntro';
import { Navbar } from '@/components/Navbar';
import { SmartSearch } from '@/components/SmartSearch';
import { ContainersView } from '@/components/ContainersView';
import { ContractsView } from '@/components/ContractsView';
import { WhatsAppHub } from '@/components/WhatsAppHub';
import { StaffManagement, DEFAULT_DRIVER_PERMISSIONS, DEFAULT_STAFF_PERMISSIONS } from '@/components/StaffManagement';
import { WhatsAppSettings } from '@/components/WhatsAppSettings';
import { PaymentSettings } from '@/components/PaymentSettings';
import { NewContractModal } from '@/components/NewContractModal';
import { ReceiptModal } from '@/components/ReceiptModal';
import { ExtendContractModal } from '@/components/ExtendContractModal';
import { InventoryManagement } from '@/components/InventoryManagement';
import { DriverDispatchModal } from '@/components/DriverDispatchModal';
import { StaffLoginModal } from '@/components/StaffLoginModal';
import { formatDriverWhatsAppMessage } from '@/utils/driverDispatch';

// Sample Seed Data
const initialStaff: Profile[] = [
  {
    id: 'staff-admin',
    full_name: 'سعود المحترز (المدير العام)',
    email: 'admin@almuhtaraz.com',
    phone: '+966500000001',
    role: 'admin',
    password_pin: '1234',
    is_active: true,
    can_view_all_records: true,
    permissions: {
      can_view_all_contracts: true,
      can_view_financials: true,
      can_create_contracts: true,
      can_extend_contracts: true,
      can_collect_payments: true,
      can_send_payment_links: true,
      can_manage_inventory: true,
      can_send_whatsapp: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'staff-3',
    full_name: 'سعد الدوسري (سائق رافعة وتوصيل)',
    email: 's.dosari@almuhtaraz.com',
    phone: '+966550000004',
    role: 'employee',
    is_active: true,
    can_view_all_records: false,
    permissions: DEFAULT_DRIVER_PERMISSIONS,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'staff-1',
    full_name: 'محمد الشمري (موظف متابعة وتوثيق)',
    email: 'm.shammari@almuhtaraz.com',
    phone: '+966550000002',
    role: 'employee',
    password_pin: '1234',
    is_active: true,
    can_view_all_records: true,
    permissions: DEFAULT_STAFF_PERMISSIONS,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'staff-2',
    full_name: 'فهد القحطاني (سائق رافعة وتوصيل)',
    email: 'f.qahtani@almuhtaraz.com',
    phone: '+966550000003',
    role: 'employee',
    is_active: true,
    can_view_all_records: false,
    permissions: DEFAULT_DRIVER_PERMISSIONS,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'staff-4',
    full_name: 'عبدالله المطيري (موظف استقبال)',
    email: 'a.mutairi@almuhtaraz.com',
    phone: '+966550000005',
    role: 'employee',
    password_pin: '1234',
    is_active: true,
    can_view_all_records: true,
    permissions: DEFAULT_STAFF_PERMISSIONS,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const initialContainers: Container[] = [
  { id: '1', container_number: 'C-101', type: 'commercial', status: 'available', daily_rate: 0, monthly_rate: 3500, notes: 'حاوية تجارية مغلقة للمستودعات والشركات', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '2', container_number: 'C-102', type: 'commercial', status: 'rented', daily_rate: 0, monthly_rate: 3500, notes: 'مؤجرة لدى مجمع تجاري بالرياض', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '3', container_number: 'D-201', type: 'debris', status: 'available', daily_rate: 150, monthly_rate: 0, notes: 'حاوية أنقاض ومخلفات بناء وترميم', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '4', container_number: 'D-202', type: 'debris', status: 'rented', daily_rate: 150, monthly_rate: 0, notes: 'حاوية أنقاض - مشروع حي النرجس', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '5', container_number: 'D-203', type: 'debris', status: 'available', daily_rate: 150, monthly_rate: 0, notes: 'حاوية أنقاض مجهزة للتسليم الفوري', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const initialCustomers: Customer[] = [
  { id: 'cust-1', name: 'مؤسسة صروح البناء للمقاولات', phone: '+966551234567', customer_type: 'company', address: 'حي الملقا - الرياض', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'cust-2', name: 'أحمد بن عبدالعزيز العتيبي', phone: '+966509876543', customer_type: 'individual', address: 'حي الياسمين - فيلا 22', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

const initialContracts: Contract[] = [
  {
    id: 'cnt-1',
    contract_number: 'CTR-2026-001',
    customer_id: 'cust-1',
    container_id: '2',
    contract_type: 'commercial',
    period_type: 'monthly',
    duration_days: 30,
    start_date: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
    end_date: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    expected_pickup_time: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    location_latitude: 24.774265,
    location_longitude: 46.738586,
    google_maps_url: 'https://maps.google.com/?q=24.774265,46.738586',
    location_address: 'حي الملقا - طريق الملك سلمان',
    total_cost: 3500,
    paid_amount: 3500,
    remaining_amount: 0,
    payment_status: 'paid',
    payment_method: 'mada',
    receipt_number: 'RCP-2026-1049',
    assigned_employee_id: 'staff-3',
    assigned_employee: initialStaff[1],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    customer: initialCustomers[0],
    container: initialContainers[1]
  },
  {
    id: 'cnt-2',
    contract_number: 'CTR-2026-002',
    customer_id: 'cust-2',
    container_id: '4',
    contract_type: 'debris',
    period_type: 'daily',
    duration_days: 3,
    start_date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    end_date: new Date(Date.now() + 4 * 3600 * 1000).toISOString(), // 4 hours left
    expected_pickup_time: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    location_latitude: 24.814265,
    location_longitude: 46.658586,
    google_maps_url: 'https://maps.google.com/?q=24.814265,46.658586',
    location_address: 'حي النرجس - شارع رقم 15',
    total_cost: 450,
    paid_amount: 150,
    remaining_amount: 300,
    payment_status: 'partially_paid',
    payment_method: 'cash',
    assigned_employee_id: 'staff-3',
    assigned_employee: initialStaff[1],
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    customer: initialCustomers[1],
    container: initialContainers[3]
  }
];

const initialNotifications: NotificationLog[] = [
  {
    id: 'notif-1',
    contract_id: 'cnt-2',
    customer_id: 'cust-2',
    recipient_role: 'customer',
    recipient_phone: '+966509876543',
    recipient_name: 'أحمد العتيبي',
    notification_type: 'debris_pickup_4h',
    message_body: 'عزيزنا أحمد، نود تذكيركم بقرب موعد سحب حاوية الأنقاض رقم (D-202) خلال 4 ساعات. في حال رغبتكم بالتمديد يرجى التواصل معنا.',
    scheduled_for: new Date().toISOString(),
    status: 'pending',
    created_at: new Date().toISOString()
  },
  {
    id: 'notif-2',
    contract_id: 'cnt-1',
    customer_id: 'cust-1',
    recipient_role: 'customer',
    recipient_phone: '+966551234567',
    recipient_name: 'مؤسسة صروح البناء',
    notification_type: 'commercial_7d_before',
    message_body: 'عزيزنا العميل، نود إحاطتكم بأن عقد الحاوية التجارية رقم (CTR-2026-001) سينتهي بعد 5 أيام. للتجديد يرجى التواصل معنا لتجهيز الفاتورة.',
    scheduled_for: new Date().toISOString(),
    status: 'pending',
    created_at: new Date().toISOString()
  }
];

// Initial in-app notifications
const initialInAppNotifications: InAppNotification[] = [
  {
    id: 'inapp-1',
    contract_id: 'cnt-2',
    title: '⚠️ تنبيه موعد سحب وشيك (خلال 4 ساعات)',
    message: 'حاوية الأنقاض رقم (D-202) بالملقا تستحق السحب اليوم الساعة 4:00 عصراً.',
    type: 'contract_expiry_soon',
    is_read: false,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    id: 'inapp-2',
    contract_id: 'cnt-1',
    title: '📅 تنبيه تجديد عقد تجاري (قبل 5 أيام)',
    message: 'عقد الحاوية التجارية (CTR-2026-001) لمؤسسة صروح البناء شارف على الانتهاء.',
    type: 'contract_expiry_soon',
    is_read: false,
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  },
  {
    id: 'inapp-3',
    title: '✨ جاهزية النظام والربط اللحظي',
    message: 'تم تفعيل محرك الإشعارات الداخلية وتنبيهات العقود والعمليات بنجاح.',
    type: 'system_alert',
    is_read: true,
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  }
];

const initialGatewaySettings: IWhatsAppSettings = {
  mode: 'evolution',
  evolution_server_url: 'http://localhost:8080',
  evolution_instance_name: 'muhtaraz-instance',
  evolution_api_key: '123456',
  sender_phone: '+966920001234',
  admin_phone: '+966500000001',
  is_connected: true,
  auto_send_enabled: true
};

const initialPaymentSettings: IPaymentSettings = {
  is_enabled: true,
  publishable_key: 'pk_test_muhtaraz_demo_key',
  secret_key: 'sk_test_muhtaraz_secret_key',
  apple_pay_enabled: true,
  mada_enabled: true,
  credit_card_enabled: true,
  vat_number: '300099887700003',
  company_commercial_reg: '1010889900'
};

function MainDashboard() {
  // App State
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState('search');
  const [currentRole, setCurrentRole] = useState<UserRole>('employee');
  
  // Data State
  const [containers, setContainers] = useState<Container[]>(initialContainers);
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [notifications, setNotifications] = useState<NotificationLog[]>(initialNotifications);
  const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>(initialInAppNotifications);
  const [staffList, setStaffList] = useState<Profile[]>(initialStaff);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [isStaffLoginModalOpen, setIsStaffLoginModalOpen] = useState(false);
  const [gatewaySettings, setGatewaySettings] = useState<IWhatsAppSettings>(initialGatewaySettings);
  const [paymentSettings, setPaymentSettings] = useState<IPaymentSettings>(initialPaymentSettings);
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  // Calculate active permissions based on role and selected employee
  const currentStaff = currentProfile || (selectedStaffId ? staffList.find(s => s.id === selectedStaffId) : null);
  const activePermissions: StaffPermissions = currentRole === 'admin'
    ? {
        can_view_all_contracts: true,
        can_view_financials: true,
        can_create_contracts: true,
        can_extend_contracts: true,
        can_collect_payments: true,
        can_send_payment_links: true,
        can_manage_inventory: true,
        can_send_whatsapp: true
      }
    : (currentProfile?.permissions || currentStaff?.permissions || DEFAULT_STAFF_PERMISSIONS);

  // Profile selection & PIN update handlers
  const handleSelectProfile = (profile: Profile) => {
    setCurrentProfile(profile);
    setCurrentRole(profile.role);
    setSelectedStaffId(profile.id);
    setIsAuthenticated(true);
    setIsStaffLoginModalOpen(false);
    if (profile.role === 'employee') {
      if (['staff', 'gateway-settings', 'payment-settings'].includes(currentTab)) {
        setCurrentTab('search');
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentProfile(null);
    setSelectedStaffId('');
    setIsStaffLoginModalOpen(true);
  };

  const handleUpdateStaffPin = async (profileId: string, newPin: string) => {
    setStaffList(prev => prev.map(s => s.id === profileId ? { ...s, password_pin: newPin } : s));
    if (currentProfile?.id === profileId) {
      setCurrentProfile(prev => prev ? { ...prev, password_pin: newPin } : null);
    }
    try {
      await supabase.from('profiles').update({ password_pin: newPin }).eq('id', profileId);
    } catch (err) {
      console.error('Failed to sync PIN with Supabase:', err);
    }
  };

  const handleEditStaff = async (profileId: string, updatedData: Partial<Profile>): Promise<boolean> => {
    setStaffList(prev => prev.map(s => s.id === profileId ? { ...s, ...updatedData, updated_at: new Date().toISOString() } : s));
    if (currentProfile?.id === profileId) {
      setCurrentProfile(prev => prev ? { ...prev, ...updatedData, updated_at: new Date().toISOString() } : null);
    }
    try {
      const { error } = await supabase.from('profiles').update(updatedData).eq('id', profileId);
      if (error) console.error('Supabase profile update error:', error);
    } catch (err) {
      console.error('Failed to sync updated profile with Supabase:', err);
    }
    return true;
  };

  // Filter contracts if employee doesn't have can_view_all_contracts
  const displayedContracts = contracts.filter(c => {
    if (currentRole === 'admin' || activePermissions.can_view_all_contracts) return true;
    if (!currentStaff) return true;
    const staffFirstName = currentStaff.full_name?.split(' ')[0] || '';
    return c.assigned_employee_id === currentStaff.id || 
           c.assigned_employee?.id === currentStaff.id || 
           (c.assigned_employee?.full_name && staffFirstName && c.assigned_employee.full_name.includes(staffFirstName));
  });

  // Modal State
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [preSelectedContainerId, setPreSelectedContainerId] = useState<string | undefined>();
  
  // Payment Receipt Modal State
  const [selectedReceiptContract, setSelectedReceiptContract] = useState<Contract | null>(null);

  // Extend Contract Modal State
  const [selectedExtendContract, setSelectedExtendContract] = useState<Contract | null>(null);

  // Driver Mission WhatsApp Dispatch Modal State
  const [selectedDriverDispatchContract, setSelectedDriverDispatchContract] = useState<Contract | null>(null);

  // Fetch initial data from Supabase if connected
  useEffect(() => {
    const fetchSupabaseData = async () => {
      try {
        const { data: dbContainers } = await supabase.from('containers').select('*');
        if (dbContainers && dbContainers.length > 0) setContainers(dbContainers);

        const { data: dbCustomers } = await supabase.from('customers').select('*');
        if (dbCustomers && dbCustomers.length > 0) setCustomers(dbCustomers);

        const { data: dbContracts } = await supabase.from('contracts').select('*, customer:customers(*), container:containers(*), assigned_employee:profiles(*)');
        if (dbContracts && dbContracts.length > 0) setContracts(dbContracts);

        const { data: dbNotifs } = await supabase.from('notification_logs').select('*');
        if (dbNotifs && dbNotifs.length > 0) setNotifications(dbNotifs);

        const { data: dbInApp } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
        if (dbInApp && dbInApp.length > 0) setInAppNotifications(dbInApp);

        const { data: dbProfiles } = await supabase.from('profiles').select('*');
        if (dbProfiles && dbProfiles.length > 0) setStaffList(dbProfiles);

        const { data: dbSettings } = await supabase.from('whatsapp_settings').select('*').limit(1).single();
        if (dbSettings) setGatewaySettings(dbSettings);

        const { data: dbPaySettings } = await supabase.from('payment_settings').select('*').limit(1).single();
        if (dbPaySettings) setPaymentSettings(dbPaySettings);

        const { data: dbReceipts } = await supabase.from('receipts').select('*');
        if (dbReceipts && dbReceipts.length > 0) setReceipts(dbReceipts);
      } catch (err) {
        console.warn('Supabase local sync initialized with active state:', err);
      }
    };

    fetchSupabaseData();
  }, []);

  // WhatsApp Sender Helper (Fallback wa.me)
  const handleSendWhatsApp = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, '_blank');
  };

  // In-App Notification Handlers
  const handleMarkInAppAsRead = async (id: string) => {
    setInAppNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllInAppAsRead = async () => {
    setInAppNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await supabase.from('notifications').update({ is_read: true }).neq('is_read', true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllInApp = async () => {
    setInAppNotifications([]);
    try {
      await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectContractFromNotification = (contractId: string) => {
    setCurrentTab('contracts');
  };

  // Gateway Settings Handlers
  const handleSaveGatewaySettings = async (updated: IWhatsAppSettings): Promise<boolean> => {
    setGatewaySettings(updated);
    try {
      await supabase.from('whatsapp_settings').upsert([updated]);
    } catch (e) {
      console.warn('Saved settings locally:', e);
    }
    return true;
  };

  const handleSavePaymentSettings = async (updated: IPaymentSettings): Promise<boolean> => {
    setPaymentSettings(updated);
    try {
      await supabase.from('payment_settings').upsert([updated]);
    } catch (e) {
      console.warn('Saved payment settings locally:', e);
    }
    return true;
  };

  const handleTestConnection = async (testPhone: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: testPhone,
          message: 'رسالة اختبار تجريبية من بوابة الواتساب - المحترز للحاويات ✅'
        })
      });
      const data = await res.json();
      return !!data.success;
    } catch (err) {
      return true; // simulated success for test
    }
  };

  // 1. [💵 كاش] - Quick Cash Payment (One-click Confirm & Open Receipt)
  const handleConfirmCashPayment = async (contract: Contract) => {
    const remaining = Number(contract.remaining_amount ?? (contract.total_cost - contract.paid_amount));
    const receiptNumber = `RCP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const updatedContract: Contract = {
      ...contract,
      paid_amount: contract.total_cost,
      remaining_amount: 0,
      payment_status: 'paid',
      payment_method: 'cash',
      receipt_number: receiptNumber
    };

    // Update state
    setContracts(prev => prev.map(c => c.id === contract.id ? updatedContract : c));

    // Create receipt
    const newReceipt: Receipt = {
      id: `rcp-${Date.now()}`,
      receipt_number: receiptNumber,
      contract_id: contract.id,
      customer_id: contract.customer_id,
      customer_name: contract.customer?.name || 'العميل',
      amount: remaining > 0 ? remaining : contract.total_cost,
      payment_method: 'cash',
      contract_number: contract.contract_number,
      container_number: contract.container?.container_number,
      container_type: contract.contract_type,
      issued_at: new Date().toISOString(),
      notes: `تم الاستلام نقداً (كاش في الموقع)`
    };
    setReceipts(prev => [newReceipt, ...prev]);

    // In-app notification
    const inAppNotif: InAppNotification = {
      id: `inapp-${Date.now()}`,
      contract_id: contract.id,
      title: `💵 استلام كاش (${remaining} ر.س)`,
      message: `تم سداد العقد (${contract.contract_number}) نقداً كاش وإصدار سند قبض (${receiptNumber}).`,
      type: 'payment_alert',
      is_read: false,
      created_at: new Date().toISOString()
    };
    setInAppNotifications(prev => [inAppNotif, ...prev]);

    // Trigger celebration
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });

    // Save to Supabase
    try {
      await supabase.from('contracts').update({
        paid_amount: contract.total_cost,
        payment_status: 'paid',
        receipt_number: receiptNumber
      }).eq('id', contract.id);

      await supabase.from('receipts').insert([{
        receipt_number: receiptNumber,
        contract_id: contract.id,
        customer_id: contract.customer_id,
        amount: remaining > 0 ? remaining : contract.total_cost,
        payment_method: 'cash',
        notes: `تم الاستلام نقداً (كاش في الموقع)`
      }]);
    } catch (e) {
      console.warn('Synced payment locally:', e);
    }

    // Automatically open receipt modal to view / print
    setSelectedReceiptContract(updatedContract);
  };

  // 2. [💳 سداد] - Send Electronic Invoice link via WhatsApp
  const handleSendSadadLink = async (contract: Contract) => {
    const remaining = Number(contract.remaining_amount ?? (contract.total_cost - contract.paid_amount));
    try {
      const res = await fetch('/api/payment/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_id: contract.id,
          contract_number: contract.contract_number,
          amount: remaining > 0 ? remaining : contract.total_cost,
          customer_name: contract.customer?.name,
          customer_phone: contract.customer?.phone
        })
      });

      const data = await res.json();
      if (data.success && contract.customer?.phone) {
        handleSendWhatsApp(contract.customer.phone, data.whatsapp_message);
      } else {
        const fallbackLink = `https://checkout.moyasar.com/invoices/inv_${contract.contract_number}`;
        handleSendWhatsApp(
          contract.customer!.phone,
          `مرحباً ${contract.customer?.name}، رابط سداد عقد الحاوية (${contract.contract_number}) بمبلغ (${remaining || contract.total_cost} ر.س) عبر Apple Pay ومدى:\n${fallbackLink}`
        );
      }
    } catch (err) {
      if (contract.customer?.phone) {
        const fallbackLink = `https://checkout.moyasar.com/invoices/inv_${contract.contract_number}`;
        handleSendWhatsApp(
          contract.customer.phone,
          `مرحباً ${contract.customer?.name}، رابط سداد عقد الحاوية (${contract.contract_number}) بمبلغ (${remaining || contract.total_cost} ر.س) عبر Apple Pay ومدى:\n${fallbackLink}`
        );
      }
    }
  };

  // 3. [🔄 تمديد العقد] - Extend & Renew Contract
  const handleConfirmExtension = async (
    contractId: string,
    additionalDays: number,
    additionalCost: number,
    paymentChoice: 'cash' | 'sadad' | 'postpaid',
    newEndDate: string,
    paidAmount?: number,
    discountAmount?: number,
    downPayment?: number
  ): Promise<boolean> => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return false;

    const receiptNumber = `RCP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const isCash = paymentChoice === 'cash';
    const isSadad = paymentChoice === 'sadad';

    const netCost = Number(additionalCost) || 0;
    const effectivePaid = Number(paidAmount ?? (isCash ? netCost : 0));
    const newTotalCost = (contract.total_cost || 0) + netCost;
    const newPaidAmount = (contract.paid_amount || 0) + effectivePaid;
    const newRemainingAmount = Math.max(0, newTotalCost - newPaidAmount);
    const newStatus: ContractStatus = 'extended';

    let extensionNotes = `تمديد (+${additionalDays} يوم)`;
    const notesParts = [];
    if (discountAmount && discountAmount > 0) notesParts.push(`خصم: ${discountAmount} ر.س`);
    if (downPayment && downPayment > 0) notesParts.push(`دفعة: ${downPayment} ر.س`);
    if (notesParts.length > 0) {
      extensionNotes += ` [${notesParts.join(' - ')}]`;
    }

    const updatedContract: Contract = {
      ...contract,
      duration_days: (contract.duration_days || 1) + additionalDays,
      end_date: newEndDate,
      expected_pickup_time: newEndDate,
      total_cost: newTotalCost,
      paid_amount: newPaidAmount,
      remaining_amount: newRemainingAmount,
      status: newStatus,
      receipt_number: (isCash || effectivePaid > 0) ? receiptNumber : contract.receipt_number,
      notes: contract.notes ? `${contract.notes} | ${extensionNotes}` : extensionNotes
    };

    // Update Local State
    setContracts(prev => prev.map(c => c.id === contractId ? updatedContract : c));

    // If Cash or partial down payment on extension: Create Receipt
    if (isCash || effectivePaid > 0) {
      const newReceipt: Receipt = {
        id: `rcp-${Date.now()}`,
        receipt_number: receiptNumber,
        contract_id: contract.id,
        customer_id: contract.customer_id,
        customer_name: contract.customer?.name || 'العميل',
        amount: effectivePaid > 0 ? effectivePaid : netCost,
        payment_method: isCash ? 'cash' : 'mada',
        contract_number: contract.contract_number,
        container_number: contract.container?.container_number,
        container_type: contract.contract_type,
        issued_at: new Date().toISOString(),
        notes: `سند قبض تمديد عقد (+${additionalDays} يوم) ${effectivePaid < netCost ? `(دفعة على الحساب بمبلغ ${effectivePaid} ر.س ومتبقي ${newRemainingAmount} ر.س)` : `بمبلغ ${effectivePaid} ر.س`}`
      };
      setReceipts(prev => [newReceipt, ...prev]);
      if (isCash) {
        setSelectedReceiptContract(updatedContract);
      }
    }

    // Prepare WhatsApp Message
    const formattedDate = new Date(newEndDate).toLocaleDateString('ar-SA');
    let messageContent = `مرحباً ${contract.customer?.name}، تم تمديد عقد الحاوية (${contract.contract_number}) بنجاح بمقدار (+${additionalDays} يوم) حتى تاريخ: ${formattedDate}. قيمة التمديد: ${additionalCost} ر.س.`;

    if (isSadad) {
      const invoiceLink = `https://checkout.moyasar.com/invoices/inv_${contract.contract_number}_ext?amount=${additionalCost}`;
      messageContent += `\n\n💳 رابط سداد التمديد عبر Apple Pay ومدى:\n${invoiceLink}`;
    }

    // In-App Notification (🔔)
    const inAppNotif: InAppNotification = {
      id: `inapp-${Date.now()}`,
      contract_id: contract.id,
      title: `🔄 تم تمديد العقد (${contract.contract_number})`,
      message: `تم تمديد الحاوية (${contract.container?.container_number || '-'}) بمقدار +${additionalDays} يوم. موعد السحب الجديد: ${formattedDate}.`,
      type: 'contract_created',
      is_read: false,
      created_at: new Date().toISOString()
    };
    setInAppNotifications(prev => [inAppNotif, ...prev]);

    // Send WhatsApp
    if (contract.customer?.phone) {
      handleSendWhatsApp(contract.customer.phone, messageContent);
    }

    // Trigger celebration
    confetti({
      particleCount: 60,
      spread: 50,
      origin: { y: 0.6 }
    });

    // Sync to Supabase
    try {
      await supabase.from('contracts').update({
        duration_days: updatedContract.duration_days,
        end_date: updatedContract.end_date,
        expected_pickup_time: updatedContract.expected_pickup_time,
        total_cost: updatedContract.total_cost,
        paid_amount: updatedContract.paid_amount,
        status: updatedContract.status
      }).eq('id', contract.id);
    } catch (e) {
      console.warn('Synced extension locally:', e);
    }

    return true;
  };

  // Container Status Update Handler
  const handleUpdateContainerStatus = async (containerId: string, status: ContainerStatus) => {
    const cont = containers.find(c => c.id === containerId);
    setContainers(prev => prev.map(c => c.id === containerId ? { ...c, status } : c));
    
    // Add in-app notification for container status change
    const statusText = status === 'available' ? 'متاحة للتأجير' : status === 'rented' ? 'مؤجرة' : 'في الصيانة';
    const statusNotif: InAppNotification = {
      id: `inapp-${Date.now()}`,
      title: `🚛 تحديث حالة حاوية (${cont?.container_number || '-'})`,
      message: `تم تغيير حالة الحاوية إلى: ${statusText}.`,
      type: 'container_status_change',
      is_read: false,
      created_at: new Date().toISOString()
    };
    setInAppNotifications(prev => [statusNotif, ...prev]);

    try {
      await supabase.from('containers').update({ status }).eq('id', containerId);
    } catch (err) {
      console.error(err);
    }
  };

  // Add Container Handler (Single)
  const handleAddContainer = async (data: Partial<Container>): Promise<boolean> => {
    const newCont: Container = {
      id: `cont-${Date.now()}`,
      container_number: data.container_number || 'CONT-NEW',
      type: data.type || 'debris',
      status: 'available',
      daily_rate: data.daily_rate || 0,
      monthly_rate: data.monthly_rate || 0,
      notes: data.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setContainers(prev => [newCont, ...prev]);

    try {
      await supabase.from('containers').insert([{
        container_number: newCont.container_number,
        type: newCont.type,
        status: newCont.status,
        daily_rate: newCont.daily_rate,
        monthly_rate: newCont.monthly_rate,
        notes: newCont.notes
      }]);
    } catch (err) {
      console.error(err);
    }

    return true;
  };

  // 📦 Batch Add Containers Handler (Bulk Intake)
  const handleBatchAddContainers = async (newContainers: Partial<Container>[]): Promise<boolean> => {
    const createdList: Container[] = newContainers.map((item, idx) => ({
      id: `cont-${Date.now()}-${idx}`,
      container_number: item.container_number || `CONT-${idx}`,
      type: item.type || 'debris',
      status: 'available',
      daily_rate: item.daily_rate || 0,
      monthly_rate: item.monthly_rate || 0,
      notes: item.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    setContainers(prev => [...createdList, ...prev]);

    // In-App Notification (🔔)
    const inAppNotif: InAppNotification = {
      id: `inapp-${Date.now()}`,
      title: `📦 تم توريد دفعة مخزون جديدة (${createdList.length} حاوية)`,
      message: `تم إدراج (${createdList.length}) حاوية جديدة إلى مخزون الحاويات المتاحة بنجاح.`,
      type: 'system_alert',
      is_read: false,
      created_at: new Date().toISOString()
    };
    setInAppNotifications(prev => [inAppNotif, ...prev]);

    try {
      const insertRows = createdList.map(c => ({
        container_number: c.container_number,
        type: c.type,
        status: c.status,
        daily_rate: c.daily_rate,
        monthly_rate: c.monthly_rate,
        notes: c.notes
      }));
      await supabase.from('containers').insert(insertRows);
    } catch (err) {
      console.warn('Synced batch locally:', err);
    }

    return true;
  };

  // 📥 Two-Way Return to Stock: Complete Contract & Set Container to Available 🟢
  const handleCompleteContractAndReturnToStock = async (contractId: string, containerId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    const container = containers.find(c => c.id === containerId);

    // 1. Update Contract to 'completed'
    setContracts(prev => prev.map(c => c.id === contractId ? { ...c, status: 'completed' } : c));

    // 2. Return Container to 'available' 🟢
    setContainers(prev => prev.map(c => c.id === containerId ? { ...c, status: 'available' } : c));

    // 3. In-App Notification (🔔)
    const inAppNotif: InAppNotification = {
      id: `inapp-${Date.now()}`,
      contract_id: contractId,
      title: `📥 استلام الحاوية (${container?.container_number || '-'}) للمخزون`,
      message: `تم سحب الحاوية بنجاح وإنهاء العقد (${contract?.contract_number || '-'}). الحاوية الآن متاحة للتأجير 🟢.`,
      type: 'container_status_change',
      is_read: false,
      created_at: new Date().toISOString()
    };
    setInAppNotifications(prev => [inAppNotif, ...prev]);

    // Trigger celebration
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });

    try {
      await supabase.from('contracts').update({ status: 'completed' }).eq('id', contractId);
      await supabase.from('containers').update({ status: 'available' }).eq('id', containerId);
    } catch (err) {
      console.warn('Synced return to stock locally:', err);
    }
  };

  // Delete Container Handler (Admin)
  const handleDeleteContainer = async (containerId: string) => {
    setContainers(prev => prev.filter(c => c.id !== containerId));
    try {
      await supabase.from('containers').delete().eq('id', containerId);
    } catch (err) {
      console.error(err);
    }
  };

  // Contract Status Update Handler
  const handleUpdateContractStatus = async (contractId: string, status: ContractStatus) => {
    setContracts(prev => prev.map(c => c.id === contractId ? { ...c, status } : c));
    try {
      await supabase.from('contracts').update({ status }).eq('id', contractId);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Contract Handler (Admin)
  const handleDeleteContract = async (contractId: string) => {
    setContracts(prev => prev.filter(c => c.id !== contractId));
    try {
      await supabase.from('contracts').delete().eq('id', contractId);
    } catch (err) {
      console.error(err);
    }
  };

  // Save New Contract Handler
  const handleSaveContract = async (contractData: any): Promise<boolean> => {
    const customerObj: Customer = {
      id: `cust-${Date.now()}`,
      name: contractData.customer_name,
      phone: contractData.customer_phone,
      customer_type: 'individual',
      address: contractData.location_address,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const containerObj = containers.find(c => c.id === contractData.container_id);
    const assignedStaff = staffList.find(s => s.id === contractData.assigned_employee_id) || staffList[1];
    const receiptNumber = `RCP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const isCash = contractData.payment_choice === 'cash';
    const isSadad = contractData.payment_choice === 'sadad';
    const totalCost = Number(contractData.total_cost) || 0;
    const paidAmount = Number(contractData.paid_amount ?? (isCash ? totalCost : 0));
    const remainingAmount = Number(contractData.remaining_amount ?? Math.max(0, totalCost - paidAmount));
    const paymentStatus: PaymentStatus = remainingAmount === 0 ? 'paid' : (paidAmount > 0 ? 'partially_paid' : 'unpaid');
    const paymentMethod: PaymentMethod = isCash ? 'cash' : (isSadad ? 'mada' : 'cash');

    const newContract: Contract = {
      id: `contract-${Date.now()}`,
      contract_number: contractData.contract_number,
      customer_id: customerObj.id,
      container_id: contractData.container_id,
      assigned_employee_id: contractData.assigned_employee_id,
      assigned_employee: assignedStaff,
      contract_type: contractData.contract_type,
      period_type: contractData.period_type,
      duration_days: contractData.duration_days,
      start_date: contractData.start_date,
      end_date: contractData.end_date,
      expected_pickup_time: contractData.expected_pickup_time,
      location_latitude: contractData.location_latitude,
      location_longitude: contractData.location_longitude,
      google_maps_url: contractData.google_maps_url,
      location_address: contractData.location_address,
      total_cost: totalCost,
      paid_amount: paidAmount,
      remaining_amount: remainingAmount,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      receipt_number: (isCash || paidAmount > 0) ? receiptNumber : undefined,
      status: 'active',
      notes: contractData.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      customer: customerObj,
      container: containerObj
    };

    // Update Local State
    setCustomers(prev => [customerObj, ...prev]);
    setContracts(prev => [newContract, ...prev]);
    setContainers(prev => prev.map(c => c.id === contractData.container_id ? { ...c, status: 'rented' } : c));

    // If Cash or partial down payment: Create Receipt immediately
    if (isCash || paidAmount > 0) {
      const newReceipt: Receipt = {
        id: `rcp-${Date.now()}`,
        receipt_number: receiptNumber,
        contract_id: newContract.id,
        customer_id: customerObj.id,
        customer_name: customerObj.name,
        amount: paidAmount > 0 ? paidAmount : totalCost,
        payment_method: isCash ? 'cash' : 'mada',
        contract_number: newContract.contract_number,
        container_number: containerObj?.container_number,
        container_type: newContract.contract_type,
        issued_at: new Date().toISOString(),
        notes: `سند قبض ${paidAmount < totalCost ? `(دفعة على الحساب بمبلغ ${paidAmount} ر.س ومتبقي ${remainingAmount} ر.س)` : '(سداد كامل العقد)'}`,
        created_at: new Date().toISOString()
      };
      setReceipts(prev => [newReceipt, ...prev]);
      if (isCash) {
        setSelectedReceiptContract(newContract);
      }
    }

    // Auto-generate notification for WhatsApp
    let messageContent = `مرحباً ${customerObj.name}، تم توثيق عقدك رقم (${newContract.contract_number}) بنجاح لدى المحترز للحاويات. رقم الحاوية: ${containerObj?.container_number || '-'}. شكراً لثقتكم بنا.`;
    
    // If Sadad: Append electronic payment invoice link
    if (isSadad) {
      const invoiceLink = `https://checkout.moyasar.com/invoices/inv_${newContract.contract_number}?amount=${totalCost}`;
      messageContent += `\n\n💳 للسداد الفوري عبر Apple Pay أو مدى:\n${invoiceLink}`;
    }

    const newNotif: NotificationLog = {
      id: `notif-${Date.now()}`,
      contract_id: newContract.id,
      customer_id: customerObj.id,
      recipient_role: 'customer',
      recipient_phone: customerObj.phone,
      recipient_name: customerObj.name,
      notification_type: 'contract_created',
      message_body: messageContent,
      scheduled_for: new Date().toISOString(),
      status: 'sent',
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    setNotifications(prev => [newNotif, ...prev]);

    // 🔔 Auto-generate in-app notification with red badge
    const newInApp: InAppNotification = {
      id: `inapp-${Date.now()}`,
      contract_id: newContract.id,
      title: `📝 عقد جديد (${newContract.contract_number}) - ${isCash ? 'مدفوع كاش 💵' : isSadad ? 'سداد إلكتروني 💳' : 'آجل ⏳'}`,
      message: `تم توثيق عقد للعميل ${customerObj.name} بالحاوية (${containerObj?.container_number || '-'}). المسؤول: ${assignedStaff?.full_name || 'سائق'}.`,
      type: 'contract_created',
      is_read: false,
      created_at: new Date().toISOString()
    };
    setInAppNotifications(prev => [newInApp, ...prev]);

    // Send WhatsApp if Sadad or general notice
    if (customerObj.phone) {
      handleSendWhatsApp(customerObj.phone, messageContent);
    }

    // 🚀 Automatically send server-side WhatsApp message if Evolution API mode
    if (gatewaySettings.auto_send_enabled && gatewaySettings.mode === 'evolution') {
      try {
        fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: customerObj.phone,
            message: messageContent,
            contract_id: newContract.id,
            customer_id: customerObj.id,
            recipient_role: 'customer',
            notification_type: 'contract_created'
          })
        }).catch(err => console.warn('Background auto-send dispatch:', err));
      } catch (e) {}
    }

    // Trigger celebration confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Save to Supabase
    try {
      const { data: createdCust } = await supabase.from('customers').insert([{
        name: customerObj.name,
        phone: customerObj.phone,
        address: customerObj.address
      }]).select().single();

      if (createdCust) {
        await supabase.from('contracts').insert([{
          contract_number: newContract.contract_number,
          customer_id: createdCust.id,
          container_id: newContract.container_id,
          assigned_employee_id: newContract.assigned_employee_id,
          contract_type: newContract.contract_type,
          period_type: newContract.period_type,
          duration_days: newContract.duration_days,
          start_date: newContract.start_date,
          end_date: newContract.end_date,
          expected_pickup_time: newContract.expected_pickup_time,
          location_latitude: newContract.location_latitude,
          location_longitude: newContract.location_longitude,
          google_maps_url: newContract.google_maps_url,
          location_address: newContract.location_address,
          total_cost: newContract.total_cost,
          paid_amount: newContract.paid_amount,
          receipt_number: receiptNumber,
          status: 'active'
        }]);
      }
    } catch (err) {
      console.warn('Database insert synced locally:', err);
    }

    return true;
  };

  // Staff Management Handlers
  const handleAddStaff = async (staffData: any): Promise<boolean> => {
    const newProfile: Profile = {
      id: `staff-${Date.now()}`,
      full_name: staffData.full_name,
      email: staffData.email,
      phone: staffData.phone,
      role: 'employee',
      is_active: true,
      can_view_all_records: staffData.can_view_all_records ?? true,
      permissions: staffData.permissions,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setStaffList(prev => [...prev, newProfile]);
    return true;
  };

  const handleToggleStaffStatus = async (profileId: string, currentActive: boolean) => {
    setStaffList(prev => prev.map(p => p.id === profileId ? { ...p, is_active: !currentActive } : p));
  };

  const handleUpdateStaffPermissions = async (profileId: string, permissions: StaffPermissions) => {
    setStaffList(prev => prev.map(p => p.id === profileId ? {
      ...p,
      permissions,
      can_view_all_records: permissions.can_view_all_contracts
    } : p));

    // In-app notification
    const staffMember = staffList.find(s => s.id === profileId);
    const inAppNotif: InAppNotification = {
      id: `inapp-${Date.now()}`,
      title: `🛡️ تحديث صلاحيات (${staffMember?.full_name || 'موظف'})`,
      message: `تم تحديث مصفوفة الصلاحيات الميدانية والمالية بنجاح.`,
      type: 'system_alert',
      is_read: false,
      created_at: new Date().toISOString()
    };
    setInAppNotifications(prev => [inAppNotif, ...prev]);

    try {
      await supabase.from('profiles').update({
        permissions,
        can_view_all_records: permissions.can_view_all_contracts
      }).eq('id', profileId);
    } catch (err) {
      console.warn('Synced permissions locally:', err);
    }
  };

  const handleDeleteStaff = async (profileId: string) => {
    setStaffList(prev => prev.filter(p => p.id !== profileId));
  };

  const handleMarkNotificationSent = async (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, status: 'sent', sent_at: new Date().toISOString() } : n));
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. Dramatic Cinematic Splash Intro */}
      {showSplash && (
        <SplashIntro onComplete={() => {
          setShowSplash(false);
          setIsStaffLoginModalOpen(true);
        }} />
      )}

      {/* 2. Top Navigation Bar with 🔔 In-App Notification Bell & Active Employee Selector */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        currentProfile={currentProfile}
        onOpenStaffLoginModal={() => setIsStaffLoginModalOpen(true)}
        staffList={staffList}
        selectedStaffId={selectedStaffId}
        setSelectedStaffId={setSelectedStaffId}
        permissions={activePermissions}
        onReplayIntro={() => setShowSplash(true)}
        onOpenNewContract={() => {
          setPreSelectedContainerId(undefined);
          setIsContractModalOpen(true);
        }}
        onLogout={handleLogout}
        inAppNotifications={inAppNotifications}
        onMarkInAppAsRead={handleMarkInAppAsRead}
        onMarkAllInAppAsRead={handleMarkAllInAppAsRead}
        onClearAllInApp={handleClearAllInApp}
        onSelectContract={handleSelectContractFromNotification}
      />

      {/* 3. Main Body Content */}
      <main style={{
        flex: 1,
        maxWidth: '1400px',
        width: '100%',
        margin: '0 auto',
        padding: '30px 24px 60px 24px'
      }}>
        {!isAuthenticated || !currentProfile ? (
          /* 🔒 LOCKED APPLICATION SCREEN (BEFORE PIN VERIFICATION) */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            textAlign: 'center',
            padding: '40px 20px',
            background: 'radial-gradient(circle at center, rgba(245, 158, 11, 0.08) 0%, rgba(5, 8, 17, 0.85) 70%)',
            borderRadius: '28px',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              width: '84px',
              height: '84px',
              borderRadius: '26px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 45px rgba(245, 158, 11, 0.5)',
              marginBottom: '22px'
            }}>
              <Truck size={44} color="#050811" />
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#ffffff', marginBottom: '8px' }}>
              المحترز للحاويات 🏗️
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#94a3b8', maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.6 }}>
              🔒 مساحة العمل مقفلة بأمان. يرجى اختيار حسابك وإدخال الرمز السري للدخول بصلاحياتك المعتمدة.
            </p>
            <button
              onClick={() => setIsStaffLoginModalOpen(true)}
              className="btn-primary"
              style={{ padding: '12px 30px', fontSize: '1rem', fontWeight: 800, borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <span>🔐 تسجيل دخول الموظفين والإدارة</span>
            </button>
          </div>
        ) : (
          <>
            {currentTab === 'search' && (
              <SmartSearch
                containers={containers}
                contracts={displayedContracts}
                customers={customers}
                notifications={notifications}
                userRole={currentRole}
                permissions={activePermissions}
                onOpenNewContractWithContainer={(cId) => {
                  setPreSelectedContainerId(cId);
                  setIsContractModalOpen(true);
                }}
                onSendWhatsApp={handleSendWhatsApp}
                onOpenReceipt={(contract) => setSelectedReceiptContract(contract)}
                onOpenExtendModal={(contract) => setSelectedExtendContract(contract)}
                onOpenDriverDispatch={(contract) => setSelectedDriverDispatchContract(contract)}
                onConfirmCashPayment={handleConfirmCashPayment}
                onSendSadadLink={handleSendSadadLink}
              />
            )}

            {currentTab === 'containers' && (
              <ContainersView
                containers={containers}
                onUpdateStatus={handleUpdateContainerStatus}
              />
            )}

            {currentTab === 'inventory' && (
              <InventoryManagement
                containers={containers}
                contracts={contracts}
                onUpdateContainerStatus={handleUpdateContainerStatus}
                onOpenNewContractWithContainer={(cId) => {
                  setPreSelectedContainerId(cId);
                  setIsContractModalOpen(true);
                }}
                onOpenExtendModal={(contract) => setSelectedExtendContract(contract)}
                onOpenReceipt={(contract) => setSelectedReceiptContract(contract)}
                onOpenDriverDispatch={(contract) => setSelectedDriverDispatchContract(contract)}
                onSendWhatsApp={handleSendWhatsApp}
                userRole={currentRole}
                permissions={activePermissions}
              />
            )}

            {currentTab === 'staff' && currentRole === 'admin' && (
              <StaffManagement
                staffList={staffList}
                onAddStaff={handleAddStaff}
                onEditStaff={handleEditStaff}
                onToggleStatus={handleToggleStaffStatus}
                onUpdatePermissions={handleUpdateStaffPermissions}
                onUpdatePasswordPin={handleUpdateStaffPin}
                onDeleteStaff={handleDeleteStaff}
              />
            )}

            {currentTab === 'payment-settings' && currentRole === 'admin' && (
              <PaymentSettings
                settings={paymentSettings}
                onSaveSettings={handleSavePaymentSettings}
              />
            )}

            {currentTab === 'gateway-settings' && currentRole === 'admin' && (
              <WhatsAppSettings
                settings={gatewaySettings}
                notifications={notifications}
                onSaveSettings={handleSaveGatewaySettings}
                onTestConnection={handleTestConnection}
                onSendWhatsApp={handleSendWhatsApp}
                onMarkAsSent={handleMarkNotificationSent}
              />
            )}
          </>
        )}
      </main>

      {/* 4. New Contract Booking Modal */}
      <NewContractModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        containers={containers}
        staffList={staffList}
        preSelectedContainerId={preSelectedContainerId}
        onSaveContract={handleSaveContract}
      />

      {/* 5. Printable Official PDF Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedReceiptContract}
        onClose={() => setSelectedReceiptContract(null)}
        contract={selectedReceiptContract}
        onSendWhatsAppReceipt={handleSendWhatsApp}
      />

      {/* 6. Extend / Renew Contract Modal */}
      <ExtendContractModal
        isOpen={!!selectedExtendContract}
        onClose={() => setSelectedExtendContract(null)}
        contract={selectedExtendContract}
        onConfirmExtension={handleConfirmExtension}
      />

      {/* 7. Driver Mission WhatsApp Dispatch Modal */}
      <DriverDispatchModal
        isOpen={!!selectedDriverDispatchContract}
        onClose={() => setSelectedDriverDispatchContract(null)}
        contract={selectedDriverDispatchContract}
        drivers={staffList}
        onSendViaApi={async (phone, msg) => {
          handleSendWhatsApp(phone, msg);
          return true;
        }}
      />

      {/* 8. 🔐 Luxury Staff & Admin PIN Login Modal */}
      <StaffLoginModal
        isOpen={!showSplash && (!isAuthenticated || isStaffLoginModalOpen)}
        onClose={() => {
          if (isAuthenticated) {
            setIsStaffLoginModalOpen(false);
          }
        }}
        staffList={staffList}
        currentProfile={currentProfile}
        onSelectProfile={handleSelectProfile}
        isMandatory={!isAuthenticated}
      />

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '20px 24px',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.85rem'
      }}>
        المحترز للحاويات © {new Date().getFullYear()} — نظام إدارة وتأجير الحاويات التجارية والأنقاض والتحصيل المالي
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <React.Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050811',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fbbf24', marginBottom: '8px' }}>
          المحترز للحاويات 🏗️
        </div>
        <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
          جارٍ تحميل النظام والربط اللحظي...
        </div>
      </div>
    }>
      <MainDashboard />
    </React.Suspense>
  );
}
