import React from 'react';
import { 
  Receipt, 
  CreditCard, 
  ChevronRight, 
  ArrowUpRight, 
  Clock,
  ExternalLink,
  Plus,
  Send,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  MapPin,
  Calendar,
  X,
  Navigation,
  DollarSign,
  Star,
  Upload,
  Scale,
  Eye,
  Paperclip,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../context/DataContext';
import { Invoice, LoadLineItem } from '../types';

import InvoiceBuilderModal from '../components/InvoiceBuilderModal';
import EmailComposerModal from '../components/EmailComposerModal';

interface InvoicesViewProps {
  navigate: (view: string, loadId: string | null) => void;
  selectedLoadId?: string | null;
}

export default function InvoicesView({ navigate, selectedLoadId }: InvoicesViewProps) {
  const { invoices, loads, customers, generateInvoice, updateInvoice, updateLoad, addDocument } = useData();
  const [activeTab, setActiveTab] = React.useState<'Open' | 'Paid' | 'Overdue' | 'Rejected' | 'Disputed'>('Open');
  const [lastResentId, setLastResentId] = React.useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<string | null>(null);
  const [paymentModalId, setPaymentModalId] = React.useState<string | null>(null);
  const [invoiceBuilderLoadId, setInvoiceBuilderLoadId] = React.useState<string | null>(null);
  const [emailComposerInvoiceId, setEmailComposerInvoiceId] = React.useState<string | null>(null);
  const [resolveDisputeId, setResolveDisputeId] = React.useState<string | null>(null);
  const [disputeForm, setDisputeForm] = React.useState({ action: 'Adjust', amount: 0, notes: '' });
  const [paymentForm, setPaymentForm] = React.useState({
    date: new Date().toISOString().split('T')[0],
    notes: '',
    rating: 5,
    attachment: null as File | null
  });
  const [toast, setToast] = React.useState<{message: string, type: 'success' | 'info'} | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [viewingDoc, setViewingDoc] = React.useState<any>(null);

  const selectedInvoice = invoices.find(i => i.id === selectedInvoiceId);
  const selectedLoad = selectedInvoice ? loads.find(l => l.id === selectedInvoice.loadId) : null;
  const selectedCustomer = selectedInvoice ? customers.find(c => c.id === selectedInvoice.customerId) : null;

  const calculateAge = (dateStr: string) => {
    const createdDate = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown';
  
  const pendingInvoicing = loads.filter(l => l.status === 'Delivered');
  const focusedLoad = selectedLoadId ? loads.find(l => l.id === selectedLoadId && l.status === 'Delivered') : null;
  const otherPending = pendingInvoicing.filter(l => l.id !== selectedLoadId);
  const [pendingExpanded, setPendingExpanded] = React.useState(false);

  React.useEffect(() => {
    if (focusedLoad && !invoiceBuilderLoadId) {
      setInvoiceBuilderLoadId(focusedLoad.id);
    }
  }, [focusedLoad]);

  const filteredInvoices = invoices.filter(inv => {
    if (activeTab === 'Open') return inv.status === 'Sent' || inv.status === 'Draft' || inv.status === 'Partially Paid';
    if (activeTab === 'Overdue') return inv.status === 'Overdue';
    if (activeTab === 'Rejected') return inv.status === 'Rejected';
    if (activeTab === 'Disputed') return inv.status === 'Disputed';
    return inv.status === 'Paid';
  });

  const handleOpenBuilder = (id: string) => {
    setInvoiceBuilderLoadId(id);
  };

  const handleGenerateInvoice = (overrides: Partial<Invoice>, lineItems?: LoadLineItem[]) => {
    if (!invoiceBuilderLoadId) return;
    
    if (lineItems) {
      updateLoad(invoiceBuilderLoadId, { lineItems });
    }
    
    const newInvoiceId = generateInvoice(invoiceBuilderLoadId, overrides);
    if (overrides.method === 'Email' && newInvoiceId) {
      setEmailComposerInvoiceId(newInvoiceId);
    } else {
      showToast('Invoice generated successfully!');
    }
    setInvoiceBuilderLoadId(null);
    if (selectedLoadId === invoiceBuilderLoadId) {
      setTimeout(() => navigate('invoices', null), 1000); // Clear focus after a second
    }
  };

  const handleResend = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLastResentId(id);
    const inv = invoices.find(i => i.id === id);
    if (inv?.method === 'Email' || !inv?.method) {
      setEmailComposerInvoiceId(id);
      setLastResentId(null);
    } else {
      showToast('Invoice resentment triggered...', 'info');
      setTimeout(() => {
        setLastResentId(null);
        showToast('Invoice resent to customer contact');
      }, 1500);
    }
  };

  const handleOpenPaymentModal = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPaymentModalId(id);
    setPaymentForm({
      date: new Date().toISOString().split('T')[0],
      notes: '',
      rating: 5,
      attachment: null
    });
  };

  const handleConfirmPayment = () => {
    if (!paymentModalId) return;
    
    updateInvoice(paymentModalId, { status: 'Paid' });
    const inv = invoices.find(i => i.id === paymentModalId);
    if (inv) {
      updateLoad(inv.loadId, { status: 'Paid' });
    }
    
    showToast(`Payment recorded for invoice ${inv?.invoiceNumber}`);
    setPaymentModalId(null);
  };

  const handleConfirmDisputeResolution = () => {
    if (!resolveDisputeId) return;
    const inv = invoices.find(i => i.id === resolveDisputeId);
    if (!inv) return;
    
    if (disputeForm.action === 'Adjust') {
      updateInvoice(resolveDisputeId, { 
        amount: inv.amount - disputeForm.amount,
        status: 'Sent',
        notes: `Dispute resolved. Credit memo issued for $${disputeForm.amount}. ${disputeForm.notes}`,
        disputeReason: undefined
      });
      showToast(`Credit memo created. Invoice updated.`);
    } else {
      updateInvoice(resolveDisputeId, {
        status: 'Sent',
        notes: `Dispute rejected/resolved: ${disputeForm.notes}`,
        disputeReason: undefined
      });
      showToast('Dispute marked resolved.');
    }
    setResolveDisputeId(null);
    setDisputeForm({ action: 'Adjust', amount: 0, notes: '' });
  };

  const outstandingBalance = invoices.filter(i => i.status !== 'Paid').reduce((acc, curr) => acc + (Number.isNaN(curr.amount) ? 0 : curr.amount), 0);

  const getAgingBalances = () => {
    let current = 0, days30 = 0, days60 = 0, days90 = 0;
    invoices.filter(i => i.status !== 'Paid').forEach(inv => {
      const age = calculateAge(inv.dueDate);
      const isPastDue = new Date(inv.dueDate) < new Date();
      if (!isPastDue) current += inv.amount;
      else if (age <= 30) days30 += inv.amount;
      else if (age <= 60) days60 += inv.amount;
      else days90 += inv.amount;
    });
    return { current, days30, days60, days90 };
  };
  const aging = getAgingBalances();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-head font-extrabold text-navy-dark">Invoice Control</h2>
          <p className="text-sm text-slate-500">Track receivables and customer payment status.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => showToast('Synced 0 new invoices with QuickBooks Online')}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-navy hover:bg-slate-50 hover:border-navy transition-all flex items-center gap-2 shadow-sm"
          >
            <RefreshCw size={14} className="text-green-600" /> Sync with QuickBooks
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="tms-card p-5 bg-teal/5 border-teal/20">
            <h4 className="text-[10px] font-bold text-teal uppercase tracking-widest mb-1">Awaiting Payment</h4>
            <div className="text-3xl font-head font-extrabold text-navy-dark">${outstandingBalance.toLocaleString()}</div>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <Clock size={14} />
              <span>{pendingInvoicing.length} loads pending invoice creation</span>
            </div>
          </div>
          
          <div className="tms-card p-5">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Aging Summary</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Current</span>
                <span className="text-sm font-bold text-navy">${aging.current.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">1-30 Days</span>
                <span className="text-sm font-bold text-orange">${aging.days30.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">31-60 Days</span>
                <span className="text-sm font-bold text-orange-600">${aging.days60.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-red">60+ Days</span>
                <span className="text-sm font-bold text-red">${aging.days90.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {pendingInvoicing.length > 0 && (
            <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${focusedLoad ? 'border-orange bg-orange/5 shadow-md shadow-orange/10' : 'border-amber-400/40 bg-amber-50/60 dark:bg-amber-900/10 dark:border-amber-500/30'}`}>
              {/* Compact alert bar — always visible */}
              <button
                onClick={() => setPendingExpanded(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-orange flex items-center justify-center flex-shrink-0">
                    <Receipt size={14} className="text-white" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-orange">
                      {focusedLoad ? 'Action Required — Invoice This Load' : `${pendingInvoicing.length} Load${pendingInvoicing.length > 1 ? 's' : ''} Ready to Invoice`}
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {focusedLoad
                        ? `${focusedLoad.loadNumber} · ${getCustomerName(focusedLoad.customerId)} · Delivered ${focusedLoad.deliveryDate}`
                        : pendingInvoicing.slice(0, 3).map(l => l.loadNumber).join(', ') + (pendingInvoicing.length > 3 ? ` +${pendingInvoicing.length - 3} more` : '')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {focusedLoad && (
                    <span className="text-[10px] font-bold text-orange bg-orange/10 px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wide">Now</span>
                  )}
                  {!focusedLoad && (
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                      {pendingInvoicing.length} pending
                    </span>
                  )}
                  <ChevronRight size={14} className={`text-slate-400 transition-transform duration-200 ${pendingExpanded || focusedLoad ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {/* Expanded list — shown when clicked or when there's a focused load */}
              <AnimatePresence>
                {(pendingExpanded || focusedLoad) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 pt-1 border-t border-orange/10 space-y-1.5">
                      {focusedLoad && (
                        <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-orange/20 rounded-xl shadow-sm">
                          <div>
                            <span className="font-mono text-sm font-black text-navy dark:text-white">{focusedLoad.loadNumber}</span>
                            <span className="text-xs text-slate-500 ml-2">{getCustomerName(focusedLoad.customerId)}</span>
                            <p className="text-[10px] text-slate-400 mt-0.5">Delivered {focusedLoad.deliveryDate}</p>
                          </div>
                          <button
                            onClick={() => handleOpenBuilder(focusedLoad.id)}
                            className="px-4 py-2 bg-orange text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow shadow-orange/20 hover:brightness-110 transition-all cursor-pointer"
                          >
                            <Plus size={12} /> Generate Invoice
                          </button>
                        </div>
                      )}
                      {otherPending.map(load => (
                        <div key={load.id} className="flex items-center justify-between px-3 py-2 hover:bg-white dark:hover:bg-zinc-800/60 rounded-lg transition-all group">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-bold text-navy dark:text-slate-200">{load.loadNumber}</span>
                            <span className="text-xs text-slate-500">{getCustomerName(load.customerId)}</span>
                            <span className="text-[10px] text-slate-400">· {load.deliveryDate}</span>
                          </div>
                          <button
                            onClick={() => handleOpenBuilder(load.id)}
                            className="px-3 py-1.5 bg-orange/90 text-white text-[10px] font-bold rounded-md flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-all cursor-pointer"
                          >
                            <Plus size={11} /> Invoice
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="tms-card">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex gap-4">
                <span 
                  onClick={() => setActiveTab('Open')}
                  className={`text-xs font-bold transition-all cursor-pointer pb-4 -mb-4 ${activeTab === 'Open' ? 'text-navy border-b-2 border-orange' : 'text-slate-400 hover:text-navy hover:border-b-2 hover:border-slate-200'}`}
                >
                  Open Invoices
                </span>
                <span 
                  onClick={() => setActiveTab('Overdue')}
                  className={`text-xs font-bold transition-all cursor-pointer pb-4 -mb-4 flex items-center gap-1.5 ${activeTab === 'Overdue' ? 'text-red border-b-2 border-red' : 'text-slate-400 hover:text-red hover:border-b-2 hover:border-slate-200'}`}
                >
                  Overdue
                  {invoices.filter(i => i.status === 'Overdue').length > 0 && (
                    <span className="bg-red/10 text-red px-1.5 py-0.5 rounded-md text-[9px]">{invoices.filter(i => i.status === 'Overdue').length}</span>
                  )}
                </span>
                <span 
                  onClick={() => setActiveTab('Rejected')}
                  className={`text-xs font-bold transition-all cursor-pointer pb-4 -mb-4 flex items-center gap-1.5 ${activeTab === 'Rejected' ? 'text-orange-500 border-b-2 border-orange-500' : 'text-slate-400 hover:text-orange-500 hover:border-b-2 hover:border-slate-200'}`}
                >
                  Rejected
                  {invoices.filter(i => i.status === 'Rejected').length > 0 && (
                    <span className="bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded-md text-[9px]">{invoices.filter(i => i.status === 'Rejected').length}</span>
                  )}
                </span>
                <span 
                  onClick={() => setActiveTab('Disputed')}
                  className={`text-xs font-bold transition-all cursor-pointer pb-4 -mb-4 flex items-center gap-1.5 ${activeTab === 'Disputed' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-slate-400 hover:text-blue-500 hover:border-b-2 hover:border-slate-200'}`}
                >
                  Disputed
                  {invoices.filter(i => i.status === 'Disputed').length > 0 && (
                    <span className="bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-md text-[9px]">{invoices.filter(i => i.status === 'Disputed').length}</span>
                  )}
                </span>
                <span 
                  onClick={() => setActiveTab('Paid')}
                  className={`text-xs font-bold transition-all cursor-pointer pb-4 -mb-4 ${activeTab === 'Paid' ? 'text-teal border-b-2 border-teal' : 'text-slate-400 hover:text-teal hover:border-b-2 hover:border-slate-200'}`}
                >
                  Paid
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="tms-table-header">Invoice #</th>
                    <th className="tms-table-header">Customer/Method</th>
                    <th className="tms-table-header">Date</th>
                    <th className="tms-table-header">Due Date</th>
                    <th className="tms-table-header text-right">Balance</th>
                    <th className="tms-table-header"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400 text-xs italic">
                        {activeTab === 'Open' ? 'No open invoices.' : 'No paid invoices found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map(inv => (
                      <tr 
                        key={inv.id} 
                        onClick={() => setSelectedInvoiceId(inv.id)}
                        className="hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 group"
                      >
                        <td className="tms-table-cell font-mono font-bold text-navy">
                          <div>{inv.invoiceNumber}</div>
                          {inv.notes && <div className="text-[9px] font-sans text-slate-400 font-normal truncate max-w-[120px] mt-1 italic block">{inv.notes}</div>}
                        </td>
                        <td className="tms-table-cell">
                          <div className="font-semibold text-slate-700">{getCustomerName(inv.customerId)}</div>
                          {inv.method && <div className="text-[10px] text-slate-400 mt-0.5">Via {inv.method}</div>}
                        </td>
                        <td className="tms-table-cell text-slate-500">{inv.date}</td>
                        <td className="tms-table-cell">
                          {inv.status === 'Paid' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal bg-teal/5 px-2 py-1 rounded-full">
                              <FileCheck size={12} />
                              Paid
                            </span>
                          ) : inv.status === 'Overdue' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red bg-red/5 px-2 py-1 rounded-full">
                              <Clock size={12} />
                              {inv.dueDate} (Overdue)
                            </span>
                          ) : inv.status === 'Rejected' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-500 bg-orange-500/5 px-2 py-1 rounded-full">
                              <X size={12} />
                              Rejected
                            </span>
                          ) : inv.status === 'Disputed' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-500 bg-blue-500/5 px-2 py-1 rounded-full">
                              <AlertCircle size={12} />
                              Disputed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                              <Clock size={12} />
                              Due: {inv.dueDate}
                            </span>
                          )}
                          {inv.status === 'Rejected' && inv.rejectionReason && (
                            <div className="text-[9px] text-orange-500 mt-1 max-w-[150px] truncate" title={inv.rejectionReason}>
                              Note: {inv.rejectionReason}
                            </div>
                          )}
                          {inv.status === 'Disputed' && inv.disputeReason && (
                            <div className="text-[9px] text-blue-500 mt-1 max-w-[150px] truncate" title={inv.disputeReason}>
                              Note: {inv.disputeReason}
                            </div>
                          )}
                        </td>
                        <td className="tms-table-cell text-right font-mono font-bold text-navy">
                          ${inv.amount.toLocaleString()}
                        </td>
                        <td className="tms-table-cell text-right text-slate-400">
                          <div className="flex items-center justify-end gap-2">
                            {inv.status === 'Disputed' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setResolveDisputeId(inv.id); }}
                                className="p-1.5 bg-blue-500/10 text-blue-500 rounded-md hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                                title="Resolve Dispute"
                              >
                                <Scale size={14} /> Resolve
                              </button>
                            )}
                            {inv.status !== 'Paid' && (
                              <button 
                                onClick={(e) => handleOpenPaymentModal(e, inv.id)}
                                className="p-1.5 bg-teal/10 text-teal rounded-md hover:bg-teal hover:text-white transition-all"
                                title="Mark as Paid"
                              >
                                <FileCheck size={14} />
                              </button>
                            )}
                            <button 
                              onClick={(e) => handleResend(e, inv.id)}
                              className={`p-1.5 rounded-md transition-all ${lastResentId === inv.id ? 'bg-orange text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-navy'}`}
                              title="Resend Invoice"
                            >
                              <Send size={14} className={lastResentId === inv.id ? 'animate-pulse' : ''} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success' ? 'bg-teal text-white border-teal-light' : 'bg-navy text-white border-navy-light'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} className="text-orange" />}
            <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoice Detail Modal */}
      <AnimatePresence>
        {selectedInvoice && selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedInvoiceId(null)}
               className="absolute inset-0 bg-navy-dark/60 backdrop-blur-sm"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="bg-navy p-8 text-white relative flex-shrink-0">
                <button 
                  onClick={() => setSelectedInvoiceId(null)}
                  className="absolute right-6 top-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-orange text-white flex items-center justify-center shadow-xl">
                      <FileText size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">{selectedInvoice.invoiceNumber}</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                          selectedInvoice.status === 'Paid' ? 'bg-teal text-white' : 
                          selectedInvoice.status === 'Overdue' ? 'bg-red text-white' : 
                          selectedInvoice.status === 'Rejected' ? 'bg-orange-500 text-white' : 
                          selectedInvoice.status === 'Disputed' ? 'bg-blue-500 text-white' : 
                          'bg-orange text-white'
                        }`}>
                          {selectedInvoice.status}
                        </span>
                        <span className="text-white/60 text-xs font-bold uppercase tracking-tighter">Issue Date: {selectedInvoice.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="text-right hidden md:block">
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total Amount</p>
                        <p className="text-3xl font-black">${selectedInvoice.amount.toLocaleString()}</p>
                     </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  {/* Customer Info */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <CreditCard size={12} /> Billed To
                    </h4>
                    <div className="space-y-1">
                      <p className="text-lg font-black text-navy-dark">{selectedCustomer.name}</p>
                      <p className="text-xs text-slate-500">
                        {selectedCustomer.billingAddress 
                          ? `${selectedCustomer.billingAddress.street}, ${selectedCustomer.billingAddress.city}, ${selectedCustomer.billingAddress.state} ${selectedCustomer.billingAddress.zip}` 
                          : 'No billing address on file'}
                      </p>
                      <p className="text-xs font-bold text-teal mt-2">Contact: {selectedCustomer.contactName}</p>
                      <p className="text-xs text-slate-400">{selectedCustomer.contactEmail}</p>
                    </div>
                    {selectedInvoice.status === 'Rejected' && selectedInvoice.rejectionReason && (
                      <div className="p-3 mt-4 bg-orange-50 border border-orange-200 rounded-xl">
                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Customer Notes / Rejection</p>
                        <p className="text-xs text-orange-800 font-medium italic">{selectedInvoice.rejectionReason}</p>
                      </div>
                    )}
                    {selectedInvoice.status === 'Disputed' && selectedInvoice.disputeReason && (
                      <div className="p-3 mt-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Customer Dispute Notes</p>
                        <p className="text-xs text-blue-800 font-medium italic">{selectedInvoice.disputeReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Tracking Info */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Navigation size={12} /> Load Reference
                    </h4>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-xs font-black text-navy">{selectedLoad?.loadNumber}</p>
                      <div className="mt-3 space-y-2">
                         <div className="flex items-start gap-2 text-[10px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-teal mt-1 flex-shrink-0" />
                            <span className="text-slate-500 truncate">{selectedLoad?.commodity}</span>
                         </div>
                         <div className="flex items-center gap-2 text-[10px] font-bold text-navy-dark">
                            <Navigation size={10} className="text-orange" />
                            <span>{selectedLoad?.miles} mi</span>
                         </div>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedInvoiceId(null);
                          navigate('loads', selectedInvoice.loadId);
                        }}
                        className="mt-4 w-full py-2 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest hover:border-navy transition-all"
                      >
                        View Load Folder
                      </button>
                    </div>
                  </div>

                  {/* Financial Status */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Calendar size={12} /> Payment Aging
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <span className="text-xs font-bold text-navy-dark">Invoice Age</span>
                        <span className="text-sm font-black text-navy">{calculateAge(selectedInvoice.date)} Days</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <span className="text-xs font-bold text-navy-dark">Terms</span>
                        <span className="text-sm font-black text-slate-500">{selectedCustomer.paymentTerms || 'Net 30'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-orange/5 border border-orange/10 rounded-xl">
                        <span className="text-xs font-bold text-orange">Due In</span>
                        <span className="text-sm font-black text-orange">{selectedInvoice.dueDate}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attached Documents */}
                {selectedInvoice.documents && selectedInvoice.documents.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Paperclip size={12} /> Attached Documents
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedInvoice.documents.map((doc: any) => (
                        <div key={doc.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between group">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText size={14} className="text-orange shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-bold text-navy truncate">{doc.name}</p>
                              <p className="text-[9px] font-mono text-slate-400">{doc.type}</p>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => {
                               e.stopPropagation();
                               setViewingDoc(doc.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-navy hover:bg-slate-100 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0"
                            title="View Document"
                          >
                            <Eye size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Line Items (Summary) */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing Structure</h4>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-50">
                          <td className="p-4 text-xs font-bold text-navy-dark">Linehaul Freight Charges</td>
                          <td className="p-4 text-xs font-black text-navy text-right">${(selectedInvoice.amount * 0.85).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                        <tr className="border-b border-slate-50">
                          <td className="p-4 text-xs font-bold text-navy-dark">FSC (Fuel Surcharge)</td>
                          <td className="p-4 text-xs font-black text-navy text-right">${(selectedInvoice.amount * 0.15).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                        <tr className="bg-navy/5">
                          <td className="p-4 text-xs font-black text-navy uppercase tracking-widest">Total Invoice Balance</td>
                          <td className="p-4 text-sm font-black text-navy text-right">${selectedInvoice.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-4 items-center justify-between flex-shrink-0">
                <div className="flex gap-3">
                  <button className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-navy uppercase tracking-widest hover:border-navy transition-all flex items-center gap-2">
                    <ExternalLink size={14} /> PDF Preview
                  </button>
                  <button 
                    onClick={(e) => handleResend(e, selectedInvoice.id)}
                    className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-navy uppercase tracking-widest hover:border-navy transition-all flex items-center gap-2"
                  >
                    <Send size={14} /> Email to Customer
                  </button>
                </div>
                {selectedInvoice.status !== 'Paid' && (
                  <button 
                    onClick={(e) => {
                      handleOpenPaymentModal(e, selectedInvoice.id);
                      setSelectedInvoiceId(null);
                    }}
                    className="flex-1 md:flex-none px-10 py-4 bg-teal text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-teal/20 hover:bg-teal-light transition-all flex items-center justify-center gap-2"
                  >
                    <FileCheck size={16} /> Mark as Paid
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Confirmation Modal */}
      <AnimatePresence>
        {invoiceBuilderLoadId && loads.find(l => l.id === invoiceBuilderLoadId) && (
          <InvoiceBuilderModal
            load={loads.find(l => l.id === invoiceBuilderLoadId)!}
            customer={customers.find(c => c.id === loads.find(l => l.id === invoiceBuilderLoadId)?.customerId)}
            onClose={() => setInvoiceBuilderLoadId(null)}
            onGenerate={handleGenerateInvoice}
            onAddDocumentToLoad={addDocument}
          />
        )}

        {emailComposerInvoiceId && invoices.find(i => i.id === emailComposerInvoiceId) && (
          <EmailComposerModal
            invoice={invoices.find(i => i.id === emailComposerInvoiceId)!}
            customer={customers.find(c => c.id === invoices.find(i => i.id === emailComposerInvoiceId)?.customerId)}
            onClose={() => setEmailComposerInvoiceId(null)}
            onSend={(emailData) => {
              setEmailComposerInvoiceId(null);
              showToast(`Invoice sent successfully to ${emailData.to}`);
            }}
          />
        )}
        
        {paymentModalId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setPaymentModalId(null)}
               className="absolute inset-0 bg-navy-dark/70 backdrop-blur-md"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="bg-teal p-6 text-white text-center">
                <FileCheck size={40} className="mx-auto mb-4" />
                <h3 className="text-xl font-black uppercase tracking-tight">Record Payment</h3>
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-1">Invoice {invoices.find(i => i.id === paymentModalId)?.invoiceNumber}</p>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Date</label>
                    <input 
                      type="date"
                      value={paymentForm.date}
                      onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy-dark"
                    />
                  </div>
                  <div className="space-y-2 text-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Rating</label>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button 
                          key={s}
                          onClick={() => setPaymentForm({...paymentForm, rating: s})}
                          className={`transition-all ${paymentForm.rating >= s ? 'text-orange scale-110' : 'text-slate-200 hover:text-orange/50'}`}
                        >
                          <Star size={20} fill={paymentForm.rating >= s ? "currentColor" : "none"} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload Receipt / Remittance</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-6 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-teal/50 hover:bg-teal/5 transition-all text-slate-400"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={(e) => setPaymentForm({...paymentForm, attachment: e.target.files?.[0] || null})}
                    />
                    {paymentForm.attachment ? (
                      <div className="flex items-center gap-2 text-teal">
                        <FileCheck size={20} />
                        <span className="text-xs font-bold">{paymentForm.attachment.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload size={20} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Click to upload file</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Notes</label>
                  <textarea 
                    placeholder="Reference number, check #, wire confirm..."
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs min-h-[100px] focus:outline-none focus:border-teal transition-all"
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => setPaymentModalId(null)}
                  className="flex-1 py-4 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-navy uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                   onClick={handleConfirmPayment}
                   className="flex-[2] py-4 bg-teal text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-teal/20 hover:bg-teal-light transition-all flex items-center justify-center gap-2"
                >
                  Confirm & Close Invoice
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Dispute Resolution Modal */}
      <AnimatePresence>
        {resolveDisputeId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
              onClick={() => setResolveDisputeId(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
               <div className="bg-blue-500 p-6 text-white text-center">
                 <Scale size={32} className="mx-auto mb-2 text-white" />
                 <h2 className="text-2xl font-black tracking-tight">Resolve Dispute</h2>
                 <p className="text-white/80 text-xs mt-1">Invoice: {invoices.find(i => i.id === resolveDisputeId)?.invoiceNumber}</p>
               </div>
               
               <div className="p-8 space-y-6">
                 
                 <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Resolution Action</label>
                   <div className="flex gap-4">
                     <label className="flex items-center gap-2 text-sm font-medium text-navy cursor-pointer">
                       <input 
                         type="radio" 
                         name="action" 
                         value="Adjust" 
                         checked={disputeForm.action === 'Adjust'}
                         onChange={(e) => setDisputeForm({...disputeForm, action: e.target.value})}
                         className="accent-blue-500 w-4 h-4"
                       />
                       Adjust & Issue Credit Memo
                     </label>
                     <label className="flex items-center gap-2 text-sm font-medium text-navy cursor-pointer">
                       <input 
                         type="radio" 
                         name="action" 
                         value="Reject" 
                         checked={disputeForm.action === 'Reject'}
                         onChange={(e) => setDisputeForm({...disputeForm, action: e.target.value})}
                         className="accent-blue-500 w-4 h-4"
                       />
                       Reject Dispute
                     </label>
                   </div>
                 </div>

                 {disputeForm.action === 'Adjust' && (
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Adjustment Amount ($)</label>
                     <div className="relative">
                       <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                       <input 
                         type="number"
                         value={disputeForm.amount || ''}
                         onChange={(e) => setDisputeForm({...disputeForm, amount: parseFloat(e.target.value) || 0})}
                         className="w-full pl-10 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-navy focus:outline-none focus:border-blue-500 transition-all font-mono"
                       />
                     </div>
                     <p className="text-[10px] text-slate-400">This amount will be deducted from the invoice total.</p>
                   </div>
                 )}

                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Resolution Notes</label>
                   <textarea 
                     placeholder="Notes to customer regarding the resolution..."
                     value={disputeForm.notes}
                     onChange={(e) => setDisputeForm({...disputeForm, notes: e.target.value})}
                     className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs min-h-[100px] focus:outline-none focus:border-blue-500 transition-all"
                   />
                 </div>

               </div>

               <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                 <button 
                   onClick={() => setResolveDisputeId(null)}
                   className="flex-1 py-4 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-navy uppercase tracking-widest hover:bg-slate-50 transition-all"
                 >
                   Cancel
                 </button>
                 <button 
                    onClick={handleConfirmDisputeResolution}
                    className="flex-[2] py-4 bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-600 transition-all"
                 >
                   Confirm Resolution
                 </button>
               </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Document Viewer Modal Overlay */}
      <AnimatePresence>
        {viewingDoc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-navy/90 backdrop-blur-md flex flex-col items-center justify-center p-8"
          >
            <div className="w-full max-w-3xl bg-white flex flex-col rounded-xl overflow-hidden shadow-2xl h-[90vh]">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-navy flex items-center gap-2"><FileText size={16} /> Viewing Document: {viewingDoc}</h3>
                <button onClick={() => setViewingDoc(null)} className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-navy transition-all"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-8">
                {/* Mock rendering of a document */}
                <div className="bg-white w-full max-w-[600px] aspect-[8.5/11] border border-slate-200 shadow-sm flex flex-col items-center justify-start relative p-12">
                  <div className="w-full h-40 border-4 border-slate-100 border-dashed rounded-lg flex items-center justify-center opacity-50 mb-12">
                    <p className="text-slate-300 font-bold uppercase tracking-widest text-xl text-center px-4">{viewingDoc} PREVIEW</p>
                  </div>
                  <div className="w-full space-y-4">
                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                    <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                    <div className="h-4 bg-slate-100 rounded w-4/6"></div>
                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                    <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
