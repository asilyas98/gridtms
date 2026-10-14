import React from 'react';
import { 
  BarChart3, 
  Truck, 
  Users, 
  MapPin, 
  FileText, 
  Wallet, 
  Settings, 
  Menu,
  ChevronRight,
  LogOut,
  ShieldCheck,
  Pin,
  MessageCircle,
  Lock,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../../context/DataContext';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick: () => void;
  collapsed?: boolean;
  num?: string;
}

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed, num }: SidebarItemProps) => (
  <button
    onClick={onClick}
    title={label}
    className={`w-full flex items-center px-3.5 py-2.5 transition-all duration-150 rounded-xl mb-1 group relative overflow-hidden select-none h-11
      ${active 
        ? 'bg-orange/10 text-orange font-semibold shadow-sm' 
        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-[#2C2C2E]/40 hover:text-slate-900 dark:hover:text-white'}`}
  >
    {/* Clean Centered Icon Container */}
    <div className="w-[44px] flex-shrink-0 flex items-center justify-start pl-1">
      <Icon size={18} className={active ? 'text-orange' : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-200'} />
    </div>

    {/* Content Animation */}
    <motion.div
      initial={false}
      animate={{ 
        opacity: collapsed ? 0 : 1,
        x: collapsed ? -8 : 0
      }}
      transition={{ 
        duration: 0.18,
        ease: [0.25, 0.1, 0.25, 1.0]
      }}
      className="flex-1 flex items-center justify-between pr-3 overflow-hidden whitespace-nowrap min-w-0"
    >
      <span className="text-[13px] tracking-tight font-medium">
        {label}
      </span>
      {num ? (
        <span className="text-[10px] font-semibold bg-orange/15 text-orange px-2 py-0.5 rounded-full select-none">
          {num}
        </span>
      ) : null}
    </motion.div>
  </button>
);

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  pinned: boolean;
  onPinToggle: () => void;
  fontSizeAdjust: number;
  isHovered: boolean;
  onHoverChange: (hovered: boolean) => void;
}

