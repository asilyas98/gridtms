import React from 'react';
import { 
  BarChart3, 
  Truck, 
  Menu,
  Wallet,
  LayoutDashboard,
  ShieldCheck
} from 'lucide-react';

interface MobileNavProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

export default function MobileNav({ currentView, setCurrentView }: MobileNavProps) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-black/80 backdrop-blur-md border-t border-[#E5E5EA] dark:border-[#1C1C1E] px-4 py-1.5 z-50 flex items-center justify-around shadow-lg">
      <button 
        onClick={() => setCurrentView('dashboard')}
        className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${currentView === 'dashboard' ? 'text-orange font-semibold' : 'text-slate-400 dark:text-zinc-500'}`}
      >
        <BarChart3 size={18} />
        <span className="text-[9px] font-medium tracking-tight">Overview</span>
      </button>
      <button 
        onClick={() => setCurrentView('dispatch')}
        className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${currentView === 'dispatch' ? 'text-orange font-semibold' : 'text-slate-400 dark:text-zinc-500'}`}
      >
        <LayoutDashboard size={18} />
        <span className="text-[9px] font-medium tracking-tight">Dispatch</span>
      </button>
      <button 
        onClick={() => setCurrentView('loads')}
        className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${currentView === 'loads' ? 'text-orange font-semibold' : 'text-slate-400 dark:text-zinc-500'}`}
      >
        <Truck size={18} />
        <span className="text-[9px] font-medium tracking-tight">Loads</span>
      </button>
      <button 
        onClick={() => setCurrentView('settlements')}
        className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${currentView === 'settlements' ? 'text-orange font-semibold' : 'text-slate-400 dark:text-zinc-500'}`}
      >
        <Wallet size={18} />
        <span className="text-[9px] font-medium tracking-tight">Financials</span>
      </button>
      <button 
        onClick={() => setCurrentView('compliance')}
        className={`flex flex-col items-center gap-1 p-1.5 transition-colors ${currentView === 'compliance' ? 'text-orange font-semibold' : 'text-slate-400 dark:text-zinc-500'}`}
      >
        <ShieldCheck size={18} />
        <span className="text-[9px] font-medium tracking-tight">Audit</span>
      </button>
    </div>
  );
}
