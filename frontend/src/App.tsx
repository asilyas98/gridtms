import React from 'react';
import Sidebar from './components/layout/Sidebar';
import DashboardView from './views/DashboardView';
import { motion } from 'motion/react';
import LoadsView from './views/LoadsView';
import CustomersView from './views/CustomersView';
import InvoicesView from './views/InvoicesView';
import SettlementsView from './views/SettlementsView';
import LocationsView from './views/LocationsView';
import AssetsView from './views/AssetsView';
import LoadDetailView from './views/LoadDetailView';
import DispatchView from './views/DispatchView';
import ComplianceView from './views/ComplianceView';
import SettingsView from './views/SettingsView';
import ArchiveView from './views/ArchiveView';
import ReportsView from './views/ReportsView';
import DocumentsView from './views/DocumentsView';
import NotificationsView from './views/NotificationsView';
import MobileNav from './components/layout/MobileNav';
import { DataProvider, useData } from './context/DataContext';
import { 
  Bell, 
  Search, 
  HelpCircle,
  ExternalLink
} from 'lucide-react';

function AppContent() {
  const [currentView, setCurrentView] = React.useState(() => sessionStorage.getItem('tms-current-view') || 'dashboard');
  const [selectedLoadId, setSelectedLoadId] = React.useState<string | null>(() => sessionStorage.getItem('tms-selected-load-id') || null);
  
  // Consume global states from context
  const { theme, companySettings, navigationIntent, setNavigationIntent, unreadNotificationCount, unsavedChanges } = useData();

  React.useEffect(() => {
    if (navigationIntent && navigationIntent.view) {
      setCurrentView(navigationIntent.view);
    }
  }, [navigationIntent]);

  // Persist view state to session storage
  React.useEffect(() => {
    sessionStorage.setItem('tms-current-view', currentView);
  }, [currentView]);

  React.useEffect(() => {
    if (selectedLoadId) {
      sessionStorage.setItem('tms-selected-load-id', selectedLoadId);
    } else {
      sessionStorage.removeItem('tms-selected-load-id');
    }
  }, [selectedLoadId]);

  // Scroll to top on view change
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView, selectedLoadId]);

  // Warn on refresh if there are unsaved changes
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Standard way to trigger browser warning
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unsavedChanges]);

  const [fontSizeAdjust, setFontSizeAdjust] = React.useState(() => {
    const saved = localStorage.getItem('tms-font-size-adjust');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [sidebarPinned, setSidebarPinned] = React.useState(() => {
    const saved = localStorage.getItem('tms-sidebar-pinned');
    return saved === 'true';
  });

  const [sidebarHovered, setSidebarHovered] = React.useState(false);

  const handlePinToggle = () => {
    setSidebarPinned(prev => {
      const next = !prev;
      localStorage.setItem('tms-sidebar-pinned', String(next));
      return next;
    });
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFontSizeAdjust(value);
    localStorage.setItem('tms-font-size-adjust', value.toString());
  };

  const navigate = (view: string, loadId: string | null = null) => {
    setCurrentView(view);
    setSelectedLoadId(loadId);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView navigate={navigate} />;
      case 'loads': 
        return selectedLoadId 
          ? <LoadDetailView loadId={selectedLoadId} onBack={() => setSelectedLoadId(null)} navigate={navigate} />
          : <LoadsView onSelectLoad={setSelectedLoadId} navigate={navigate} />;
      case 'dispatch': return <DispatchView navigate={navigate} selectedLoadId={selectedLoadId} />;
      case 'assets': return <AssetsView />;
      case 'customers': return <CustomersView />;
      case 'invoices': return <InvoicesView navigate={navigate} selectedLoadId={selectedLoadId} />;
      case 'settlements': return <SettlementsView />;
      case 'locations': return <LocationsView />;
      case 'compliance': return <ComplianceView />;
      case 'settings': return <SettingsView />;
      case 'archive': return <ArchiveView navigate={navigate} />;
      case 'reports': return <ReportsView navigate={navigate} />;
      case 'documents': return <DocumentsView />;
      case 'notifications': return <NotificationsView navigate={navigate} />;
      default: return <DashboardView navigate={navigate} />;
    }
  };

  const handleNavClick = (view: string) => {
    setCurrentView(view);
    setSelectedLoadId(null);
  };

  return (
    <div 
      className={`flex min-h-screen relative pb-16 lg:pb-0 transition-colors duration-300 ${
        theme === 'dark' ? 'dark bg-black text-slate-100' : 'bg-[#F5F5F7] text-slate-900'
      }`}
      style={{
        '--font-size-adjust': `${fontSizeAdjust}px`
      } as React.CSSProperties}
    >
      <motion.div 
        className="hidden lg:flex flex-shrink-0 h-screen sticky top-0 z-50 select-none bg-transparent"
        initial={false}
        animate={{ width: sidebarPinned || sidebarHovered ? 260 : 72 }}
        transition={{ 
          duration: 0.2,
          ease: [0.25, 0.1, 0.25, 1.0] // Apple-like custom ease
        }}
      >
        <Sidebar 
          currentView={currentView} 
          setCurrentView={handleNavClick} 
          pinned={sidebarPinned} 
          onPinToggle={handlePinToggle}
          fontSizeAdjust={fontSizeAdjust}
          isHovered={sidebarHovered}
          onHoverChange={setSidebarHovered}
        />
      </motion.div>
      
      <MobileNav currentView={currentView} setCurrentView={handleNavClick} />
      
      <main className="flex-1 flex flex-col min-w-0">
        {/* Apple-like Glassmorphic Top Nav Bar */}
        <header className={`h-16 border-b flex items-center justify-between px-8 sticky top-0 z-30 transition-colors duration-200 backdrop-blur-md ${
          theme === 'dark' 
            ? 'bg-black/70 border-[#1C1C1E] text-white' 
            : 'bg-white/80 border-[#E5E5EA] text-[#1C1C1E]'
        }`}>
          <div className="flex items-center gap-6">
            {/* Spotlight-inspired Capsule Search */}
            <div 
              title="Type a search query to filter active loads, customers, or routes"
              className={`flex items-center gap-3 px-4 py-2 rounded-full w-80 border focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all ${
                theme === 'dark' ? 'bg-[#1C1C1E]/50 border-[#2D2D2D]' : 'bg-slate-100/80 border-slate-200/80'
              }`}
            >
              <Search size={14} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Search operational records..." 
                className="bg-transparent border-none outline-none text-[13px] w-full placeholder-slate-400 font-sans" 
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase select-none">
                Live Data Link
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Live Font Zoom Slider */}
            <div 
              className="flex items-center gap-3 px-3 py-1.5 rounded-full border bg-slate-50 dark:bg-[#121214] border-slate-200/60 dark:border-[#2C2C2E] min-w-[170px] select-none"
              title="Adjust visual scale dynamically"
            >
              <span className="text-[10px] font-semibold text-slate-400">A</span>
              <input 
                type="range"
                min="-2"
                max="8"
                value={fontSizeAdjust}
                onChange={handleFontSizeChange}
                className="w-full h-1 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">A</span>
              {fontSizeAdjust !== 0 && (
                <span className="text-[9px] font-mono font-semibold text-blue-500 dark:text-blue-400">
                  {fontSizeAdjust > 0 ? `+${fontSizeAdjust}px` : `${fontSizeAdjust}px`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 pl-4 border-l border-slate-200/60 dark:border-[#2C2C2E]">
              <button 
                title="Active alerts and system notifications"
                onClick={() => navigate('notifications')}
                className="relative p-1.5 rounded-lg text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
              >
                <Bell size={18} />
                {unreadNotificationCount > 0 && (
                  <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>
              
              <button 
                title="Resources and documentation manuals"
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
              >
                <HelpCircle size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Core Content Body with Fluid margins */}
        <section className={`flex-1 p-8 overflow-y-auto transition-colors duration-200 ${
          theme === 'dark' ? 'bg-black text-slate-100' : 'bg-[#F2F2F7] text-slate-900'
        }`}>
          <div className="max-w-7xl mx-auto h-full">
            {renderView()}
          </div>
        </section>

        {/* Minimal macOS Status Line */}
        <footer className={`h-8 border-t px-8 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500 transition-colors duration-200 select-none ${
          theme === 'dark' ? 'bg-black border-[#1C1C1E]' : 'bg-white border-[#E5E5EA]'
        }`}>
          <div>
            {companySettings.carrierName} — Version 1.0.4
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 
              Operational Cloud Active
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}
