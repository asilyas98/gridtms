import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { Search, MapPin, Users, Truck, FileText, Wallet, PackageOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GlobalSearchProps {
  navigate: (view: string, loadId?: string | null) => void;
  theme: string;
}

export default function GlobalSearch({ navigate, theme }: GlobalSearchProps) {
  const { loads, drivers, trucks, customers, locations, invoices, setNavigationIntent } = useData();
  const settlements: any[] = [];
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = React.useMemo(() => {
    if (!query.trim()) return [];
    
    const searchTerms = query.toLowerCase().split(' ').filter(Boolean);
    const matches = (text: string | undefined) => 
      searchTerms.every(term => text?.toLowerCase().includes(term));

    const found = [];

    // Search Loads (Match Load #, PO, Bol)
    const matchedLoads = (loads || []).filter(l => 
      matches(l.loadNumber) || matches(l.customerPo) || matches(l.bolNumber)
    ).slice(0, 5);
    if (matchedLoads.length > 0) found.push({ group: 'Loads', items: matchedLoads, type: 'load' });

    // Search Drivers (Match Name, CDL, Phone)
    const matchedDrivers = (drivers || []).filter(d => 
      matches(d.name) || matches(d.cdlNumber) || matches(d.phone)
    ).slice(0, 3);
    if (matchedDrivers.length > 0) found.push({ group: 'Drivers', items: matchedDrivers, type: 'driver' });

    // Search Trucks (Match Unit #, VIN)
    const matchedTrucks = (trucks || []).filter(t => 
      matches(t.unitNumber) || matches(t.vin)
    ).slice(0, 3);
    if (matchedTrucks.length > 0) found.push({ group: 'Trucks', items: matchedTrucks, type: 'truck' });

    // Search Customers (Match Name, MC/DOT, Code)
    const matchedCustomers = (customers || []).filter(c => 
      matches(c.name) || matches(c.mcNumber) || matches(c.code)
    ).slice(0, 3);
    if (matchedCustomers.length > 0) found.push({ group: 'Customers', items: matchedCustomers, type: 'customer' });

    // Search Locations (Match Name, City, State)
    const matchedLocations = (locations || []).filter(loc => 
      matches(loc.name) || matches(loc.address?.city) || matches(loc.address?.state) || matches(loc.address?.zip)
    ).slice(0, 3);
    if (matchedLocations.length > 0) found.push({ group: 'Locations', items: matchedLocations, type: 'location' });

    // Search Invoices
    const matchedInvoices = (invoices || []).filter(i => 
      matches(i.invoiceNumber)
    ).slice(0, 3);
    if (matchedInvoices.length > 0) found.push({ group: 'Invoices', items: matchedInvoices, type: 'invoice' });

    // Search Settlements (Note: settlements might not be in DataContext)
    const matchedSettlements = (settlements || []).filter((s: any) => 
      matches(s.settlementNumber)
    ).slice(0, 3);
    if (matchedSettlements.length > 0) found.push({ group: 'Settlements', items: matchedSettlements, type: 'settlement' });

    return found;
  }, [query, loads, drivers, trucks, customers, locations, invoices, settlements]);

  const handleSelect = (item: any, type: string) => {
    if (typeof setIsOpen === 'function') setIsOpen(false);
    if (typeof setQuery === 'function') setQuery('');
    
    switch (type) {
      case 'load': 
        navigate('loads', item.id); 
        break;
      case 'driver': 
        setNavigationIntent({ view: 'assets', tab: 'Drivers', searchQuery: item.name });
        navigate('assets'); 
        break;
      case 'truck': 
        setNavigationIntent({ view: 'assets', tab: 'Trucks', searchQuery: item.unitNumber });
        navigate('assets'); 
        break;
      case 'customer': 
        setNavigationIntent({ view: 'customers', searchQuery: item.name });
        navigate('customers'); 
        break;
      case 'location': 
        setNavigationIntent({ view: 'locations', searchQuery: item.name });
        navigate('locations'); 
        break;
      case 'invoice': 
        setNavigationIntent({ view: 'invoices', searchQuery: item.invoiceNumber });
        navigate('invoices'); 
        break;
      case 'settlement': 
        setNavigationIntent({ view: 'settlements', searchQuery: item.settlementNumber });
        navigate('settlements'); 
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'load': return <Truck size={16} className="text-orange" />;
      case 'driver': return <Users size={16} className="text-blue-500" />;
      case 'truck': return <Truck size={16} className="text-emerald-500" />;
      case 'customer': return <Users size={16} className="text-purple-500" />;
      case 'location': return <MapPin size={16} className="text-rose-500" />;
      case 'invoice': return <FileText size={16} className="text-amber-500" />;
      case 'settlement': return <Wallet size={16} className="text-indigo-500" />;
      default: return <Search size={16} />;
    }
  };

  const getSubtext = (item: any, type: string) => {
    switch (type) {
      case 'load': return `${item.originId || 'Origin'} -> ${item.destinationId || 'Destination'} • ${item.status}`;
      case 'driver': return `${item.status} • ${item.currentLocation || 'Unknown'}`;
      case 'truck': return `VIN: ${item.vin || 'N/A'} • ${item.status}`;
      case 'customer': return `${item.address?.city || ''}, ${item.address?.state || ''}`;
      case 'location': return `${item.address?.city || ''}, ${item.address?.state || ''} • ${item.type}`;
      case 'invoice': return `Load: ${item.loadId} • ${item.status}`;
      case 'settlement': return `${item.periodStart} - ${item.periodEnd} • ${item.status}`;
      default: return '';
    }
  };

  const getName = (item: any, type: string) => {
    switch (type) {
      case 'load': return `Load ${item.loadNumber}`;
      case 'invoice': return `Invoice ${item.invoiceNumber}`;
      case 'settlement': return `Settlement ${item.settlementNumber}`;
      case 'truck': return `Truck ${item.unitNumber}`;
      default: return item.name || `Unknown ${type}`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      setIsOpen(false);
      navigate('search', query.trim());
      e.currentTarget.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative z-50">
      <div 
        title="Type a search query to filter active loads, customers, or routes"
        className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-full w-full border focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-500 transition-all ${
          theme === 'dark' ? 'bg-[#1C1C1E]/50 border-[#2D2D2D]' : 'bg-slate-100/80 border-slate-200/80'
        }`}
      >
        <Search size={14} className="text-slate-400 shrink-0" />
        <input 
          type="text" 
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search operational records..." 
          className="bg-transparent border-none outline-none text-[13px] w-full placeholder-slate-500 dark:placeholder-slate-400 font-sans text-black dark:text-white" 
        />
      </div>

      <AnimatePresence>
        {isOpen && query.trim().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full mt-2 left-0 w-[400px] rounded-xl border shadow-xl max-h-[60vh] overflow-y-auto ${
              theme === 'dark' ? 'bg-[#1C1C1E] border-[#2D2D2D]' : 'bg-white border-slate-200'
            }`}
          >
            {results.length === 0 ? (
              <button 
                onClick={() => {
                  setIsOpen(false);
                  navigate('search', query.trim());
                }}
                className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
              >
                <div className="flex items-center gap-3">
                  <Search size={16} className="text-blue-500" />
                  <span className="text-sm">Search for "{query}"</span>
                </div>
              </button>
            ) : (
              <div className="py-2">
                {results.map((group) => (
                  <div key={group.group} className="mb-2 last:mb-0">
                    <div className="px-4 py-1 flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                        {group.group}
                      </span>
                      <div className="flex-1 h-px bg-slate-100 dark:bg-zinc-800" />
                    </div>
                    <div>
                      {group.items.map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item, group.type)}
                          className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors ${
                            theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-black' : 'bg-white shadow-sm border border-slate-100'}`}>
                            {getIcon(group.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-black dark:text-white truncate">
                              {getName(item, group.type)}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {getSubtext(item, group.type)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                
                <div className="px-2 mt-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <button 
                    onClick={() => {
                      setIsOpen(false);
                      navigate('search', query.trim());
                    }}
                    className={`w-full text-center py-2 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10 transition-colors`}
                  >
                    View all results for "{query}"
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
