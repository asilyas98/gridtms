import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Check, Package, MapPin, DollarSign, Building2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { LoadStatus, Driver, Truck } from '../../types';

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

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

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
      
      let nextData = { ...data.draftLoad };
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
    let truckId = undefined;
    
    if (isDispatched) {
      const driver = drivers.find(d => d.id === formData.driverId);
      truckId = driver?.truckId;
      if (driver) updateDriver(driver.id, { status: 'On Route' });
      if (truckId) updateTruck(truckId, { status: 'On Route' });
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-dark/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-head font-extrabold text-navy-dark">Create New Load</h2>
            <p className="text-xs text-slate-500">Guided setup for a new freight movement.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-100">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all
                ${step > i ? 'bg-teal text-white' : step === i ? 'bg-navy text-white' : 'bg-slate-200 text-slate-500'}`}>
                {step > i ? <Check size={12} /> : i}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${step === i ? 'text-navy' : 'text-slate-400'}`}>
                {i === 1 ? 'Customer' : i === 2 ? 'Route' : i === 3 ? 'Freight' : 'Financials'}
              </span>
              {i < 4 && <ChevronRight size={14} className="text-slate-300" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <Building2 size={14} className="text-orange" /> Select Customer
                    </span>
                    <select 
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-orange/20 focus:border-orange outline-none"
                      value={formData.customerId}
                      onChange={e => setFormData({ ...formData, customerId: e.target.value })}
                    >
                      <option value="">Choose a customer...</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                    </select>
                    <div className="text-right mt-2">
                       <button type="button" onClick={handleAddCustomer} className="text-[10px] uppercase font-bold tracking-widest text-orange hover:underline">
                         + Add New Customer
                       </button>
                    </div>
                  </label>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <MapPin size={14} className="text-teal" /> Origin
                    </span>
                    <select 
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-teal/20 focus:border-teal outline-none"
                      value={formData.originId}
                      onChange={e => setFormData({ ...formData, originId: e.target.value })}
                    >
                      <option value="">Select origin...</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name} - {l.address.city}, {l.address.state}</option>)}
                    </select>
                    <div className="text-right mt-2">
                       <button type="button" onClick={handleAddOrigin} className="text-[10px] uppercase font-bold tracking-widest text-teal hover:underline">
                         + Add New Location
                       </button>
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Pickup Date</span>
                    <input 
                      type="date"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm mt-1"
                      value={formData.pickupDate}
                      onChange={e => setFormData({ ...formData, pickupDate: e.target.value })}
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <MapPin size={14} className="text-orange" /> Destination
                    </span>
                    <select 
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-orange/20 focus:border-orange outline-none"
                      value={formData.destinationId}
                      onChange={e => setFormData({ ...formData, destinationId: e.target.value })}
                    >
                      <option value="">Select destination...</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name} - {l.address.city}, {l.address.state}</option>)}
                    </select>
                    <div className="text-right mt-2">
                       <button type="button" onClick={handleAddDestination} className="text-[10px] uppercase font-bold tracking-widest text-orange hover:underline">
                         + Add New Location
                       </button>
                    </div>
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Delivery Date</span>
                    <input 
                      type="date"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm mt-1"
                      value={formData.deliveryDate}
                      onChange={e => setFormData({ ...formData, deliveryDate: e.target.value })}
                    />
                  </label>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-6">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <Package size={14} className="text-navy" /> Commodity
                    </span>
                    <input 
                      type="text"
                      placeholder="e.g. Dry Goods"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm"
                      value={formData.commodity}
                      onChange={e => setFormData({ ...formData, commodity: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Equipment Type</span>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm mt-1"
                      value={formData.equipmentType}
                      onChange={e => setFormData({ ...formData, equipmentType: e.target.value })}
                    >
                      <option>Dry Van 53'</option>
                      <option>Reefer 53'</option>
                      <option>Flatbed</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Weight (lbs)</span>
                    <input 
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm mt-1"
                      value={Number.isNaN(formData.weight) ? '' : formData.weight}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                        setFormData({ ...formData, weight: Number.isNaN(val) ? 0 : val });
                      }}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Customer PO</span>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm mt-1"
                      value={formData.customerPo}
                      onChange={e => setFormData({ ...formData, customerPo: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">BOL Number</span>
                    <input 
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm mt-1"
                      value={formData.bolNumber}
                      onChange={e => setFormData({ ...formData, bolNumber: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Service Level</span>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm mt-1"
                      value={formData.serviceLevel}
                      onChange={e => setFormData({ ...formData, serviceLevel: e.target.value })}
                    >
                      <option>Standard</option>
                      <option>Expedited</option>
                      <option>Team</option>
                    </select>
                  </label>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-6">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <DollarSign size={14} className="text-teal" /> Linehaul Rate
                    </span>
                    <input 
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm"
                      value={Number.isNaN(formData.rate) ? '' : formData.rate}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setFormData({ ...formData, rate: Number.isNaN(val) ? 0 : val });
                      }}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Trip Miles</span>
                    <input 
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm mt-1"
                      value={Number.isNaN(formData.miles) ? '' : formData.miles}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setFormData({ ...formData, miles: Number.isNaN(val) ? 0 : val });
                      }}
                    />
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mt-6">
                  <label className="block">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Quick Assign Driver (Optional)</span>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm mt-1"
                      value={formData.driverId}
                      onChange={e => setFormData({ ...formData, driverId: e.target.value })}
                    >
                      <option value="">Unassigned (Send to Dispatch Board)</option>
                      {drivers.filter(d => d.status === 'Available' && d.truckId).map(d => (
                        <option key={d.id} value={d.id}>{d.name} (Unit {trucks.find(t => t.id === d.truckId)?.unitNumber})</option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-400 mt-1 italic">Selecting a driver skips the dispatch board and immediately sets status to Dispatched.</p>
                  </label>
                </div>
                
                <div className="p-6 bg-navy text-white rounded-xl shadow-lg flex justify-between items-center mt-6">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Projected Revenue</p>
                    <h3 className="text-3xl font-head font-extrabold text-white">${formData.rate.toLocaleString()}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400">RPM</p>
                    <h3 className="text-xl font-mono font-bold">${formData.miles > 0 ? (formData.rate / formData.miles).toFixed(2) : '0.00'}/mi</h3>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        <div className="p-6 border-t border-slate-100 bg-white sticky bottom-0 flex justify-between">
          <button 
            type="button"
            onClick={step === 1 ? onClose : handleBack}
            className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
          >
            <ChevronLeft size={16} /> {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          {step < 4 ? (
            <button 
              type="button"
              onClick={handleNext}
              className="px-8 py-2.5 bg-navy text-white rounded-lg text-sm font-bold hover:bg-navy-light transition-all shadow-md flex items-center gap-2"
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              className={`px-10 py-2.5 text-white rounded-lg text-sm font-bold transition-all shadow-lg ${formData.driverId ? 'bg-teal hover:bg-teal-light shadow-teal/20' : 'bg-orange hover:bg-orange/90 shadow-orange/20'}`}
            >
              {formData.driverId ? 'Finalize & Dispatch Load' : 'Finalize Load Record'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
