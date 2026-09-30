import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  MapPin,
  Calendar,
  Truck,
  DollarSign,
  UserPlus
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useViewMode } from '../context/ViewModeContext';
import { Load } from '../types';
import LoadWizard from '../components/loads/LoadWizard';

interface LoadsViewProps {
  onSelectLoad: (id: string) => void;
  navigate: (view: string, loadId: string | null) => void;
}

export default function LoadsView({ onSelectLoad, navigate }: LoadsViewProps) {
  const { loads, customers, locations, drivers, updateLoad, navigationIntent, setNavigationIntent, canPerformAction } = useData();
  const { isSimplified } = useViewMode();
  const [searchTerm, setSearchTerm] = useState('');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [timeframeFilter, setTimeframeFilter] = useState('All Time');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [equipmentFilter, setEquipmentFilter] = useState('All');

  const canCreate = canPerformAction('createEditLoads');
  const canViewRates = canPerformAction('viewRates');
  const canExport = canPerformAction('exportData');

  const handleExportLoads = () => {
    const headers = ['Load Number', 'Customer', 'Origin', 'Destination', 'Status', 'Driver', 'Pickup Date', 'Delivery Date', 'Rate', 'Miles', 'Equipment'];
    const rows = filteredLoads.map(l => [
      l.loadNumber,
      `"${getCustomerName(l.customerId)}"`,
      `"${getLocationName(l.originId)}"`,
      `"${getLocationName(l.destinationId)}"`,
      l.status,
      `"${getDriverName(l.driverId)}"`,
      l.pickupDate,
      l.deliveryDate,
      canViewRates ? l.rate : 'Restricted',
      l.miles,
      `"${l.equipmentType || 'Standard'}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `gridtms_loads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  React.useEffect(() => {
    if (navigationIntent?.view === 'loads' && navigationIntent.action === 'resume_wizard') {
      setIsWizardOpen(true);
    }
  }, [navigationIntent]);

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown';
  const getLocationName = (id: string) => locations.find(l => l.id === id)?.name || 'Unknown';
  const getDriverName = (id?: string) => {
    if (!id) return 'Unassigned';
    return drivers.find(d => d.id === id)?.name || 'Unknown Driver';
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'In Transit': return 'bg-blue-100 text-blue-700';
      case 'Delivered': return 'bg-teal-100 text-teal-700';
      case 'Invoiced': return 'bg-purple-100 text-purple-700';
      case 'At Pickup': return 'bg-orange/20 text-orange';
      case 'Paid': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const filteredLoads = loads.filter(l => {
    const matchesSearch = l.loadNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getCustomerName(l.customerId).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All Status' || l.status === statusFilter;
    
    let matchesTimeframe = true;
    if (timeframeFilter !== 'All Time') {
      const loadDate = new Date(l.pickupDate);
      const now = new Date();
      if (timeframeFilter === 'Today') {
        matchesTimeframe = loadDate.toDateString() === now.toDateString();
      } else if (timeframeFilter === 'This Week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        matchesTimeframe = loadDate >= weekAgo && loadDate <= now;
      } else if (timeframeFilter === 'This Month') {
        matchesTimeframe = loadDate.getMonth() === now.getMonth() && loadDate.getFullYear() === now.getFullYear();
      }
    }

    const matchesEquipment = equipmentFilter === 'All' || l.equipmentType === equipmentFilter;
    return matchesSearch && matchesStatus && matchesTimeframe && matchesEquipment;
  });

  const handleAssignDriver = (id: string) => {
    // Navigate straight to dispatch view
    navigate('dispatch', id);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-head font-extrabold text-navy-dark">Loads Master Grid</h2>
          <p className="text-sm text-slate-500">Manage freight movements across the network.</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => setIsWizardOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg shadow-sm font-bold transition-all text-sm bg-orange hover:bg-orange/90 text-white transform active:scale-95"
          >
            <Plus size={18} />
            Create New Load
          </button>
        )}
      </header>

      <div className="tms-card p-4 flex flex-wrap items-center gap-3 bg-slate-50/50">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search load #, customer..." 
            className="w-full bg-white border border-slate-200 rounded-md pl-10 pr-4 py-2 text-xs focus:ring-2 focus:ring-orange/20 focus:border-orange outline-none transition-all shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="bg-white border border-slate-200 rounded-md px-3 py-2 text-xs font-semibold text-slate-600 outline-none"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option>All Status</option>
          <option>Created</option>
          <option>Dispatched</option>
          <option>In Transit</option>
          <option>Delivered</option>
          <option>Invoiced</option>
        </select>
        {!isSimplified && (
          <>
            <select 
              className="bg-white border border-slate-200 rounded-md px-3 py-2 text-xs font-semibold text-slate-600 outline-none"
              value={timeframeFilter}
              onChange={(e) => setTimeframeFilter(e.target.value)}
            >
              <option value="All Time">Timeframe: All Time</option>
              <option value="Today">Today</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
            </select>
            <button 
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-2 border rounded-md transition-all ${
                showAdvancedFilters || equipmentFilter !== 'All'
                  ? 'bg-navy text-white border-navy' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Toggle Advanced Filters"
              aria-label="Toggle Advanced Filters"
            >
              <Filter size={16} />
            </button>
            {canExport && (
              <>
                <div className="h-8 w-px bg-slate-200 mx-2" />
                <button 
                  type="button"
                  onClick={handleExportLoads}
                  className="inline-flex items-center gap-2 px-3 py-2 border rounded-md text-xs font-bold transition-all shadow-sm bg-white border-slate-200 text-navy hover:bg-slate-50 cursor-pointer active:scale-95"
                >
                  <Download size={14} />
                  Export
                </button>
              </>
            )}
          </>
        )}
      </div>

      {showAdvancedFilters && !isSimplified && (
        <div className="p-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Equipment Filter:</span>
          <select
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value)}
            className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none"
          >
            <option value="All">All Equipment Types</option>
            <option value="Dry Van">Dry Van</option>
            <option value="Reefer">Reefer</option>
            <option value="Flatbed">Flatbed</option>
            <option value="Step Deck">Step Deck</option>
          </select>
          {equipmentFilter !== 'All' && (
            <button
              type="button"
              onClick={() => setEquipmentFilter('All')}
              className="text-[11px] text-orange hover:underline font-bold"
            >
              Reset Filter
            </button>
          )}
          <span className="ml-auto text-[11px] text-slate-400">
            Showing {filteredLoads.length} of {loads.length} loads
          </span>
        </div>
      )}

      {isSimplified ? (
        /* Mobile-First Decluttered Cards (Simplified Mode) */
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredLoads.map((load) => (
              <div
                key={load.id}
                onClick={() => onSelectLoad(load.id)}
                className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1C1C1E] hover:border-slate-400 dark:hover:border-white/30 transition-all cursor-pointer shadow-xs space-y-2.5 active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {load.loadNumber}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${getStatusStyle(load.status)}`}>
                    {load.status}
                  </span>
                </div>

                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {getCustomerName(load.customerId)}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{getLocationName(load.originId).split('-')[0]}</span>
                  <span className="text-slate-400">→</span>
                  <span className="truncate">{getLocationName(load.destinationId).split('-')[0]}</span>
                </div>

                <div className="pt-2.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Driver: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{getDriverName(load.driverId)}</strong>
                  </span>
                  {canViewRates && (
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      ${load.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-between text-xs text-slate-500">
            <span>Showing {filteredLoads.length} active loads in Simplified View.</span>
            <span className="text-[11px] font-medium text-slate-400">Tap any load for details</span>
          </div>
        </div>
      ) : (
        /* Full Desktop Table (Detailed Mode) */
        <div className="tms-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="w-10 px-4 py-2"><input type="checkbox" className="rounded border-slate-300 text-orange focus:ring-orange" /></th>
                  <th className="tms-table-header">Load Number</th>
                  <th className="tms-table-header">Status</th>
                  <th className="tms-table-header">Customer</th>
                  <th className="tms-table-header">Route (Origin → Dest)</th>
                  <th className="tms-table-header">Pickup</th>
                  <th className="tms-table-header">Driver</th>
                  {canViewRates && <th className="tms-table-header text-right">Revenue</th>}
                </tr>
              </thead>
              <tbody>
                {filteredLoads.map((load) => (
                  <tr 
                    key={load.id} 
                    onClick={() => onSelectLoad(load.id)}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer border-b border-slate-100"
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" className="rounded border-slate-300 text-orange focus:ring-orange" /></td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-navy group-hover:text-orange transition-colors">
                        {load.loadNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${getStatusStyle(load.status)}`}>
                        <div className="w-1 h-1 rounded-full bg-current" />
                        {load.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                      {getCustomerName(load.customerId)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-medium">
                          <MapPin size={10} className="text-slate-400" />
                          <span>{getLocationName(load.originId).split('-')[0]}</span>
                          <span className="text-slate-300">→</span>
                          <span>{getLocationName(load.destinationId).split('-')[0]}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono pl-4">
                          {load.miles} miles · {load.equipmentType}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{load.pickupDate}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">08:00 AM</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {load.driverId ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-navy-light text-white text-[8px] flex items-center justify-center font-bold">
                            {(getDriverName(load.driverId) || '??').split(' ').map(n=>n[0]).join('')}
                          </div>
                          <span className="text-xs text-slate-600 font-medium">{getDriverName(load.driverId)}</span>
                        </div>
                      ) : canCreate ? (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleAssignDriver(load.id); }}
                          className="text-[10px] font-bold text-orange flex items-center gap-1 px-2 py-1 border border-orange/20 rounded hover:bg-orange/5"
                        >
                          <UserPlus size={12} /> Assign
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Unassigned</span>
                      )}
                    </td>
                    {canViewRates && (
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono font-bold text-navy">
                          ${load.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>Showing 1 - {filteredLoads.length} of {filteredLoads.length} loads</div>
          </div>
        </div>
      )}

      <LoadWizard 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)} 
        navigate={navigate}
      />
    </div>
  );
}
