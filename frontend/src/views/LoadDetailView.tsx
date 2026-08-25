import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Truck, 
  User, 
  FileText, 
  DollarSign, 
  History, 
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  Package,
  Calendar,
  Phone,
  Scale,
  Navigation,
  FileCheck,
  AlertCircle,
  Hash,
  Activity,
  Layers,
  Printer,
  Copy,
  Edit2,
  XCircle,
  X,
  Eye
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { motion } from 'motion/react';

interface LoadDetailViewProps {
  loadId: string;
  onBack: () => void;
  navigate: (view: string, loadId: string | null) => void;
}

export default function LoadDetailView({ loadId, onBack, navigate }: LoadDetailViewProps) {
  const { 
    loads, 
    customers, 
    locations, 
    drivers, 
    trucks, 
    advanceLoadStatus, 
    generateInvoice, 
    updateLoad, 
    duplicateLoad,
    updateDriver,
    updateTruck,
    addDocument,
    removeDocument,
    addLoadItem,
    removeLoadItem
  } = useData();
  const [activeTab, setActiveTab] = useState('Overview');
  const [isEditing, setIsEditing] = useState(false);
  const [showAddFinancial, setShowAddFinancial] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [selectedDocPreview, setSelectedDocPreview] = useState<any | null>(null);
  const [newFinancial, setNewFinancial] = useState({ description: '', amount: '', type: 'Revenue' as 'Revenue' | 'Expense' });
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState('Rate Confirmation');
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = loads.find(l => l.id === loadId);
  if (!load) return <div>Load not found</div>;

  const handleSendToApp = async () => {
    setIsSending(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    updateLoad(loadId, { sentToApp: true });
    setIsSending(false);
  };

  const handleCancel = () => {
    updateLoad(loadId, { status: 'Cancelled' as any });
  };

  const handleDuplicate = () => {
    duplicateLoad(loadId);
    onBack();
  };

  const handleAddDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDocName || newDocType) {
      addDocument(loadId, { name: newDocName || newDocType, type: newDocType });
      setNewDocName('');
      setNewDocType('Rate Confirmation');
      setShowAddDoc(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      addDocument(loadId, { name: newDocName || file.name, type: newDocType });
      if (fileInputRef.current) fileInputRef.current.value = '';
      setNewDocName('');
      setNewDocType('Rate Confirmation');
      setShowAddDoc(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleAddFinancial = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newFinancial.amount);
    if (newFinancial.description && !Number.isNaN(amount)) {
      addLoadItem(loadId, { 
        description: newFinancial.description, 
        amount: amount, 
        type: newFinancial.type 
      });
      setNewFinancial({ description: '', amount: '', type: 'Revenue' });
      setShowAddFinancial(false);
    }
  };

  const handleRemoveFinancial = (itemId: string) => {
    removeLoadItem(loadId, itemId);
  };

  const handleRemoveDocument = (docId: string) => {
    removeDocument(loadId, docId);
  };

  const handleViewDoc = (doc: any) => {
    setSelectedDocPreview(doc);
  };

  const customer = customers.find(c => c.id === load.customerId);
  const origin = locations.find(l => l.id === load.originId);
  const destination = locations.find(l => l.id === load.destinationId);
  const driver = drivers.find(d => d.id === load.driverId);
  const truck = trucks.find(t => t.id === load.truckId);

  const tabs = [
    { name: 'Overview' },
    { name: 'Stops', badge: 2 },
    { name: 'Documents', badge: load.documents?.length || 0 },
    { name: 'Financials', badge: load.lineItems?.length || 0 },
    { name: 'Activity Log', badge: load.activityLog?.length || 0 }
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Delivered': return 'bg-teal/10 text-teal border-teal/20';
      case 'In Transit': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Dispatched': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'At Pickup': return 'bg-orange/10 text-orange border-orange/20';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-500">
      {/* Breadcrumbs */}
      <nav className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
          <button onClick={onBack} className="hover:text-navy hover:underline">Loads</button>
          <ChevronRight size={10} />
          <span className="text-navy">{load.loadNumber}</span>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => setIsEditing(!isEditing)}
             className={`px-4 py-1.5 border rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${isEditing ? 'bg-navy text-white' : 'bg-white border-slate-200 text-navy hover:border-navy'}`}
           >
             <Edit2 size={12} /> {isEditing ? 'Save' : 'Edit'}
           </button>
           <button 
             onClick={handleDuplicate}
             className="px-4 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-1.5"
           >
             <Copy size={12} /> Duplicate
           </button>
           <button 
             onClick={() => window.print()}
             className="px-4 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-1.5"
           >
             <Printer size={12} /> Print BOL
           </button>
           <button 
             onClick={handleCancel}
             className="px-4 py-1.5 border border-red-200 text-red-500 rounded-lg text-xs font-bold hover:bg-red-50 transition-all"
           >
             Cancel Load
           </button>
        </div>
      </nav>

      {/* Main Header / Stepper Context */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col xl:flex-row xl:items-stretch gap-6">
        
        {/* Left: Identity */}
        <div className="xl:w-1/3 flex flex-col justify-between border-b xl:border-b-0 xl:border-r border-slate-100 pb-6 xl:pb-0 xl:pr-6">
          <div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border mb-4 ${getStatusStyle(load.status)}`}>
               <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
               {load.status}
            </div>
            <h1 className="text-4xl font-head font-black text-navy-dark tracking-tight mb-2">{load.loadNumber}</h1>
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <span className="truncate max-w-[120px]" title={origin?.address.city}>{origin?.address.city}, {origin?.address.state}</span>
              <ArrowLeft size={12} className="rotate-180 shrink-0 text-slate-300" /> 
              <span className="truncate max-w-[120px]" title={destination?.address.city}>{destination?.address.city}, {destination?.address.state}</span>
            </p>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-50">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><DollarSign size={10} /> Total Rate</p>
            <h3 className="text-2xl font-black font-head text-navy-dark">${load.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">${(load.rate / Math.max(load.miles, 1)).toFixed(2)}/mi all-in</p>
          </div>
        </div>

        {/* Right: Dynamic Action Lifecycle */}
        <div className="flex-1 flex flex-col justify-center py-2 xl:pl-4">
          
          {/* Progress Indicators */}
          <div className="flex items-center justify-between mb-8 relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 -translate-y-1/2 -z-10 rounded-full" />
            
            {/* Steps definition */}
            {[
              { id: 'Created', label: 'Processing' },
              { id: 'Dispatched', label: 'Dispatched' },
              { id: 'In Transit', label: 'In Transit' },
              { id: 'Delivered', label: 'Delivered' },
              { id: 'Invoiced', label: 'Invoiced' }
            ].map((step, idx, arr) => {
              const statusOrder = ['Created', 'Dispatched', 'At Pickup', 'Loaded', 'In Transit', 'Delivered', 'Invoiced', 'Paid', 'Cancelled'];
              
              // Map detailed status to high-level step
              let mappedLoadStatus = load.status;
              if (['At Pickup', 'Loaded'].includes(load.status)) mappedLoadStatus = 'In Transit';
              if (load.status === 'Paid') mappedLoadStatus = 'Invoiced';
              if (load.status === 'Cancelled') mappedLoadStatus = 'Created';
              
              const stepIndex = arr.findIndex(s => s.id === step.id);
              const activeIndex = arr.findIndex(s => s.id === mappedLoadStatus);
              
              const isPast = stepIndex < activeIndex;
              const isActive = stepIndex === activeIndex;

              return (
                <div key={step.id} className="flex flex-col items-center gap-2 bg-white px-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ring-4 ring-white transition-all duration-500
                    ${isPast ? 'bg-teal text-white' : isActive ? 'bg-navy text-white ring-navy/20 scale-110' : 'bg-slate-100 text-slate-300'}
                  `}>
                    {isPast ? <CheckCircle2 size={12} /> : (idx + 1)}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isActive ? 'text-navy scale-105' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Action Box based on current status */}
          <div className="bg-slate-50/50 rounded-xl p-6 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {load.status === 'Created' && (
              <>
                <div>
                  <h4 className="text-sm font-bold text-navy-dark">Ready for Dispatch</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">Assign a driver and equipment to dispatch this load.</p>
                </div>
                <button 
                  onClick={() => navigate('dispatch', loadId)}
                  className="w-full sm:w-auto px-6 py-3 bg-orange text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange/90 shadow-lg shadow-orange/20 transition-all text-center"
                >
                  Dispatch Load
                </button>
              </>
            )}
            
            {(load.status === 'Dispatched') && (
              <>
                <div>
                  <h4 className="text-sm font-bold text-navy-dark">Awaiting Pickup Arrival</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">Has {driver?.name || 'the driver'} arrived at the shipper?</p>
                </div>
                <button 
                  onClick={() => updateLoad(loadId, { status: 'At Pickup' })}
                  className="w-full sm:w-auto px-6 py-3 bg-navy text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-navy-light shadow-lg shadow-navy/20 transition-all text-center"
                >
                  Mark Arrived
                </button>
              </>
            )}

            {(load.status === 'At Pickup') && (
              <>
                <div>
                  <h4 className="text-sm font-bold text-navy-dark">At Shipper (Loading)</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">Waiting for freight to be loaded onto equipment.</p>
                </div>
                <button 
                  onClick={() => updateLoad(loadId, { status: 'In Transit' })}
                  className="w-full sm:w-auto px-6 py-3 bg-teal text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-teal-light shadow-lg shadow-teal/20 transition-all text-center"
                >
                  Mark Loaded & Depart
                </button>
              </>
            )}

            {(load.status === 'In Transit' || load.status === 'Loaded') && (
              <>
                <div>
                  <h4 className="text-sm font-bold text-navy-dark">In Transit to Receiver</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">Heading to {destination?.address.city || 'destination'}.</p>
                </div>
                <button 
                  onClick={() => updateLoad(loadId, { status: 'Delivered' })}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-400 shadow-lg shadow-blue-500/20 transition-all text-center"
                >
                  Mark Delivered
                </button>
              </>
            )}

            {load.status === 'Delivered' && (
              <>
                <div>
                  <h4 className="text-sm font-bold text-teal">Delivery Confirmed</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">Ensure POD is uploaded before generating an invoice.</p>
                </div>
                <motion.button 
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  onClick={() => navigate('invoices', loadId)}
                  className="w-full sm:w-auto px-6 py-3 bg-teal text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-teal-light shadow-lg shadow-teal/20 transition-all flex items-center justify-center gap-2"
                >
                  <FileCheck size={14} className="animate-bounce" /> Invoice & Bill
                </motion.button>
              </>
            )}

            {load.status === 'Invoiced' && (
              <>
                <div>
                  <h4 className="text-sm font-bold text-navy-dark">Awaiting Payment</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">Invoice sent. Waiting for customer settlement.</p>
                </div>
                <button 
                  onClick={() => updateLoad(loadId, { status: 'Paid' })}
                  className="w-full sm:w-auto px-6 py-3 bg-teal text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-teal-light shadow-lg shadow-teal/20 transition-all flex items-center justify-center gap-2"
                >
                  Record Payment
                </button>
              </>
            )}
            
            {load.status === 'Paid' && (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal/10 text-teal flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-teal">Load Complete & Paid</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">All lifecycle steps have been finalized.</p>
                  </div>
                </div>
              </>
            )}

            {load.status === 'Cancelled' && (
              <div className="flex items-center gap-3 w-full justify-center opacity-70 p-4">
                <XCircle size={24} className="text-red-500" />
                <h4 className="text-sm font-bold text-red-500 uppercase tracking-widest">Load Cancelled</h4>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => load.status === 'Created' || !load.driverId ? navigate('dispatch', loadId) : null}
          className={`bg-white rounded-xl p-5 border border-slate-100 flex flex-col gap-1 text-left transition-all relative group shadow-sm ${(!load.driverId || load.status === 'Created') ? 'hover:border-orange hover:bg-orange/5 cursor-pointer ring-2 ring-orange/20' : ''}`}
        >
          <div className="flex justify-between items-center z-10 relative mb-1">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Truck size={10}/> Assignment</p>
            {load.driverId && load.status !== 'Paid' && load.status !== 'Invoiced' && load.status !== 'Cancelled' && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  updateLoad(loadId, { driverId: undefined, truckId: undefined, status: 'Created' });
                  if (load.driverId) updateDriver(load.driverId, { status: 'Available' });
                  if (load.truckId) updateTruck(load.truckId, { status: 'Available' });
                }}
                className="opacity-0 group-hover:opacity-100 text-[9px] font-bold text-red-500 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded transition-all uppercase tracking-widest absolute right-0 -top-1"
              >
                Unassign
              </button>
            )}
          </div>
          <h3 className="text-sm font-bold text-navy-dark flex items-center gap-2">
            {driver?.name || 'Requires Dispatch'}
            {(!load.driverId || load.status === 'Created') && <ChevronRight size={12} className="text-orange" />}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">{truck ? `Tractor ${truck.unitNumber}` : 'Pending equipment'}</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-3"><Calendar size={10}/> Schedule</p>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                 <span className="text-[10px] text-slate-500">Pickup</span>
                 {isEditing ? (
                   <input type="datetime-local" className="text-xs w-32 border-b border-orange outline-none" value={load.pickupDate.substring(0, 16)} onChange={(e) => updateLoad(loadId, { pickupDate: e.target.value + ':00Z' })} />
                 ) : (
                   <span className="text-xs font-bold text-navy-dark">{new Date(load.pickupDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                 )}
              </div>
              <div className="flex justify-between items-center">
                 <span className="text-[10px] text-slate-500">Delivery</span>
                 {isEditing ? (
                   <input type="datetime-local" className="text-xs w-32 border-b border-orange outline-none" value={load.deliveryDate.substring(0, 16)} onChange={(e) => updateLoad(loadId, { deliveryDate: e.target.value + ':00Z' })} />
                 ) : (
                   <span className="text-xs font-bold text-navy-dark">{new Date(load.deliveryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                 )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-3"><Package size={10}/> Freight Specs</p>
           <div className="flex items-center justify-between text-xs font-medium text-slate-600 border-b border-slate-50 pb-1.5 mb-1.5">
             <span>Weight</span>
             <span className="font-bold text-navy-dark">{load.weight.toLocaleString()} lbs</span>
           </div>
           <div className="flex items-center justify-between text-xs font-medium text-slate-600">
             <span>Commodity</span>
             <span className="font-bold text-navy-dark truncate max-w-[100px]" title={load.commodity}>{load.commodity}</span>
           </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-3"><Hash size={10}/> References</p>
           <div className="flex items-center justify-between text-xs font-medium text-slate-600 border-b border-slate-50 pb-1.5 mb-1.5">
             <span>PO #</span>
             <span className="font-mono font-bold text-navy-dark truncate max-w-[100px]">{load.customerPo || 'N/A'}</span>
           </div>
           <div className="flex items-center justify-between text-xs font-medium text-slate-600">
             <span>BOL #</span>
             <span className="font-mono font-bold text-navy-dark truncate max-w-[100px]">{load.bolNumber || 'N/A'}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center border-b border-slate-100 scroller-hidden overflow-x-auto">
               {tabs.map(tab => (
                 <button
                   key={tab.name}
                   onClick={() => setActiveTab(tab.name)}
                   className={`px-8 py-5 text-sm font-bold transition-all relative whitespace-nowrap flex items-center gap-2
                     ${activeTab === tab.name ? 'text-navy-dark' : 'text-slate-400 hover:text-navy-light'}`}
                 >
                   {tab.name}
                   {tab.badge && (
                     <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none
                       ${activeTab === tab.name ? 'bg-orange/10 text-orange' : 'bg-slate-100 text-slate-400'}`}>
                       {tab.badge}
                     </span>
                   )}
                   {activeTab === tab.name && (
                     <motion.div 
                       layoutId="activeTabUnderline"
                       className="absolute bottom-0 left-0 right-0 h-1 bg-orange" 
                     />
                   )}
                 </button>
               ))}
            </div>

            <div className="p-8">
              {activeTab === 'Overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in duration-500">
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Customer & References</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center group">
                         <span className="text-xs text-slate-400 font-medium">Customer</span>
                         <span className="text-xs font-bold text-navy-dark">{customer?.name}</span>
                      </div>
                      <div className="flex justify-between items-center group">
                         <span className="text-xs text-slate-400 font-medium">Customer PO</span>
                         {isEditing ? (
                           <input 
                              className="text-xs font-bold text-navy-dark border-b border-orange outline-none bg-transparent text-right"
                              value={load.customerPo || ''} 
                              onChange={e => updateLoad(loadId, { customerPo: e.target.value })}
                           />
                         ) : (
                           <span className="text-xs font-bold text-navy-dark">{load.customerPo || 'N/A'}</span>
                         )}
                      </div>
                      <div className="flex justify-between items-center group">
                         <span className="text-xs text-slate-400 font-medium">BOL #</span>
                         {isEditing ? (
                           <input 
                              className="text-xs font-bold text-navy-dark border-b border-orange outline-none bg-transparent text-right"
                              value={load.bolNumber || ''} 
                              onChange={e => updateLoad(loadId, { bolNumber: e.target.value })}
                           />
                         ) : (
                           <span className="text-xs font-bold text-navy-dark">{load.bolNumber || 'N/A'}</span>
                         )}
                      </div>
                      <div className="flex justify-between items-center group">
                         <span className="text-xs text-slate-400 font-medium">Service Level</span>
                         <span className="text-xs font-bold text-navy-dark">{load.serviceLevel || 'Standard'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Freight Details</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center group">
                         <span className="text-xs text-slate-400 font-medium">Commodity</span>
                         {isEditing ? (
                           <input 
                              className="text-xs font-bold text-navy-dark border-b border-orange outline-none bg-transparent text-right"
                              value={load.commodity || ''} 
                              onChange={e => updateLoad(loadId, { commodity: e.target.value })}
                           />
                         ) : (
                           <span className="text-xs font-bold text-navy-dark">{load.commodity}</span>
                         )}
                      </div>
                      <div className="flex justify-between items-center group">
                         <span className="text-xs text-slate-400 font-medium">Weight</span>
                         {isEditing ? (
                           <div className="flex items-center gap-1">
                             <input 
                                className="text-xs font-bold text-navy-dark border-b border-orange outline-none bg-transparent text-right w-20"
                                type="number"
                                value={Number.isNaN(load.weight) ? '' : load.weight} 
                                onChange={e => {
                                  const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                                  updateLoad(loadId, { weight: Number.isNaN(val) ? 0 : val });
                                }}
                             />
                             <span className="text-[10px] text-slate-400">lbs</span>
                           </div>
                         ) : (
                           <span className="text-xs font-bold text-navy-dark">{load.weight.toLocaleString()} lbs</span>
                         )}
                      </div>
                      <div className="flex justify-between items-center group">
                         <span className="text-xs text-slate-400 font-medium">Equipment</span>
                         {isEditing ? (
                            <select 
                               className="text-xs font-bold text-navy-dark border-b border-orange outline-none bg-transparent"
                               value={load.equipmentType} 
                               onChange={e => updateLoad(loadId, { equipmentType: e.target.value })}
                            >
                               <option value="Dry Van 53'">Dry Van 53'</option>
                               <option value="Reefer 53'">Reefer 53'</option>
                               <option value="Flatbed">Flatbed</option>
                            </select>
                         ) : (
                           <span className="text-xs font-bold text-navy-dark">{load.equipmentType}</span>
                         )}
                      </div>
                      <div className="flex justify-between items-center group">
                         <span className="text-xs text-slate-400 font-medium">Miles (PC*MILER)</span>
                         <span className="text-xs font-bold text-navy-dark">{load.miles}</span>
                      </div>
                    </div>
                  </div>

                  {load.driverId && (
                    <div className="md:col-span-2 pt-6 border-t border-slate-100">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        Assignment & Assets
                        <span className="px-2 py-0.5 bg-teal text-white rounded text-[8px]">ACTIVE ASSIGNMENT</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-navy text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-navy/20 shrink-0">
                            {driver?.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-navy-dark">{driver?.name}</p>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">CDL CL-A</span>
                              <span className="text-[10px] font-bold text-teal uppercase tracking-tighter flex items-center gap-1">
                                <Activity size={10} /> HOS: {driver?.hosAvailable}
                              </span>
                            </div>
                            <button className="flex items-center gap-1.5 text-xs text-orange font-bold hover:underline mt-1">
                              <Phone size={10} /> Call Driver
                            </button>
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <Truck size={24} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-navy-dark">Unit {truck?.unitNumber}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{truck?.makeModel}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${truck?.pmStatus === 'Current' ? 'border-teal/20 text-teal bg-teal/5' : 'border-red-200 text-red-500 bg-red-50'}`}>
                                PM {truck?.pmStatus}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">{truck?.type}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 p-4 bg-navy/5 rounded-2xl border border-navy/10 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${load.sentToApp ? 'bg-teal text-white' : 'bg-slate-200 text-slate-400'}`}>
                            {load.sentToApp ? <CheckCircle2 size={20} /> : <Phone size={20} />}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-navy uppercase tracking-widest">Driver App Status</p>
                            <p className="text-xs text-slate-500 font-medium">
                              {load.sentToApp 
                                ? 'Successfully pushed to driver device' 
                                : 'Draft assignment local to dispatcher only'}
                            </p>
                          </div>
                        </div>
                        <button 
                          disabled={load.sentToApp || isSending}
                          onClick={handleSendToApp}
                          className={`w-full md:w-auto px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2
                            ${load.sentToApp 
                              ? 'bg-white border border-teal text-teal cursor-default shadow-none' 
                              : isSending 
                                ? 'bg-orange/50 text-white cursor-wait'
                                : 'bg-orange text-white shadow-orange/20 hover:bg-orange-dark'}`}
                        >
                          {isSending ? (
                            <>
                              <Activity size={14} className="animate-spin" />
                              Sending to {driver?.name.split(' ')[0]}...
                            </>
                          ) : load.sentToApp ? (
                            <>
                              <Navigation size={14} />
                              Sent to App
                            </>
                          ) : (
                            <>
                              <Navigation size={14} />
                              Send Load to Driver App
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'Stops' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                   <div className="flex items-center justify-between mb-2">
                     <p className="text-xs text-slate-500 font-medium italic">Sequential routing order for load {load.loadNumber}</p>
                     {isEditing && <button className="text-[10px] font-bold text-orange uppercase tracking-wider hover:underline">+ Add Stop</button>}
                   </div>
                   <div className="space-y-6 relative">
                     <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-100" />
                     
                     {/* Pickup Stop */}
                     <div className="flex gap-6 relative">
                        <div className="w-8 h-8 rounded-full bg-orange text-white flex items-center justify-center font-bold text-xs shrink-0 z-10 border-4 border-white shadow-sm">1</div>
                        <div className="flex-1 bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-bold text-orange uppercase tracking-widest">Pickup</span>
                            {isEditing ? (
                               <input type="datetime-local" className="text-[10px] border-b border-orange outline-none bg-transparent" value={load.pickupDate.substring(0, 16)} onChange={(e) => updateLoad(loadId, { pickupDate: e.target.value + ':00Z' })} />
                             ) : (
                               <span className="text-[10px] text-slate-400 font-mono">{new Date(load.pickupDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                             )}
                          </div>
                          {isEditing ? (
                            <div className="space-y-2">
                              <select 
                                className="text-sm font-bold text-navy-dark w-full bg-white border border-slate-200 rounded p-1 outline-none focus:border-orange"
                                value={load.originId}
                                onChange={e => updateLoad(loadId, { originId: e.target.value })}
                              >
                                {locations.map(loc => (
                                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                              </select>
                              <p className="text-xs text-slate-400">Edit location address in Locations view</p>
                            </div>
                          ) : (
                            <>
                              <h5 className="text-sm font-bold text-navy-dark tracking-tight">{origin?.name}</h5>
                              <p className="text-xs text-slate-500 mt-1">{origin?.address.street}, {origin?.address.city}, {origin?.address.state}</p>
                            </>
                          )}
                        </div>
                     </div>

                     {/* Delivery Stop */}
                     <div className="flex gap-6 relative">
                        <div className="w-8 h-8 rounded-full bg-teal text-white flex items-center justify-center font-bold text-xs shrink-0 z-10 border-4 border-white shadow-sm">2</div>
                        <div className="flex-1 bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-bold text-teal uppercase tracking-widest">Delivery</span>
                            {isEditing ? (
                               <input type="datetime-local" className="text-[10px] border-b border-orange outline-none bg-transparent" value={load.deliveryDate.substring(0, 16)} onChange={(e) => updateLoad(loadId, { deliveryDate: e.target.value + ':00Z' })} />
                             ) : (
                               <span className="text-[10px] text-slate-400 font-mono">{new Date(load.deliveryDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                             )}
                          </div>
                          {isEditing ? (
                             <select 
                                className="text-sm font-bold text-navy-dark w-full bg-white border border-slate-200 rounded p-1 outline-none focus:border-orange"
                                value={load.destinationId}
                                onChange={e => updateLoad(loadId, { destinationId: e.target.value })}
                              >
                                {locations.map(loc => (
                                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                              </select>
                          ) : (
                            <>
                              <h5 className="text-sm font-bold text-navy-dark tracking-tight">{destination?.name}</h5>
                              <p className="text-xs text-slate-500 mt-1">{destination?.address.street}, {destination?.address.city}, {destination?.address.state}</p>
                            </>
                          )}
                        </div>
                     </div>
                   </div>
                </div>
              )}

              {activeTab === 'Documents' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-500">
                  {showAddDoc && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-6 border-2 border-orange bg-orange/5 rounded-xl md:col-span-2 space-y-4"
                    >
                      <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
                        <div className="flex-1 w-full space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                               <label className="block text-[9px] font-bold text-orange uppercase mb-1">Document Type</label>
                               <select 
                                 className="w-full bg-white border border-orange/20 rounded-lg px-4 py-2 text-xs outline-none focus:border-orange font-bold text-navy"
                                 value={newDocType}
                                 onChange={e => setNewDocType(e.target.value)}
                               >
                                 <option value="Rate Confirmation">Rate Confirmation</option>
                                 <option value="POD / BOL">POD / BOL</option>
                                 <option value="Lumper Receipt">Lumper Receipt</option>
                                 <option value="Scale Ticket">Scale Ticket</option>
                                 <option value="Invoice">Invoice</option>
                                 <option value="Other">Other</option>
                               </select>
                             </div>
                             <div>
                               <label className="block text-[9px] font-bold text-orange uppercase mb-1">Custom Label (Optional)</label>
                               <input 
                                 autoFocus
                                 className="w-full bg-white border border-orange/20 rounded-lg px-4 py-2 text-xs outline-none focus:border-orange font-medium"
                                 value={newDocName}
                                 onChange={e => setNewDocName(e.target.value)}
                                 placeholder="e.g. Signed POD - Final"
                                 onKeyDown={e => e.key === 'Enter' && handleAddDocSubmit(e as any)}
                               />
                             </div>
                           </div>
                           <div 
                             onClick={triggerFileUpload} 
                             className="border-2 border-dashed border-orange/30 hover:border-orange bg-white rounded-xl p-6 text-center cursor-pointer transition-all"
                           >
                              <Printer size={24} className="mx-auto text-orange mb-2" />
                              <p className="text-xs font-bold text-navy">Click to browse or drag and drop a file</p>
                              <p className="text-[10px] text-slate-500 mt-1">PDF, JPG, PNG up to 10MB</p>
                           </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                           <button 
                             type="button"
                             onClick={() => setShowAddDoc(false)}
                             className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase w-full md:w-auto bg-white rounded-lg border border-slate-200"
                           >
                             Cancel
                           </button>
                           <button 
                             onClick={handleAddDocSubmit}
                             className="px-6 py-3 bg-navy text-white text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-lg w-full md:w-auto hover:bg-navy-light"
                           >
                             Manual Entry without file
                           </button>
                        </div>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                    </motion.div>
                  )}
                  {(load.documents || []).map(doc => (
                    <div key={doc.id} className="p-4 border border-slate-100 rounded-xl flex items-center justify-between hover:border-orange transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange/5 flex items-center justify-center text-orange group-hover:bg-orange group-hover:text-white transition-all">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-navy-dark">{doc.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{doc.type} · {doc.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleViewDoc(doc)}
                          className="p-2 text-slate-400 hover:text-navy hover:bg-white rounded-md transition-all"
                          title="View Preview"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handleRemoveDocument(doc.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                          title="Delete Document"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => setShowAddDoc(true)}
                    className="p-4 border-2 border-dashed border-slate-100 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-orange transition-all group cursor-pointer"
                  >
                     <span className="text-[10px] font-black text-slate-300 uppercase group-hover:text-orange transition-colors">+ Upload Document</span>
                  </button>
                </div>
              )}

              {activeTab === 'Financials' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-teal/5 rounded-xl border border-teal/10">
                      <p className="text-[9px] font-bold text-teal uppercase tracking-widest mb-1">Gross Revenue</p>
                      <p className="text-xl font-head font-black text-teal">
                        ${(load.lineItems?.filter(i => i.type === 'Revenue').reduce((sum, item) => sum + item.amount, 0) || load.rate).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                      <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest mb-1">Total Expenses</p>
                      <p className="text-xl font-head font-black text-red-400">
                        -${(load.lineItems?.filter(i => i.type === 'Expense').reduce((sum, item) => sum + item.amount, 0) || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 bg-navy-dark rounded-xl border border-navy shadow-lg shadow-navy/10 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10">
                        <DollarSign size={40} className="text-white" />
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">Net Profit</p>
                      <div className="flex items-center gap-3 relative z-10">
                        <p className="text-xl font-head font-black text-white">
                          ${((load.lineItems?.filter(i => i.type === 'Revenue').reduce((sum, item) => sum + item.amount, 0) || load.rate) - 
                            (load.lineItems?.filter(i => i.type === 'Expense').reduce((sum, item) => sum + item.amount, 0) || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </p>
                        {(() => {
                          const revenue = (load.lineItems?.filter(i => i.type === 'Revenue').reduce((sum, item) => sum + item.amount, 0) || load.rate);
                          const profit = revenue - (load.lineItems?.filter(i => i.type === 'Expense').reduce((sum, item) => sum + item.amount, 0) || 0);
                          const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
                          return (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${margin >= 15 ? 'bg-teal/20 text-teal-300' : margin > 0 ? 'bg-orange/20 text-orange-300' : 'bg-red-500/20 text-red-300'}`}>
                              {margin.toFixed(1)}% Margin
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                    <div className="p-4 bg-slate-50/50 flex items-center justify-between">
                       <span className="text-[10px] font-bold text-navy uppercase tracking-widest">Line Item Detail</span>
                       {!showAddFinancial && (
                         <button 
                           onClick={() => setShowAddFinancial(true)}
                           className="text-[10px] font-bold text-orange uppercase tracking-wider hover:underline"
                         >
                           + Add Item
                         </button>
                       )}
                    </div>

                    {showAddFinancial && (
                      <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 bg-orange/5 border-b border-orange/10"
                      >
                        <form onSubmit={handleAddFinancial} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="md:col-span-2">
                             <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Description</label>
                             <input 
                               autoFocus
                               required
                               className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-orange"
                               value={newFinancial.description}
                               onChange={e => setNewFinancial({ ...newFinancial, description: e.target.value })}
                               placeholder="e.g. Fuel Surcharge"
                             />
                          </div>
                          <div>
                             <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Amount</label>
                             <div className="relative">
                               <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                               <input 
                                 required
                                 type="number"
                                 step="0.01"
                                 className="w-full bg-white border border-slate-200 rounded-lg pl-6 pr-3 py-2 text-xs outline-none focus:border-orange font-mono"
                                 value={newFinancial.amount}
                                 onChange={e => setNewFinancial({ ...newFinancial, amount: e.target.value })}
                                 placeholder="0.00"
                               />
                             </div>
                          </div>
                          <div>
                             <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Entry Type</label>
                             <div className="flex bg-white border border-slate-200 rounded-lg p-1">
                               <button 
                                 type="button"
                                 onClick={() => setNewFinancial({ ...newFinancial, type: 'Revenue' })}
                                 className={`flex-1 py-1 text-[9px] font-bold uppercase rounded ${newFinancial.type === 'Revenue' ? 'bg-teal text-white' : 'text-slate-400'}`}
                               >
                                 Revenue
                               </button>
                               <button 
                                 type="button"
                                 onClick={() => setNewFinancial({ ...newFinancial, type: 'Expense' })}
                                 className={`flex-1 py-1 text-[9px] font-bold uppercase rounded ${newFinancial.type === 'Expense' ? 'bg-red-400 text-white' : 'text-slate-400'}`}
                               >
                                 Expense
                               </button>
                             </div>
                          </div>
                          <div className="md:col-span-4 flex justify-end gap-2">
                            <button 
                              type="button"
                              onClick={() => setShowAddFinancial(false)}
                              className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase hover:text-navy"
                            >
                              Cancel
                            </button>
                            <button 
                              type="submit"
                              className="bg-orange text-white px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-orange/20"
                            >
                              Add Line Item
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}

                    {(load.lineItems && load.lineItems.length > 0) ? (
                      load.lineItems.map(item => (
                        <div key={item.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                          <div className="flex items-center gap-4">
                            {isEditing && (
                              <button 
                                onClick={() => handleRemoveFinancial(item.id)}
                                className="text-red-400 hover:text-red-600 transition-colors"
                              >
                                <XCircle size={14} />
                              </button>
                            )}
                            <div>
                              <p className="text-xs font-bold text-navy-dark">{item.description}</p>
                              <p className="text-[10px] text-slate-400 font-medium">Added to load</p>
                            </div>
                          </div>
                          <span className={`text-xs font-mono font-bold ${item.type === 'Revenue' ? 'text-teal' : 'text-red-400'}`}>
                            {item.type === 'Revenue' ? '+' : '-'}${item.amount.toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 flex justify-between items-center">
                         <div>
                           <p className="text-xs font-bold text-navy-dark">Linehaul Revenue</p>
                           <p className="text-[10px] text-slate-400">Fixed rate via Contract</p>
                         </div>
                         <span className="text-xs font-mono font-bold text-teal">+${load.rate.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'Activity Log' && (
                <div className="space-y-6 animate-in fade-in duration-500 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                   {(load.activityLog && load.activityLog.length > 0) ? (
                     load.activityLog.map((log) => {
                       let icon = <Activity size={14}/>;
                       let color = 'text-blue-500 bg-blue-50';
                       
                       switch(log.type) {
                         case 'status': 
                           icon = <Navigation size={14}/>;
                           color = 'text-purple-500 bg-purple-50';
                           break;
                         case 'document':
                           icon = <FileCheck size={14}/>;
                           color = 'text-teal bg-teal/10';
                           break;
                         case 'financial':
                           icon = <DollarSign size={14}/>;
                           color = 'text-orange bg-orange/10';
                           break;
                         case 'edit':
                           icon = <Edit2 size={14}/>;
                           color = 'text-navy-light bg-slate-50';
                           break;
                         case 'system':
                           icon = <Layers size={14}/>;
                           color = 'text-slate-400 bg-slate-100';
                           break;
                       }

                       return (
                         <div key={log.id} className="flex gap-4 group">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-white shadow-sm z-10 ${color}`}>
                              {icon}
                            </div>
                            <div className="pb-6 border-l-2 border-slate-50 pl-6 -ml-10 pt-1 flex-1">
                               <div className="flex items-center justify-between mb-1">
                                 <p className="text-xs font-bold text-navy-dark tracking-tight">{log.action}</p>
                                 <span className="text-[10px] text-slate-400 font-mono text-right">{log.date}</span>
                               </div>
                               <p className="text-[10px] text-slate-400 font-medium">Operator: {log.user}</p>
                            </div>
                         </div>
                       );
                     })
                   ) : (
                     <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                        <History size={48} className="mb-4 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">No activity recorded yet</p>
                     </div>
                   )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Sidebar - Timeline */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col h-fit">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Timeline</h4>
          
          <div className="space-y-8 relative">
            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-100" />
            
            <div className="relative pl-7 group">
              <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-teal shadow-lg shadow-teal/20 z-10 border-2 border-white" />
              <p className="text-[10px] text-slate-400 font-mono">Mar 15, 06:12 AM</p>
              <h5 className="text-sm font-bold text-navy-dark">Dispatched</h5>
            </div>

            <div className="relative pl-7 group">
              <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-teal shadow-lg shadow-teal/20 z-10 border-2 border-white" />
              <p className="text-[10px] text-slate-400 font-mono">08:22 AM</p>
              <h5 className="text-sm font-bold text-navy-dark">Arrived Pickup</h5>
            </div>

            <div className="relative pl-7 group">
              <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-teal shadow-lg shadow-teal/20 z-10 border-2 border-white" />
              <p className="text-[10px] text-slate-400 font-mono">09:51 AM</p>
              <h5 className="text-sm font-bold text-navy-dark">Loaded</h5>
            </div>

            <div className="relative pl-7 group">
              <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/20 z-10 border-2 border-white ring-2 ring-blue-500/10" />
              <p className="text-[10px] text-slate-400 font-mono">10:08 AM</p>
              <h5 className="text-sm font-bold text-navy-dark animate-pulse">In Transit</h5>
            </div>

            <div className="relative pl-7 group">
              <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-slate-100 z-10 border-2 border-white" />
              <p className="text-[10px] text-slate-400 font-mono">~3:45 PM</p>
              <h5 className="text-sm font-bold text-slate-400">Est. Delivery</h5>
            </div>
          </div>

          <div className="mt-12 space-y-3">
             <button className="w-full py-3 bg-navy text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-navy-light transition-all shadow-lg shadow-navy/10">
                Live Tracking Map
             </button>
             <button className="w-full py-3 bg-white border border-slate-200 text-slate-400 rounded-xl text-xs font-bold uppercase tracking-widest hover:border-navy hover:text-navy transition-all">
                Share Status
             </button>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      {selectedDocPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-12">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSelectedDocPreview(null)}
            className="absolute inset-0 bg-navy-dark/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-5xl h-full rounded-2xl shadow-2xl relative z-10 flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-orange/10 flex items-center justify-center text-orange">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-navy-dark">{selectedDocPreview.name}</h3>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{selectedDocPreview.type} · {selectedDocPreview.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-navy">
                  <Printer size={18} />
                </button>
                <button 
                  onClick={() => setSelectedDocPreview(null)}
                  className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-red-500"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-slate-100 p-8 overflow-y-auto">
              {/* Mock Document Page */}
              <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-sm min-h-[1000px] p-12 text-slate-800">
                <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
                   <div>
                     <h1 className="text-2xl font-black text-navy-dark mb-1">TRUCKFLOW LOGISTICS</h1>
                     <p className="text-xs text-slate-500 font-medium">123 Dispatch Way, Suite 400<br/>Chicago, IL 60601</p>
                   </div>
                   <div className="text-right">
                     <div className="inline-block bg-navy text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest mb-4">
                       {selectedDocPreview.name.toUpperCase()}
                     </div>
                     <p className="text-xs text-slate-500">Date: <span className="font-bold text-slate-800">{selectedDocPreview.date}</span></p>
                     <p className="text-xs text-slate-500">Load #: <span className="font-bold text-slate-800">{load.loadNumber}</span></p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-12">
                   <div>
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Bill To</h4>
                     <p className="text-sm font-bold text-navy-dark">{customer?.name}</p>
                     <p className="text-xs text-slate-500 mt-1">Ref PO: {load.customerPo || 'N/A'}</p>
                   </div>
                   <div>
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Carrier</h4>
                     <p className="text-sm font-bold text-navy-dark">{driver?.name || 'Unassigned'}</p>
                     <p className="text-xs text-slate-500 mt-1">Truck ID: {truck?.unitNumber || 'TBD'}</p>
                   </div>
                </div>

                <div className="border border-slate-900 mb-12">
                   <div className="bg-slate-900 text-white grid grid-cols-4 p-2 text-[10px] font-bold uppercase tracking-widest">
                      <div className="col-span-2">Description</div>
                      <div className="text-center">Reference</div>
                      <div className="text-right">Amount</div>
                   </div>
                   <div className="grid grid-cols-4 p-4 text-xs">
                      <div className="col-span-2 font-bold">{load.commodity} Linehaul</div>
                      <div className="text-center text-slate-400">{load.loadNumber}</div>
                      <div className="text-right font-mono font-bold">${load.rate.toLocaleString()}</div>
                   </div>
                   <div className="grid grid-cols-4 p-4 text-xs border-t border-slate-100 italic text-slate-500">
                      <div className="col-span-4">* Document electronically signed and verified by carrier app.</div>
                   </div>
                </div>

                <div className="mt-20 flex justify-between items-end grayscale opacity-50">
                   <div className="w-48 h-12 border-b-2 border-slate-300 relative">
                     <div className="absolute inset-0 flex items-center justify-center font-serif italic text-navy-light text-xl">
                       {driver?.name}
                     </div>
                     <span className="absolute -bottom-5 left-0 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carrier signature</span>
                   </div>
                   <div className="w-48 h-12 border-b-2 border-slate-300 relative">
                     <span className="absolute -bottom-5 left-0 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Shipper signature</span>
                   </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedDocPreview(null)}
                className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-navy hover:text-navy-light transition-all"
              >
                Close Preview
              </button>
              <button className="px-6 py-2 bg-navy text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-navy-light transition-all shadow-lg shadow-navy/10">
                Download PDF
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Plus({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
