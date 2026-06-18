import React, { useState } from 'react';
import {
  Archive,
  RotateCcw,
  Truck,
  Users,
  FileText,
  Package,
  Search,
  AlertTriangle,
  CheckCircle2,
  X,
  StickyNote
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { motion, AnimatePresence } from 'motion/react';

interface ArchiveViewProps {
  navigate: (view: string, loadId: string | null) => void;
}

type ArchiveTab = 'loads' | 'drivers' | 'trucks' | 'invoices';

interface RestoreModalState {
  type: ArchiveTab;
  id: string;
  name: string;
}

export default function ArchiveView({ navigate }: ArchiveViewProps) {
  const { loads, drivers, trucks, invoices, customers, locations, updateLoad, updateDriver, updateTruck, updateInvoice } = useData();
  const [activeTab, setActiveTab] = useState<ArchiveTab>('loads');
  const [search, setSearch] = useState('');
  const [restoreModal, setRestoreModal] = useState<RestoreModalState | null>(null);
  const [restoreNote, setRestoreNote] = useState('');

  const archivedLoads = loads.filter(l => l.status === 'Archived');
  const archivedDrivers = drivers.filter(d => d.archived);
  const archivedTrucks = trucks.filter(t => t.archived);
  const archivedInvoices = invoices.filter(i => i.status === 'Void');

  const totalArchived = archivedLoads.length + archivedDrivers.length + archivedTrucks.length + archivedInvoices.length;

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown';
  const getLocationName = (id: string) => locations.find(l => l.id === id)?.name || 'Unknown';
  const getDriverName = (id?: string) => id ? (drivers.find(d => d.id === id)?.name || 'Unknown') : 'Unassigned';

  const tabs: { id: ArchiveTab; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'loads', label: 'Loads', icon: Package, count: archivedLoads.length },
    { id: 'drivers', label: 'Drivers', icon: Users, count: archivedDrivers.length },
    { id: 'trucks', label: 'Units', icon: Truck, count: archivedTrucks.length },
    { id: 'invoices', label: 'Invoices', icon: FileText, count: archivedInvoices.length },
  ];

  const handleRestore = () => {
    if (!restoreModal) return;
    const note = restoreNote.trim() || 'Restored from archive.';
    switch (restoreModal.type) {
      case 'loads':
        updateLoad(restoreModal.id, { status: 'Created' as any });
        break;
      case 'drivers':
        updateDriver(restoreModal.id, { archived: false, archiveNote: note });
        break;
      case 'trucks':
        updateTruck(restoreModal.id, { archived: false, archiveNote: note });
        break;
      case 'invoices':
        updateInvoice(restoreModal.id, { status: 'Draft' });
        break;
    }
    setRestoreModal(null);
    setRestoreNote('');
  };

  const filterStr = search.toLowerCase();

  const filteredLoads = archivedLoads.filter(l =>
    l.loadNumber.toLowerCase().includes(filterStr) || getCustomerName(l.customerId).toLowerCase().includes(filterStr)
  );
  const filteredDrivers = archivedDrivers.filter(d => d.name.toLowerCase().includes(filterStr));
  const filteredTrucks = archivedTrucks.filter(t => t.unitNumber.toLowerCase().includes(filterStr) || t.makeModel.toLowerCase().includes(filterStr));
  const filteredInvoices = archivedInvoices.filter(i => i.invoiceNumber.toLowerCase().includes(filterStr) || getCustomerName(i.customerId).toLowerCase().includes(filterStr));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-head font-extrabold text-navy-dark flex items-center gap-3">
            <Archive size={22} className="text-amber-500" /> Archive
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {totalArchived} archived item{totalArchived !== 1 ? 's' : ''}. Archived records are excluded from reports, settlements, and invoicing. You can restore them at any time.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearch(''); }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
        <input
          type="text"
          placeholder="Search archived records..."
          className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none transition-all"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Content */}
      <div className="tms-card overflow-hidden">
        {activeTab === 'loads' && (
          <>
            {filteredLoads.length === 0 ? (
              <EmptyState label="No archived loads" />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="tms-table-header">Load #</th>
                    <th className="tms-table-header">Customer</th>
                    <th className="tms-table-header">Route</th>
                    <th className="tms-table-header">Driver</th>
                    <th className="tms-table-header text-right">Revenue</th>
                    <th className="tms-table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLoads.map(load => (
                    <tr key={load.id} className="border-b border-slate-100 hover:bg-amber-50/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-sm text-slate-500">{load.loadNumber}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-600">{getCustomerName(load.customerId)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {getLocationName(load.originId).split(' ')[0]} → {getLocationName(load.destinationId).split(' ')[0]}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{getDriverName(load.driverId)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-xs text-slate-600">${load.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setRestoreModal({ type: 'loads', id: load.id, name: load.loadNumber })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold rounded-lg hover:bg-amber-100 transition-all"
                        >
                          <RotateCcw size={11} /> Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {activeTab === 'drivers' && (
          <>
            {filteredDrivers.length === 0 ? (
              <EmptyState label="No archived drivers" />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="tms-table-header">Driver</th>
                    <th className="tms-table-header">CDL Class</th>
                    <th className="tms-table-header">Type</th>
                    <th className="tms-table-header">Archive Note</th>
                    <th className="tms-table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDrivers.map(driver => (
                    <tr key={driver.id} className="border-b border-slate-100 hover:bg-amber-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 text-[9px] flex items-center justify-center font-bold">
                            {driver.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-xs font-bold text-slate-600">{driver.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{driver.cdlClass}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{driver.type || 'Company Driver'}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 italic max-w-[200px] truncate">{driver.archiveNote || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setRestoreModal({ type: 'drivers', id: driver.id, name: driver.name })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold rounded-lg hover:bg-amber-100 transition-all"
                        >
                          <RotateCcw size={11} /> Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {activeTab === 'trucks' && (
          <>
            {filteredTrucks.length === 0 ? (
              <EmptyState label="No archived units" />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="tms-table-header">Unit #</th>
                    <th className="tms-table-header">Make / Model</th>
                    <th className="tms-table-header">Type</th>
                    <th className="tms-table-header">Archive Note</th>
                    <th className="tms-table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrucks.map(truck => (
                    <tr key={truck.id} className="border-b border-slate-100 hover:bg-amber-50/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-sm text-slate-600">{truck.unitNumber}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{truck.makeModel}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{truck.type}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 italic max-w-[200px] truncate">{truck.archiveNote || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setRestoreModal({ type: 'trucks', id: truck.id, name: `Unit ${truck.unitNumber}` })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold rounded-lg hover:bg-amber-100 transition-all"
                        >
                          <RotateCcw size={11} /> Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {activeTab === 'invoices' && (
          <>
            {filteredInvoices.length === 0 ? (
              <EmptyState label="No voided invoices" />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="tms-table-header">Invoice #</th>
                    <th className="tms-table-header">Customer</th>
                    <th className="tms-table-header">Date</th>
                    <th className="tms-table-header">Notes</th>
                    <th className="tms-table-header text-right">Amount</th>
                    <th className="tms-table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(inv => (
                    <tr key={inv.id} className="border-b border-slate-100 hover:bg-amber-50/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-sm text-slate-500">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-600">{getCustomerName(inv.customerId)}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{new Date(inv.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 italic max-w-[180px] truncate">{inv.notes || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-xs text-slate-600">${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setRestoreModal({ type: 'invoices', id: inv.id, name: inv.invoiceNumber })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold rounded-lg hover:bg-amber-100 transition-all"
                        >
                          <RotateCcw size={11} /> Restore to Draft
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      <AnimatePresence>
        {restoreModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-dark/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <RotateCcw size={18} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="text-base font-black text-navy">Restore "{restoreModal.name}"?</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    This will move the record back to the live system. You can add an optional note explaining the restoration.
                  </p>
                </div>
              </div>
              <div className="px-6 py-4">
                <label className="block">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <StickyNote size={11} /> Restoration Note (optional)
                  </span>
                  <textarea
                    rows={3}
                    placeholder="e.g. Driver rehired, reinstating record..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 outline-none resize-none"
                    value={restoreNote}
                    onChange={e => setRestoreNote(e.target.value)}
                  />
                </label>
              </div>
              <div className="px-6 pb-5 flex justify-end gap-3">
                <button
                  onClick={() => { setRestoreModal(null); setRestoreNote(''); }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestore}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-all shadow-sm"
                >
                  <CheckCircle2 size={13} className="inline mr-1.5" />Restore Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="p-16 text-center">
      <Archive size={36} className="text-slate-200 mx-auto mb-3" />
      <p className="text-sm font-bold text-slate-400">{label}</p>
      <p className="text-xs text-slate-300 mt-1">Items you cancel or archive will appear here.</p>
    </div>
  );
}
