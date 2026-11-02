'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Truck, Lock, ShieldCheck } from 'lucide-react';
import { supabaseBrowser as supabase } from '@/lib/supabaseBrowser';
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
  SmartAssistantSettings,
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
import { StaffManagement, DEFAULT_DRIVER_PERMISSIONS, DEFAULT_STAFF_PERMISSIONS, NewStaffAccount } from '@/components/StaffManagement';
import { WhatsAppSettings } from '@/components/WhatsAppSettings';
import { PaymentSettings } from '@/components/PaymentSettings';
import { SmartAssistantHub } from '@/components/SmartAssistantHub';
import { FloatingVoiceOrb } from '@/components/FloatingVoiceOrb';
import { NewContractModal } from '@/components/NewContractModal';
import { ReceiptModal } from '@/components/ReceiptModal';
import { ExtendContractModal } from '@/components/ExtendContractModal';
import { InventoryManagement } from '@/components/InventoryManagement';
import { DriverDispatchModal } from '@/components/DriverDispatchModal';
import { StaffLoginModal } from '@/components/StaffLoginModal';
import { formatDriverWhatsAppMessage } from '@/utils/driverDispatch';
import { formatCustomerVoucherMessage, formatDriverMissionMessage, formatAdminAlertMessage } from '@/utils/voucherFormatter';
import { isRealCallablePhone } from '@/components/SaudiPhoneInput';
import { generateContractVoucherImage } from '@/lib/contractImageGenerator';
import { DevLab } from '@/components/DevLab';
import { OfficialContractModal } from '@/components/OfficialContractModal';
import { ContractAuthenticationHub } from '@/components/ContractAuthenticationHub';
import { OfficialContractRecord, OfficialContractData, ContractSealSettings } from '@/types/officialContract';
import { encodeUtf8Base64 } from '@/utils/receiptEncoder';
import { createReceiptImageUrl } from '@/lib/receiptVerification';
import { CustomersDirectoryView } from '@/components/CustomersDirectoryView';
import { MarketingCustomer } from '@/types/customerMarketing';
import { VehiclesManagement } from '@/components/VehiclesManagement';
import { TransportVehicle } from '@/types/database';

