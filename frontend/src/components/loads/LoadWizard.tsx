import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Package, 
  MapPin, 
  DollarSign, 
  Building2,
  Calendar,
  Truck,
  CreditCard,
  Phone,
  Mail,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { LoadStatus } from '../../types';

interface LoadWizardProps {
  isOpen: boolean;
  onClose: () => void;
  navigate: (view: string, loadId: string | null) => void;
}

export default function LoadWizard({ isOpen, onClose, navigate }: LoadWizardProps) {
  const { customers, locations, drivers, trucks, addLoad, updateDriver, updateTruck, navigationIntent, setNavigationIntent } = useData();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    customerId: '',
    originId: '',
    destinationId: '',
    pickupDate: new Date().toISOString().split('T')[0],
    deliveryDate: new Date().toISOString().split('T')[0],
    rate: 0,
    miles: 0,
    commodity: '',
    weight: 0,
    equipmentType: "Dry Van 53'",
    customerPo: '',
    bolNumber: '',
    serviceLevel: 'Standard',
    driverId: '',
  });

  const handleNext = () => setStep(s => Math.min(4, s + 1));
  const handleBack = () => setStep(s => Math.max(1, s - 1));

  const handleAddCustomer = () => {
    onClose();
    setNavigationIntent({ view: 'customers', action: 'create', returnTo: 'loads', returnData: { draftLoad: formData, step: 1, type: 'customer' } });
  };

  const handleAddOrigin = () => {
    onClose();
    setNavigationIntent({ view: 'locations', action: 'create', returnTo: 'loads', returnData: { draftLoad: formData, step: 2, type: 'location_origin' } });
  };

  const handleAddDestination = () => {
    onClose();
    setNavigationIntent({ view: 'locations', action: 'create', returnTo: 'loads', returnData: { draftLoad: formData, step: 2, type: 'location_dest' } });
  };

  React.useEffect(() => {
    if (isOpen && navigationIntent?.action === 'resume_wizard' && navigationIntent.returnData) {
      const data = navigationIntent.returnData;
      
      const nextData = { ...data.draftLoad };
      if (data.newId) {
        if (data.type === 'customer') nextData.customerId = data.newId;
        else if (data.type === 'location_origin') nextData.originId = data.newId;
        else if (data.type === 'location_dest') nextData.destinationId = data.newId;
      }
      
      setFormData(nextData);
      setStep(data.step);
      
      // Clear intent so we don't loop
      setTimeout(() => setNavigationIntent(null), 10);
    }
  }, [isOpen, navigationIntent, setNavigationIntent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if we are automatically dispatching
    const isDispatched = formData.driverId !== '';
    let truckId: string | undefined = undefined;
    
    if (isDispatched) {
      const driver = drivers.find(d => d.id === formData.driverId);
      truckId = driver?.truckId;
      if (driver) updateDriver(driver.id, { status: 'On Load' });
      if (truckId) updateTruck(truckId, { status: 'In Use' });
    }

    const { driverId, ...loadData } = formData;

    const newLoadId = addLoad({
      ...loadData,
      driverId: isDispatched ? driverId : undefined,
      truckId: truckId,
      status: (isDispatched ? 'Dispatched' : 'Created') as LoadStatus,
      lineItems: [
        { id: `li-${Math.random().toString(36).substr(2, 9)}`, description: 'Linehaul Rate', amount: formData.rate, type: 'Revenue' }
      ]
    });
    onClose();
    // Guided Workflow: Move to load detail view
    navigate('loads', newLoadId);
  };

  // Validation checks per step
  const isStepValid = () => {
    if (step === 1) return Boolean(formData.customerId);
    if (step === 2) return Boolean(formData.originId && formData.destinationId);
    if (step === 3) return Boolean(formData.commodity && formData.commodity.trim().length > 0);
    if (step === 4) return Boolean(formData.rate && formData.rate > 0);
    return true;
  };

  const selectedCustomer = customers.find(c => c.id === formData.customerId);
  const selectedOrigin = locations.find(l => l.id === formData.originId);
  const selectedDest = locations.find(l => l.id === formData.destinationId);

  const stepNames = ['Customer', 'Route', 'Freight', 'Financials'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-dark/60 backdrop-blur-sm p-4">
      {/* 
        Fixed modal height container (h-[670px] max-h-[92vh])
        Prevents vertical bouncing/shifting across steps while giving 
        a clean, stable Apple-inspired experience.
      */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 14 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl w-full max-w-4xl h-[670px] max-h-[92vh] overflow-hidden flex flex-col relative border border-slate-200/80 dark:border-white/10"
      >
        {/* Header - Fixed Height & Docked */}
        <div className="h-[74px] shrink-0 px-8 border-b border-slate-100 dark:border-white/10 flex justify-between items-center bg-white dark:bg-[#1C1C1E] z-10">
          <div>
            <h2 className="text-xl font-head font-extrabold text-navy-dark dark:text-white tracking-tight">Create New Load</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Guided setup for a new freight movement.</p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            title="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Progress Tracker - Fixed Height & Docked */}
        <div className="h-[52px] shrink-0 bg-slate-50/80 dark:bg-white/5 px-8 flex items-center justify-between border-b border-slate-100 dark:border-white/10 select-none">
          {stepNames.map((name, index) => {
            const stepNum = index + 1;
            const isCompleted = step > stepNum;
            const isActive = step === stepNum;
            return (
              <React.Fragment key={name}>
                <div className="flex items-center gap-2.5">
                  <div 
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                      isCompleted 
                        ? 'bg-teal text-white' 
                        : isActive 
                        ? 'bg-navy dark:bg-white dark:text-navy text-white' 
                        : 'bg-slate-200 dark:bg-white/15 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check size={13} strokeWidth={2.5} /> : stepNum}
                  </div>
                  <span 
                    className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${
                      isActive 
                        ? 'text-navy dark:text-white' 
                        : isCompleted 
                        ? 'text-teal dark:text-teal-light' 
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {name}
                  </span>
                </div>
                {stepNum < 4 && (
                  <div className="flex-1 mx-4 h-[1px] bg-slate-200 dark:bg-white/10 hidden sm:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Scrollable Form Body - Stable Scrollbar Gutter */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6 [scrollbar-gutter:stable] focus:outline-none">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.16 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <Building2 size={14} className="text-orange" /> Select Customer or Shipper
                    </span>
                    <select 
                      required
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange/20 focus:border-orange outline-none dark:text-white"
                      value={formData.customerId}
                      onChange={e => setFormData({ ...formData, customerId: e.target.value })}
                    >
                      <option value="" className="dark:bg-[#1C1C1E]">Choose a customer...</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id} className="dark:bg-[#1C1C1E]">
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[11px] text-slate-400">
                        {formData.customerId ? 'Customer account linked for billing and dispatch.' : 'Select a verified billing customer to proceed.'}
                      </p>
                      <button 
                        type="button" 
                        onClick={handleAddCustomer} 
                        className="text-[10px] uppercase font-bold tracking-widest text-orange bg-orange/10 hover:bg-orange/20 px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus size={14} /> Add New Customer
                      </button>
                    </div>
                  </label>
                </div>

                {/* Customer Details Preview Card */}
                {selectedCustomer ? (
                  <div className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 space-y-3 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-navy dark:text-white">{selectedCustomer.name}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold">
                            {selectedCustomer.code}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {selectedCustomer.address.city}, {selectedCustomer.address.state}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        selectedCustomer.status === 'Active' 
                          ? 'bg-teal/10 text-teal dark:bg-teal/20 dark:text-teal-light' 
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}>
                        {selectedCustomer.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Terms</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {selectedCustomer.paymentTerms || 'Net 30'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Credit Limit</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          ${(selectedCustomer.creditLimit || 25000).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Contact</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200 truncate block">
                          {selectedCustomer.phone || selectedCustomer.email || 'Direct Dispatch'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Billing Method</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {selectedCustomer.billingDeliveryMethod || 'Email Invoicing'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                    <Building2 size={28} className="text-slate-300 dark:text-slate-600" />
                    <p className="text-xs font-medium">Please pick a shipper or broker from the menu above to unlock route details.</p>
                  </div>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.16 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Origin */}
                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-2">
                        <MapPin size={14} className="text-teal" /> Origin (Shipper)
                      </span>
                      <select 
                        required
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal/20 focus:border-teal outline-none dark:text-white"
                        value={formData.originId}
                        onChange={e => setFormData({ ...formData, originId: e.target.value })}
                      >
                        <option value="" className="dark:bg-[#1C1C1E]">Select origin location...</option>
                        {locations.map(l => (
                          <option key={l.id} value={l.id} className="dark:bg-[#1C1C1E]">
                            {l.name} — {l.address.city}, {l.address.state}
                          </option>
                        ))}
                      </select>
                      <div className="text-right mt-2">
                        <button 
                          type="button" 
                          onClick={handleAddOrigin} 
                          className="text-[10px] uppercase font-bold tracking-widest text-teal bg-teal/10 hover:bg-teal/20 px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 w-full sm:w-auto"
                        >
                          <Plus size={14} /> Add New Location
                        </button>
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Pickup Date
                      </span>
                      <input 
                        type="date"
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none dark:text-white"
                        value={formData.pickupDate}
                        onChange={e => setFormData({ ...formData, pickupDate: e.target.value })}
                      />
                    </label>
                  </div>

                  {/* Destination */}
                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-2">
                        <MapPin size={14} className="text-orange" /> Destination (Receiver)
                      </span>
                      <select 
                        required
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange/20 focus:border-orange outline-none dark:text-white"
                        value={formData.destinationId}
                        onChange={e => setFormData({ ...formData, destinationId: e.target.value })}
                      >
                        <option value="" className="dark:bg-[#1C1C1E]">Select destination location...</option>
                        {locations.map(l => (
                          <option key={l.id} value={l.id} className="dark:bg-[#1C1C1E]">
                            {l.name} — {l.address.city}, {l.address.state}
                          </option>
                        ))}
                      </select>
                      <div className="text-right mt-2">
                        <button 
                          type="button" 
                          onClick={handleAddDestination} 
                          className="text-[10px] uppercase font-bold tracking-widest text-orange hover:underline px-2 py-1"
                        >
                          + Add New Location
                        </button>
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Delivery Date
                      </span>
                      <input 
                        type="date"
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none dark:text-white"
                        value={formData.deliveryDate}
                        onChange={e => setFormData({ ...formData, deliveryDate: e.target.value })}
                      />
                    </label>
                  </div>
                </div>

                {/* Route Summary Preview */}
                {selectedOrigin && selectedDest && (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 flex items-center justify-between text-xs animate-in fade-in duration-300">
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-bold text-navy dark:text-white block">{selectedOrigin.address.city}, {selectedOrigin.address.state}</span>
                        <span className="text-[10px] text-slate-400">{selectedOrigin.name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 px-2">
                        <ArrowRight size={16} className="text-teal" />
                      </div>
                      <div>
                        <span className="font-bold text-navy dark:text-white block">{selectedDest.address.city}, {selectedDest.address.state}</span>
                        <span className="text-[10px] text-slate-400">{selectedDest.name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">Schedule</span>
                      <span className="font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                        {formData.pickupDate} ➔ {formData.deliveryDate}
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.16 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <Package size={14} className="text-navy dark:text-white" /> Commodity Description
                    </span>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Dry Goods, Auto Parts, Beverage"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none dark:text-white"
                      value={formData.commodity}
                      onChange={e => setFormData({ ...formData, commodity: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Equipment Type
                    </span>
                    <select 
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none dark:text-white"
                      value={formData.equipmentType}
                      onChange={e => setFormData({ ...formData, equipmentType: e.target.value })}
                    >
                      <option className="dark:bg-[#1C1C1E]">Dry Van 53'</option>
                      <option className="dark:bg-[#1C1C1E]">Reefer 53'</option>
                      <option className="dark:bg-[#1C1C1E]">Flatbed</option>
                      <option className="dark:bg-[#1C1C1E]">Step Deck</option>
                      <option className="dark:bg-[#1C1C1E]">Power Only</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Weight (lbs)
                    </span>
                    <input 
                      type="number"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none dark:text-white"
                      value={Number.isNaN(formData.weight) || formData.weight === 0 ? '' : formData.weight}
                      placeholder="e.g. 42000"
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                        setFormData({ ...formData, weight: Number.isNaN(val) ? 0 : val });
                      }}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Service Level
                    </span>
                    <select 
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none dark:text-white"
                      value={formData.serviceLevel}
                      onChange={e => setFormData({ ...formData, serviceLevel: e.target.value })}
                    >
                      <option className="dark:bg-[#1C1C1E]">Standard</option>
                      <option className="dark:bg-[#1C1C1E]">Expedited</option>
                      <option className="dark:bg-[#1C1C1E]">Team</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Customer PO #
                    </span>
                    <input 
                      type="text"
                      placeholder="e.g. PO-89240"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none dark:text-white"
                      value={formData.customerPo}
                      onChange={e => setFormData({ ...formData, customerPo: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      BOL Number
                    </span>
                    <input 
                      type="text"
                      placeholder="e.g. BOL-10928"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none dark:text-white"
                      value={formData.bolNumber}
                      onChange={e => setFormData({ ...formData, bolNumber: e.target.value })}
                    />
                  </label>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.16 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <DollarSign size={14} className="text-teal" /> Linehaul Rate ($ USD)
                    </span>
                    <input 
                      type="number"
                      required
                      placeholder="e.g. 2450"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none dark:text-white font-semibold"
                      value={Number.isNaN(formData.rate) || formData.rate === 0 ? '' : formData.rate}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setFormData({ ...formData, rate: Number.isNaN(val) ? 0 : val });
                      }}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Trip Miles
                    </span>
                    <input 
                      type="number"
                      placeholder="e.g. 640"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none dark:text-white font-semibold"
                      value={Number.isNaN(formData.miles) || formData.miles === 0 ? '' : formData.miles}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setFormData({ ...formData, miles: Number.isNaN(val) ? 0 : val });
                      }}
                    />
                  </label>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Quick Assign Driver (Optional)
                    </span>
                    <select 
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none dark:text-white"
                      value={formData.driverId}
                      onChange={e => setFormData({ ...formData, driverId: e.target.value })}
                    >
                      <option value="" className="dark:bg-[#1C1C1E]">Unassigned (Send to Dispatch Board)</option>
                      {drivers.filter(d => d.status === 'Available' && d.truckId).map(d => (
                        <option key={d.id} value={d.id} className="dark:bg-[#1C1C1E]">
                          {d.name} (Unit {trucks.find(t => t.id === d.truckId)?.unitNumber})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      Selecting a driver automatically marks status as <span className="font-semibold text-teal">Dispatched</span> and reserves their truck.
                    </p>
                  </label>
                </div>
                
                {/* Financial Summary Card */}
                <div className="p-6 bg-navy text-white rounded-2xl shadow-lg flex justify-between items-center">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Projected Revenue</p>
                    <h3 className="text-3xl font-head font-extrabold text-white mt-0.5">
                      ${(formData.rate || 0).toLocaleString()}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Rate Per Mile (RPM)</p>
                    <h3 className="text-2xl font-mono font-bold text-teal-light mt-0.5">
                      ${formData.miles > 0 && formData.rate > 0 ? (formData.rate / formData.miles).toFixed(2) : '0.00'}/mi
                    </h3>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* 
          Fixed Docked Persistent Footer
          The right-aligned button container has a fixed width (w-56)
          and the modal dialog has a fixed height (h-[670px]), guaranteeing
          that the Continue button NEVER shifts position across steps.
        */}
        <div className="h-[76px] shrink-0 px-8 border-t border-slate-100 dark:border-white/10 bg-white dark:bg-[#1C1C1E] flex items-center justify-between z-10 select-none">
          {/* Left Action (Cancel / Back) with stable width */}
          <button 
            type="button"
            onClick={step === 1 ? onClose : handleBack}
            className="w-28 h-11 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-98"
          >
            <ChevronLeft size={16} /> {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          {/* Middle: Apple-Style Step Indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500 tracking-wide">
            <span>Step {step} of 4</span>
            <span>•</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300">{stepNames[step - 1]}</span>
          </div>

          {/* Right Action Container: Anchored fixed-width box */}
          <div className="w-56 flex justify-end shrink-0">
            {step < 4 ? (
              <button 
                type="button"
                onClick={handleNext}
                disabled={!isStepValid()}
                className={`w-full h-11 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 active:scale-98 ${
                  isStepValid()
                    ? 'bg-navy dark:bg-slate-800 text-white hover:bg-navy-light cursor-pointer shadow-navy/20'
                    : 'bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                }`}
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button 
                type="button"
                onClick={handleSubmit}
                disabled={!isStepValid()}
                className={`w-full h-11 text-white rounded-xl text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-2 active:scale-98 ${
                  isStepValid()
                    ? (formData.driverId 
                        ? 'bg-teal hover:bg-teal-light shadow-teal/20 cursor-pointer' 
                        : 'bg-orange hover:bg-orange/90 shadow-orange/20 cursor-pointer')
                    : 'bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                }`}
              >
                {formData.driverId ? 'Finalize & Dispatch' : 'Finalize Load'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
