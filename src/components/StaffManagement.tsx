'use client';

import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  UserCheck, 
  Trash2, 
  Key, 
  CheckCircle2, 
  Phone,
  Truck,
  Briefcase,
  ChevronDown,
  ChevronUp,
  X,
  Send,
  MessageSquare,
  Lock,
  Eye,
  EyeOff,
  Edit3
} from 'lucide-react';
import { Profile, StaffPermissions, UserRole } from '@/types/database';
import { openDriverWhatsApp } from '@/utils/driverDispatch';
import { SaudiPhoneInput } from './SaudiPhoneInput';

interface StaffManagementProps {
  staffList: Profile[];
  onAddStaff: (staffData: any) => Promise<boolean>;
  onEditStaff?: (profileId: string, updatedData: Partial<Profile>) => Promise<boolean>;
  onToggleStatus: (profileId: string, currentActive: boolean) => Promise<void>;
  onUpdatePermissions: (profileId: string, permissions: StaffPermissions) => Promise<void>;
  onUpdatePasswordPin?: (profileId: string, newPin: string) => Promise<void>;
  onDeleteStaff: (profileId: string) => Promise<void>;
}

export const DEFAULT_DRIVER_PERMISSIONS: StaffPermissions = {
  can_view_all_contracts: false,
  can_view_financials: false,
  can_create_contracts: false,
  can_extend_contracts: true,
  can_collect_payments: true,
  can_send_payment_links: false,
  can_manage_inventory: true,
  can_send_whatsapp: true
};

export const DEFAULT_STAFF_PERMISSIONS: StaffPermissions = {
  can_view_all_contracts: true,
  can_view_financials: true,
  can_create_contracts: true,
  can_extend_contracts: true,
  can_collect_payments: true,
  can_send_payment_links: true,
  can_manage_inventory: true,
  can_send_whatsapp: true
};

