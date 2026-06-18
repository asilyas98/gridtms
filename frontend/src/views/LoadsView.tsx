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
  UserPlus,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  FileText,
  Printer,
  X
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Load } from '../types';
import LoadWizard from '../components/loads/LoadWizard';

interface LoadsViewProps {
  onSelectLoad: (id: string) => void;
  navigate: (view: string, loadId: string | null) => void;
}

type SortDir = 'asc' | 'desc';

export default function LoadsView({ onSelectLoad, navigate }: LoadsViewProps) {
  const { loads, customers, locations, drivers, updateLoad, navigationIntent, setNavigationIntent } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [timeframeFilter, setTimeframeFilter] = useState('All Time');
  const [loadsTab, setLoadsTab] = useState<'active' | 'archived'>('active');
  const [sortColumn, setSortColumn] = useState('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showExportModal, setShowExportModal] = useState(false);

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
      case 'Archived': return 'bg-amber-100 text-amber-700';
      case 'Cancelled': return 'bg-red-100 text-red-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDir('asc');
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

    return matchesSearch && matchesStatus && matchesTimeframe;
  });

  const displayedLoads = filteredLoads.filter(l =>
    loadsTab === 'archived' ? l.status === 'Archived' : l.status !== 'Archived'
  );

  const sortedLoads = [...displayedLoads].sort((a, b) => {
    if (!sortColumn) return 0;
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortColumn) {
      case 'loadNumber': return dir * a.loadNumber.localeCompare(b.loadNumber);
      case 'status': return dir * a.status.localeCompare(b.status);
      case 'customer': return dir * getCustomerName(a.customerId).localeCompare(getCustomerName(b.customerId));
      case 'route': return dir * getLocationName(a.originId).localeCompare(getLocationName(b.originId));
      case 'pickup': return dir * new Date(a.pickupDate).getTime() - dir * new Date(b.pickupDate).getTime();
      case 'driver': return dir * getDriverName(a.driverId).localeCompare(getDriverName(b.driverId));
      case 'revenue': return dir * (a.rate - b.rate);
      default: return 0;
    }
  });

  const SortIcon = ({ col }: { col: string }) => {
    if (sortColumn !== col) return <ChevronsUpDown size={11} className="text-slate-300 ml-1" />;
    return sortDir === 'asc'
      ? <ChevronUp size={11} className="text-navy ml-1" />
      : <ChevronDown size={11} className="text-navy ml-1" />;
  };

  const handleExport = (format: 'csv' | 'print') => {
    if (format === 'csv') {
      const headers = ['Load #', 'Status', 'Customer', 'Origin', 'Destination', 'Pickup Date', 'Driver', 'Revenue'];
      const rows = sortedLoads.map(l => [
        l.loadNumber,
        l.status,
        getCustomerName(l.customerId),
        getLocationName(l.originId),
        getLocationName(l.destinationId),
        new Date(l.pickupDate).toLocaleDateString(),
        getDriverName(l.driverId),
        l.rate.toFixed(2)
      ]);
      const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loads_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      window.print();
    }
    setShowExportModal(false);
  };

  const handleAssignDriver = (id: string) => {
    navigate('dispatch', id);
  };

  const archivedCount = loads.filter(l => l.status === 'Archived').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-head font-extrabold text-navy-dark">Loads Master Grid</h2>
          <p className="text-sm text-slate-500">Manage freight movements across the network.</p>
        </div>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="inline-flex items-center gap-2 bg-orange hover:bg-orange/90 text-white px-6 py-2.5 rounded-lg shadow-sm font-bold transition-all transform active:scale-95 text-sm"
        >
          <Plus size={18} />
          Create New Load
        </button>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        <button
          onClick={() => setLoadsTab('active')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 -mb-px ${loadsTab === 'active' ? 'border-orange text-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Active Loads
        </button>
        <button
          onClick={() => setLoadsTab('archived')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 -mb-px flex items-center gap-2 ${loadsTab === 'archived' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Archive
          {archivedCount > 0 && (
            <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-1.5 py-0.5 rounded-full">{archivedCount}</span>
          )}
        </button>
      </div>

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
        {loadsTab === 'active' && (
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
        )}
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
        <button className="p-2 border border-slate-200 rounded-md hover:bg-white transition-all text-slate-600">
          <Filter size={16} />
        </button>
        <div className="h-8 w-px bg-slate-200 mx-2" />
        <button
          onClick={() => setShowExportModal(true)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-md text-xs font-bold text-navy hover:bg-slate-50 transition-all shadow-sm"
        >
          <Download size={14} />
          Export
        </button>
      </div>

      <div className="tms-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="w-10 px-4 py-2"><input type="checkbox" className="rounded border-slate-300 text-orange focus:ring-orange" /></th>
                <th className="tms-table-header cursor-pointer select-none hover:bg-slate-100 transition-colors" onClick={() => handleSort('loadNumber')}>
                  <span className="flex items-center">Load Number <SortIcon col="loadNumber" /></span>
                </th>
                <th className="tms-table-header cursor-pointer select-none hover:bg-slate-100 transition-colors" onClick={() => handleSort('status')}>
                  <span className="flex items-center">Status <SortIcon col="status" /></span>
                </th>
                <th className="tms-table-header cursor-pointer select-none hover:bg-slate-100 transition-colors" onClick={() => handleSort('customer')}>
                  <span className="flex items-center">Customer <SortIcon col="customer" /></span>
                </th>
                <th className="tms-table-header cursor-pointer select-none hover:bg-slate-100 transition-colors" onClick={() => handleSort('route')}>
                  <span className="flex items-center">Route (Origin → Dest) <SortIcon col="route" /></span>
                </th>
                <th className="tms-table-header cursor-pointer select-none hover:bg-slate-100 transition-colors" onClick={() => handleSort('pickup')}>
                  <span className="flex items-center">Pickup <SortIcon col="pickup" /></span>
                </th>
                <th className="tms-table-header cursor-pointer select-none hover:bg-slate-100 transition-colors" onClick={() => handleSort('driver')}>
                  <span className="flex items-center">Driver <SortIcon col="driver" /></span>
                </th>
                <th className="tms-table-header text-right cursor-pointer select-none hover:bg-slate-100 transition-colors" onClick={() => handleSort('revenue')}>
                  <span className="flex items-center justify-end">Revenue <SortIcon col="revenue" /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedLoads.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400 font-medium">
                    {loadsTab === 'archived' ? 'No archived loads found.' : 'No loads match the current filters.'}
                  </td>
                </tr>
              )}
              {sortedLoads.map((load) => (
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
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleAssignDriver(load.id); }}
                        className="text-[10px] font-bold text-orange flex items-center gap-1 px-2 py-1 border border-orange/20 rounded hover:bg-orange/5"
                      >
                        <UserPlus size={12} /> Assign
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono font-bold text-navy">
                      ${load.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>Showing 1 - {sortedLoads.length} of {sortedLoads.length} loads</div>
        </div>
      </div>

      <LoadWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        navigate={navigate}
      />

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-black text-navy">Export Loads</h2>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-500 font-medium">
                Export {sortedLoads.length} load{sortedLoads.length !== 1 ? 's' : ''} from the current view.
              </p>
              <button
                onClick={() => handleExport('csv')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm font-bold text-green-700 hover:bg-green-100 transition-all"
              >
                <FileText size={18} />
                <div className="text-left">
                  <div>Export as CSV (Excel)</div>
                  <div className="text-[10px] font-normal text-green-600">Downloads a .csv file — open in Excel or Google Sheets</div>
                </div>
              </button>
              <button
                onClick={() => handleExport('print')}
                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm font-bold text-blue-700 hover:bg-blue-100 transition-all"
              >
                <Printer size={18} />
                <div className="text-left">
                  <div>Print / Save as PDF</div>
                  <div className="text-[10px] font-normal text-blue-600">Opens the browser print dialog — save as PDF</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