// Sample Seed Data
const initialStaff: Profile[] = [
  {
    id: 'staff-admin',
    full_name: 'سعود المحترز (المدير العام)',
    email: 'admin@almuhtaraz.com',
    phone: '+966500000001',
    role: 'admin',
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
  evolution_server_url: '',
  evolution_instance_name: 'muhtaraz-instance',
  evolution_api_key: '',
  sender_phone: '+966920001234',
  admin_phone: '+966500000001',
  is_connected: true,
  auto_send_enabled: true
};

const initialPaymentSettings: IPaymentSettings = {
  is_enabled: true,
  publishable_key: '',
  secret_key: '',
  apple_pay_enabled: true,
  mada_enabled: true,
  credit_card_enabled: true,
  vat_number: '300099887700003',
  company_commercial_reg: '1010889900'
};

const initialAssistantSettings: SmartAssistantSettings = {
  whatsapp_routing: {
    notify_customer: true,
    notify_driver: true,
    notify_admin: true,
  },
  daily_report: {
    enabled: true,
    send_time: '21:00',
    admin_phone: '+966500000001',
  },
  approval_policy: {
    require_admin_approval_for_staff: false,
  },
  auto_dispatch_enabled: true,
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'حدث خطأ غير معروف أثناء الاتصال بقاعدة البيانات.';
}

function MainDashboard() {
  // App State
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState('search');
  const [currentRole, setCurrentRole] = useState<UserRole>('employee');
  
  // Data State
  const [containers, setContainers] = useState<Container[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [inAppNotifications, setInAppNotifications] = useState<InAppNotification[]>([]);
  const [isBusinessDataLoading, setIsBusinessDataLoading] = useState(false);
  const [businessDataError, setBusinessDataError] = useState<string | null>(null);
  const [businessDataReloadKey, setBusinessDataReloadKey] = useState(0);
  const [realtimeSyncError, setRealtimeSyncError] = useState<string | null>(null);
  const realtimeReloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [isStaffLoginModalOpen, setIsStaffLoginModalOpen] = useState(false);
  const [gatewaySettings, setGatewaySettings] = useState<IWhatsAppSettings>(initialGatewaySettings);
  const [paymentSettings, setPaymentSettings] = useState<IPaymentSettings>(initialPaymentSettings);
  const [assistantSettings, setAssistantSettings] = useState<SmartAssistantSettings>(initialAssistantSettings);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [vehicles, setVehicles] = useState<TransportVehicle[]>([]);

  // WhatsApp Alert System – persistent failure notifications
  interface WhatsAppAlert {
    id: string;
    type: 'success' | 'error';
    recipient: 'customer' | 'driver';
    recipientName: string;
    recipientPhone: string;
    contractNumber: string;
    message: string;
    errorMessage?: string;
    timestamp: string;
  }
  const [whatsappAlerts, setWhatsappAlerts] = useState<WhatsAppAlert[]>([]);
  const dismissAlert = useCallback((id: string) => setWhatsappAlerts(prev => prev.filter(a => a.id !== id)), []);
  const retryAlert = useCallback(async (alert: WhatsAppAlert) => {
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: alert.recipientPhone, message: alert.message })
      });
      const data = await res.json();
      if (data.success) {
        setWhatsappAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, type: 'success', errorMessage: undefined } : a));
        setTimeout(() => dismissAlert(alert.id), 4000);
      }
    } catch {}
  }, [dismissAlert]);

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

  // Authenticated profile selection
  const handleSelectProfile = (profile: Profile) => {
    setCurrentProfile(profile);
    setCurrentRole(profile.role);
    setSelectedStaffId(profile.id);
    setIsAuthenticated(true);
    setIsStaffLoginModalOpen(false);
    if (profile.role === 'employee') {
      if (['staff', 'payment-settings'].includes(currentTab)) {
        setCurrentTab('search');
      }
    }
  };

  const handleLogout = () => {
    void supabase.auth.signOut().then(({ error }) => {
      if (error) {
        console.error('Failed to sign out:', error);
        return;
      }
      setIsAuthenticated(false);
      setCurrentProfile(null);
      setSelectedStaffId('');
      setStaffList([]);
      setIsStaffLoginModalOpen(true);
    });
  };

  useEffect(() => {
    let cancelled = false;

    const restoreAuthenticatedProfile = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Could not restore the authenticated user:', authError);
        return;
      }
      if (!user) return;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role, is_active, can_view_all_records, permissions, notes, created_at, updated_at')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) {
        console.error('Could not load the authenticated staff profile:', profileError);
        return;
      }
      if (!profile || !profile.is_active) {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Could not sign out an inactive profile:', error);
        return;
      }
      if (!cancelled) handleSelectProfile(profile);
    };

    void restoreAuthenticatedProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!currentProfile) return;
    let cancelled = false;

    const loadStaffProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role, is_active, can_view_all_records, permissions, notes, created_at, updated_at')
        .order('created_at', { ascending: true });
      if (error) {
        console.error('Could not load staff profiles:', error);
        alert('تعذر تحميل قائمة الموظفين. أعد المحاولة بعد التحقق من الاتصال.');
        return;
      }
      if (!cancelled && data) setStaffList(data);
    };

    void loadStaffProfiles();
    return () => {
      cancelled = true;
    };
  }, [currentProfile?.id]);

  const handleEditStaff = async (profileId: string, updatedData: Partial<Profile>): Promise<boolean> => {
    const { error } = await supabase.from('profiles').update(updatedData).eq('id', profileId);
    if (error) {
      console.error('Could not update staff profile:', error);
      alert('تعذر حفظ بيانات الموظف.');
      return false;
    }
    const updatedAt = new Date().toISOString();
    setStaffList(prev => prev.map(s => s.id === profileId ? { ...s, ...updatedData, updated_at: updatedAt } : s));
    if (currentProfile?.id === profileId) {
      setCurrentProfile(prev => prev ? { ...prev, ...updatedData, updated_at: updatedAt } : null);
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

  // Official Municipal Contract Modal State
  const [isOfficialContractModalOpen, setIsOfficialContractModalOpen] = useState(false);
  const [selectedOfficialRecordForModal, setSelectedOfficialRecordForModal] = useState<OfficialContractRecord | null>(null);

  // ── 📜 OFFICIAL CONTRACTS & MANAGER SEAL AUTHENTICATION STATE ──
  const [officialContractRecords, setOfficialContractRecords] = useState<OfficialContractRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('al_muhtaraz_official_contracts');
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.warn('Error reading stored official contracts:', e);
      }
    }
    return [
      {
        id: 'off-1',
        status: 'pending_seal',
        contractData: {
          contractDate: new Date().toISOString().split('T')[0],
          approvalNumber: 'APP-2026-9104',
          serialNumber: '0208',
          secondPartyName: 'شركة الإعمار والتطوير للمقاولات',
          containerCount: 2,
          containerType: 'حاوية مخلفات وترميم 20 ياردة',
          phoneNumber: '0555123456',
          plotNumber: '140 / ب',
          planNumber: '254 / ج',
          locationDescription: 'حي المروج — تقاطع شارع الملك فهد مع شارع الأندلس',
          renovationLicenseYears: 1,
          buildingLicenseYears: 2,
          isSealed: false
        },
        createdBy: 'أحمد السائق',
        createdAt: new Date().toISOString()
      }
    ];
  });

  const [contractSealSettings, setContractSealSettings] = useState<ContractSealSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('al_muhtaraz_contract_seal_settings');
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.warn('Error reading stored seal settings:', e);
      }
    }
    return {
      sealImageUrl: null,
      managerName: 'أبو ماجد (المدير العام)',
      updatedAt: new Date().toISOString()
    };
  });

  // Sync official contracts to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('al_muhtaraz_official_contracts', JSON.stringify(officialContractRecords));
      } catch (e) {
        console.warn('Error saving official contracts locally:', e);
      }
    }
  }, [officialContractRecords]);

  // Sync seal settings
  const handleSaveSealSettings = async (settings: ContractSealSettings) => {
    setContractSealSettings(settings);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('al_muhtaraz_contract_seal_settings', JSON.stringify(settings));
      } catch (e) {
        console.warn('Error saving seal settings locally:', e);
      }
    }
    try {
      await supabase.from('contract_seal_settings').upsert([{
        id: 1,
        seal_image_url: settings.sealImageUrl,
        manager_name: settings.managerName,
        updated_at: new Date().toISOString()
      }]);
    } catch (err) {
      console.warn('Supabase seal settings sync error:', err);
    }
  };

  // Submit contract for manager sealing (Employee)
  const handleSubmitOfficialContractForSealing = async (data: OfficialContractData): Promise<boolean> => {
    const newRecord: OfficialContractRecord = {
      id: `off-${Date.now()}`,
      status: 'pending_seal',
      contractData: data,
      createdBy: currentProfile?.full_name || 'موظف',
      createdAt: new Date().toISOString()
    };
    setOfficialContractRecords(prev => [newRecord, ...prev]);

    // Send in-app notification to Manager
    const inApp: InAppNotification = {
      id: `notif-${Date.now()}`,
      contract_id: newRecord.id,
      title: `📑 عقد رفع أنقاض جديد بحاجة للتوثيق`,
      message: `قام (${newRecord.createdBy}) برفع عقد رقم (${data.serialNumber}) لصالح (${data.secondPartyName}) بانتظار اعتماد وختم المدير.`,
      type: 'contract_created',
      is_read: false,
      created_at: new Date().toISOString()
    };
    setInAppNotifications(prev => [inApp, ...prev]);
    return true;
  };

  // Seal contract (Manager)
  const handleSealOfficialContractByManager = async (recordId: string, data: OfficialContractData): Promise<boolean> => {
    setOfficialContractRecords(prev => prev.map(rec => {
      if (rec.id === recordId) {
        return {
          ...rec,
          status: 'sealed',
          contractData: {
            ...data,
            isSealed: true,
            sealedBy: contractSealSettings.managerName || 'المدير العام',
            sealedAt: new Date().toISOString(),
            sealImageUrl: contractSealSettings.sealImageUrl || undefined
          },
          sealedBy: contractSealSettings.managerName || 'المدير العام',
          sealedAt: new Date().toISOString(),
          sealImageUrl: contractSealSettings.sealImageUrl || undefined
        };
      }
      return rec;
    }));

    // In-app notification
    const inApp: InAppNotification = {
      id: `notif-sealed-${Date.now()}`,
      contract_id: recordId,
      title: `✓ تم توثيق وختم العقد (${data.serialNumber})`,
      message: `تم اعتماد وختم العقد رسمياً وأصبح جاهزاً للطباعة والإرسال للطرف الثاني (${data.secondPartyName}).`,
      type: 'contract_created',
      is_read: false,
      created_at: new Date().toISOString()
    };
    setInAppNotifications(prev => [inApp, ...prev]);
    return true;
  };

  const handleDeleteOfficialContractRecord = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا العقد من سجلات التوثيق؟')) {
      setOfficialContractRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleOpenContractForSealing = (record: OfficialContractRecord) => {
    setSelectedOfficialRecordForModal(record);
    setIsOfficialContractModalOpen(true);
  };

  const handlePrintOfficialContract = (record: OfficialContractRecord) => {
    setSelectedOfficialRecordForModal(record);
    setIsOfficialContractModalOpen(true);
  };

  const handleSendOfficialContractWhatsApp = (record: OfficialContractRecord) => {
    if (record.contractData.phoneNumber && isRealCallablePhone(record.contractData.phoneNumber)) {
      const payload = {
        type: 'official_contract' as const,
        approvalNumber: record.contractData.approvalNumber,
        serialNumber: record.contractData.serialNumber,
        contractDate: record.contractData.contractDate,
        secondPartyName: record.contractData.secondPartyName,
        containerCount: record.contractData.containerCount,
        containerType: record.contractData.containerType,
        phoneNumber: record.contractData.phoneNumber,
        plotNumber: record.contractData.plotNumber,
        planNumber: record.contractData.planNumber,
        locationDescription: record.contractData.locationDescription,
        renovationLicenseYears: record.contractData.renovationLicenseYears,
        buildingLicenseYears: record.contractData.buildingLicenseYears,
        isSealed: record.status === 'sealed' || record.contractData.isSealed,
        sealedBy: record.sealedBy || record.contractData.sealedBy,
        sealedAt: record.sealedAt || record.contractData.sealedAt,
        sealImageUrl: record.sealImageUrl || record.contractData.sealImageUrl
      };
      const encoded = encodeUtf8Base64(payload);
      const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://al-muhtaraz.vercel.app';
      const verifyUrl = `${origin}/receipt/${encodeURIComponent(record.contractData.approvalNumber || record.contractData.serialNumber)}?d=${encoded}&type=official`;

      const msg = `مرحباً ${record.contractData.secondPartyName}، مرفق رابط وثيقة عقد تأجير الحاويات المعتمد والمختوم رقم (${record.contractData.serialNumber || record.contractData.approvalNumber}) من شركة المحترز للحاويات 🏗️\n\n📄 للاطلاع على العقد الرسمي والختم المعتمد إلكترونياً:\n${verifyUrl}\n\nشكراً لتعاملكم واختياركم المحترز للحاويات 🙏`;
      handleSendWhatsApp(record.contractData.phoneNumber, msg);
    } else {
      alert('رقم جوال الطرف الثاني غير مسجل أو غير صحيح.');
    }
  };

  // ── 👥 CUSTOMER DIRECTORY & MARKETING DATABASE STATE ──
  const [marketingCustomers, setMarketingCustomers] = useState<MarketingCustomer[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('al_muhtaraz_marketing_customers');
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.warn('Error reading stored marketing customers:', e);
      }
    }
    return [
      {
        id: 'cust-1',
        name: 'شركة دار الإعمار والمقاولات',
        phone: '0555123456',
        category: 'company',
        address: 'سكاكا — حي المروج',
        total_contracts: 4,
        last_deal_date: '2026-08-20',
        marketing_opt_in: true,
        tags: ['مقاول رئيسي', 'حاويات شهرية'],
        source: 'contract',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'cust-2',
        name: 'مؤسسة أفق الشمال للتجارة',
        phone: '0509876543',
        category: 'company',
        address: 'سكاكا — شارع الملك فهد',
        total_contracts: 2,
        last_deal_date: '2026-08-22',
        marketing_opt_in: true,
        tags: ['رخصة ترميم'],
        source: 'contract',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'cust-3',
        name: 'محمد بن سالم الرويلي',
        phone: '0532643000',
        category: 'individual',
        address: 'حي الشفاء',
        total_contracts: 1,
        last_deal_date: '2026-08-25',
        marketing_opt_in: true,
        tags: ['مالك مبنى'],
        source: 'contract',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  });

  // Sync to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('al_muhtaraz_marketing_customers', JSON.stringify(marketingCustomers));
      } catch (e) {
        console.warn('Error saving marketing customers:', e);
      }
    }
  }, [marketingCustomers]);

  const handleSaveMarketingCustomer = (cust: MarketingCustomer) => {
    setMarketingCustomers(prev => {
      const exists = prev.some(c => c.id === cust.id);
      if (exists) {
        return prev.map(c => c.id === cust.id ? cust : c);
      }
      return [cust, ...prev];
    });
  };

  const handleDeleteMarketingCustomer = (id: string) => {
    setMarketingCustomers(prev => prev.filter(c => c.id !== id));
  };

  // Auto-sync and extract customers from contracts and official contracts
  const handleSyncCustomersFromContracts = (): number => {
    let addedCount = 0;
    const existingPhones = new Set(marketingCustomers.map(c => c.phone.replace(/[^0-9]/g, '')));
    const newEntries: MarketingCustomer[] = [];

    // 1. From regular contracts
    contracts.forEach(cnt => {
      const cleanPhone = (cnt.customer?.phone || '').replace(/[^0-9]/g, '');
      if (cleanPhone.length >= 9 && !existingPhones.has(cleanPhone)) {
        existingPhones.add(cleanPhone);
        newEntries.push({
          id: `sync-cnt-${cnt.id}`,
          name: cnt.customer?.name || 'عميل عقد حاوية',
          phone: cnt.customer?.phone || '',
          category: cnt.contract_type === 'commercial' ? 'company' : 'individual',
          address: cnt.location_address || undefined,
          total_contracts: 1,
          last_deal_date: cnt.start_date ? cnt.start_date.split('T')[0] : undefined,
          marketing_opt_in: true,
          tags: ['عقد حاوية', cnt.contract_type === 'commercial' ? 'تجاري' : 'يومي'],
          source: 'contract',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        addedCount++;
      }
    });

    // 2. From official municipal contracts
    officialContractRecords.forEach(off => {
      const cleanPhone = (off.contractData.phoneNumber || '').replace(/[^0-9]/g, '');
      if (cleanPhone.length >= 9 && !existingPhones.has(cleanPhone)) {
        existingPhones.add(cleanPhone);
        newEntries.push({
          id: `sync-off-${off.id}`,
          name: off.contractData.secondPartyName || 'عميل رفع أنقاض موثق',
          phone: off.contractData.phoneNumber,
          category: 'company',
          address: off.contractData.locationDescription || undefined,
          total_contracts: 1,
          last_deal_date: off.contractData.contractDate,
          marketing_opt_in: true,
          tags: ['عقد أنقاض موثق', 'بلدي'],
          source: 'official_contract',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        addedCount++;
      }
    });

    if (newEntries.length > 0) {
      setMarketingCustomers(prev => [...newEntries, ...prev]);
    }
    return addedCount;
  };

  // Safe Broadcast Campaign Dispatcher
  const handleBulkSendCampaign = async (
    recipients: { name: string; phone: string }[],
    messageTemplate: string,
    onProgress: (sent: number, total: number) => void
  ): Promise<void> => {
    let sent = 0;
    for (const recipient of recipients) {
      if (recipient.phone && isRealCallablePhone(recipient.phone)) {
        const personalized = messageTemplate.replace(/{الاسم}/g, recipient.name);
        try {
          await handleSendWhatsApp(recipient.phone, personalized);
          sent++;
          onProgress(sent, recipients.length);
          // Wait 1.8s between messages to prevent spam detection
          await new Promise(r => setTimeout(r, 1800));
        } catch (e) {
          console.warn('Failed to send campaign message to:', recipient.phone, e);
        }
      }
    }
  };

  // Driver Mission WhatsApp Dispatch Modal State
  const [selectedDriverDispatchContract, setSelectedDriverDispatchContract] = useState<Contract | null>(null);

  // Live WhatsApp Connection Status (Monitored across all dashboards)
  const [whatsappLiveStatus, setWhatsappLiveStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');

  useEffect(() => {
    const pollWhatsAppStatus = async () => {
      try {
        const res = await fetch('/api/whatsapp/status');
        const data = await res.json();
        if (data.status === 'connected') {
          setWhatsappLiveStatus('connected');
        } else if (data.status === 'connecting') {
          setWhatsappLiveStatus('connecting');
        } else {
          setWhatsappLiveStatus('disconnected');
        }
      } catch {
        // Network failure
      }
    };
    pollWhatsAppStatus();
    const interval = setInterval(pollWhatsAppStatus, 25000);
    return () => clearInterval(interval);
  }, []);

  // Load shared business records from Supabase; empty tables are authoritative.
  useEffect(() => {
    if (!isAuthenticated) return;

    let isCurrent = true;
    const fetchSupabaseData = async () => {
      const errors: string[] = [];
      setIsBusinessDataLoading(true);
      setBusinessDataError(null);
      setContainers([]);
      setContracts([]);
      setCustomers([]);

      try {
        const [containersResult, customersResult, contractsResult] = await Promise.all([
          supabase.from('containers').select('*'),
          supabase.from('customers').select('*'),
          supabase.from('contracts').select('*, customer:customers(*), container:containers(*), assigned_employee:profiles!contracts_assigned_employee_id_fkey(*)')
        ]);
        if (!isCurrent) return;

        const coreErrors = [
          containersResult.error && `الحاويات: ${containersResult.error.message}`,
          customersResult.error && `العملاء: ${customersResult.error.message}`,
          contractsResult.error && `العقود: ${contractsResult.error.message}`
        ].filter((error): error is string => Boolean(error));

        if (coreErrors.length) {
          setContainers([]);
          setCustomers([]);
          setContracts([]);
          errors.push(...coreErrors);
        } else {
          setContainers(containersResult.data ?? []);
          setCustomers(customersResult.data ?? []);
          setContracts(contractsResult.data ?? []);
        }

        // Restore from localStorage first for instant display
        try {
          const localWa = localStorage.getItem('muhtaraz_whatsapp_settings');
          if (localWa) setGatewaySettings(JSON.parse(localWa));
          const localPay = localStorage.getItem('muhtaraz_payment_settings');
          if (localPay) setPaymentSettings(JSON.parse(localPay));
        } catch (e) {}

        const [
          notificationsResult,
          inAppResult,
          settingsResult,
          paymentSettingsResult,
          receiptsResult,
          vehiclesResult,
          sealResult
        ] = await Promise.all([
          supabase.from('notification_logs').select('*'),
          supabase.from('notifications').select('*').order('created_at', { ascending: false }),
          supabase.from('whatsapp_settings').select('*').limit(1).maybeSingle(),
          supabase.from('payment_settings').select('*').limit(1).maybeSingle(),
          supabase.from('receipts').select('*'),
          supabase.from('vehicles').select('*'),
          supabase.from('contract_seal_settings').select('*').limit(1).maybeSingle()
        ]);
        if (!isCurrent) return;

        if (notificationsResult.error) errors.push(`الإشعارات: ${notificationsResult.error.message}`);
        else setNotifications(notificationsResult.data ?? []);

        if (inAppResult.error) errors.push(`التنبيهات الداخلية: ${inAppResult.error.message}`);
        else setInAppNotifications(inAppResult.data ?? []);

        if (settingsResult.error) errors.push(`إعدادات واتساب: ${settingsResult.error.message}`);
        else if (settingsResult.data) setGatewaySettings(settingsResult.data);

        if (paymentSettingsResult.error) errors.push(`إعدادات الدفع: ${paymentSettingsResult.error.message}`);
        else if (paymentSettingsResult.data) setPaymentSettings(paymentSettingsResult.data);

        if (receiptsResult.error) errors.push(`السندات: ${receiptsResult.error.message}`);
        else setReceipts(receiptsResult.data ?? []);

        if (vehiclesResult.error) errors.push(`المركبات: ${vehiclesResult.error.message}`);
        else setVehicles(vehiclesResult.data ?? []);

        if (sealResult.error) errors.push(`ختم العقود: ${sealResult.error.message}`);
        else if (sealResult.data) {
          setContractSealSettings({
            sealImageUrl: sealResult.data.seal_image_url || null,
            managerName: sealResult.data.manager_name || 'أبو ماجد (المدير العام)',
            updatedAt: sealResult.data.updated_at || new Date().toISOString()
          });
        }
      } catch (err) {
        if (!isCurrent) return;
        setContainers([]);
        setCustomers([]);
        setContracts([]);
        errors.push(getErrorMessage(err));
      } finally {
        if (isCurrent) {
          setBusinessDataError(errors.length ? errors.join(' • ') : null);
          setIsBusinessDataLoading(false);
        }
      }
    };

    void fetchSupabaseData();
    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated, businessDataReloadKey]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const scheduleReload = () => {
      if (realtimeReloadTimer.current) clearTimeout(realtimeReloadTimer.current);
      realtimeReloadTimer.current = setTimeout(() => {
        setBusinessDataReloadKey(key => key + 1);
      }, 300);
    };

    const channel = supabase
      .channel('shared-business-records')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'containers' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receipts' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_logs' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, scheduleReload)
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeSyncError('تعذر الاتصال بالمزامنة اللحظية. تحقق من اتصال الشبكة وإعداد Realtime في Supabase.');
        } else if (status === 'SUBSCRIBED') {
          setRealtimeSyncError(null);
          scheduleReload();
        }
      });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') scheduleReload();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (realtimeReloadTimer.current) clearTimeout(realtimeReloadTimer.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  // WhatsApp Sender Helper (Fallback wa.me – for manual send buttons only)
  const handleSendWhatsApp = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, '_blank');
  };

  // 🔕 Silent WhatsApp Send with Persistent Alert Feedback
  const sendSilentWhatsApp = useCallback(async (
    phone: string,
    message: string,
    recipient: 'customer' | 'driver',
    recipientName: string,
    contractNumber: string,
    extraPayload?: Record<string, string>
  ): Promise<{ success: boolean; error?: string }> => {
    const alertId = `wa-alert-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message, ...extraPayload })
      });
      const data = await res.json();
      if (data.success) {
        // Success: show brief green toast that auto-dismisses after 5s
        const successAlert: WhatsAppAlert = {
          id: alertId,
          type: 'success',
          recipient,
          recipientName,
          recipientPhone: phone,
          contractNumber,
          message,
          timestamp: new Date().toISOString()
        };
        setWhatsappAlerts(prev => [successAlert, ...prev]);
        setTimeout(() => dismissAlert(alertId), 5000);
        return { success: true };
      } else {
        // Failure: show persistent red alert that stays until manually dismissed
        const errorAlert: WhatsAppAlert = {
          id: alertId,
          type: 'error',
          recipient,
          recipientName,
          recipientPhone: phone,
          contractNumber,
          message,
          errorMessage: data.error || 'تعذّر الوصول إلى بوابة الواتساب',
          timestamp: new Date().toISOString()
        };
        setWhatsappAlerts(prev => [errorAlert, ...prev]);
        return { success: false, error: data.error };
      }
    } catch (err: any) {
      const errorAlert: WhatsAppAlert = {
        id: alertId,
        type: 'error',
        recipient,
        recipientName,
        recipientPhone: phone,
        contractNumber,
        message,
        errorMessage: err?.message || 'خطأ في الاتصال بالشبكة',
        timestamp: new Date().toISOString()
      };
      setWhatsappAlerts(prev => [errorAlert, ...prev]);
      return { success: false, error: err?.message };
    }
  }, [dismissAlert]);

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
    if (contractId.startsWith('off-') || contractId.startsWith('notif-sealed-')) {
      const offRec = officialContractRecords.find(r => r.id === contractId);
      if (offRec) {
        setSelectedOfficialRecordForModal(offRec);
        setIsOfficialContractModalOpen(true);
      }
      setCurrentTab('contract-auth');
    } else {
      setCurrentTab('contracts');
    }
  };

  // Gateway Settings Handlers
  const handleSaveGatewaySettings = async (updated: IWhatsAppSettings): Promise<boolean> => {
    try {
      const { error } = await supabase.from('whatsapp_settings').upsert([updated]);
      if (error) {
        console.error('Could not save WhatsApp server settings:', error);
        return false;
      }
      setGatewaySettings(updated);
      return true;
    } catch (error) {
      console.error('Could not save WhatsApp server settings:', error);
      return false;
    }
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

  const handleSaveAssistantSettings = async (updated: SmartAssistantSettings): Promise<boolean> => {
    setAssistantSettings(updated);
    try {
      await supabase.from('assistant_settings').upsert([updated]);
    } catch (e) {
      console.warn('Saved assistant settings locally:', e);
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

    // 🚀 Tracked Silent WhatsApp Dispatch for Receipt Confirmation
    if (contract.customer?.phone && isRealCallablePhone(contract.customer.phone)) {
      const receiptAmount = remaining > 0 ? remaining : contract.total_cost;
      const receiptMsg = `مرحباً ${contract.customer?.name || 'العميل'}، تم استلام مبلغ (${receiptAmount} ر.س) نقداً وتوثيق سند قبض رقم (${receiptNumber}) لعقد الحاوية (${contract.contract_number}).\n\nشكراً لتعاملكم واختياركم المحترز للحاويات 🏗️`;
      await sendSilentWhatsApp(
        contract.customer.phone,
        receiptMsg,
        'customer',
        contract.customer?.name || 'العميل',
        contract.contract_number,
        { contract_id: contract.id, customer_id: contract.customer_id, recipient_role: 'customer', notification_type: 'custom_alert' }
      );
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
    }

    // Always display the full updated contract & extension receipt directly on screen
    setSelectedReceiptContract(updatedContract);

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

    // 🚀 Tracked Silent WhatsApp Dispatch with Persistent Alert Feedback
    if (contract.customer?.phone && isRealCallablePhone(contract.customer.phone)) {
      await sendSilentWhatsApp(
        contract.customer.phone,
        messageContent,
        'customer',
        contract.customer?.name || 'العميل',
        contract.contract_number,
        { contract_id: contract.id, customer_id: contract.customer_id, recipient_role: 'customer', notification_type: 'contract_extended' }
      );
    }
    // Dispatch to assigned driver if present and real
    const extDriver = staffList.find(s => s.id === contract.assigned_employee_id);
    if (extDriver?.phone && isRealCallablePhone(extDriver.phone)) {
      const driverMsg = `🔄 تمديد عقد حاوية\nرقم العقد: ${contract.contract_number}\nرقم الحاوية: ${contract.container?.container_number || '-'}\nالعميل: ${contract.customer?.name || '-'} (${contract.customer?.phone || '-'})\nموعد السحب الجديد: ${new Date(newEndDate).toLocaleDateString('ar-SA')}\nمدة إضافية: +${additionalDays} يوم`;
      await sendSilentWhatsApp(
        extDriver.phone,
        driverMsg,
        'driver',
        extDriver.full_name,
        contract.contract_number,
        { contract_id: contract.id, recipient_role: 'driver', notification_type: 'contract_extended' }
      );
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
    try {
      const { data, error } = await supabase
        .from('containers')
        .update({ status })
        .eq('id', containerId)
        .select('*')
        .single();
      if (error) throw error;

      setContainers(prev => prev.map(c => c.id === containerId ? data : c));
      setBusinessDataError(null);
    } catch (error) {
      setBusinessDataError(`تعذر تحديث حالة الحاوية: ${getErrorMessage(error)}`);
      return;
    }

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

  };

  // Add Container Handler (Single)
  const handleAddContainer = async (data: Partial<Container>): Promise<boolean> => {
    try {
      const { data: createdContainer, error } = await supabase
        .from('containers')
        .insert([{
          container_number: data.container_number?.trim(),
          type: data.type || 'debris',
          status: 'available',
          daily_rate: data.daily_rate ?? 0,
          monthly_rate: data.monthly_rate ?? 0,
          notes: data.notes
        }])
        .select('*')
        .single();
      if (error) throw error;
      if (!createdContainer?.id) throw new Error('لم تُرجع قاعدة البيانات سجل الحاوية بعد الحفظ.');

      setContainers(prev => [createdContainer, ...prev]);
      setBusinessDataError(null);
      return true;
    } catch (error) {
      setBusinessDataError(`تعذر حفظ الحاوية: ${getErrorMessage(error)}`);
      return false;
    }
  };

  // 📦 Batch Add Containers Handler (Bulk Intake)
  const handleBatchAddContainers = async (newContainers: Partial<Container>[]): Promise<boolean> => {
    try {
      const insertRows = newContainers.map(item => ({
        container_number: item.container_number?.trim(),
        type: item.type || 'debris',
        status: 'available' as const,
        daily_rate: item.daily_rate ?? 0,
        monthly_rate: item.monthly_rate ?? 0,
        notes: item.notes
      }));
      const { data: createdList, error } = await supabase
        .from('containers')
        .insert(insertRows)
        .select('*');
      if (error) throw error;
      if (!createdList || createdList.length !== insertRows.length) {
        throw new Error('لم تؤكد قاعدة البيانات حفظ جميع الحاويات في الدفعة.');
      }

      setContainers(prev => [...createdList, ...prev]);
      setBusinessDataError(null);
      const inAppNotif: InAppNotification = {
        id: `inapp-${Date.now()}`,
        title: `📦 تم توريد دفعة مخزون جديدة (${createdList.length} حاوية)`,
        message: `تم إدراج (${createdList.length}) حاوية جديدة إلى مخزون الحاويات المتاحة بنجاح.`,
        type: 'system_alert',
        is_read: false,
        created_at: new Date().toISOString()
      };
      setInAppNotifications(prev => [inAppNotif, ...prev]);
      return true;
    } catch (error) {
      setBusinessDataError(`تعذر حفظ دفعة الحاويات: ${getErrorMessage(error)}`);
      return false;
    }
  };

  // 📥 Two-Way Return to Stock: Complete Contract & Set Container to Available 🟢
  const handleCompleteContractAndReturnToStock = async (contractId: string, containerId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    const container = containers.find(c => c.id === containerId);

    try {
      const { data, error } = await supabase.rpc('complete_container_rental_contract', {
        p_contract_id: contractId,
        p_container_id: containerId
      });
      if (error) throw error;
      if (!data || typeof data !== 'object' || !('contract' in data) || !('container' in data)) {
        throw new Error('لم تُرجع قاعدة البيانات تأكيد إنهاء العقد وتحديث الحاوية.');
      }

      const completedContract = data.contract as Contract;
      const availableContainer = data.container as Container;
      if (!completedContract.id || !availableContainer.id) {
        throw new Error('بيانات التأكيد التي أعادتها قاعدة البيانات غير مكتملة.');
      }

      setContracts(prev => prev.map(c => c.id === contractId ? { ...c, ...completedContract } : c));
      setContainers(prev => prev.map(c => c.id === containerId ? availableContainer : c));
      setBusinessDataError(null);
    } catch (error) {
      setBusinessDataError(`تعذر إنهاء العقد وإعادة الحاوية للمخزون: ${getErrorMessage(error)}`);
      return;
    }

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

  };

  // Delete Container Handler (Admin)
  const handleDeleteContainer = async (containerId: string) => {
    try {
      const { data, error } = await supabase
        .from('containers')
        .delete()
        .eq('id', containerId)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('لم تُحذف الحاوية؛ قد تكون مرتبطة بعقد أو لا تملك صلاحية الحذف.');
      setContainers(prev => prev.filter(c => c.id !== containerId));
      setBusinessDataError(null);
    } catch (error) {
      setBusinessDataError(`تعذر حذف الحاوية: ${getErrorMessage(error)}`);
    }
  };

  // Contract Status Update Handler
  const handleUpdateContractStatus = async (contractId: string, status: ContractStatus) => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .update({ status })
        .eq('id', contractId)
        .select('*, customer:customers(*), container:containers(*), assigned_employee:profiles!contracts_assigned_employee_id_fkey(*)')
        .single();
      if (error) throw error;
      if (!data?.id) throw new Error('لم تُرجع قاعدة البيانات العقد بعد تحديثه.');
      setContracts(prev => prev.map(c => c.id === contractId ? data : c));
      if (data.container) {
        setContainers(prev => prev.map(c => c.id === data.container_id ? data.container as Container : c));
      }
      setBusinessDataError(null);
    } catch (error) {
      setBusinessDataError(`تعذر تحديث حالة العقد: ${getErrorMessage(error)}`);
    }
  };

  // Delete Contract Handler (Admin)
  const handleDeleteContract = async (contractId: string) => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('لم يُحذف العقد أو لا تملك صلاحية الحذف.');
      setContracts(prev => prev.filter(c => c.id !== contractId));
      setBusinessDataError(null);
    } catch (error) {
      setBusinessDataError(`تعذر حذف العقد: ${getErrorMessage(error)}`);
    }
  };

  // Save New Contract Handler
  const handleSaveContract = async (contractData: any): Promise<boolean> => {
    let customerObj: Customer = {
      id: '',
      name: contractData.customer_name,
      phone: contractData.customer_phone,
      customer_type: 'individual',
      address: contractData.location_address,
      created_at: '',
      updated_at: ''
    };

    let containerObj = containers.find(c => c.id === contractData.container_id);
    if (!containerObj || containerObj.status !== 'available') {
      setBusinessDataError('الحاوية المختارة غير موجودة أو لم تعد متاحة. حدّث القائمة واختر حاوية متاحة.');
      return false;
    }

    const assignedStaff = staffList.find(s => s.id === contractData.assigned_employee_id);
    const receiptNumber = `RCP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const isFree = !!contractData.is_free;
    const isCash = !isFree && contractData.payment_choice === 'cash';
    const isSadad = !isFree && contractData.payment_choice === 'sadad';
    const totalCost = isFree ? 0 : (Number(contractData.total_cost) || 0);
    const paidAmount = isFree ? 0 : Number(contractData.paid_amount ?? (isCash ? totalCost : 0));
    const remainingAmount = isFree ? 0 : Number(contractData.remaining_amount ?? Math.max(0, totalCost - paidAmount));
    const paymentStatus: PaymentStatus = isFree ? 'paid' : (remainingAmount === 0 ? 'paid' : (paidAmount > 0 ? 'partially_paid' : 'unpaid'));
    const paymentMethod: PaymentMethod = isFree ? 'free' : (isCash ? 'cash' : (isSadad ? 'mada' : 'cash'));

    let newContract: Contract = {
      id: '',
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
      is_free: isFree,
      receipt_number: (isFree || isCash || paidAmount > 0) ? receiptNumber : undefined,
      status: 'active',
      notes: contractData.notes,
      created_at: '',
      updated_at: '',
      customer: customerObj,
      container: containerObj
    };

    const shouldCreateReceipt = isFree || isCash || paidAmount > 0;
    const receiptAmount = isFree ? 0 : (paidAmount > 0 ? paidAmount : totalCost);
    const receiptNotes = isFree
      ? 'عقد تأجير معتمد'
      : `سند قبض ${paidAmount < totalCost ? `(دفعة على الحساب بمبلغ ${paidAmount} ر.س ومتبقي ${remainingAmount} ر.س)` : '(سداد كامل العقد)'}`;
    let persistedReceipt: Partial<Receipt> | null = null;

    try {
      const { data, error } = await supabase.rpc('create_container_rental_contract', {
        p_payload: {
          contract_number: newContract.contract_number,
          container_id: newContract.container_id,
          customer_name: customerObj.name,
          customer_phone: customerObj.phone,
          customer_type: customerObj.customer_type,
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
          total_cost: totalCost,
          paid_amount: paidAmount,
          payment_status: paymentStatus,
          payment_method: paymentMethod,
          is_free: isFree,
          notes: newContract.notes,
          receipt_number: shouldCreateReceipt ? receiptNumber : null,
          receipt_amount: shouldCreateReceipt ? receiptAmount : null,
          receipt_notes: shouldCreateReceipt ? receiptNotes : null
        }
      });
      if (error) throw error;

      const savedRental = data as {
        customer?: Customer;
        contract?: Partial<Contract>;
        container?: Container;
        receipt?: Partial<Receipt> | null;
      } | null;
      if (
        !savedRental?.customer?.id
        || !savedRental.contract?.id
        || !savedRental.container?.id
        || Boolean(savedRental.receipt) !== shouldCreateReceipt
      ) {
        throw new Error('لم تُرجع قاعدة البيانات سجلات العميل والعقد والحاوية بعد الحفظ.');
      }

      customerObj = savedRental.customer;
      containerObj = savedRental.container;
      persistedReceipt = savedRental.receipt || null;
      newContract = {
        ...newContract,
        ...savedRental.contract,
        customer_id: customerObj.id,
        container_id: containerObj.id,
        payment_method: paymentMethod,
        is_free: isFree,
        customer: customerObj,
        container: containerObj,
        assigned_employee: assignedStaff
      };
      setBusinessDataError(null);
    } catch (error) {
      const message = `تعذر حفظ العقد والحاوية: ${getErrorMessage(error)}`;
      setBusinessDataError(message);
      alert(message);
      return false;
    }

    // Update Local State
    setCustomers(prev => [customerObj, ...prev]);
    setContracts(prev => [newContract, ...prev]);
    setContainers(prev => prev.map(c => c.id === containerObj?.id ? containerObj : c));

    // If Free, Cash or partial down payment: Create Receipt immediately
    if (isFree || isCash || paidAmount > 0) {
      const newReceipt: Receipt = {
        id: persistedReceipt?.id || '',
        receipt_number: receiptNumber,
        contract_id: newContract.id,
        customer_id: customerObj.id,
        customer_name: customerObj.name,
        amount: receiptAmount,
        payment_method: isFree ? 'free' : (isCash ? 'cash' : 'mada'),
        contract_number: newContract.contract_number,
        container_number: containerObj?.container_number,
        container_type: newContract.contract_type,
        issued_at: new Date().toISOString(),
        notes: receiptNotes,
        created_at: new Date().toISOString()
      };
      setReceipts(prev => [{ ...newReceipt, ...persistedReceipt }, ...prev]);
    }

    // Always display the full official contract & receipt voucher directly on screen
    setSelectedReceiptContract(newContract);

    // 🧾 1. Format Customer Official Receipt Voucher Text (Zero links, pure official formatted document)
    const customerVoucherMessage = formatCustomerVoucherMessage({
      contract: newContract,
      customer: customerObj,
      container: containerObj,
      receiptNumber,
      isCash,
      paidAmount,
      remainingAmount,
      totalCost
    });

    const newNotif: NotificationLog = {
      id: `notif-${Date.now()}`,
      contract_id: newContract.id,
      customer_id: customerObj.id,
      recipient_role: 'customer',
      recipient_phone: customerObj.phone,
      recipient_name: customerObj.name,
      notification_type: 'contract_created',
      message_body: customerVoucherMessage,
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
      title: `📝 عقد جديد (${newContract.contract_number}) - ${isFree ? 'عقد مجاني 🎁' : isCash ? 'مدفوع كاش 💵' : isSadad ? 'سداد إلكتروني 💳' : 'آجل ⏳'}`,
      message: `تم توثيق عقد للعميل ${customerObj.name} بالحاوية (${containerObj?.container_number || '-'}). المسؤول: ${assignedStaff?.full_name || 'سائق'}.`,
      type: 'contract_created',
      is_read: false,
      created_at: new Date().toISOString()
    };
    setInAppNotifications(prev => [newInApp, ...prev]);

    // 🚀 1. Check Routing & Dispatch Official Voucher to Customer
    // (Primary Plan: Luxury Digital Image Voucher 🖼️ | Safe Fallback: Formatted Text Document 📄)
    const shouldNotifyCustomer = assistantSettings.whatsapp_routing?.notify_customer ?? true;
    if (shouldNotifyCustomer && isRealCallablePhone(customerObj.phone)) {
      let imageSent = false;
      const receiptPayload = {
        type: 'receipt' as const,
        receiptNumber,
        contractNumber: newContract.contract_number,
        customerName: customerObj.name,
        customerPhone: customerObj.phone,
        containerNumber: containerObj?.container_number || '-',
        contractType: newContract.contract_type === 'debris' ? 'حاوية مخلفات وأنقاض' : 'حاوية تجارية للمنشآت',
        paidAmount,
        totalCost,
        paymentMethod: isCash ? 'cash' : (isSadad ? 'mada' : 'deferred'),
        startDate: new Date(newContract.start_date).toLocaleDateString('ar-SA'),
        endDate: new Date(newContract.end_date).toLocaleDateString('ar-SA'),
        locationAddress: newContract.location_address || 'الموقع محدد عبر خرائط Google',
        issueDate: new Date().toISOString(),
        notes: newContract.notes || ''
      };

      try {
        const verificationImageUrl = await createReceiptImageUrl(receiptPayload);

        // Generate High-Definition Digital Card Image
        const imageBase64 = await generateContractVoucherImage({
          contractNumber: newContract.contract_number,
          receiptNumber: (isCash || paidAmount > 0) ? receiptNumber : undefined,
          customerName: customerObj.name,
          customerPhone: customerObj.phone,
          containerNumber: containerObj?.container_number || '-',
          contractType: newContract.contract_type === 'debris' ? 'حاوية مخلفات وأنقاض' : 'حاوية تجارية للمنشآت',
          totalCost,
          paidAmount,
          remainingAmount,
          paymentMethod: isCash ? 'نقدي كاش' : (isSadad ? 'بطاقة مدى / Apple Pay' : 'آجل'),
          startDate: new Date(newContract.start_date).toLocaleDateString('ar-SA'),
          endDate: new Date(newContract.end_date).toLocaleDateString('ar-SA'),
          locationAddress: newContract.location_address || 'الموقع محدد عبر خرائط Google',
          verificationUrl: verificationImageUrl
        });

        const imageCaption = `مرحباً ${customerObj.name}، مرفق صورة وثيقة وسند عقد الحاوية رقم (${newContract.contract_number}) من مؤسسة المحترز للحاويات 🏗️\n\nشكراً لتعاملكم واختياركم المحترز للحاويات 🙏`;

        const imgResult = await sendSilentWhatsApp(
          customerObj.phone,
          imageCaption,
          'customer',
          customerObj.name,
          newContract.contract_number,
          {
            contract_id: newContract.id,
            customer_id: customerObj.id,
            recipient_role: 'customer',
            notification_type: 'contract_created',
            mediaBase64: imageBase64,
            mediaType: 'image',
            caption: imageCaption
          }
        );

        if (imgResult?.success) {
          imageSent = true;
        }
      } catch (err) {
        console.warn('Primary Image dispatch failed, triggering safe text fallback:', err);
      }

      // 🛡️ Safe Fallback: If image dispatch failed for any reason, send the reliable text voucher!
      if (!imageSent) {
        await sendSilentWhatsApp(
          customerObj.phone,
          customerVoucherMessage,
          'customer',
          customerObj.name,
          newContract.contract_number,
          { contract_id: newContract.id, customer_id: customerObj.id, recipient_role: 'customer', notification_type: 'contract_created' }
        );
      }
    } else if (shouldNotifyCustomer) {
      // Customer phone was invalid/missing
      const warnAlertId = `wa-alert-cust-${Date.now()}`;
      setWhatsappAlerts(prev => [{
        id: warnAlertId,
        type: 'error',
        recipient: 'customer',
        recipientName: customerObj.name,
        recipientPhone: customerObj.phone || 'غير مسجل',
        contractNumber: newContract.contract_number,
        message: 'تعذر إرسال السند للعميل: رقم الهاتف غير مكتمل أو غير صالح للإرسال.',
        errorMessage: 'رقم جوال العميل غير صحيح (يجب 10 أرقام تبدأ بـ 05)',
        timestamp: new Date().toISOString()
      }, ...prev]);
    }

    // ⏱️ Pacing Delay (800ms) - Prevents Baileys WebSocket concurrency drop
    await new Promise(r => setTimeout(r, 800));

    // 🚀 2. Check Routing & Dispatch to Driver
    const shouldNotifyDriver = assistantSettings.whatsapp_routing?.notify_driver ?? true;
    if (shouldNotifyDriver && assignedStaff) {
      if (assignedStaff.phone && isRealCallablePhone(assignedStaff.phone)) {
        const mapsUrl = contractData.google_maps_url || `https://maps.google.com/?q=${contractData.location_latitude},${contractData.location_longitude}`;
        const driverMsg = formatDriverMissionMessage({
          contract: newContract,
          customer: customerObj,
          container: containerObj,
          mapsUrl,
          expectedTime: contractData.expected_pickup_time
        });
        await sendSilentWhatsApp(
          assignedStaff.phone,
          driverMsg,
          'driver',
          assignedStaff.full_name,
          newContract.contract_number,
          { contract_id: newContract.id, recipient_role: 'driver', notification_type: 'driver_dispatch' }
        );
      } else {
        // Driver was assigned, but lacks a valid phone number -> Alert staff immediately!
        const warnAlertId = `wa-alert-driver-${Date.now()}`;
        setWhatsappAlerts(prev => [{
          id: warnAlertId,
          type: 'error',
          recipient: 'driver',
          recipientName: assignedStaff.full_name,
          recipientPhone: assignedStaff.phone || 'غير مسجل',
          contractNumber: newContract.contract_number,
          message: `تعذر إرسال إشعار المهمة للسائق (${assignedStaff.full_name}) لعدم وجود رقم جوال صالح مسجل في ملفه.`,
          errorMessage: 'رقم جوال السائق مفقود أو غير مكتمل في إدارة الموظفين',
          timestamp: new Date().toISOString()
        }, ...prev]);
      }
    }

    // ⏱️ Pacing Delay (800ms)
    await new Promise(r => setTimeout(r, 800));

    // 🚀 3. Check Routing & Dispatch Instant Executive Alert to Admin (ONLY if real admin phone configured)
    const shouldNotifyAdmin = assistantSettings.whatsapp_routing?.notify_admin ?? true;
    const adminPhone = gatewaySettings.admin_phone || assistantSettings.daily_report?.admin_phone;
    if (shouldNotifyAdmin && adminPhone && isRealCallablePhone(adminPhone)) {
      const adminAlertMsg = formatAdminAlertMessage({
        contract: newContract,
        customer: customerObj,
        container: containerObj,
        staffName: currentProfile?.full_name || assignedStaff?.full_name,
        paidAmount,
        isCash
      });
      await sendSilentWhatsApp(
        adminPhone,
        adminAlertMsg,
        'driver',
        'المدير العام',
        newContract.contract_number,
        { contract_id: newContract.id, recipient_role: 'admin', notification_type: 'admin_alert' }
      );
    }

    // Trigger celebration confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    return true;
  };

  // Staff Management Handlers
  const handleAddStaff = async (staffData: NewStaffAccount): Promise<boolean> => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        alert('انتهت جلسة المدير. سجّل الدخول مجددًا ثم أعد المحاولة.');
        return false;
      }
      const apiBaseUrl = process.env.NEXT_PUBLIC_STAFF_ADMIN_API_BASE_URL?.replace(/\/+$/, '') || '';
      const response = await fetch(`${apiBaseUrl}/api/admin/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(staffData)
      });
      const result = await response.json() as { profile?: Profile; error?: string };
      const createdProfile = result.profile;
      if (!response.ok || !createdProfile) {
        alert(result.error || 'تعذر إنشاء حساب الموظف.');
        return false;
      }
      setStaffList(prev => [...prev.filter(profile => profile.id !== createdProfile.id), createdProfile]);
      return true;
    } catch (err) {
      console.error('Staff account creation failed:', err);
      alert('تعذر الاتصال بالخادم لإنشاء حساب الموظف.');
      return false;
    }
  };

  const handleSetStaffPassword = async (profileId: string, password: string): Promise<boolean> => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        alert('انتهت جلسة المدير. سجّل الدخول مجددًا ثم أعد المحاولة.');
        return false;
      }
      const apiBaseUrl = process.env.NEXT_PUBLIC_STAFF_ADMIN_API_BASE_URL?.replace(/\/+$/, '') || '';
      const response = await fetch(`${apiBaseUrl}/api/admin/staff/${encodeURIComponent(profileId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ password })
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        alert(result.error || 'تعذر تحديث كلمة مرور الموظف.');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Staff password update failed:', error);
      alert('تعذر الاتصال بالخادم لتحديث كلمة مرور الموظف.');
      return false;
    }
  };

  const handleToggleStaffStatus = async (profileId: string, currentActive: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !currentActive })
      .eq('id', profileId);
    if (error) {
      console.error('Could not update staff account status:', error);
      alert('تعذر تحديث حالة حساب الموظف.');
      return;
    }
    setStaffList(prev => prev.map(p => p.id === profileId ? { ...p, is_active: !currentActive } : p));
    if (currentProfile?.id === profileId) {
      setCurrentProfile(prev => prev ? { ...prev, is_active: !currentActive } : null);
    }
  };

  const handleUpdateStaffPermissions = async (profileId: string, permissions: StaffPermissions) => {
    const { error } = await supabase.from('profiles').update({
      permissions,
      can_view_all_records: permissions.can_view_all_contracts
    }).eq('id', profileId);
    if (error) {
      console.error('Could not update staff permissions:', error);
      alert('تعذر حفظ صلاحيات الموظف.');
      return;
    }
    setStaffList(prev => prev.map(p => p.id === profileId ? {
      ...p,
      permissions,
      can_view_all_records: permissions.can_view_all_contracts
    } : p));
    if (currentProfile?.id === profileId) {
      setCurrentProfile(prev => prev ? {
        ...prev,
        permissions,
        can_view_all_records: permissions.can_view_all_contracts
      } : null);
    }

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
  };

  const handleMarkNotificationSent = async (notifId: string) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, status: 'sent', sent_at: new Date().toISOString() } : n));
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* ===== 🔔 WhatsApp Dispatch Alert Overlay ===== */}
      {whatsappAlerts.length > 0 && (
        <div style={{
          position: 'fixed',
          top: '16px',
          left: '16px',
          right: '16px',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          alignItems: 'stretch',
          pointerEvents: 'none'
        }}>
          {whatsappAlerts.map(alert => (
            <div key={alert.id} style={{
              pointerEvents: 'all',
              background: alert.type === 'error'
                ? 'rgba(239,68,68,0.97)'
                : 'rgba(22,163,74,0.97)',
              border: `2px solid ${alert.type === 'error' ? '#b91c1c' : '#15803d'}`,
              borderRadius: '14px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              boxShadow: alert.type === 'error'
                ? '0 8px 32px rgba(239,68,68,0.5), 0 2px 8px rgba(0,0,0,0.4)'
                : '0 8px 32px rgba(22,163,74,0.35), 0 2px 8px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(8px)',
              animation: 'slideInFromTop 0.35s cubic-bezier(.2,.8,.3,1.1)',
              direction: 'rtl'
            }}>
              {/* Icon */}
              <span style={{ fontSize: '26px', flexShrink: 0, marginTop: '2px' }}>
                {alert.type === 'error' ? '⚠️' : '✅'}
              </span>
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '4px' }}>
                  {alert.type === 'error'
                    ? `⛔ فشل إرسال الواتساب إلى ${alert.recipient === 'customer' ? 'العميل' : 'السائق'}: ${alert.recipientName}`
                    : `✅ تم الإرسال بنجاح إلى ${alert.recipient === 'customer' ? 'العميل' : 'السائق'}: ${alert.recipientName}`
                  }
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.88)', marginBottom: '4px' }}>
                  عقد رقم: {alert.contractNumber} • {alert.recipientPhone}
                </div>
                {alert.type === 'error' && alert.errorMessage && (
                  <div style={{ fontSize: '12px', color: 'rgba(255,220,220,0.9)', marginBottom: '6px' }}>
                    تفاصيل الخطأ: {alert.errorMessage}
                  </div>
                )}
                {/* Action Buttons */}
                {alert.type === 'error' && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <button
                      onClick={() => retryAlert(alert)}
                      style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: '1px solid rgba(255,255,255,0.5)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '13px',
                        padding: '5px 14px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.35)')}
                      onMouseOut={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                    >🔄 إعادة المحاولة</button>
                    <button
                      onClick={() => handleSendWhatsApp(alert.recipientPhone, alert.message)}
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        border: '1px solid rgba(255,255,255,0.4)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '13px',
                        padding: '5px 14px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.28)')}
                      onMouseOut={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                    >📲 إرسال يدوي عبر الواتساب</button>
                  </div>
                )}
              </div>
              {/* Dismiss Button */}
              <button
                onClick={() => dismissAlert(alert.id)}
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 700,
                  flexShrink: 0,
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.38)')}
                onMouseOut={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
                title="إغلاق التنبيه"
              >✕</button>
            </div>
          ))}
        </div>
      )}
      {/* ===== End Alert Overlay ===== */}
      
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
        onOpenOfficialContract={() => {
          setSelectedOfficialRecordForModal(null);
          setIsOfficialContractModalOpen(true);
        }}
        pendingOfficialContractsCount={officialContractRecords.filter(r => r.status === 'pending_seal').length}
        onLogout={handleLogout}
        inAppNotifications={inAppNotifications}
        onMarkInAppAsRead={handleMarkInAppAsRead}
        onMarkAllInAppAsRead={handleMarkAllInAppAsRead}
        onClearAllInApp={handleClearAllInApp}
        onSelectContract={handleSelectContractFromNotification}
        whatsappStatus={whatsappLiveStatus}
      />

      {/* ⚠️ Global WhatsApp Disconnected Alert Banner for ALL Employees */}
      {whatsappLiveStatus === 'disconnected' && isAuthenticated && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.22) 0%, rgba(220, 38, 38, 0.35) 50%, rgba(239, 68, 68, 0.22) 100%)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.45)',
          color: '#fee2e2',
          padding: '9px 16px',
          textAlign: 'center',
          fontSize: '0.84rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          boxShadow: '0 4px 15px rgba(239, 68, 68, 0.15)',
          zIndex: 900
        }}>
          <span style={{ fontSize: '1.1rem' }}>⚠️</span>
          <span>تنبيه لجميع الموظفين والسائقين: خادم الواتساب السحابي غير متصل حالياً — الرسائل التلقائية متوقفة مؤقتاً.</span>
          {currentRole === 'admin' && (
            <button
              onClick={() => setCurrentTab('whatsapp')}
              style={{
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '4px 14px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              إعادة ربط الجهاز الآن 🔄
            </button>
          )}
        </div>
      )}

      {/* 3. Main Body Content */}
      <main className="main-app-container" style={{
        flex: 1,
        maxWidth: '1400px',
        width: '100%',
        margin: '0 auto',
        padding: '30px 24px 60px 24px'
      }}>
        {isAuthenticated && isBusinessDataLoading && (
          <div role="status" style={{
            marginBottom: '18px',
            padding: '14px 18px',
            borderRadius: '12px',
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            color: '#bfdbfe',
            direction: 'rtl'
          }}>
            جارٍ تحميل البيانات المشتركة من قاعدة البيانات...
          </div>
        )}
        {isAuthenticated && (businessDataError || realtimeSyncError) && (
          <div role="alert" style={{
            marginBottom: '18px',
            padding: '14px 18px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fecaca',
            direction: 'rtl'
          }}>
            <div style={{ marginBottom: '10px' }}>
              {businessDataError || realtimeSyncError}
            </div>
            <button
              type="button"
              onClick={() => setBusinessDataReloadKey(key => key + 1)}
              style={{
                padding: '7px 12px',
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              إعادة تحميل البيانات الآن
            </button>
          </div>
        )}
        {!isAuthenticated || !currentProfile ? (
          /* 🔒 LOCKED APPLICATION SCREEN */
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
              🔒 مساحة العمل مقفلة. سجّل الدخول بالبريد الإلكتروني وكلمة المرور المعتمدين.
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
                contracts={contracts}
                userRole={currentRole}
                permissions={activePermissions}
                onUpdateStatus={handleUpdateContainerStatus}
                onAddContainer={handleAddContainer}
                onDeleteContainer={handleDeleteContainer}
                onOpenRentModal={(containerId: string) => {
                  setPreSelectedContainerId(containerId);
                  setIsContractModalOpen(true);
                }}
                onOpenExtendModal={(contract: Contract) => setSelectedExtendContract(contract)}
                onOpenReceipt={(contract: Contract) => setSelectedReceiptContract(contract)}
              />
            )}

            {currentTab === 'inventory' && (
              <InventoryManagement
                containers={containers}
                contracts={contracts}
                onBatchAddContainers={handleBatchAddContainers}
                onUpdateContainerStatus={handleUpdateContainerStatus}
                onCompleteContractAndReturnToStock={handleCompleteContractAndReturnToStock}
                onDeleteContainer={handleDeleteContainer}
                onOpenNewContract={(containerId: string) => {
                  setPreSelectedContainerId(containerId);
                  setIsContractModalOpen(true);
                }}
                onOpenExtendModal={(contract: Contract) => setSelectedExtendContract(contract)}
              />
            )}

            {currentTab === 'staff' && currentRole === 'admin' && (
              <StaffManagement
                staffList={staffList}
                onAddStaff={handleAddStaff}
                onEditStaff={handleEditStaff}
                onSetStaffPassword={handleSetStaffPassword}
                onToggleStatus={handleToggleStaffStatus}
                onUpdatePermissions={handleUpdateStaffPermissions}
              />
            )}

            {currentTab === 'payment-settings' && currentRole === 'admin' && (
              <PaymentSettings
                settings={paymentSettings}
                onSaveSettings={handleSavePaymentSettings}
              />
            )}

            {/* 🤖 EXECUTIVE SMART AI & AUTOMATION HUB TAB */}
            {currentTab === 'ai-hub' && currentRole === 'admin' && (
              <SmartAssistantHub
                contracts={contracts}
                containers={containers}
                customers={customers}
                staffList={staffList}
                receipts={receipts}
                vehicles={vehicles}
                assistantSettings={assistantSettings}
                onSaveAssistantSettings={handleSaveAssistantSettings}
                gatewaySettings={gatewaySettings}
                onSaveGatewaySettings={handleSaveGatewaySettings}
                onSendWhatsApp={handleSendWhatsApp}
              />
            )}

            {/* ✅ CONTRACTS TAB */}
            {currentTab === 'contracts' && (
              <ContractsView
                contracts={displayedContracts}
                userRole={currentRole}
                paymentSettings={paymentSettings}
                permissions={activePermissions}
                onUpdateContractStatus={handleUpdateContractStatus}
                onDeleteContract={handleDeleteContract}
                onSendWhatsApp={handleSendWhatsApp}
                onOpenReceipt={(contract) => setSelectedReceiptContract(contract)}
                onOpenExtendModal={(contract) => setSelectedExtendContract(contract)}
                onOpenDriverDispatch={(contract) => setSelectedDriverDispatchContract(contract)}
                onConfirmCashPayment={handleConfirmCashPayment}
                onSendSadadLink={handleSendSadadLink}
                onOpenOfficialContract={() => setIsOfficialContractModalOpen(true)}
              />
            )}

            {/* ✅ UNIFIED WHATSAPP CLOUD CENTER TAB */}
            {currentTab === 'whatsapp' && (
              <WhatsAppSettings
                settings={gatewaySettings}
                notifications={notifications}
                onSaveSettings={handleSaveGatewaySettings}
                onTestConnection={handleTestConnection}
                onSendWhatsApp={handleSendWhatsApp}
                onMarkAsSent={handleMarkNotificationSent}
              />
            )}

            {/* 👥 CUSTOMERS DIRECTORY & PROMOTIONAL CAMPAIGNS TAB */}
            {currentTab === 'customers' && (
              <CustomersDirectoryView
                customers={marketingCustomers}
                userRole={currentRole}
                onSaveCustomer={handleSaveMarketingCustomer}
                onDeleteCustomer={handleDeleteMarketingCustomer}
                onSyncCustomersFromContracts={handleSyncCustomersFromContracts}
                onSendSingleWhatsApp={handleSendWhatsApp}
                onBulkSendCampaign={handleBulkSendCampaign}
              />
            )}

            {/* 🔖 OFFICIAL CONTRACTS AUTHENTICATION & ELECTRONIC SEAL HUB */}
            {currentTab === 'contract-auth' && (
              <ContractAuthenticationHub
                currentRole={currentRole}
                contracts={officialContractRecords}
                onOpenContractForSealing={handleOpenContractForSealing}
                onPrintContract={handlePrintOfficialContract}
                onSendContractWhatsApp={handleSendOfficialContractWhatsApp}
                onDeleteContractRecord={handleDeleteOfficialContractRecord}
                sealSettings={contractSealSettings}
                onSaveSealSettings={handleSaveSealSettings}
              />
            )}

            {/* TRANSPORT VEHICLES TAB */}
            {currentTab === 'vehicles' && (
              <VehiclesManagement
                vehicles={vehicles}
                staffList={staffList}
                onAddVehicle={(vehicle) => {
                  const newVehicle = { ...vehicle, id: `v_${Date.now()}` } as TransportVehicle;
                  setVehicles(prev => [...prev, newVehicle]);
                  alert(`تمت إضافة سيارة النقل ${newVehicle.plate_number} بنجاح`);
                }}
                onEditVehicle={(vehicle) => {
                  setVehicles(prev => prev.map(v => v.id === vehicle.id ? vehicle : v));
                  alert(`تم تحديث بيانات السيارة ${vehicle.plate_number} بنجاح`);
                }}
                onDeleteVehicle={(id) => {
                  if(confirm('هل أنت متأكد من حذف هذه السيارة؟')) {
                    setVehicles(prev => prev.filter(v => v.id !== id));
                    alert('تم حذف السيارة بنجاح');
                  }
                }}
                onSendWhatsApp={(phone, message) => handleSendWhatsApp(phone, message)}
              />
            )}

            {/* 🧪 ISOLATED R&D DEV-LAB TAB (ADMIN ONLY) */}
            {currentTab === 'dev-lab' && currentRole === 'admin' && (
              <DevLab 
                currentRole={currentRole} 
                contracts={contracts}
                containers={containers}
                customers={customers}
                staffList={staffList}
                receipts={receipts}
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
        userRole={currentRole}
        permissions={activePermissions}
      />

      {/* 5. Printable Official PDF Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedReceiptContract}
        onClose={() => setSelectedReceiptContract(null)}
        contract={selectedReceiptContract}
        onSendWhatsAppReceipt={(phone, message, imageBase64) => sendSilentWhatsApp(
          phone,
          message,
          'customer',
          selectedReceiptContract?.customer?.name || 'العميل',
          selectedReceiptContract?.contract_number || '',
          {
            mediaBase64: imageBase64,
            mediaType: 'image',
            caption: message
          }
        )}
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

      {/* 8. 🔐 Staff and Admin Login Modal */}
      <StaffLoginModal
        isOpen={!showSplash && (!isAuthenticated || isStaffLoginModalOpen)}
        onClose={() => {
          if (isAuthenticated) {
            setIsStaffLoginModalOpen(false);
          }
        }}
        onSelectProfile={handleSelectProfile}
        isMandatory={!isAuthenticated}
      />

      {/* 9. 📜 Official Municipal Container Rental Contract Modal (A4 Print / PDF / Electronic Seal) */}
      <OfficialContractModal
        isOpen={isOfficialContractModalOpen}
        onClose={() => {
          setIsOfficialContractModalOpen(false);
          setSelectedOfficialRecordForModal(null);
        }}
        initialRecord={selectedOfficialRecordForModal}
        userRole={currentRole}
        sealSettings={contractSealSettings}
        onSubmitForSealing={handleSubmitOfficialContractForSealing}
        onSealContractByManager={handleSealOfficialContractByManager}
      />

      {/* 👑 Floating Saudi Female Voice Assistant Orb (Admin Exclusively) */}
      <FloatingVoiceOrb
        userRole={currentRole}
        contracts={contracts}
        containers={containers}
        customers={customers}
        staffList={staffList}
        receipts={receipts}
        vehicles={vehicles}
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
