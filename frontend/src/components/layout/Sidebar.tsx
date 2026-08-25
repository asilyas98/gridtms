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
  MessageCircle
} from 'lucide-react';
import { motion } from 'motion/react';

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
    className={`w-full flex items-center px-3.5 py-2.5 transition-all duration-150 rounded-xl mb-1 group relative overflow-hidden select-none h-11
      ${active 
        ? 'bg-orange/10 text-orange font-semibold shadow-sm' 
        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-[#2C2C2E]/40 hover:text-slate-900 dark:hover:text-white'}`}
  >
    {/* Clean Centered Icon Container */}
    <div className="w-[44px] flex-shrink-0 flex items-center justify-start pl-1">
      <Icon size={18} className={active ? 'text-orange' : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-200'} />
    </div>

    {/* Elegant Content Animation */}
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
      {num && (
        <span className="text-[10px] font-semibold bg-orange/15 text-orange px-2 py-0.5 rounded-full select-none">
          {num}
        </span>
      )}
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
            <div className="w-full flex items-center h-full justify-center text-slate-400">
              <Menu size={18} className="text-slate-400" />
            </div>
          ) : (
            <div className="flex items-center justify-between w-full px-5 h-full">
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col justify-center min-w-0"
              >
                <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-widest leading-none select-none">GRID TMS</h1>
                <p className="text-[9px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-1 select-none">OPERATIONAL CORE</p>
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
          
          <SidebarItem 
            icon={BarChart3} 
            label="Dashboard" 
            active={currentView === 'dashboard'} 
            onClick={() => setCurrentView('dashboard')}
            collapsed={collapsed}
          />
          <SidebarItem 
            icon={Menu} 
            label="Dispatch Board" 
            active={currentView === 'dispatch'} 
            onClick={() => setCurrentView('dispatch')}
            num="Live"
            collapsed={collapsed}
          />
          <SidebarItem 
            icon={Truck} 
            label="Load Management" 
            active={currentView === 'loads'} 
            onClick={() => setCurrentView('loads')}
            collapsed={collapsed}
          />
          <SidebarItem 
            icon={Users} 
            label="Asset Management" 
            active={currentView === 'assets'} 
            onClick={() => setCurrentView('assets')}
            collapsed={collapsed}
          />
          <SidebarItem 
            icon={Users} 
            label="Customers" 
            active={currentView === 'customers'} 
            onClick={() => setCurrentView('customers')}
            collapsed={collapsed}
          />
          <SidebarItem 
            icon={MapPin} 
            label="Locations" 
            active={currentView === 'locations'} 
            onClick={() => setCurrentView('locations')}
            collapsed={collapsed}
          />
          <SidebarItem 
            icon={FileText} 
            label="Invoices" 
            active={currentView === 'invoices'} 
            onClick={() => setCurrentView('invoices')}
            collapsed={collapsed}
          />
          <SidebarItem 
            icon={Wallet} 
            label="Settlements" 
            active={currentView === 'settlements'} 
            onClick={() => setCurrentView('settlements')}
            collapsed={collapsed}
          />
          <SidebarItem 
            icon={MessageCircle} 
            label="AI Assistant" 
            active={currentView === 'ai'} 
            onClick={() => setCurrentView('ai')}
            num="AI"
            collapsed={collapsed}
          />
          <SidebarItem 
            icon={ShieldCheck} 
            label="Compliance" 
            active={currentView === 'compliance'} 
            onClick={() => setCurrentView('compliance')}
            collapsed={collapsed}
          />

          <div className="pt-4 mt-4 border-t border-[#E5E5EA] dark:border-[#1C1C1E]">
            <SidebarItem 
              icon={Settings} 
              label="Settings" 
              active={currentView === 'settings'}
              onClick={() => setCurrentView('settings')}
              collapsed={collapsed}
            />
          </div>
        </div>

        {/* User profile section matching Apple's Finder account footers */}
        <div className="p-3 mt-auto border-t border-[#E5E5EA] dark:border-[#1C1C1E] bg-[#F5F5F7] dark:bg-black/40 flex overflow-hidden">
          <div className="flex items-center w-full px-1">
            <div className="w-8 h-8 rounded-full bg-[#007AFF] text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
              SK
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
              <div className="flex-1 overflow-hidden min-w-0">
                <p className="text-slate-950 dark:text-slate-100 text-[12px] font-semibold truncate">Sarah K.</p>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate mt-0.5">Senior Dispatcher</p>
              </div>
              <button title="Log Out" onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 ml-1 cursor-pointer">
                <LogOut size={14} />
              </button>
            </motion.div>
          </div>
        </div>
      </aside>
    </div>
  );
}
