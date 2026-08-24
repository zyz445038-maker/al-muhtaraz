export type UserRole = 'admin' | 'employee';

export interface StaffPermissions {
  can_view_all_contracts: boolean; // رؤية كافة العقود أم العقود المعينة له فقط
  can_view_financials: boolean; // رؤية إجمالي المبالغ والأسعار والإيرادات
  can_create_contracts: boolean; // إنشاء وتوثيق عقود جديدة
  can_extend_contracts: boolean; // تمديد وتأجيل السحب
  can_collect_payments: boolean; // تحصيل كاش وإصدار سند قبض
  can_send_payment_links: boolean; // إرسال روابط سداد عبر الواتساب
  can_manage_inventory: boolean; // سحب واستلام الحاويات للمخزون
  can_send_whatsapp: boolean; // إرسال إشعارات الواتساب
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  password_pin?: string;
  is_active: boolean;
  can_view_all_records: boolean; // legacy
  permissions?: StaffPermissions;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type ContainerType = 'commercial' | 'debris';
export type ContainerStatus = 'available' | 'rented' | 'maintenance';

export interface Container {
  id: string;
  container_number: string;
  type: ContainerType;
  status: ContainerStatus;
  daily_rate: number;
  monthly_rate: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  alt_phone?: string;
  customer_type: 'individual' | 'company';
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type ContractPeriodType = 'daily' | 'monthly' | 'semi_annual' | 'annual';
export type ContractStatus = 'active' | 'completed' | 'cancelled' | 'extended';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';
export type PaymentMethod = 'apple_pay' | 'mada' | 'credit_card' | 'cash' | 'pos' | 'bank_transfer';

export interface Contract {
  id: string;
  contract_number: string;
  customer_id: string;
  container_id?: string;
  contract_type: ContainerType; // commercial or debris
  period_type: ContractPeriodType;
  duration_days: number;
  start_date: string;
  end_date: string;
  expected_pickup_time?: string;
  location_latitude?: number;
  location_longitude?: number;
  google_maps_url?: string;
  location_address?: string;
  total_cost: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  receipt_number?: string;
  status: ContractStatus;
  created_by_employee_id?: string;
  assigned_employee_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;

  // Joined fields for UI convenience
  customer?: Customer;
  container?: Container;
  assigned_employee?: Profile;
}

export type RecipientRole = 'customer' | 'employee' | 'admin';
export type NotificationType =
  | 'debris_pickup_4h'
  | 'commercial_7d_before'
  | 'commercial_2d_before'
  | 'contract_created'
  | 'custom_alert';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

export interface NotificationLog {
  id: string;
  contract_id?: string;
  customer_id?: string;
  recipient_role: RecipientRole;
  recipient_phone: string;
  recipient_name?: string;
  notification_type: NotificationType;
  message_body: string;
  scheduled_for: string;
  sent_at?: string;
  status: NotificationStatus;
  error_message?: string;
  created_at: string;
  
  // Joined field
  contract?: Contract;
}

// In-App Internal Notification Types
export type InAppNotificationType =
  | 'contract_expiry_soon'
  | 'contract_created'
  | 'container_status_change'
  | 'payment_alert'
  | 'system_alert';

export interface InAppNotification {
  id: string;
  user_id?: string;
  contract_id?: string;
  title: string;
  message: string;
  type: InAppNotificationType;
  is_read: boolean;
  created_at: string;
}

// WhatsApp Gateway Settings
export type WhatsAppMode = 'embedded' | 'evolution' | 'wame';

export interface WhatsAppSettings {
  id?: string;
  mode: WhatsAppMode;
  evolution_server_url: string;
  evolution_instance_name: string;
  evolution_api_key: string;
  sender_phone: string;
  admin_phone: string;
  is_connected: boolean;
  auto_send_enabled: boolean;
  updated_at?: string;
}

// Payment Gateway Settings (Moyasar)
export interface PaymentSettings {
  id?: string;
  is_enabled: boolean; // Feature toggle
  publishable_key: string;
  secret_key: string;
  apple_pay_enabled: boolean;
  mada_enabled: boolean;
  credit_card_enabled: boolean;
  vat_number: string;
  company_commercial_reg: string;
  updated_at?: string;
}

// Official Payment Receipt
export interface Receipt {
  id: string;
  receipt_number: string;
  contract_id: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  payment_method: PaymentMethod;
  transaction_ref?: string;
  contract_number: string;
  container_number?: string;
  container_type?: ContainerType;
  issued_at: string;
  notes?: string;
  created_at?: string;
}

// Executive Smart AI Assistant & Operations Hub Settings
export interface SmartAssistantSettings {
  id?: string;
  whatsapp_routing: {
    notify_customer: boolean;
    notify_driver: boolean;
    notify_admin: boolean;
  };
  daily_report: {
    enabled: boolean;
    send_time: string;
    admin_phone: string;
  };
  approval_policy: {
    require_admin_approval_for_staff: boolean;
  };
  auto_dispatch_enabled: boolean;
  updated_at?: string;
}

