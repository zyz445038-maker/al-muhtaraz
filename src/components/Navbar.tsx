'use client';

import React, { useState } from 'react';
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
  Bot,
  Menu,
  X,
  Smartphone,
  LogOut,
  ChevronLeft,
  Sparkles,
  FlaskConical,
  FileCode2
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
  onOpenOfficialContract?: () => void;
  onLogout?: () => void;
  inAppNotifications: InAppNotification[];
  onMarkInAppAsRead: (id: string) => void;
  onMarkAllInAppAsRead: () => void;
  onClearAllInApp: () => void;
  onSelectContract: (contractId: string) => void;
  whatsappStatus?: 'connected' | 'connecting' | 'disconnected';
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
  onOpenOfficialContract,
  onLogout,
  inAppNotifications,
  onMarkInAppAsRead,
  onMarkAllInAppAsRead,
  onClearAllInApp,
  onSelectContract,
  whatsappStatus = 'connected'
}) => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const handleTabSelect = (tab: string) => {
    setCurrentTab(tab);
    setIsMobileDrawerOpen(false);
  };

  return (
    <>
      <style>{`
        /* 🖥️ Desktop vs 📱 Mobile Adaptive Breakpoint (768px) */
        @media (min-width: 769px) {
          .desktop-nav-view { display: flex !important; }
          .desktop-actions-view { display: flex !important; }
          .mobile-top-header { display: none !important; }
          .mobile-bottom-app-bar { display: none !important; }
          .mobile-drawer-overlay { display: none !important; }
        }

        @media (max-width: 768px) {
          .desktop-nav-view { display: none !important; }
          .desktop-actions-view { display: none !important; }
          .mobile-top-header { display: flex !important; }
          .mobile-bottom-app-bar { display: flex !important; }
        }
      `}</style>

      {/* ─── 🖥️ DESKTOP NAVBAR (PRESERVED 100% INTACT) ─── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: 'rgba(8, 12, 20, 0.88)',
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

          {/* Desktop Navigation Tabs */}
          <nav className="desktop-nav-view" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
              <Smartphone size={17} />
              <span>محرك الواتساب</span>
            </button>

            {/* Admin only Tabs */}
            {currentRole === 'admin' && (
              <>
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
                  id="nav-dev-lab-tab"
                  onClick={() => setCurrentTab('dev-lab')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: currentTab === 'dev-lab' ? '1px solid #ec4899' : '1px solid rgba(236, 72, 153, 0.3)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    background: currentTab === 'dev-lab' ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(168, 85, 247, 0.2))' : 'rgba(236, 72, 153, 0.08)',
                    color: '#f472b6',
                    boxShadow: currentTab === 'dev-lab' ? '0 0 15px rgba(236, 72, 153, 0.35)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <FlaskConical size={17} color="#f472b6" />
                  <span>مختبر التطوير (R&D)</span>
                </button>
              </>
            )}
          </nav>

          {/* Desktop Right Actions */}
          <div className="desktop-actions-view" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            
            {/* Live WhatsApp Status Pill */}
            {whatsappStatus === 'connected' ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '10px',
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#34d399',
                  boxShadow: '0 0 12px rgba(16, 185, 129, 0.15)'
                }}
                title="محرك الواتساب السحابي متصل بنجاح"
              >
                <span style={{ fontSize: '0.85rem' }}>⚡</span>
                <span>الواتساب متصل 🟢</span>
              </div>
            ) : (
              <button
                onClick={() => setCurrentTab('whatsapp')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(185, 28, 28, 0.35))',
                  border: '1px solid #ef4444',
                  borderRadius: '10px',
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#fee2e2',
                  cursor: 'pointer',
                  boxShadow: '0 0 14px rgba(239, 68, 68, 0.25)'
                }}
                title="الواتساب غير متصل - انقر لربط الجهاز"
              >
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping inline-block" />
                <span>انقطاع الواتساب 🔴 (انقر للربط)</span>
              </button>
            )}

            <InstallAppButton />

            <NotificationBell
              notifications={inAppNotifications}
              onMarkAsRead={onMarkInAppAsRead}
              onMarkAllAsRead={onMarkAllInAppAsRead}
              onClearAll={onClearAllInApp}
              onSelectContract={onSelectContract}
            />

            {/* Official Municipal A4 Contract Button */}
            {onOpenOfficialContract && permissions?.can_create_contracts !== false && (
              <button
                id="btn-official-contract-header"
                onClick={onOpenOfficialContract}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '8px 16px',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #b91c1c, #dc2626)',
                  color: '#ffffff',
                  boxShadow: '0 0 16px rgba(220, 38, 38, 0.35)',
                  border: '1px solid rgba(254, 202, 202, 0.3)',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
                title="إنشاء وتوثيق عقد تأجير حاوية رسمي A4"
              >
                <FileCode2 size={17} />
                <span>عقد البلدية الموثق A4</span>
              </button>
            )}

            {/* Main Action: New Contract Button */}
            {permissions?.can_create_contracts !== false && (
              <button
                id="btn-new-contract-header"
                className="btn btn-primary"
                onClick={onOpenNewContract}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 18px',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)',
                  border: 'none',
                  borderRadius: '12px'
                }}
              >
                <PlusCircle size={18} />
                <span>عقد جديد</span>
              </button>
            )}

            {/* Profile / Role Switcher */}
            {onOpenStaffLoginModal && (
              <button
                onClick={onOpenStaffLoginModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  background: currentRole === 'admin' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                  border: currentRole === 'admin' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(56, 189, 248, 0.35)',
                  borderRadius: '12px',
                  cursor: 'pointer',
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

            {/* Logout Button */}
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

          {/* ─── 📱 MOBILE COMPACT TOP HEADER ─── */}
          <div className="mobile-top-header" style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: '8px'
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setCurrentTab('search')}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 12px rgba(245, 158, 11, 0.4)'
              }}>
                <Truck size={20} color="#050811" />
              </div>
              <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#ffffff' }}>
                المحترز <span style={{ color: '#fbbf24' }}>للحاويات</span>
              </span>
            </div>

            {/* Mobile Actions: New Contract + Bell + Drawer Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {permissions?.can_create_contracts !== false && (
                <button
                  onClick={onOpenNewContract}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#050811',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: 900,
                    boxShadow: '0 0 12px rgba(245, 158, 11, 0.35)',
                    cursor: 'pointer'
                  }}
                >
                  <PlusCircle size={15} />
                  <span>عقد جديد</span>
                </button>
              )}

              <NotificationBell
                notifications={inAppNotifications}
                onMarkAsRead={onMarkInAppAsRead}
                onMarkAllAsRead={onMarkAllInAppAsRead}
                onClearAll={onClearAllInApp}
                onSelectContract={onSelectContract}
              />

              {/* Hamburger Drawer Button */}
              <button
                onClick={() => setIsMobileDrawerOpen(true)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="القائمة الكاملة"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* ─── 📱 MOBILE BOTTOM NAVIGATION APP BAR (Fixed at bottom) ─── */}
      <nav className="mobile-bottom-app-bar" style={{
        display: 'none',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9995,
        background: 'rgba(8, 12, 20, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(245, 158, 11, 0.3)',
        padding: '6px 12px 10px 12px',
        alignItems: 'center',
        justifyContent: 'space-around',
        boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.6)'
      }}>
        {/* Tab 1: Search */}
        <button
          onClick={() => handleTabSelect('search')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            background: 'transparent',
            border: 'none',
            color: currentTab === 'search' ? '#fbbf24' : '#64748b',
            cursor: 'pointer',
            padding: '4px',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: currentTab === 'search' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Search size={19} />
          </div>
          <span style={{ fontSize: '0.68rem', fontWeight: currentTab === 'search' ? 800 : 600 }}>البحث</span>
        </button>

        {/* Tab 2: Containers */}
        <button
          onClick={() => handleTabSelect('containers')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            background: 'transparent',
            border: 'none',
            color: currentTab === 'containers' ? '#38bdf8' : '#64748b',
            cursor: 'pointer',
            padding: '4px',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: currentTab === 'containers' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Truck size={19} />
          </div>
          <span style={{ fontSize: '0.68rem', fontWeight: currentTab === 'containers' ? 800 : 600 }}>الحاويات</span>
        </button>

        {/* Tab 3: Contracts */}
        <button
          onClick={() => handleTabSelect('contracts')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            background: 'transparent',
            border: 'none',
            color: currentTab === 'contracts' ? '#34d399' : '#64748b',
            cursor: 'pointer',
            padding: '4px',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: currentTab === 'contracts' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileText size={19} />
          </div>
          <span style={{ fontSize: '0.68rem', fontWeight: currentTab === 'contracts' ? 800 : 600 }}>العقود</span>
        </button>

        {/* Tab 4: AI Copilot (if admin) */}
        {currentRole === 'admin' && (
          <button
            onClick={() => handleTabSelect('ai-hub')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              background: 'transparent',
              border: 'none',
              color: currentTab === 'ai-hub' ? '#fbbf24' : '#64748b',
              cursor: 'pointer',
              padding: '4px',
              transition: 'all 0.2s'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: currentTab === 'ai-hub' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(245, 158, 11, 0.1)',
              color: currentTab === 'ai-hub' ? '#050811' : '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: currentTab === 'ai-hub' ? '0 0 12px rgba(245, 158, 11, 0.4)' : 'none'
            }}>
              <Bot size={19} />
            </div>
            <span style={{ fontSize: '0.68rem', fontWeight: currentTab === 'ai-hub' ? 800 : 600 }}>المساعد</span>
          </button>
        )}

        {/* Tab 5: WhatsApp Engine */}
        <button
          onClick={() => handleTabSelect('whatsapp')}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            background: 'transparent',
            border: 'none',
            color: currentTab === 'whatsapp' ? '#34d399' : '#64748b',
            cursor: 'pointer',
            padding: '4px',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: currentTab === 'whatsapp' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Smartphone size={19} />
          </div>
          <span style={{ fontSize: '0.68rem', fontWeight: currentTab === 'whatsapp' ? 800 : 600 }}>الواتساب</span>
        </button>

        {/* Tab 6: More Menu Drawer Trigger */}
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            background: 'transparent',
            border: 'none',
            color: isMobileDrawerOpen ? '#fbbf24' : '#64748b',
            cursor: 'pointer',
            padding: '4px',
            transition: 'all 0.2s'
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: isMobileDrawerOpen ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Menu size={19} />
          </div>
          <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>المزيد</span>
        </button>
      </nav>

      {/* ─── 📱 MOBILE SIDE DRAWER (SLIDE-OVER MENU) ─── */}
      {isMobileDrawerOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'flex-end',
          direction: 'rtl'
        }}>
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileDrawerOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              animation: 'fadeIn 0.2s ease'
            }}
          />

          {/* Drawer Content */}
          <div style={{
            position: 'relative',
            width: '320px',
            maxWidth: '85vw',
            height: '100%',
            background: 'linear-gradient(180deg, #0f172a 0%, #050811 100%)',
            borderLeft: '1px solid rgba(245, 158, 11, 0.3)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
            boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.8)',
            zIndex: 10
          }}>
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#050811'
                }}>
                  <Truck size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#ffffff' }}>لوحة التحكم والمزيد</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>مؤسسة المحترز للحاويات</div>
                </div>
              </div>

              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Info Badge */}
            <div style={{
              background: currentRole === 'admin' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(56, 189, 248, 0.12)',
              border: currentRole === 'admin' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '14px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: currentRole === 'admin' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #38bdf8, #0284c7)',
                  color: currentRole === 'admin' ? '#000000' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900
                }}>
                  {currentRole === 'admin' ? '👑' : '👷'}
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: currentRole === 'admin' ? '#fbbf24' : '#38bdf8' }}>
                    {currentRole === 'admin' ? '👑 أبو ماجد (المدير العام)' : (currentProfile?.full_name || 'موظف')}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    {currentRole === 'admin' ? 'صلاحيات إدارية كاملة' : 'حساب موظف ميداني'}
                  </div>
                </div>
              </div>

              {onOpenStaffLoginModal && (
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenStaffLoginModal();
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    fontSize: '0.72rem',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  تبديل
                </button>
              )}
            </div>

            {/* Quick Action in Mobile Drawer: Official Contract A4 */}
            {onOpenOfficialContract && permissions?.can_create_contracts !== false && (
              <button
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  onOpenOfficialContract();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #b91c1c, #dc2626)',
                  color: '#ffffff',
                  border: '1px solid rgba(254, 202, 202, 0.3)',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  boxShadow: '0 4px 15px rgba(220, 38, 38, 0.35)',
                  cursor: 'pointer'
                }}
              >
                <FileCode2 size={18} />
                <span>📜 إصدار عقد البلدية الموثق A4</span>
              </button>
            )}

            {/* Drawer Menu Navigation Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              
              <button
                onClick={() => handleTabSelect('search')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: currentTab === 'search' ? 'rgba(245, 158, 11, 0.18)' : 'transparent',
                  border: 'none',
                  color: currentTab === 'search' ? '#fbbf24' : '#e2e8f0',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'right'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Search size={18} color="#fbbf24" />
                  <span>البحث والاستعلام الشامل</span>
                </div>
                <ChevronLeft size={16} color="#64748b" />
              </button>

              <button
                onClick={() => handleTabSelect('containers')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: currentTab === 'containers' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                  border: 'none',
                  color: currentTab === 'containers' ? '#38bdf8' : '#e2e8f0',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'right'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Truck size={18} color="#38bdf8" />
                  <span>إدارة أسطول الحاويات</span>
                </div>
                <ChevronLeft size={16} color="#64748b" />
              </button>

              <button
                onClick={() => handleTabSelect('contracts')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: currentTab === 'contracts' ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
                  border: 'none',
                  color: currentTab === 'contracts' ? '#34d399' : '#e2e8f0',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'right'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={18} color="#34d399" />
                  <span>سجل العقود والتحصيل المالي</span>
                </div>
                <ChevronLeft size={16} color="#64748b" />
              </button>

              <button
                onClick={() => handleTabSelect('whatsapp')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: currentTab === 'whatsapp' ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
                  border: 'none',
                  color: currentTab === 'whatsapp' ? '#34d399' : '#e2e8f0',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'right'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Smartphone size={18} color="#34d399" />
                  <span>محرك الواتساب وبطاقات العقود</span>
                </div>
                <ChevronLeft size={16} color="#64748b" />
              </button>

              {/* Admin Special Sections */}
              {currentRole === 'admin' && (
                <>
                  <button
                    onClick={() => handleTabSelect('ai-hub')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: currentTab === 'ai-hub' ? 'rgba(245, 158, 11, 0.18)' : 'transparent',
                      border: 'none',
                      color: currentTab === 'ai-hub' ? '#fbbf24' : '#e2e8f0',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'right'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Bot size={18} color="#fbbf24" />
                      <span>المساعد الذكي (AI Copilot)</span>
                    </div>
                    <span style={{ background: '#fbbf24', color: '#000', fontSize: '0.65rem', fontWeight: 900, padding: '1px 5px', borderRadius: '4px' }}>AI</span>
                  </button>

                  <button
                    onClick={() => handleTabSelect('inventory')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: currentTab === 'inventory' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                      border: 'none',
                      color: currentTab === 'inventory' ? '#38bdf8' : '#e2e8f0',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'right'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Package size={18} color="#38bdf8" />
                      <span>إدارة المخزون والتوريد</span>
                    </div>
                    <ChevronLeft size={16} color="#64748b" />
                  </button>

                  <button
                    onClick={() => handleTabSelect('staff')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: currentTab === 'staff' ? 'rgba(168, 85, 247, 0.18)' : 'transparent',
                      border: 'none',
                      color: currentTab === 'staff' ? '#c084fc' : '#e2e8f0',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'right'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Users size={18} color="#c084fc" />
                      <span>إدارة الموظفين والسائقين</span>
                    </div>
                    <ChevronLeft size={16} color="#64748b" />
                  </button>

                  <button
                    onClick={() => handleTabSelect('payment-settings')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: currentTab === 'payment-settings' ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
                      border: 'none',
                      color: currentTab === 'payment-settings' ? '#34d399' : '#e2e8f0',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'right'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CreditCard size={18} color="#34d399" />
                      <span>بوابة الدفع الإلكتروني</span>
                    </div>
                    <ChevronLeft size={16} color="#64748b" />
                  </button>

                  <button
                    onClick={() => handleTabSelect('dev-lab')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: currentTab === 'dev-lab' ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(168, 85, 247, 0.2))' : 'rgba(236, 72, 153, 0.08)',
                      border: '1px solid rgba(236, 72, 153, 0.3)',
                      color: '#f472b6',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      textAlign: 'right'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FlaskConical size={18} color="#f472b6" />
                      <span>مختبر التطوير والذكاء (R&D)</span>
                    </div>
                    <span style={{ background: '#ec4899', color: '#fff', fontSize: '0.65rem', fontWeight: 900, padding: '1px 5px', borderRadius: '4px' }}>LAB</span>
                  </button>
                </>
              )}
            </div>

            {/* Bottom Utilities in Drawer */}
            <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>حالة الواتساب:</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: whatsappStatus === 'connected' ? '#34d399' : '#f87171' }}>
                  {whatsappStatus === 'connected' ? 'متصل بنجاح 🟢' : 'غير متصل 🔴'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onReplayIntro();
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: '#94a3b8',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <RotateCcw size={14} />
                  <span>المقدمة</span>
                </button>

                {onLogout && (
                  <button
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      onLogout();
                    }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      borderRadius: '10px',
                      color: '#f87171',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <LogOut size={14} />
                    <span>قفل / خروج</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