export default function Sidebar({ 
  currentView, 
  setCurrentView, 
  pinned, 
  onPinToggle, 
  fontSizeAdjust,
  isHovered,
  onHoverChange
}: SidebarProps) {
  const collapsed = !isHovered && !pinned;
  const { currentUser, teamUsers, setCurrentUser: switchUser, canAccessModule } = useData();
  const displayName = currentUser?.name || 'Carrier Admin';
  const userInitials = currentUser?.avatarInitials || 'CA';
  const userRole = currentUser?.role || 'Owner / Super Admin';
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = React.useState(false);

  const handleLogout = () => {
    const logout = (window as any).gridTmsLogout;
    if (typeof logout === 'function') {
      logout();
    } else {
      localStorage.removeItem('gridtms_access_token');
      localStorage.removeItem('gridtms_user');
      window.location.reload();
    }
  };

  return (
    <div className="w-full h-full relative select-none">
      <aside
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
        style={{
          ['--font-size-adjust' as any]: `${Math.min(fontSizeAdjust, 2)}px`
        }}
        className="h-screen bg-[#F5F5F7] dark:bg-black flex flex-col absolute top-0 left-0 z-50 shadow-sm overflow-hidden border-r border-[#E5E5EA] dark:border-[#1C1C1E] w-full"
      >
        {/* Elegant Header Section */}
        <div className="border-b border-[#E5E5EA] dark:border-[#1C1C1E] mb-4 h-16 overflow-hidden relative flex items-center w-full">
          {collapsed ? (
            <div className="w-full flex items-center h-full justify-center">
              <img src="/gridtms-logo.svg" alt="GridTMS" className="h-10 w-10 object-cover object-left" />
            </div>
          ) : (
            <div className="flex items-center justify-between w-full px-5 h-full">
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col justify-center min-w-0"
              >
                <div className="inline-flex w-fit rounded-lg bg-white px-2 py-1 shadow-sm ring-1 ring-slate-200/70">
                  <img src="/gridtms-logo.svg" alt="GridTMS" className="h-8 w-[120px] object-contain object-left" />
                </div>
              </motion.div>
              
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                {/* Smooth-fading Apple-like Pin Toggle */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPinToggle();
                  }}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer select-none border ${
                    pinned 
                      ? 'bg-orange border-orange text-white shadow-sm hover:brightness-110' 
                      : 'bg-slate-100 dark:bg-zinc-900 border-[#E5E5EA] dark:border-[#2C2C2E] text-slate-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                  title={pinned ? "Unpin sidebar" : "Pin sidebar"}
                >
                  <Pin size={12} className={`transform transition-transform duration-200 ${pinned ? '-rotate-45' : ''}`} />
                </motion.button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation List */}
        <div className="flex-1 px-3 overflow-y-auto no-scrollbar py-2 space-y-0.5">
          {/* Section Header */}
          {!collapsed && (
            <div className="px-3 py-1.5 mb-1 select-none">
              <p className="text-[9px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-bold">Applications</p>
            </div>
          )}
          
          {canAccessModule('dashboard') && (
            <SidebarItem 
              icon={BarChart3} 
              label="Dashboard" 
              active={currentView === 'dashboard'} 
              onClick={() => setCurrentView('dashboard')}
              collapsed={collapsed}
            />
          )}
          {canAccessModule('dispatch') && (
            <SidebarItem 
              icon={Menu} 
              label="Dispatch Board" 
              active={currentView === 'dispatch'} 
              onClick={() => setCurrentView('dispatch')}
              num="Live"
              collapsed={collapsed}
            />
          )}
          {canAccessModule('loads') && (
            <SidebarItem 
              icon={Truck} 
              label="Load Management" 
              active={currentView === 'loads'} 
              onClick={() => setCurrentView('loads')}
              collapsed={collapsed}
            />
          )}
          {canAccessModule('assets') && (
            <SidebarItem 
              icon={Users} 
              label="Asset Management" 
              active={currentView === 'assets'} 
              onClick={() => setCurrentView('assets')}
              collapsed={collapsed}
            />
          )}
          {canAccessModule('customers') && (
            <SidebarItem 
              icon={Users} 
              label="Customers" 
              active={currentView === 'customers'} 
              onClick={() => setCurrentView('customers')}
              collapsed={collapsed}
            />
          )}
          {canAccessModule('locations') && (
            <SidebarItem 
              icon={MapPin} 
              label="Locations" 
              active={currentView === 'locations'} 
              onClick={() => setCurrentView('locations')}
              collapsed={collapsed}
            />
          )}
          {canAccessModule('invoices') && (
            <SidebarItem 
              icon={FileText} 
              label="Invoices" 
              active={currentView === 'invoices'} 
              onClick={() => setCurrentView('invoices')}
              collapsed={collapsed}
            />
          )}
          {canAccessModule('settlements') && (
            <SidebarItem 
              icon={Wallet} 
              label="Settlements" 
              active={currentView === 'settlements'} 
              onClick={() => setCurrentView('settlements')}
              collapsed={collapsed}
            />
          )}
          {canAccessModule('ai') && (
            <SidebarItem 
              icon={MessageCircle} 
              label="AI Assistant" 
              active={currentView === 'ai'} 
              onClick={() => setCurrentView('ai')}
              num="AI"
              collapsed={collapsed}
            />
          )}
          {canAccessModule('compliance') && (
            <SidebarItem 
              icon={ShieldCheck} 
              label="Compliance" 
              active={currentView === 'compliance'} 
              onClick={() => setCurrentView('compliance')}
              collapsed={collapsed}
            />
          )}

          {(canAccessModule('team') || canAccessModule('settings')) && (
            <div className="pt-3 mt-3 border-t border-[#E5E5EA] dark:border-[#1C1C1E] space-y-0.5">
              <SidebarItem 
                icon={Settings} 
                label="Settings" 
                active={currentView === 'settings' || currentView === 'team'} 
                onClick={() => setCurrentView('settings')}
                collapsed={collapsed}
              />
            </div>
          )}
        </div>

        {/* User profile section matching Apple's Finder account footers */}
        <div className="p-3 mt-auto border-t border-[#E5E5EA] dark:border-[#1C1C1E] bg-[#F5F5F7] dark:bg-black/40 flex overflow-hidden">
          <div className="flex items-center w-full px-1">
            <div className="w-8 h-8 rounded-full bg-[#007AFF] text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
              {userInitials}
            </div>
            
            <motion.div
              initial={false}
              animate={{ 
                opacity: collapsed ? 0 : 1,
                x: collapsed ? -12 : 0
              }}
              transition={{ duration: 0.18 }}
              className="flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap min-w-0 pl-3"
            >
              <div 
                className="flex-1 overflow-hidden min-w-0 cursor-pointer group"
                onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
                title="Click to switch active user or test roles"
              >
                <div className="flex items-center gap-1.5">
                  <p className="text-slate-950 dark:text-slate-100 text-[12px] font-semibold truncate group-hover:text-orange transition-colors">{displayName}</p>
                  <span className="text-[8px] bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 px-1 py-0.2 rounded font-mono">Switch</span>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate mt-0.5">{userRole}</p>
              </div>
              <button title="Log Out" onClick={() => setShowLogoutConfirm(true)} className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 ml-1 cursor-pointer">
                <LogOut size={14} />
              </button>
            </motion.div>
          </div>

          {/* Quick User Switcher Flyout */}
          <AnimatePresence>
            {showRoleSwitcher && !collapsed && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-16 left-3 right-3 bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl p-2 z-50 space-y-1 text-left"
              >
                <div className="px-2 py-1 flex items-center justify-between border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Switch User & Role</span>
                  <button 
                    onClick={() => setShowRoleSwitcher(false)} 
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ×
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5 pt-1">
                  {teamUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u);
                        setShowRoleSwitcher(false);
                      }}
                      className={`w-full flex items-center gap-2 p-1.5 rounded-lg text-left transition-colors ${
                        currentUser.id === u.id 
                          ? 'bg-orange/10 text-orange font-semibold' 
                          : 'hover:bg-slate-50 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold">
                        {u.avatarInitials || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate leading-tight">{u.name}</div>
                        <div className="text-[9px] text-slate-400 dark:text-zinc-500 truncate">{u.role}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <button type="button" aria-label="Cancel logout" className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:border dark:border-[#2C2C2E] dark:bg-[#1C1C1E]"
            >
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"><LogOut size={24} /></div>
                <div><h3 className="text-lg font-bold text-slate-900 dark:text-white">Sign Out</h3><p className="text-sm text-slate-500 dark:text-slate-400">Are you sure you want to log out?</p></div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowLogoutConfirm(false)} className="flex-1 rounded-xl bg-slate-100 py-3 font-semibold text-slate-700 hover:bg-slate-200 dark:bg-[#2C2C2E] dark:text-slate-300">Cancel</button>
                <button type="button" onClick={handleLogout} className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-700">Confirm Logout</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