export const StaffManagement: React.FC<StaffManagementProps> = ({
  staffList,
  onAddStaff,
  onEditStaff,
  onToggleStatus,
  onUpdatePermissions,
  onUpdatePasswordPin,
  onDeleteStaff
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'staff' | 'drivers'>('all');
  
  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [passwordPin, setPasswordPin] = useState('1234');
  const [showAddPin, setShowAddPin] = useState(false);
  const [phone, setPhone] = useState('+9665');
  const [truckNotes, setTruckNotes] = useState('');
  const [jobRole, setJobRole] = useState<'driver' | 'staff'>('driver');
  const [isPermissionsDropdownOpenInAdd, setIsPermissionsDropdownOpenInAdd] = useState(true);
  const [newStaffPermissions, setNewStaffPermissions] = useState<StaffPermissions>(DEFAULT_STAFF_PERMISSIONS);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 📝 Comprehensive Edit Staff Modal State
  const [editingStaff, setEditingStaff] = useState<Profile | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPasswordPin, setEditPasswordPin] = useState('');
  const [editTruckNotes, setEditTruckNotes] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPermissions, setEditPermissions] = useState<StaffPermissions>(DEFAULT_STAFF_PERMISSIONS);
  const [showEditPin, setShowEditPin] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Table active dropdown popup ID for permissions
  const [openDropdownStaffId, setOpenDropdownStaffId] = useState<string | null>(null);

  const maxStaffLimit = 15;
  const currentCount = staffList.length;

  const officeStaffList = staffList.filter(s => s.role === 'admin' || (!s.full_name.includes('سائق')));
  const driversList = staffList.filter(s => s.full_name.includes('سائق') || s.email?.includes('driver'));

  const displayedList = activeCategory === 'staff' 
    ? officeStaffList 
    : activeCategory === 'drivers' 
    ? driversList 
    : staffList;

  const handleOpenEditModal = (staff: Profile) => {
    setEditingStaff(staff);
    setEditFullName(staff.full_name);
    setEditPhone(staff.phone || '+9665');
    setEditPasswordPin(staff.password_pin || '1234');
    setEditTruckNotes(staff.notes?.replace('شاحنة: ', '') || '');
    setEditIsActive(staff.is_active);
    setEditPermissions(staff.permissions || (staff.full_name.includes('سائق') ? DEFAULT_DRIVER_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS));
    setShowEditPin(false);
  };

  const handleSaveFullEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setIsSavingEdit(true);

    const isDriver = editingStaff.full_name.includes('سائق') || editingStaff.email?.includes('driver');
    const updatedData: Partial<Profile> = {
      full_name: editFullName,
      phone: editPhone,
      password_pin: isDriver ? undefined : editPasswordPin,
      notes: isDriver && editTruckNotes ? `شاحنة: ${editTruckNotes}` : undefined,
      is_active: editIsActive,
      permissions: isDriver ? DEFAULT_DRIVER_PERMISSIONS : editPermissions,
      can_view_all_records: isDriver ? false : editPermissions.can_view_all_contracts
    };

    if (onEditStaff) {
      await onEditStaff(editingStaff.id, updatedData);
    } else {
      if (onUpdatePermissions && updatedData.permissions) {
        await onUpdatePermissions(editingStaff.id, updatedData.permissions);
      }
      if (onUpdatePasswordPin && updatedData.password_pin) {
        await onUpdatePasswordPin(editingStaff.id, updatedData.password_pin);
      }
    }

    setIsSavingEdit(false);
    setEditingStaff(null);
  };

  const handleTogglePermission = async (staff: Profile, key: keyof StaffPermissions) => {
    const currentPerms: StaffPermissions = staff.permissions || (
      staff.full_name.includes('سائق') ? DEFAULT_DRIVER_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS
    );
    const updatedPerms: StaffPermissions = {
      ...currentPerms,
      [key]: !currentPerms[key]
    };
    await onUpdatePermissions(staff.id, updatedPerms);
  };

  const handleTestDriverWhatsApp = (driver: Profile) => {
    const msg = `مرحباً ${driver.full_name}، هذا إشعار تجريبي للتحقق من جاهزية استقبال أوامر مهام الحاويات (إنزال وسحب) لدى *المحترز للحاويات*. 🚚`;
    openDriverWhatsApp(driver.phone || '+966550000004', msg);
  };

  const handleSubmitNewStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentCount >= maxStaffLimit) {
      alert(`عذراً، تم الوصول للحد الأقصى لعدد المستخدمين (${maxStaffLimit}).`);
      return;
    }

    setIsSubmitting(true);
    const isDriver = jobRole === 'driver';
    const roleTitle = isDriver ? '(سائق رافعة وتوصيل)' : '(موظف استقبال ومتابعة)';
    const assignedPerms = isDriver ? DEFAULT_DRIVER_PERMISSIONS : newStaffPermissions;

    const success = await onAddStaff({
      full_name: `${fullName} ${roleTitle}`,
      email: isDriver ? `driver.${Date.now()}@almuhtaraz.com` : `staff.${Date.now()}@almuhtaraz.com`,
      password_pin: isDriver ? undefined : (passwordPin || '1234'),
      phone,
      notes: isDriver && truckNotes ? `شاحنة: ${truckNotes}` : undefined,
      can_view_all_records: assignedPerms.can_view_all_contracts,
      permissions: assignedPerms
    });
    setIsSubmitting(false);

    if (success) {
      setIsAddModalOpen(false);
      setFullName('');
      setPasswordPin('1234');
      setPhone('+9665');
      setTruckNotes('');
      setJobRole('driver');
      setNewStaffPermissions(DEFAULT_STAFF_PERMISSIONS);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.85rem', fontWeight: '700', marginBottom: '4px' }}>
            <ShieldCheck size={16} />
            <span>خاص بالمدير العام</span>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ffffff' }}>
            فريق العمل والأسطول الميداني
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
            إدارة موظفي الاستقبال بصلاحيات منسدلة، وسائقي الأسطول الميداني الذين يستلمون المهام مباشرة عبر الواتساب
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={() => {
            setJobRole('driver');
            setIsAddModalOpen(true);
          }}
          disabled={currentCount >= maxStaffLimit}
          style={{ opacity: currentCount >= maxStaffLimit ? 0.6 : 1 }}
        >
          <UserPlus size={18} />
          <span>إضافة سائق أو موظف جديد</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        
        {/* Office Staff Card */}
        <div 
          onClick={() => setActiveCategory('staff')}
          style={{
            background: activeCategory === 'staff' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.6)',
            border: `1px solid ${activeCategory === 'staff' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '14px',
            padding: '18px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>موظفو الاستقبال والنظام</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                {officeStaffList.length}
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={22} color="#38bdf8" />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px', marginBottom: 0 }}>
            يدخلون للنظام وتُدار صلاحياتهم عبر القوائم المنسدلة
          </p>
        </div>

        {/* Fleet Drivers Card */}
        <div 
          onClick={() => setActiveCategory('drivers')}
          style={{
            background: activeCategory === 'drivers' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(15, 23, 42, 0.6)',
            border: `1px solid ${activeCategory === 'drivers' ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '14px',
            padding: '18px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>سائقو الأسطول الميداني</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', marginTop: '4px' }}>
                {driversList.length}
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={22} color="#34d399" />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '8px', marginBottom: 0, fontWeight: 700 }}>
            ⚡ لا يدخلون للنظام — يستلمون المهام والمواقع عبر الواتساب مباشرة
          </p>
        </div>

        {/* All Filter */}
        <div 
          onClick={() => setActiveCategory('all')}
          style={{
            background: activeCategory === 'all' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(15, 23, 42, 0.6)',
            border: `1px solid ${activeCategory === 'all' ? '#fbbf24' : 'rgba(255, 255, 255, 0.1)'}`,
            borderRadius: '14px',
            padding: '18px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>إجمالي الفريق والأسطول</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
                {staffList.length}
              </div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} color="#fbbf24" />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px', marginBottom: 0 }}>
            عرض الجميع
          </p>
        </div>

      </div>

      {/* Staff Table */}
      <div className="glass-panel" style={{ overflow: 'visible' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: 'rgba(15, 23, 42, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <th style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>الاسم والصفة</th>
              <th style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>رقم جوال الواتساب للمهام</th>
              <th style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>طريقة العمل والصلاحيات</th>
              <th style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>حالة النشاط</th>
              <th style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {displayedList.map((staff) => {
              const isDriver = staff.full_name.includes('سائق') || staff.email?.includes('driver');
              const isAdmin = staff.role === 'admin';
              const perms: StaffPermissions = staff.permissions || (
                isDriver ? DEFAULT_DRIVER_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS
              );
              const isDropdownOpen = openDropdownStaffId === staff.id;

              return (
                <tr 
                  key={staff.id}
                  style={{ 
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    background: staff.role === 'admin' ? 'rgba(245, 158, 11, 0.04)' : isDriver ? 'rgba(16, 185, 129, 0.02)' : 'transparent'
                  }}
                >
                  {/* Name and Role */}
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: isAdmin ? 'rgba(245, 158, 11, 0.2)' : isDriver ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {isAdmin ? <ShieldCheck size={20} color="#fbbf24" /> : isDriver ? <Truck size={20} color="#34d399" /> : <Briefcase size={20} color="#38bdf8" />}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ffffff' }}>
                          {staff.full_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                          <span style={{
                            display: 'inline-block',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '1px 8px',
                            borderRadius: '4px',
                            background: isAdmin ? '#f59e0b' : isDriver ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                            color: isAdmin ? '#050811' : isDriver ? '#34d399' : '#38bdf8',
                            border: `1px solid ${isAdmin ? 'transparent' : isDriver ? 'rgba(16, 185, 129, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`
                          }}>
                            {isAdmin ? '👑 المدير العام' : isDriver ? '🚛 سائق رافعة وتوصيل ميداني' : '👷 موظف استقبال ومتابعة'}
                          </span>

                          {!isDriver && (
                            <button
                              onClick={() => handleOpenEditModal(staff)}
                              style={{
                                background: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: '6px',
                                padding: '1px 6px',
                                color: '#fbbf24',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="تعديل الرمز السري وبيانات الموظف"
                            >
                              <Key size={10} />
                              <span>الرمز: {staff.password_pin || '1234'}</span>
                              <Edit3 size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Phone */}
                  <td style={{ padding: '16px 20px', direction: 'ltr', textAlign: 'right' }}>
                    <span style={{ color: '#e2e8f0', fontSize: '0.88rem', fontWeight: 600 }}>
                      {staff.phone || staff.email}
                    </span>
                  </td>

                  {/* Permissions or Driver Dispatch Status */}
                  <td style={{ padding: '16px 20px', position: 'relative' }}>
                    {isAdmin ? (
                      <span style={{ color: '#fbbf24', fontSize: '0.82rem', fontWeight: 800 }}>
                        👑 صلاحيات كاملة غير محدودة
                      </span>
                    ) : isDriver ? (
                      /* Driver Mode: Direct WhatsApp Dispatch Target */
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: '8px',
                          padding: '5px 10px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span>📲 مستلم مهام الواتساب (إنزال/سحب)</span>
                        </span>

                        <button
                          onClick={() => handleTestDriverWhatsApp(staff)}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(37, 211, 102, 0.4)',
                            color: '#25D366',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="إرسال إشعار تجريبي لجوال السائق"
                        >
                          <Send size={12} />
                          <span>اختبار</span>
                        </button>
                      </div>
                    ) : (
                      /* Office Staff: Sleek Permissions Dropdown Menu */
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          onClick={() => setOpenDropdownStaffId(isDropdownOpen ? null : staff.id)}
                          style={{
                            background: isDropdownOpen ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.8)',
                            border: `1px solid ${isDropdownOpen ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)'}`,
                            color: isDropdownOpen ? '#38bdf8' : '#e2e8f0',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <Key size={14} color="#38bdf8" />
                          <span>صلاحيات الموظف</span>
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: perms.can_view_financials ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            color: perms.can_view_financials ? '#34d399' : '#f87171'
                          }}>
                            {perms.can_view_financials ? '💰 المبالغ ظاهرة' : '🔒 المبالغ محجوبة'}
                          </span>
                          {isDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {/* Interactive Dropdown Checklist Box */}
                        {isDropdownOpen && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '8px',
                            width: '320px',
                            background: '#0f172a',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            borderRadius: '12px',
                            padding: '14px',
                            zIndex: 100,
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '6px' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8' }}>
                                تبديل صلاحيات الموظف ⚡
                              </span>
                              <button
                                onClick={() => setOpenDropdownStaffId(null)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                              >
                                <X size={14} />
                              </button>
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px', background: perms.can_view_financials ? 'rgba(16, 185, 129, 0.1)' : 'transparent' }}>
                              <span>💰 رؤية المبالغ والأسعار</span>
                              <input
                                type="checkbox"
                                checked={perms.can_view_financials}
                                onChange={() => handleTogglePermission(staff, 'can_view_financials')}
                                style={{ accentColor: '#10b981' }}
                              />
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px' }}>
                              <span>🌐 رؤية كافة العقود</span>
                              <input
                                type="checkbox"
                                checked={perms.can_view_all_contracts}
                                onChange={() => handleTogglePermission(staff, 'can_view_all_contracts')}
                                style={{ accentColor: '#38bdf8' }}
                              />
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px' }}>
                              <span>📝 إنشاء وتوثيق عقود</span>
                              <input
                                type="checkbox"
                                checked={perms.can_create_contracts}
                                onChange={() => handleTogglePermission(staff, 'can_create_contracts')}
                                style={{ accentColor: '#fbbf24' }}
                              />
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px' }}>
                              <span>🔄 تمديد وتأجيل السحب</span>
                              <input
                                type="checkbox"
                                checked={perms.can_extend_contracts}
                                onChange={() => handleTogglePermission(staff, 'can_extend_contracts')}
                                style={{ accentColor: '#38bdf8' }}
                              />
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px' }}>
                              <span>💵 تحصيل كاش وسند قبض</span>
                              <input
                                type="checkbox"
                                checked={perms.can_collect_payments}
                                onChange={() => handleTogglePermission(staff, 'can_collect_payments')}
                                style={{ accentColor: '#10b981' }}
                              />
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px' }}>
                              <span>💳 إرسال روابط سداد</span>
                              <input
                                type="checkbox"
                                checked={perms.can_send_payment_links}
                                onChange={() => handleTogglePermission(staff, 'can_send_payment_links')}
                                style={{ accentColor: '#fbbf24' }}
                              />
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer', padding: '4px 6px', borderRadius: '6px' }}>
                              <span>📦 سحب واستلام للمخزون</span>
                              <input
                                type="checkbox"
                                checked={perms.can_manage_inventory}
                                onChange={() => handleTogglePermission(staff, 'can_manage_inventory')}
                                style={{ accentColor: '#10b981' }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Status Toggle */}
                  <td style={{ padding: '16px 20px' }}>
                    {staff.role === 'admin' ? (
                      <span style={{ color: '#34d399', fontSize: '0.82rem', fontWeight: 700 }}>نشط دائماً</span>
                    ) : (
                      <button
                        onClick={() => onToggleStatus(staff.id, staff.is_active)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: staff.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: staff.is_active ? '#34d399' : '#f87171'
                        }}
                      >
                        {staff.is_active ? 'نشط 🟢' : 'موقوف 🔴'}
                      </button>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      {/* ✏️ Full Edit Staff Modal Button */}
                      <button
                        onClick={() => handleOpenEditModal(staff)}
                        style={{
                          background: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          color: '#38bdf8',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease'
                        }}
                        title="تعديل كافة بيانات الموظف وكلمة السر والصلاحيات في نافذة منبثقة"
                      >
                        <Edit3 size={14} />
                        <span>تعديل ✏️</span>
                      </button>

                      {staff.role !== 'admin' && (
                        <button
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من حذف ${staff.full_name}؟`)) {
                              onDeleteStaff(staff.id);
                            }
                          }}
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#f87171',
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="حذف السجل"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal (With Permissions Dropdown ONLY for Staff, Hidden for Driver) */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: '26px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff' }}>
                  {jobRole === 'driver' ? 'إضافة سائق أسطول ميداني 🚛' : 'إضافة موظف استقبال للنظام 👷'}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
                  {jobRole === 'driver' ? 'السائق يستلم المهام والمواقع عبر الواتساب مباشرة دون الحاجة للدخول للنظام' : 'تسجيل موظف جديد وضبط صلاحيات دخوله للنظام'}
                </p>
              </div>

              <button
                onClick={() => setIsAddModalOpen(false)}
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

            <form onSubmit={handleSubmitNewStaff} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Role Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '6px', color: '#fbbf24' }}>
                  نوع الإضافة:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div
                    onClick={() => setJobRole('driver')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: `2px solid ${jobRole === 'driver' ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: jobRole === 'driver' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <Truck size={20} color={jobRole === 'driver' ? '#34d399' : '#94a3b8'} style={{ margin: '0 auto 4px auto' }} />
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: jobRole === 'driver' ? '#34d399' : '#ffffff' }}>
                      سائق أسطول ميداني 🚛
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '2px', fontWeight: 700 }}>
                      (مهام واتساب فقط)
                    </div>
                  </div>

                  <div
                    onClick={() => setJobRole('staff')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: `2px solid ${jobRole === 'staff' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: jobRole === 'staff' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <Briefcase size={20} color={jobRole === 'staff' ? '#38bdf8' : '#94a3b8'} style={{ margin: '0 auto 4px auto' }} />
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: jobRole === 'staff' ? '#38bdf8' : '#ffffff' }}>
                      موظف استقبال 👷
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                      (دخول نظام وصلاحيات)
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '4px', color: '#e2e8f0' }}>
                  {jobRole === 'driver' ? 'اسم السائق:' : 'اسم الموظف:'}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={jobRole === 'driver' ? 'مثال: فهد القحطاني' : 'مثال: محمد الشمري'}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              {/* Phone */}
              <SaudiPhoneInput
                label={`رقم جوال الواتساب ${jobRole === 'driver' ? '(لاستلام أوامر المهام والمواقع)' : ''}:`}
                value={phone}
                onChange={(val) => setPhone(val)}
                required
              />

              {/* Driver Extra: Vehicle / Crane notes */}
              {jobRole === 'driver' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', marginBottom: '4px', color: '#94a3b8' }}>
                    رقم الشاحنة / الرافعة أو المنطقة الميدانية (اختياري):
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="مثال: رافعة رقم 4 - شمال الرياض"
                    value={truckNotes}
                    onChange={(e) => setTruckNotes(e.target.value)}
                  />
                </div>
              )}

              {/* Password PIN (ONLY for Office Staff) */}
              {jobRole === 'staff' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Key size={14} />
                      <span>كلمة المرور / الرمز السري للدخول:</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setPasswordPin(Math.floor(1000 + Math.random() * 9000).toString())}
                      style={{
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: '#fbbf24',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      توليد رمز تلقائي 🎲
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showAddPin ? 'text' : 'password'}
                      className="form-input"
                      dir="ltr"
                      placeholder="مثال: 1234 أو رمز مخصص"
                      value={passwordPin}
                      onChange={(e) => setPasswordPin(e.target.value)}
                      required
                      style={{ paddingLeft: '40px', letterSpacing: showAddPin ? '2px' : 'normal', fontWeight: 800 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPin(!showAddPin)}
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      {showAddPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                    يدخل الموظف بالنقر على اسمه وإدخال هذا الرمز السري مباشرة دون الحاجة لبريد إلكتروني.
                  </span>
                </div>
              )}

              {/* 🛡️ Permissions Dropdown (ONLY shown when jobRole === 'staff', HIDDEN for driver) */}
              {jobRole === 'staff' && (
                <div style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div
                    onClick={() => setIsPermissionsDropdownOpenInAdd(!isPermissionsDropdownOpenInAdd)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Key size={16} color="#38bdf8" />
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#38bdf8' }}>
                        قائمة صلاحيات موظف الاستقبال ▾
                      </span>
                    </div>
                    {isPermissionsDropdownOpenInAdd ? <ChevronUp size={16} color="#38bdf8" /> : <ChevronDown size={16} color="#38bdf8" />}
                  </div>

                  {isPermissionsDropdownOpenInAdd && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={newStaffPermissions.can_view_financials}
                          onChange={(e) => setNewStaffPermissions(p => ({ ...p, can_view_financials: e.target.checked }))}
                          style={{ accentColor: '#10b981' }}
                        />
                        <span>💰 رؤية المبالغ المالية</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={newStaffPermissions.can_view_all_contracts}
                          onChange={(e) => setNewStaffPermissions(p => ({ ...p, can_view_all_contracts: e.target.checked }))}
                          style={{ accentColor: '#38bdf8' }}
                        />
                        <span>🌐 رؤية كافة العقود</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={newStaffPermissions.can_create_contracts}
                          onChange={(e) => setNewStaffPermissions(p => ({ ...p, can_create_contracts: e.target.checked }))}
                          style={{ accentColor: '#fbbf24' }}
                        />
                        <span>📝 إنشاء وتوثيق عقود</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={newStaffPermissions.can_extend_contracts}
                          onChange={(e) => setNewStaffPermissions(p => ({ ...p, can_extend_contracts: e.target.checked }))}
                          style={{ accentColor: '#38bdf8' }}
                        />
                        <span>🔄 تمديد وتأجيل السحب</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={newStaffPermissions.can_collect_payments}
                          onChange={(e) => setNewStaffPermissions(p => ({ ...p, can_collect_payments: e.target.checked }))}
                          style={{ accentColor: '#10b981' }}
                        />
                        <span>💵 تحصيل كاش وسند قبض</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={newStaffPermissions.can_send_payment_links}
                          onChange={(e) => setNewStaffPermissions(p => ({ ...p, can_send_payment_links: e.target.checked }))}
                          style={{ accentColor: '#fbbf24' }}
                        />
                        <span>💳 إرسال روابط سداد</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={newStaffPermissions.can_manage_inventory}
                          onChange={(e) => setNewStaffPermissions(p => ({ ...p, can_manage_inventory: e.target.checked }))}
                          style={{ accentColor: '#10b981' }}
                        />
                        <span>📦 استلام للمخزون</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={newStaffPermissions.can_send_whatsapp}
                          onChange={(e) => setNewStaffPermissions(p => ({ ...p, can_send_whatsapp: e.target.checked }))}
                          style={{ accentColor: '#10b981' }}
                        />
                        <span>📱 مراسلة بالواتساب</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'جارٍ الإضافة...' : jobRole === 'driver' ? 'حفظ وإضافة السائق الميداني 🚛' : 'حفظ وإضافة الموظف 👷'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ✏️ COMPREHENSIVE EDIT STAFF & PIN MODAL (ADMIN CONTROL)   */}
      {/* ======================================================== */}
      {editingStaff && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 6, 23, 0.88)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '16px',
          direction: 'rtl'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, #0f172a 0%, #050811 100%)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '24px',
            maxWidth: '520px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '26px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(56, 189, 248, 0.15)',
            position: 'relative',
            color: '#ffffff'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(56, 189, 248, 0.18)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8'
                }}>
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                    تعديل بيانات وحساب الموظف
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {editingStaff.full_name}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setEditingStaff(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  color: '#94a3b8',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSaveFullEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* 1. Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px', color: '#e2e8f0' }}>
                  الاسم الكامل:
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                />
              </div>

              {/* 2. Phone Number */}
              <SaudiPhoneInput
                label="رقم جوال الواتساب للمهام:"
                value={editPhone}
                onChange={(val) => setEditPhone(val)}
                required
              />

              {/* 3. Password PIN (Only for non-drivers or staff with system login) */}
              {!editingStaff.full_name.includes('سائق') && !editingStaff.email?.includes('driver') && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Key size={14} />
                      <span>كلمة المرور / الرمز السري للدخول:</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditPasswordPin(Math.floor(1000 + Math.random() * 9000).toString())}
                      style={{
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        color: '#fbbf24',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      توليد رمز تلقائي 🎲
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showEditPin ? 'text' : 'password'}
                      className="form-input"
                      dir="ltr"
                      value={editPasswordPin}
                      onChange={(e) => setEditPasswordPin(e.target.value)}
                      placeholder="مثال: 1234"
                      required
                      style={{ paddingLeft: '40px', letterSpacing: showEditPin ? '2px' : 'normal', fontWeight: 800 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPin(!showEditPin)}
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      {showEditPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                    يدخل الموظف بالنقر على اسمه وإدخال هذا الرمز السري مباشرة.
                  </span>
                </div>
              )}

              {/* 4. Driver Notes / Truck Number */}
              {(editingStaff.full_name.includes('سائق') || editingStaff.email?.includes('driver')) && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px', color: '#94a3b8' }}>
                    رقم الشاحنة / الرافعة أو المنطقة الميدانية:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="مثال: رافعة رقم 4 - شمال الرياض"
                    value={editTruckNotes}
                    onChange={(e) => setEditTruckNotes(e.target.value)}
                  />
                </div>
              )}

              {/* 5. Account Status */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px', color: '#e2e8f0' }}>
                  حالة الحساب:
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setEditIsActive(true)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: `1px solid ${editIsActive ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: editIsActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                      color: editIsActive ? '#34d399' : '#94a3b8',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    نشط 🟢
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditIsActive(false)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: `1px solid ${!editIsActive ? '#ef4444' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: !editIsActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                      color: !editIsActive ? '#f87171' : '#94a3b8',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    موقوف 🔴
                  </button>
                </div>
              </div>

              {/* 6. Permissions Checklist (For office staff) */}
              {!editingStaff.full_name.includes('سائق') && editingStaff.role !== 'admin' && (
                <div style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38bdf8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '6px' }}>
                    توزيع صلاحيات الموظف 🛡️
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#ffffff', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editPermissions.can_view_financials}
                        onChange={(e) => setEditPermissions(p => ({ ...p, can_view_financials: e.target.checked }))}
                        style={{ accentColor: '#10b981' }}
                      />
                      <span>💰 رؤية المبالغ والأسعار</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#ffffff', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editPermissions.can_view_all_contracts}
                        onChange={(e) => setEditPermissions(p => ({ ...p, can_view_all_contracts: e.target.checked }))}
                        style={{ accentColor: '#38bdf8' }}
                      />
                      <span>🌐 رؤية كافة العقود</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#ffffff', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editPermissions.can_create_contracts}
                        onChange={(e) => setEditPermissions(p => ({ ...p, can_create_contracts: e.target.checked }))}
                        style={{ accentColor: '#fbbf24' }}
                      />
                      <span>📝 إنشاء وتوثيق عقود</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#ffffff', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editPermissions.can_extend_contracts}
                        onChange={(e) => setEditPermissions(p => ({ ...p, can_extend_contracts: e.target.checked }))}
                        style={{ accentColor: '#38bdf8' }}
                      />
                      <span>🔄 تمديد وتأجيل السحب</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#ffffff', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editPermissions.can_collect_payments}
                        onChange={(e) => setEditPermissions(p => ({ ...p, can_collect_payments: e.target.checked }))}
                        style={{ accentColor: '#10b981' }}
                      />
                      <span>💵 تحصيل كاش وسند قبض</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#ffffff', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editPermissions.can_send_payment_links}
                        onChange={(e) => setEditPermissions(p => ({ ...p, can_send_payment_links: e.target.checked }))}
                        style={{ accentColor: '#fbbf24' }}
                      />
                      <span>💳 إرسال روابط سداد</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#ffffff', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editPermissions.can_manage_inventory}
                        onChange={(e) => setEditPermissions(p => ({ ...p, can_manage_inventory: e.target.checked }))}
                        style={{ accentColor: '#10b981' }}
                      />
                      <span>📦 استلام وسحب للمخزون</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#ffffff', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editPermissions.can_send_whatsapp}
                        onChange={(e) => setEditPermissions(p => ({ ...p, can_send_whatsapp: e.target.checked }))}
                        style={{ accentColor: '#10b981' }}
                      />
                      <span>📱 مراسلة بالواتساب</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingStaff(null)}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? 'جارٍ حفظ التعديلات...' : 'حفظ التعديلات وكلمة السر 💾'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
