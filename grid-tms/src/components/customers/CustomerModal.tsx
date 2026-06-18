import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Building2, MapPin, Phone, Mail, DollarSign, Wallet } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Customer } from '../../types';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
}

export default function CustomerModal({ isOpen, onClose, customerToEdit }: CustomerModalProps) {
  const { addCustomer, updateCustomer } = useData();
  const [formData, setFormData] = useState({
    name: '',
    status: 'Active' as const,
    creditLimit: 50000,
    outstandingBalance: 0,
    phone: '',
    email: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'USA'
    }
  });

  useEffect(() => {
    if (customerToEdit) {
      setFormData({
        name: customerToEdit.name,
        status: customerToEdit.status,
        creditLimit: customerToEdit.creditLimit,
        outstandingBalance: customerToEdit.outstandingBalance,
        phone: customerToEdit.phone,
        email: customerToEdit.email,
        address: {
          street: customerToEdit.address.street || '',
          city: customerToEdit.address.city || '',
          state: customerToEdit.address.state || '',
          zip: customerToEdit.address.zip || '',
          country: customerToEdit.address.country || 'USA'
        }
      });
    } else {
      setFormData({
        name: '',
        status: 'Active' as const,
        creditLimit: 50000,
        outstandingBalance: 0,
        phone: '',
        email: '',
        address: {
          street: '',
          city: '',
          state: '',
          zip: '',
          country: 'USA'
        }
      });
    }
  }, [customerToEdit?.id, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customerToEdit) {
      updateCustomer(customerToEdit.id, formData);
    } else {
      addCustomer(formData);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-dark/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-head font-extrabold text-navy-dark">
            {customerToEdit ? 'Edit Customer Profile' : 'New Customer Profile'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <label className="col-span-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Legal Company Name</span>
              <input 
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 mt-1 outline-none focus:ring-2 focus:ring-orange/20"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </label>
            
            <label>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Phone</span>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 mt-1"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </label>
            
            <label>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Billing Email</span>
              <input 
                type="email"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 mt-1"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </label>

            <div className="col-span-2 space-y-4 pt-4 border-t border-slate-50">
              <span className="text-[10px] font-bold text-navy uppercase tracking-widest block">Primary Address</span>
              <input 
                placeholder="Street Address"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2"
                value={formData.address.street}
                onChange={e => setFormData({ ...formData, address: { ...formData.address, street: e.target.value } })}
              />
              <div className="grid grid-cols-3 gap-4">
                <input 
                  placeholder="City"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2"
                  value={formData.address.city}
                  onChange={e => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                />
                <input 
                  placeholder="State"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2"
                  value={formData.address.state}
                  onChange={e => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                />
                <input 
                  placeholder="ZIP"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2"
                  value={formData.address.zip}
                  onChange={e => setFormData({ ...formData, address: { ...formData.address, zip: e.target.value } })}
                />
              </div>
            </div>

            <div className="col-span-2 space-y-4 pt-4 border-t border-slate-50">
              <span className="text-[10px] font-bold text-navy uppercase tracking-widest block">Financial Settings</span>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Credit Limit</span>
                  <div className="relative mt-1">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2"
                      value={Number.isNaN(formData.creditLimit) ? '' : formData.creditLimit}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                        setFormData({ ...formData, creditLimit: Number.isNaN(val) ? 0 : val });
                      }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Current Outstanding Balance</span>
                  <div className="relative mt-1">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2"
                      value={Number.isNaN(formData.outstandingBalance) ? '' : formData.outstandingBalance}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                        setFormData({ ...formData, outstandingBalance: Number.isNaN(val) ? 0 : val });
                      }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Initial Status</span>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 mt-1"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <option value="Active">Active</option>
                    <option value="Prospect">Prospect</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-10 py-2.5 bg-navy text-white rounded-lg text-sm font-bold hover:bg-navy-light transition-all shadow-lg"
            >
              {customerToEdit ? 'Save Profile' : 'Configure Customer'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
