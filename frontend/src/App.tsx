import React from 'react';
import Sidebar from './components/layout/Sidebar';
import DashboardView from './views/DashboardView';
import { motion, AnimatePresence } from 'motion/react';
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
import AIAssistantView from './views/AIAssistantView';
import SearchResultsView from './views/SearchResultsView';
import SecureAuthGate from './components/auth/SecureAuthGate';
import ChatbotWidget from './components/ai/ChatbotWidget';
import { DataProvider, useData } from './context/DataContext';
import GlobalSearch from './components/layout/GlobalSearch';
import { 
  Bell, 
  Search, 
  HelpCircle,
  ExternalLink,
  Menu,
  X
} from 'lucide-react';

function AppContent() {
  const { theme, companySettings, navigationIntent: contextNavIntent, setNavigationIntent: setContextNavIntent } = useData();
  const [currentView, setCurrentView] = React.useState('dashboard');
  const [selectedLoadId, setSelectedLoadId] = React.useState<string | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = React.useState('');
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  
  // Listen for navigation intents from deeply nested components or local storage
  const [navigationIntent, setNavigationIntent] = React.useState<{view: string, timestamp: number} | null>(null);

  React.useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'gridtms_navigation_intent') {
        try {
          const intent = JSON.parse(e.newValue || '{}');
          if (intent.view) {
            setNavigationIntent(intent);
            // Clear it so it can fire again
            localStorage.removeItem('gridtms_navigation_intent');
          }
        } catch (err) {}
      }
    };
    
    const handleRecordIdChanged = (e: any) => {
      if (e.detail?.oldId && e.detail?.newId) {
        setSelectedLoadId(prev => prev === e.detail.oldId ? e.detail.newId : prev);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('record-id-changed', handleRecordIdChanged);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('record-id-changed', handleRecordIdChanged);
    };
  }, []);

  React.useEffect(() => {
    if (navigationIntent && navigationIntent.view) {
      setCurrentView(navigationIntent.view);
    }
  }, [navigationIntent]);
  
  React.useEffect(() => {
    if (contextNavIntent && contextNavIntent.view) {
      setCurrentView(contextNavIntent.view);
      // We don't necessarily clear it immediately here, let the view consume it, 
      // or we can clear it if it's purely a navigation trigger. 
      // Wait, let's just use it to set currentView.
    }
  }, [contextNavIntent]);

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

  const navigate = (view: string, payload: string | null = null) => {
    setCurrentView(view);
    if (view === 'search') {
      setGlobalSearchQuery(payload || '');
      setSelectedLoadId(null);
    } else {
      setSelectedLoadId(payload);
    }
    setIsSidebarOpen(false);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'search': return <SearchResultsView query={globalSearchQuery} navigate={navigate} />;
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
      case 'ai': return <AIAssistantView />;
      default: return <DashboardView />;
    }
  };

  const handleNavClick = (view: string) => {
    setCurrentView(view);
    setSelectedLoadId(null);
    setIsSidebarOpen(false);
  };

  return (
    <div 
      className={`flex h-[100dvh] w-screen overflow-hidden relative transition-colors duration-300 ${
        theme === 'dark' ? 'dark bg-black text-slate-100' : 'bg-[#F5F5F7] text-slate-900'
      }`}
      style={{
        '--font-size-adjust': `${fontSizeAdjust}px`
      } as React.CSSProperties}
    >
      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.div 
        className={`fixed lg:sticky top-0 left-0 h-full z-50 select-none bg-transparent ${isSidebarOpen ? 'flex' : 'hidden lg:flex'}`}
        initial={false}
        animate={{ width: sidebarPinned || sidebarHovered || isSidebarOpen ? 260 : 72 }}
        transition={{ 
          duration: 0.2,
          ease: [0.25, 0.1, 0.25, 1.0] // Apple-like custom ease
        }}
      >
        <Sidebar 
          currentView={currentView} 
          setCurrentView={handleNavClick} 
          pinned={sidebarPinned || isSidebarOpen} 
          onPinToggle={handlePinToggle}
          fontSizeAdjust={fontSizeAdjust}
          isHovered={sidebarHovered}
          onHoverChange={setSidebarHovered}
        />
      </motion.div>
      
      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        {/* Apple-like Glassmorphic Top Nav Bar */}
        <header className={`h-16 flex-shrink-0 border-b flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 transition-colors duration-200 backdrop-blur-md ${
          theme === 'dark' 
            ? 'bg-black/70 border-[#1C1C1E] text-white' 
            : 'bg-white/80 border-[#E5E5EA] text-[#1C1C1E]'
        }`}>
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-6 flex-1 min-w-0 pr-2 sm:pr-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 shrink-0 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
            >
              <Menu size={22} />
            </button>
            
            {/* Unified Global Search Component */}
            <div className="flex-1 max-w-[400px] min-w-0">
              <GlobalSearch navigate={navigate} theme={theme} />
            </div>
            
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase select-none">
                Live Data Link
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-6 shrink-0">
            {/* Live Font Zoom Slider */}
            <div 
              className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-full border bg-slate-50 dark:bg-[#121214] border-slate-200/60 dark:border-[#2C2C2E] min-w-[170px] select-none"
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

            <div className="flex items-center gap-2 lg:gap-4 lg:pl-4 lg:border-l border-slate-200/60 dark:border-[#2C2C2E]">
              <button 
                title="Active alerts and system notifications"
                className="relative p-1.5 rounded-lg text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              
              <button 
                title="Open GridTMS AI assistant"
                onClick={() => navigate('ai')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
              >
                <HelpCircle size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Core Content Body with Fluid margins */}
        <section className={`flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 transition-colors duration-200 ${
          theme === 'dark' ? 'bg-black text-slate-100' : 'bg-[#F2F2F7] text-slate-900'
        }`}>
          <div className="max-w-7xl mx-auto h-full">
            {renderView()}
          </div>
        </section>

        {/* Minimal macOS Status Line */}
        <footer className={`h-8 flex-shrink-0 border-t px-4 lg:px-8 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500 transition-colors duration-200 select-none ${
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
    <SecureAuthGate>
      <DataProvider>
        <AppContent />
        <ChatbotWidget />
      </DataProvider>
    </SecureAuthGate>
  );
}
