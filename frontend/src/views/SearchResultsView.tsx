import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Search, PackageOpen, Users, Truck as TruckIcon, MapPin, FileText, Wallet, ChevronRight, LayoutList, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SearchResultsViewProps {
  query: string;
  navigate: (view: string, id?: string | null) => void;
}

export default function SearchResultsView({ query, navigate }: SearchResultsViewProps) {
  const { loads, drivers, trucks, customers, locations, invoices, theme, setNavigationIntent } = useData();
  const [activeTab, setActiveTab] = useState('All');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    
    const searchTerms = query.toLowerCase().split(' ').filter(Boolean);
    const matches = (text: string | undefined) => 
      searchTerms.every(term => text?.toLowerCase().includes(term));

    const found: { group: string; items: any[]; type: string; icon: React.ReactNode }[] = [];

    // Search Loads
    const matchedLoads = (loads || []).filter(l => 
      matches(l.loadNumber) || matches(l.customerPo) || matches(l.bolNumber)
    );
    if (matchedLoads.length > 0) found.push({ group: 'Loads', items: matchedLoads, type: 'load', icon: <Truck size={16} /> });

    // Search Drivers
    const matchedDrivers = (drivers || []).filter(d => 
      matches(d.name) || matches(d.cdlNumber) || matches(d.phone) || matches(d.email)
    );
    if (matchedDrivers.length > 0) found.push({ group: 'Drivers', items: matchedDrivers, type: 'driver', icon: <Users size={16} /> });

    // Search Trucks
    const matchedTrucks = (trucks || []).filter(t => 
      matches(t.unitNumber) || matches(t.vin) || matches(t.makeModel)
    );
    if (matchedTrucks.length > 0) found.push({ group: 'Trucks', items: matchedTrucks, type: 'truck', icon: <TruckIcon size={16} /> });

    // Search Customers
    const matchedCustomers = (customers || []).filter(c => 
      matches(c.name) || matches(c.mcNumber) || matches(c.code) || matches(c.email)
    );
    if (matchedCustomers.length > 0) found.push({ group: 'Customers', items: matchedCustomers, type: 'customer', icon: <Users size={16} /> });

    // Search Locations
    const matchedLocations = (locations || []).filter(loc => 
      matches(loc.name) || matches(loc.address?.city) || matches(loc.address?.state) || matches(loc.address?.zip)
    );
    if (matchedLocations.length > 0) found.push({ group: 'Locations', items: matchedLocations, type: 'location', icon: <MapPin size={16} /> });

    // Search Invoices
    const matchedInvoices = (invoices || []).filter(i => 
      matches(i.invoiceNumber) || matches(i.status)
    );
    if (matchedInvoices.length > 0) found.push({ group: 'Invoices', items: matchedInvoices, type: 'invoice', icon: <FileText size={16} /> });

    return found;
  }, [query, loads, drivers, trucks, customers, locations, invoices]);

  const tabs = ['All', ...results.map(r => r.group)];

  const displayedResults = useMemo(() => {
    if (activeTab === 'All') return results;
    return results.filter(r => r.group === activeTab);
  }, [results, activeTab]);

  const handleSelect = (item: any, type: string) => {
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

  const getSubtext = (item: any, type: string) => {
    switch (type) {
      case 'load': return `${item.originId || 'Origin'} -> ${item.destinationId || 'Destination'} • ${item.status}`;
      case 'driver': return `${item.status} • ${item.currentLocation || 'Unknown'}`;
      case 'truck': return `VIN: ${item.vin || 'N/A'} • ${item.status}`;
      case 'customer': return `${item.address?.city || ''}, ${item.address?.state || ''}`;
      case 'location': return `${item.address?.city || ''}, ${item.address?.state || ''} • ${item.type}`;
      case 'invoice': return `Load: ${item.loadId} • ${item.status} • $${item.amount?.toFixed(2) || '0.00'}`;
      default: return '';
    }
  };

  const getName = (item: any, type: string) => {
    switch (type) {
      case 'load': return `Load ${item.loadNumber}`;
      case 'invoice': return `Invoice ${item.invoiceNumber}`;
      case 'truck': return `Truck ${item.unitNumber}`;
      default: return item.name || `Unknown ${type}`;
    }
  };

  const totalResultsCount = results.reduce((acc, group) => acc + group.items.length, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="mb-6 flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white flex items-center gap-3">
          <Search className="text-blue-500" size={24} />
          Search Results
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          {totalResultsCount} result{totalResultsCount !== 1 ? 's' : ''} found for "<span className="font-semibold text-black dark:text-white">{query}</span>"
        </p>
      </header>

      {totalResultsCount === 0 ? (
        <div className={`flex flex-col items-center justify-center flex-1 rounded-2xl border border-dashed ${theme === 'dark' ? 'border-zinc-800 bg-[#121214]' : 'border-slate-200 bg-slate-50'}`}>
          <Search size={48} className="text-slate-300 dark:text-zinc-600 mb-4" />
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">No matching records</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-sm text-center">We couldn't find anything matching your search. Try adjusting your keywords or checking for typos.</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          {/* Sidebar / Tabs */}
          <aside className="w-full lg:w-56 flex-shrink-0 lg:overflow-y-auto no-scrollbar">
            <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
              {tabs.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-colors whitespace-nowrap ${
                    activeTab === tab 
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' 
                      : 'text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-[#1C1C1E]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {tab === 'All' && <LayoutList size={16} />}
                    {tab !== 'All' && results.find(r => r.group === tab)?.icon}
                    {tab}
                  </span>
                  {tab !== 'All' && (
                    <span className={`text-[10px] py-0.5 px-2 rounded-full ${
                      activeTab === tab 
                        ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' 
                        : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-slate-300'
                    }`}>
                      {results.find(r => r.group === tab)?.items.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </aside>

          {/* Results List */}
          <main className="flex-1 overflow-y-auto pr-2 pb-12">
            <AnimatePresence mode="popLayout">
              {displayedResults.map((group) => (
                <motion.div 
                  key={group.group}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mb-8"
                >
                  <h3 className="text-xs font-bold tracking-widest uppercase text-slate-500 dark:text-slate-400 mb-3 px-1 flex items-center gap-2">
                    {group.icon}
                    {group.group}
                  </h3>
                  <div className="flex flex-col gap-2">
                    {group.items.map((item: any, idx: number) => (
                      <button
                        key={`${group.type}-${item.id || idx}`}
                        onClick={() => handleSelect(item, group.type)}
                        className={`group flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                          theme === 'dark' 
                            ? 'bg-[#1C1C1E] border-[#2D2D2D] hover:border-blue-500/50 hover:bg-[#252528]' 
                            : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            theme === 'dark' ? 'bg-black text-slate-300' : 'bg-slate-50 text-slate-500 border border-slate-100'
                          }`}>
                            {group.icon}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-black dark:text-white truncate">
                              {getName(item, group.type)}
                            </p>
                            <p className="text-[13px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                              {getSubtext(item, group.type)}
                            </p>
                          </div>
                        </div>
                        <div className={`opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0 -translate-x-2 ${
                          theme === 'dark' ? 'text-zinc-500' : 'text-slate-400'
                        }`}>
                          <ChevronRight size={18} />
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </main>
        </div>
      )}
    </div>
  );
}
