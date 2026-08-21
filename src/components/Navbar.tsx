'use client';

import React from 'react';
import { 
  Truck, 
  Search, 
  PlusCircle, 
  FileText, 
  MessageSquare, 
  Users, 
  RotateCcw, 
  ShieldCheck, 
  UserCheck, 
  Settings, 
  CreditCard, 
  Package,
  Bot
} from 'lucide-react';
import { InAppNotification, Profile, StaffPermissions, UserRole } from '@/types/database';
import { NotificationBell } from './NotificationBell';
import { InstallAppButton } from './InstallAppButton';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentProfile?: Profile | null;
  onOpenStaffLoginModal?: () => void;
  staffList?: Profile[];
  selectedStaffId?: string;
  setSelectedStaffId?: (id: string) => void;
  permissions?: StaffPermissions;
  onReplayIntro: () => void;
  onOpenNewContract: () => void;
  onLogout?: () => void;
  inAppNotifications: InAppNotification[];
  onMarkInAppAsRead: (id: string) => void;
  onMarkAllInAppAsRead: () => void;
  onClearAllInApp: () => void;
  onSelectContract: (contractId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentRole,
  setCurrentRole,
  currentProfile,
  onOpenStaffLoginModal,
  staffList = [],
  selectedStaffId,
  setSelectedStaffId,
  permissions,
  onReplayIntro,
  onOpenNewContract,
  onLogout,
  inAppNotifications,
  onMarkInAppAsRead,
  onMarkAllInAppAsRead,
  onClearAllInApp,
  onSelectContract,
}) => {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      background: 'rgba(8, 12, 20, 0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '12px 24px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Brand Logo & Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }} onClick={() => setCurrentTab('search')}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)'
          }}>
            <Truck size={24} color="#050811" />
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.5px' }}>
              المحترز <span style={{ color: 'var(--accent-gold)' }}>للحاويات</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              إدارة وتأجير الحاويات التجارية والأنقاض
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            id="nav-search-tab"
            onClick={() => setCurrentTab('search')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              fontWeight: 600,
              background: currentTab === 'search' ? 'rgba(245, 158, 11, 0.18)' : 'transparent',
              color: currentTab === 'search' ? '#fbbf24' : '#94a3b8',
              transition: 'all 0.2s ease'
            }}
          >
            <Search size={17} />
            <span>البحث والاستعلام</span>
          </button>

          <button
            id="nav-containers-tab"
            onClick={() => setCurrentTab('containers')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              fontWeight: 600,
              background: currentTab === 'containers' ? 'rgba(245, 158, 11, 0.18)' : 'transparent',
              color: currentTab === 'containers' ? '#fbbf24' : '#94a3b8',
              transition: 'all 0.2s ease'
            }}
          >
            <Truck size={17} />
            <span>الحاويات</span>
          </button>

          <button
            id="nav-contracts-tab"
            onClick={() => setCurrentTab('contracts')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              fontWeight: 600,
              background: currentTab === 'contracts' ? 'rgba(245, 158, 11, 0.18)' : 'transparent',
              color: currentTab === 'contracts' ? '#fbbf24' : '#94a3b8',
              transition: 'all 0.2s ease'
            }}
          >
            <FileText size={17} />
            <span>سجل العقود والتحصيل</span>
          </button>

          <button
            id="nav-whatsapp-tab"
            onClick={() => setCurrentTab('whatsapp')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              fontWeight: 600,
              background: currentTab === 'whatsapp' ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
              color: currentTab === 'whatsapp' ? '#34d399' : '#94a3b8',
              transition: 'all 0.2s ease'
            }}
          >
            <MessageSquare size={17} />
            <span>محرك الواتساب</span>
          </button>

          {/* Admin only Tabs */}
          {currentRole === 'admin' && (
            <>
              {/* 🤖 Executive AI Copilot & Automation Hub Tab */}
              <button
                id="nav-ai-hub-tab"
                onClick={() => setCurrentTab('ai-hub')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: currentTab === 'ai-hub' ? '1px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.25)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  background: currentTab === 'ai-hub' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.15))' : 'rgba(245, 158, 11, 0.08)',
                  color: '#fbbf24',
                  boxShadow: currentTab === 'ai-hub' ? '0 0 15px rgba(245, 158, 11, 0.3)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <Bot size={18} color="#fbbf24" />
                <span>المساعد الذكي</span>
                <span style={{
                  background: '#fbbf24',
                  color: '#050811',
                  borderRadius: '6px',
                  padding: '1px 5px',
                  fontSize: '0.65rem',
                  fontWeight: 900
                }}>AI</span>
              </button>
              <button
                id="nav-inventory-tab"
                onClick={() => setCurrentTab('inventory')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  background: currentTab === 'inventory' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: currentTab === 'inventory' ? '#38bdf8' : '#94a3b8',
                  transition: 'all 0.2s ease'
                }}
              >
                <Package size={17} />
                <span>إدارة المخزون والتوريد</span>
              </button>

              <button
                id="nav-staff-tab"
                onClick={() => setCurrentTab('staff')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  background: currentTab === 'staff' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  color: currentTab === 'staff' ? '#a5b4fc' : '#94a3b8',
                  transition: 'all 0.2s ease'
                }}
              >
                <Users size={17} />
                <span>إدارة الموظفين</span>
              </button>

              <button
                id="nav-payment-settings-tab"
                onClick={() => setCurrentTab('payment-settings')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  background: currentTab === 'payment-settings' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  color: currentTab === 'payment-settings' ? '#34d399' : '#94a3b8',
                  transition: 'all 0.2s ease'
                }}
              >
                <CreditCard size={17} />
                <span>بوابة الدفع</span>
              </button>

              <button
                id="nav-gateway-settings-tab"
                onClick={() => setCurrentTab('gateway-settings')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  background: currentTab === 'gateway-settings' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: currentTab === 'gateway-settings' ? '#fbbf24' : '#94a3b8',
                  transition: 'all 0.2s ease'
                }}
              >
                <Settings size={17} />
                <span>إعدادات البوابة</span>
              </button>
            </>
          )}
        </nav>

        {/* Right Actions: Install App, In-App Bell, New Contract, Role Switcher, Replay Intro */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          
          {/* 📱 Executive PWA Install Button with Periodic Ambient Pulse */}
          <InstallAppButton />

          {/* 🔔 In-App Notification Bell Component */}
          <NotificationBell
            notifications={inAppNotifications}
            onMarkAsRead={onMarkInAppAsRead}
            onMarkAllAsRead={onMarkAllInAppAsRead}
            onClearAll={onClearAllInApp}
            onSelectContract={onSelectContract}
          />

          {/* New Contract Button (Admin or if has create contract permission) */}
          {(currentRole === 'admin' || permissions?.can_create_contracts !== false) && (
            <button
              id="btn-open-new-contract"
              className="btn-primary"
              onClick={onOpenNewContract}
              style={{ padding: '9px 18px', fontSize: '0.9rem' }}
            >
              <PlusCircle size={18} />
              <span>عقد جديد</span>
            </button>
          )}

          {/* 🔐 Interactive Staff Account / PIN Login Badge & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {onOpenStaffLoginModal && (
              <button
                onClick={onOpenStaffLoginModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: currentRole === 'admin' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                  border: `1px solid ${currentRole === 'admin' ? '#f59e0b' : '#38bdf8'}`,
                  borderRadius: '12px',
                  padding: '6px 12px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease',
                  boxShadow: currentRole === 'admin' ? '0 0 15px rgba(245, 158, 11, 0.2)' : '0 0 15px rgba(56, 189, 248, 0.2)'
                }}
                title="تبديل الحساب أو تسجيل الدخول بالرمز السري"
              >
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '8px',
                  background: currentRole === 'admin' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #38bdf8, #0284c7)',
                  color: currentRole === 'admin' ? '#000000' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '0.8rem'
                }}>
                  {currentRole === 'admin' ? '👑' : '👷'}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: currentRole === 'admin' ? '#fbbf24' : '#38bdf8', lineHeight: 1.2 }}>
                    {currentRole === 'admin' ? '👑 المدير العام' : (currentProfile?.full_name?.split(' ')[0] || '👷 موظف')}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '1px' }}>
                    {currentRole === 'admin' ? 'صلاحيات كاملة ▾' : 'حساب نشط 🔒'}
                  </div>
                </div>
              </button>
            )}

            {/* Logout / Switch Account Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  borderRadius: '10px',
                  padding: '7px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease'
                }}
                title="تسجيل الخروج وقفل النظام"
              >
                <span>🔒 قفل / خروج</span>
              </button>
            )}
          </div>

          {/* Replay Intro Button */}
          <button
            title="إعادة تشغيل المقدمة السينمائية"
            onClick={onReplayIntro}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
