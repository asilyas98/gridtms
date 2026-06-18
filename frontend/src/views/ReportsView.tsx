import React, { useState } from 'react';
import {
  LineChart,
  Download,
  Filter,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  FileText,
  Printer,
  TrendingUp,
  DollarSign,
  Truck,
  Users,
  Package,
  Calendar
} from 'lucide-react';
import { useData } from '../context/DataContext';

interface ReportsViewProps {
  navigate: (view: string, loadId: string | null) => void;
}

type ReportTab = 'loads' | 'revenue' | 'drivers' | 'aging';
type SortDir = 'asc' | 'desc';

export default function ReportsView({ navigate }: ReportsViewProps) {
  const { loads, drivers, trucks, customers, locations, invoices } = useData();
  const [activeTab, setActiveTab] = useState<ReportTab>('loads');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortCol, setSortCol] = useState('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown';
  const getLocationName = (id: string) => locations.find(l => l.id === id)?.name || 'Unknown';
  const getDriverName = (id?: string) => id ? (drivers.find(d => d.id === id)?.name || 'Unassigned') : 'Unassigned';

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <ChevronsUpDown size={11} className="text-slate-300 ml-1 inline" />;
    return sortDir === 'asc'
      ? <ChevronUp size={11} className="text-navy ml-1 inline" />
      : <ChevronDown size={11} className="text-navy ml-1 inline" />;
  };

  const filterStr = search.toLowerCase();
  const activeLoads = loads.filter(l => l.status !== 'Archived');

  const filteredLoads = activeLoads.filter(l => {
    const matchSearch = l.loadNumber.toLowerCase().includes(filterStr) || getCustomerName(l.customerId).toLowerCase().includes(filterStr);
    let matchDate = true;
    if (dateFrom) matchDate = matchDate && new Date(l.pickupDate) >= new Date(dateFrom);
    if (dateTo) matchDate = matchDate && new Date(l.pickupDate) <= new Date(dateTo);
    return matchSearch && matchDate;
  });

  const sortedLoads = [...filteredLoads].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortCol) {
      case 'load': return dir * a.loadNumber.localeCompare(b.loadNumber);
      case 'customer': return dir * getCustomerName(a.customerId).localeCompare(getCustomerName(b.customerId));
      case 'status': return dir * a.status.localeCompare(b.status);
      case 'pickup': return dir * (new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime());
      case 'driver': return dir * getDriverName(a.driverId).localeCompare(getDriverName(b.driverId));
      case 'rate': return dir * (a.rate - b.rate);
      case 'miles': return dir * (a.miles - b.miles);
      default: return 0;
    }
  });

  // Revenue by customer
  const revenueByCustomer = customers.map(c => {
    const cLoads = activeLoads.filter(l => l.customerId === c.id && l.status !== 'Cancelled');
    const totalRev = cLoads.reduce((sum, l) => sum + l.rate, 0);
    const paid = cLoads.filter(l => l.status === 'Paid').reduce((sum, l) => sum + l.rate, 0);
    const outstanding = invoices.filter(i => i.customerId === c.id && i.status !== 'Paid').reduce((sum, i) => sum + i.amount, 0);
    return { name: c.name, id: c.id, loads: cLoads.length, totalRev, paid, outstanding };
  }).filter(r => r.loads > 0 || r.search).sort((a, b) => b.totalRev - a.totalRev);

  const filteredRevenue = revenueByCustomer.filter(r =>
    r.name.toLowerCase().includes(filterStr)
  );

  // Driver performance
  const driverPerf = drivers.filter(d => !d.archived).map(d => {
    const dLoads = activeLoads.filter(l => l.driverId === d.id);
    const totalMiles = dLoads.reduce((sum, l) => sum + l.miles, 0);
    const totalRev = dLoads.reduce((sum, l) => sum + l.rate, 0);
    const completed = dLoads.filter(l => ['Delivered', 'Invoiced', 'Paid'].includes(l.status)).length;
    return { id: d.id, name: d.name, type: d.type || 'Company Driver', loads: dLoads.length, completed, totalMiles, totalRev, score: d.score };
  }).filter(d => d.loads > 0 || filterStr.length === 0 || d.name.toLowerCase().includes(filterStr));

  const filteredDriverPerf = driverPerf.filter(d => d.name.toLowerCase().includes(filterStr));

  // Aging report
  const agingData = invoices.filter(i => i.status !== 'Paid' && i.status !== 'Void').map(inv => {
    const age = Math.ceil((new Date().getTime() - new Date(inv.dueDate).getTime()) / 86400000);
    const isPastDue = new Date(inv.dueDate) < new Date();
    return {
      ...inv,
      customer: getCustomerName(inv.customerId),
      age: isPastDue ? age : 0,
      bucket: !isPastDue ? 'Current' : age <= 30 ? '1-30 Days' : age <= 60 ? '31-60 Days' : '60+ Days'
    };
  });

  const filteredAging = agingData.filter(a => a.customer.toLowerCase().includes(filterStr));

  // Totals for summary stats
  const totalRevenue = activeLoads.reduce((sum, l) => sum + l.rate, 0);
  const totalMiles = activeLoads.reduce((sum, l) => sum + l.miles, 0);
  const avgRPM = totalMiles > 0 ? totalRevenue / totalMiles : 0;
  const paidLoads = activeLoads.filter(l => l.status === 'Paid').length;

  const exportCSV = (rows: any[][], filename: string) => {
    const csv = rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCurrent = () => {
    if (activeTab === 'loads') {
      const headers = ['Load #', 'Status', 'Customer', 'Origin', 'Destination', 'Pickup', 'Driver', 'Miles', 'Revenue'];
      const rows = sortedLoads.map(l => [l.loadNumber, l.status, getCustomerName(l.customerId), getLocationName(l.originId), getLocationName(l.destinationId), new Date(l.pickupDate).toLocaleDateString(), getDriverName(l.driverId), l.miles, l.rate.toFixed(2)]);
      exportCSV([headers, ...rows], 'load_activity_report');
    } else if (activeTab === 'revenue') {
      const headers = ['Customer', 'Total Loads', 'Total Revenue', 'Collected', 'Outstanding'];
      const rows = filteredRevenue.map(r => [r.name, r.loads, r.totalRev.toFixed(2), r.paid.toFixed(2), r.outstanding.toFixed(2)]);
      exportCSV([headers, ...rows], 'revenue_by_customer_report');
    } else if (activeTab === 'drivers') {
      const headers = ['Driver', 'Type', 'Total Loads', 'Completed', 'Total Miles', 'Total Revenue', 'Safety Score'];
      const rows = filteredDriverPerf.map(d => [d.name, d.type, d.loads, d.completed, d.totalMiles, d.totalRev.toFixed(2), d.score]);
      exportCSV([headers, ...rows], 'driver_performance_report');
    } else {
      const headers = ['Invoice #', 'Customer', 'Status', 'Due Date', 'Age (days)', 'Bucket', 'Amount'];
      const rows = filteredAging.map(a => [a.invoiceNumber, a.customer, a.status, new Date(a.dueDate).toLocaleDateString(), a.age, a.bucket, a.amount.toFixed(2)]);
      exportCSV([headers, ...rows], 'invoice_aging_report');
    }
  };

  const tabs: { id: ReportTab; label: string; icon: React.ElementType }[] = [
    { id: 'loads', label: 'Load Activity', icon: Package },
    { id: 'revenue', label: 'Revenue by Customer', icon: DollarSign },
    { id: 'drivers', label: 'Driver Performance', icon: Users },
    { id: 'aging', label: 'Invoice Aging', icon: FileText },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-head font-extrabold text-navy-dark flex items-center gap-3">
            <LineChart size={22} className="text-navy" /> Reports
          </h2>
          <p className="text-sm text-slate-500 mt-1">Standard trucking industry reports. Filter, sort, and export.</p>
        </div>
      </header>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, sub: 'All active loads', icon: DollarSign, color: 'text-teal' },
          { label: 'Total Loads', value: activeLoads.length, sub: `${paidLoads} fully paid`, icon: Package, color: 'text-navy' },
          { label: 'Total Miles', value: totalMiles.toLocaleString(), sub: 'Combined dispatched', icon: Truck, color: 'text-blue-500' },
          { label: 'Avg RPM', value: `$${avgRPM.toFixed(2)}`, sub: 'Revenue per mile', icon: TrendingUp, color: 'text-orange' },
        ].map(kpi => (
          <div key={kpi.label} className="tms-card p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-xl bg-slate-50 ${kpi.color}`}>
              <kpi.icon size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</p>
              <p className="text-xl font-head font-extrabold text-navy-dark">{kpi.value}</p>
              <p className="text-[10px] text-slate-400">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearch(''); setSortCol(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px ${
              activeTab === tab.id ? 'border-navy text-navy' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-navy/10 focus:border-navy outline-none transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {(activeTab === 'loads') && (
          <>
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-slate-400" />
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none bg-white" />
              <span className="text-slate-300 text-xs">to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none bg-white" />
            </div>
          </>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleExportCurrent}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-navy hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download size={13} /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-navy hover:bg-slate-50 transition-all shadow-sm"
          >
            <Printer size={13} /> Print
          </button>
        </div>
      </div>

      {/* Report Table */}
      <div className="tms-card overflow-x-auto">
        {activeTab === 'loads' && (
          <>
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Load Activity Report — {sortedLoads.length} records</span>
              <span className="text-[10px] font-bold text-navy">${sortedLoads.reduce((s, l) => s + l.rate, 0).toLocaleString(undefined, { minimumFractionDigits: 0 })} total revenue</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  {[['load','Load #'],['status','Status'],['customer','Customer'],['pickup','Pickup Date'],['driver','Driver'],['miles','Miles'],['rate','Revenue']].map(([col, label]) => (
                    <th key={col} className="tms-table-header cursor-pointer select-none hover:bg-slate-50" onClick={() => handleSort(col)}>
                      <span className="flex items-center">{label}<SortIcon col={col} /></span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedLoads.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">No records match the current filters.</td></tr>
                ) : sortedLoads.map(load => (
                  <tr key={load.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors cursor-pointer" onClick={() => navigate('loads', load.id)}>
                    <td className="px-4 py-2.5 font-mono font-bold text-xs text-navy">{load.loadNumber}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${getStatusBg(load.status)}`}>{load.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{getCustomerName(load.customerId)}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{new Date(load.pickupDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{getDriverName(load.driverId)}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-slate-600">{load.miles.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-xs text-navy">${load.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              {sortedLoads.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={5} className="px-4 py-2.5 text-xs font-black text-slate-500 uppercase tracking-widest">Totals</td>
                    <td className="px-4 py-2.5 font-mono font-bold text-xs text-navy">{sortedLoads.reduce((s, l) => s + l.miles, 0).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-black text-sm text-navy">${sortedLoads.reduce((s, l) => s + l.rate, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </>
        )}

        {activeTab === 'revenue' && (
          <>
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Revenue by Customer — {filteredRevenue.length} customers</span>
              <span className="text-[10px] font-bold text-navy">${filteredRevenue.reduce((s, r) => s + r.totalRev, 0).toLocaleString(undefined, { minimumFractionDigits: 0 })} total</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  <th className="tms-table-header">Customer</th>
                  <th className="tms-table-header text-right">Total Loads</th>
                  <th className="tms-table-header text-right">Total Revenue</th>
                  <th className="tms-table-header text-right">Collected</th>
                  <th className="tms-table-header text-right">Outstanding</th>
                  <th className="tms-table-header">Share</th>
                </tr>
              </thead>
              <tbody>
                {filteredRevenue.map(r => {
                  const share = totalRevenue > 0 ? (r.totalRev / totalRevenue) * 100 : 0;
                  return (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-2.5 text-xs font-bold text-slate-700">{r.name}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-mono text-slate-600">{r.loads}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-xs text-navy">${r.totalRev.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-teal">${r.paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-orange">${r.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[80px]">
                            <div className="h-full bg-navy rounded-full" style={{ width: `${share}%` }} />
                          </div>
                          <span className="text-[9px] font-mono text-slate-500">{share.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {activeTab === 'drivers' && (
          <>
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Driver Performance — {filteredDriverPerf.length} drivers</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  <th className="tms-table-header">Driver</th>
                  <th className="tms-table-header">Type</th>
                  <th className="tms-table-header text-right">Total Loads</th>
                  <th className="tms-table-header text-right">Completed</th>
                  <th className="tms-table-header text-right">Total Miles</th>
                  <th className="tms-table-header text-right">Revenue Generated</th>
                  <th className="tms-table-header text-right">Safety Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredDriverPerf.map(d => (
                  <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-2.5 text-xs font-bold text-slate-700">{d.name}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{d.type}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-600">{d.loads}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-teal">{d.completed}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-600">{d.totalMiles.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-xs text-navy">${d.totalRev.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`text-xs font-black ${d.score >= 90 ? 'text-teal' : d.score >= 70 ? 'text-orange' : 'text-red-500'}`}>{d.score}/100</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {activeTab === 'aging' && (
          <>
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Invoice Aging Report — {filteredAging.length} open invoices</span>
              <span className="text-[10px] font-bold text-orange">${filteredAging.reduce((s, a) => s + a.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 0 })} outstanding</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  <th className="tms-table-header">Invoice #</th>
                  <th className="tms-table-header">Customer</th>
                  <th className="tms-table-header">Status</th>
                  <th className="tms-table-header">Due Date</th>
                  <th className="tms-table-header">Bucket</th>
                  <th className="tms-table-header text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredAging.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-teal font-bold">All invoices collected.</td></tr>
                ) : filteredAging.map(a => (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-bold text-xs text-navy">{a.invoiceNumber}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{a.customer}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${a.status === 'Overdue' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{a.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{new Date(a.dueDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.bucket === '60+ Days' ? 'bg-red-100 text-red-600' : a.bucket === '31-60 Days' ? 'bg-orange/20 text-orange' : a.bucket === '1-30 Days' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-700'}`}>
                        {a.bucket}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-xs text-navy">${a.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

function getStatusBg(status: string) {
  switch (status) {
    case 'In Transit': return 'bg-blue-100 text-blue-700';
    case 'Delivered': return 'bg-teal/10 text-teal';
    case 'Invoiced': return 'bg-purple-100 text-purple-700';
    case 'Paid': return 'bg-green-100 text-green-700';
    case 'Dispatched': return 'bg-indigo-100 text-indigo-700';
    case 'At Pickup': return 'bg-orange/10 text-orange';
    default: return 'bg-slate-100 text-slate-500';
  }
}
