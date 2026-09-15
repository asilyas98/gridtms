import React, { useState, useRef } from 'react';
import { 
  Building2, 
  CreditCard, 
  MapPin, 
  Phone, 
  Mail, 
  ExternalLink,
  Plus,
  Search,
  XCircle,
  Edit2,
  Trash2,
  DollarSign,
  Receipt,
  FileText,
  TrendingUp,
  X,
  Check,
  AlertTriangle,
  ArrowLeft,
  UploadCloud,
  File,
  AlertCircle,
  Info,
  Settings,
  ShieldCheck,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { motion, AnimatePresence } from 'motion/react';
import { Customer, Address, ComplianceDocument } from '../types';

import { uploadFileToSupabase } from '../lib/storage';

export default function CustomersView() {
  const { 
    customers, 
    addCustomer,
    updateCustomer, 
    deleteCustomer, 
    loads, 
    invoices, 
    updateInvoice,
    navigationIntent,
    setNavigationIntent
  } = useData();

  // Navigation states
  const [showCreationMode, setShowCreationMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [localIntent, setLocalIntent] = useState<any>(null);

  React.useEffect(() => {
    if (navigationIntent && navigationIntent.view === 'customers') {
      if (navigationIntent.action === 'create') {
        setShowCreationMode(true);
        if (navigationIntent.returnTo) setLocalIntent(navigationIntent);
      }
      if (navigationIntent.searchQuery) {
        setSearchQuery(navigationIntent.searchQuery);
      }
      setNavigationIntent(null);
    }
  }, [navigationIntent, setNavigationIntent]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Detail Modals
  const [accountingCustomer, setAccountingCustomer] = useState<Customer | null>(null);
  const [activeLoadsCustomer, setActiveLoadsCustomer] = useState<Customer | null>(null);
  
  // Accounting adjustment variables
  const [paymentAmount, setPaymentAmount] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState('');

  // ==========================================
  // Form Field States (Comprehensive TMS Form)
  // ==========================================
  const [custName, setCustName] = useState('');
  const [custDba, setCustDba] = useState('');
  const [custStatus, setCustStatus] = useState<'Active' | 'On Hold' | 'Inactive' | 'Prospect'>('Active');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custMcNumber, setCustMcNumber] = useState('');
  const [custDotNumber, setCustDotNumber] = useState('');
  const [custTaxId, setCustTaxId] = useState('');

  // Headquarters Address (Physical)
  const [custStreet, setCustStreet] = useState('');
  const [custCity, setCustCity] = useState('');
  const [custState, setCustState] = useState('');
  const [custZip, setCustZip] = useState('');
  const [custCountry, setCustCountry] = useState('USA');

  // Billing Address (Checkbox flag & fields)
  const [billingDiff, setBillingDiff] = useState(false);
  const [billStreet, setBillStreet] = useState('');
  const [billCity, setBillCity] = useState('');
  const [billState, setBillState] = useState('');
  const [billZip, setBillZip] = useState('');

  // Financial Options
  const [custCreditLimit, setCustCreditLimit] = useState<number>(50000);
  const [custOutstanding, setCustOutstanding] = useState<number>(0);
  const [custPaymentTerms, setCustPaymentTerms] = useState('Net 30');
  const [custDeliveryMethod, setCustDeliveryMethod] = useState('Email PDF');
  const [custRequirePo, setCustRequirePo] = useState(false);
  const [custRequirePod, setCustRequirePod] = useState(false);

  // Operations & EDI Integration
  const [custEdiId, setCustEdiId] = useState('');
  const [custOpsPhone, setCustOpsPhone] = useState('');
  const [custOpsEmail, setCustOpsEmail] = useState('');
  const [custNotes, setCustNotes] = useState('');

  // Compliance Upload states
  const [uploadedDocs, setUploadedDocs] = useState<ComplianceDocument[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [currentSelectedFile, setCurrentSelectedFile] = useState<File | null>(null);
  const [selectedDocType, setSelectedDocType] = useState('W-9 Federal Tax Certification');
  const [docExpiryDate, setDocExpiryDate] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // Document Drag & Drop Simulator Handlers
  // ==========================================
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleManualFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setCurrentSelectedFile(file);
    setUploadSuccess(false);
    setUploadProgress(null);
  };

  const triggerUploadSimulation = async () => {
    if (!currentSelectedFile) return;
    
    setUploadProgress(10);
    const url = await uploadFileToSupabase(currentSelectedFile, 'customers');
    setUploadProgress(100);
    (currentSelectedFile as any).uploadedUrl = url;
    setUploadSuccess(true);
  };

  const attachUploadedDoc = () => {
    if (!currentSelectedFile) return;
    
    const newDoc: ComplianceDocument = {
      id: `doc-${Math.random().toString(36).substr(2, 9)}`,
      name: currentSelectedFile.name,
      type: selectedDocType,
      expiryDate: docExpiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Valid',
      url: (currentSelectedFile as any).uploadedUrl || undefined
    };

    setUploadedDocs(prev => [...prev, newDoc]);
    
    // Reset file states
    setCurrentSelectedFile(null);
    setUploadProgress(null);
    setUploadSuccess(false);
    setDocExpiryDate('');
  };

  const deleteUploadedDoc = (id: string) => {
    setUploadedDocs(prev => prev.filter(d => d.id !== id));
  };

  const resetAllFormStates = () => {
    setCustName('');
    setCustDba('');
    setCustStatus('Active');
    setCustPhone('');
    setCustEmail('');
    setCustMcNumber('');
    setCustDotNumber('');
    setCustTaxId('');

    setCustStreet('');
    setCustCity('');
    setCustState('');
    setCustZip('');
    setCustCountry('USA');

    setBillingDiff(false);
    setBillStreet('');
    setBillCity('');
    setBillState('');
    setBillZip('');

    setCustCreditLimit(50000);
    setCustOutstanding(0);
    setCustPaymentTerms('Net 30');
    setCustDeliveryMethod('Email PDF');
    setCustRequirePo(false);
    setCustRequirePod(false);

    setCustEdiId('');
    setCustOpsPhone('');
    setCustOpsEmail('');
    setCustNotes('');

    setUploadedDocs([]);
    setUploadSuccess(false);
    setUploadProgress(null);
    setCurrentSelectedFile(null);
    setDocExpiryDate('');
  };

  // ==========================================
  // Form submission handler
  // ==========================================
  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName) return;

    const dataPayload = {
      name: custName,
      status: custStatus,
      creditLimit: custCreditLimit,
      outstandingBalance: custOutstanding,
      phone: custPhone,
      email: custEmail,
      address: {
        street: custStreet,
        city: custCity,
        state: custState,
        zip: custZip,
        country: custCountry
      },
      // Extended fields
      dba: custDba || undefined,
      mcNumber: custMcNumber || undefined,
      dotNumber: custDotNumber || undefined,
      taxId: custTaxId || undefined,
      paymentTerms: custPaymentTerms,
      billingDeliveryMethod: custDeliveryMethod,
      billingAddress: billingDiff ? {
        street: billStreet,
        city: billCity,
        state: billState,
        zip: billZip,
        country: 'USA'
      } : undefined,
      requirePo: custRequirePo,
      requirePod: custRequirePod,
      ediId: custEdiId || undefined,
      opsPhone: custOpsPhone || undefined,
      opsEmail: custOpsEmail || undefined,
      notes: custNotes || undefined,
      complianceDocs: uploadedDocs
    };

    if (isEditing && editingId) {
      updateCustomer(editingId, dataPayload);
    } else {
      const newId = addCustomer(dataPayload);
      if (localIntent && localIntent.returnTo) {
        setShowCreationMode(false);
        resetAllFormStates();
        setNavigationIntent({
          ...localIntent,
          view: localIntent.returnTo,
          action: 'resume_wizard',
          returnData: {
            ...localIntent.returnData,
            newId: newId,
          }
        });
        setLocalIntent(null);
        return;
      }
    }

    setShowCreationMode(false);
    resetAllFormStates();
    setLocalIntent(null);
  };

  const handleCancelForm = () => {
    setShowCreationMode(false);
    resetAllFormStates();
    if (localIntent && localIntent.returnTo) {
      setNavigationIntent({
        ...localIntent,
        view: localIntent.returnTo,
        action: 'resume_wizard'
      });
      setLocalIntent(null);
    }
  };

  // Populate details for edit
  const handleEditClick = (cust: Customer) => {
    setCustName(cust.name);
    setCustDba(cust.dba || '');
    setCustStatus(cust.status);
    setCustPhone(cust.phone || '');
    setCustEmail(cust.email || '');
    setCustMcNumber(cust.mcNumber || '');
    setCustDotNumber(cust.dotNumber || '');
    setCustTaxId(cust.taxId || '');
    
    setCustStreet(cust.address.street || '');
    setCustCity(cust.address.city || '');
    setCustState(cust.address.state || '');
    setCustZip(cust.address.zip || '');
    setCustCountry(cust.address.country || 'USA');

    setBillingDiff(cust.billingAddress ? true : false);
    setBillStreet(cust.billingAddress?.street || '');
    setBillCity(cust.billingAddress?.city || '');
    setBillState(cust.billingAddress?.state || '');
    setBillZip(cust.billingAddress?.zip || '');
    
    setCustCreditLimit(cust.creditLimit);
    setCustOutstanding(cust.outstandingBalance);
    setCustPaymentTerms(cust.paymentTerms || 'Net 30');
    setCustDeliveryMethod(cust.billingDeliveryMethod || 'Email PDF');
    setCustRequirePo(cust.requirePo || false);
    setCustRequirePod(cust.requirePod || false);

    setCustEdiId(cust.ediId || '');
    setCustOpsPhone(cust.opsPhone || '');
    setCustOpsEmail(cust.opsEmail || '');
    setCustNotes(cust.notes || '');

    setUploadedDocs(cust.complianceDocs || []);

    setIsEditing(true);
    setEditingId(cust.id);
    setShowCreationMode(true);
  };

  // Delete Action
  const handleDeleteClick = (id: string, name: string) => {
    deleteCustomer(id);
  };

  const handleApplyPayment = (customer: Customer) => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    const newBalance = Math.max(0, customer.outstandingBalance - amount);
    updateCustomer(customer.id, { outstandingBalance: newBalance });
    
    setAccountingCustomer({
      ...customer,
      outstandingBalance: newBalance
    });
    setPaymentAmount('');
    alert(`Payment of $${amount.toLocaleString()} applied successfully!`);
  };

  const handleAdjustCreditLimit = (customer: Customer) => {
    const limit = parseInt(newCreditLimit);
    if (isNaN(limit) || limit < 0) {
      alert('Please enter a valid credit limit.');
      return;
    }
    updateCustomer(customer.id, { creditLimit: limit });
    
    setAccountingCustomer({
      ...customer,
      creditLimit: limit
    });
    setNewCreditLimit('');
    alert(`Credit limit updated to $${limit.toLocaleString()}!`);
  };

  const handleInvoiceStatusChange = (customer: Customer, invoiceId: string, newStatus: any) => {
    const oldInvoice = invoices.find(inv => inv.id === invoiceId);
    updateInvoice(invoiceId, { status: newStatus });
    
    if (newStatus === 'Paid' && oldInvoice && oldInvoice.status !== 'Paid') {
      const newBal = Math.max(0, customer.outstandingBalance - oldInvoice.amount);
      updateCustomer(customer.id, { outstandingBalance: newBal });
      setAccountingCustomer({
        ...customer,
        outstandingBalance: newBal
      });
    }
  };

  const getCustomerLoads = (customerId: string) => {
    return loads.filter(l => l.customerId === customerId);
  };

  const getCustomerInvoices = (customerId: string) => {
    return invoices.filter(inv => inv.customerId === customerId);
  };

  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.code.toLowerCase().includes(query) ||
      customer.address.city.toLowerCase().includes(query) ||
      customer.status.toLowerCase().includes(query)
    );
  });

  // ==========================================
  // RENDER DYNAMIC FULL-SCREEN CREATION PAGE
  // ==========================================
  if (showCreationMode) {
    const docOptions = [
      'W-9 Federal Tax Certification',
      'Credit Agreement Form',
      'Broker-Carrier Contract',
      'Sales / Pricing Contract',
      'Surety Bond & Co-Sign',
      'Custom Regulatory PDF',
      'Standard BOL / POD template'
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Head Bar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-150">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleCancelForm}
              className="p-2 border border-slate-200 text-slate-500 hover:text-navy hover:border-navy bg-white rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Revenue & Credit Audit</span>
                <span className="text-slate-300">/</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-orange">Modern TMS Profile Registry</span>
              </div>
              <h2 className="text-2xl font-head font-extrabold text-navy-dark tracking-tight">
                {isEditing ? 'Modify Customer Dossier' : 'Register New Customer'}
              </h2>
            </div>
          </div>
        </header>

        {/* Master Data Entry Form */}
        <form onSubmit={handleCreateCustomerSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (Main Specs Block) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Box 1: Identification & Authority */}
            <div className="tms-card p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-orange" />
                  <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Legal Identification & Authority</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Operations Ready</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Legal Company Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="e.g. Amazon Logistics, LLC"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doing Business As (DBA)</label>
                  <input 
                    type="text" 
                    value={custDba}
                    onChange={(e) => setCustDba(e.target.value)}
                    placeholder="e.g. Amazon Carrier Services"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Status Flag</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                    value={custStatus}
                    onChange={(e) => setCustStatus(e.target.value as any)}
                  >
                    <option value="Active">Active Profile</option>
                    <option value="Prospect">Prospect Lead</option>
                    <option value="On Hold">Credit Hold</option>
                    <option value="Inactive">Inactive/Closed</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">FMCSA MC Number</label>
                  <input 
                    type="text"
                    value={custMcNumber}
                    onChange={(e) => setCustMcNumber(e.target.value)}
                    placeholder="MC-091493"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all uppercase font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">USDOT Number</label>
                  <input 
                    type="text"
                    value={custDotNumber}
                    onChange={(e) => setCustDotNumber(e.target.value)}
                    placeholder="DOT-8241032"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all uppercase font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Federal Tax EIN</label>
                  <input 
                    type="text"
                    value={custTaxId}
                    onChange={(e) => setCustTaxId(e.target.value)}
                    placeholder="12-3456789"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Box 2: Contact Registries */}
            <div className="tms-card p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-orange" />
                  <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Communication Channels</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Billing / Legal Contacts */}
                <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-extrabold text-navy uppercase tracking-wider block">Billing Accounts Payable</span>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Billing Email *</label>
                    <input 
                      type="email"
                      required
                      value={custEmail}
                      onChange={(e) => setCustEmail(e.target.value)}
                      placeholder="payments@amazon.com"
                      className="w-full bg-white border border-slate-200 focus:border-orange rounded-lg px-3 py-2 text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Billing Hotline Phone</label>
                    <input 
                      type="tel"
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      placeholder="+1 (800) 412-4011"
                      className="w-full bg-white border border-slate-200 focus:border-orange rounded-lg px-3 py-2 text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Operations Contacts */}
                <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-extrabold text-navy uppercase tracking-wider block">Logistics Operations Contacts</span>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Dispatch Ops Email</label>
                    <input 
                      type="email"
                      value={custOpsEmail}
                      onChange={(e) => setCustOpsEmail(e.target.value)}
                      placeholder="chicago-dispatch@amazon.com"
                      className="w-full bg-white border border-slate-200 focus:border-orange rounded-lg px-3 py-2 text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Direct Operations Phone</label>
                    <input 
                      type="tel"
                      value={custOpsPhone}
                      onChange={(e) => setCustOpsPhone(e.target.value)}
                      placeholder="+1 (312) 505-9238"
                      className="w-full bg-white border border-slate-200 focus:border-orange rounded-lg px-3 py-2 text-xs outline-none"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* Box 3: Physical & Billing Addresses */}
            <div className="tms-card p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-orange" />
                  <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Geographical Nodes</h3>
                </div>
              </div>

              {/* HQ Address physical */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-navy uppercase tracking-widest block">Corporate Headquarters (Physical)</span>
                
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Street Address *</label>
                  <input 
                    type="text"
                    required
                    value={custStreet}
                    onChange={(e) => setCustStreet(e.target.value)}
                    placeholder="410 Terry Ave N"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">City *</label>
                    <input 
                      type="text"
                      required
                      value={custCity}
                      onChange={(e) => setCustCity(e.target.value)}
                      placeholder="Seattle"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">State / Province *</label>
                    <input 
                      type="text"
                      required
                      value={custState}
                      onChange={(e) => setCustState(e.target.value)}
                      placeholder="WA"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-2.5 text-sm outline-none transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">ZIP / Postal *</label>
                    <input 
                      type="text"
                      required
                      value={custZip}
                      onChange={(e) => setCustZip(e.target.value)}
                      placeholder="98109"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-2.5 text-sm outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Billing Location differential checkbox */}
              <div className="pt-2 border-t border-slate-50">
                <label className="inline-flex items-center gap-3.5 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={billingDiff}
                    onChange={(e) => setBillingDiff(e.target.checked)}
                    className="w-4 h-4 rounded text-orange focus:ring-orange border-slate-300 transition-all cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-navy-dark group-hover:text-orange transition-colors">Billing HQ Address is Different</span>
                    <p className="text-[9.5px] text-slate-400">Enable this if invoices should be posted to an alternative accounting center.</p>
                  </div>
                </label>
              </div>

              {/* Conditional Billing address inputs */}
              <AnimatePresence>
                {billingDiff && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden space-y-3 pt-3 bg-amber-50/30 p-4 rounded-xl border border-amber-100"
                  >
                    <span className="text-[10px] font-bold text-orange uppercase tracking-widest block">Invoicing Accounts Payable address</span>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Billing Street Address</label>
                      <input 
                        type="text"
                        value={billStreet}
                        onChange={(e) => setBillStreet(e.target.value)}
                        placeholder="P.O. Box 80214"
                        className="w-full bg-white border border-slate-200 focus:border-orange rounded-lg px-3 py-2 text-xs outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Billing City</label>
                        <input 
                          type="text"
                          value={billCity}
                          onChange={(e) => setBillCity(e.target.value)}
                          placeholder="Fargo"
                          className="w-full bg-white border border-slate-200 focus:border-orange rounded-lg px-3 py-2 text-xs outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Billing State</label>
                        <input 
                          type="text"
                          value={billState}
                          onChange={(e) => setBillState(e.target.value)}
                          placeholder="ND"
                          className="w-full bg-white border border-slate-200 focus:border-orange rounded-lg px-3 py-2 text-xs outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Billing ZIP</label>
                        <input 
                          type="text"
                          value={billZip}
                          onChange={(e) => setBillZip(e.target.value)}
                          placeholder="58108"
                          className="w-full bg-white border border-slate-200 focus:border-orange rounded-lg px-3 py-2 text-xs outline-none font-mono"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Box 4: Invoicing & Financial Configuration */}
            <div className="tms-card p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-orange" />
                  <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Pricing & Ledger Rule Profile</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Approved Credit Limit</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="number"
                      required
                      value={custCreditLimit}
                      onChange={(e) => setCustCreditLimit(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl pl-9 pr-4 py-3 text-sm outline-none transition-all font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Starting Ledger Due</label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="number"
                      value={custOutstanding}
                      onChange={(e) => setCustOutstanding(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl pl-9 pr-4 py-3 text-sm outline-none transition-all font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contractual Terms</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                    value={custPaymentTerms}
                    onChange={(e) => setCustPaymentTerms(e.target.value)}
                  >
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days (Standard)</option>
                    <option value="Net 45">Net 45 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                    <option value="Due on Receipt">Due on Receipt</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Method</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                    value={custDeliveryMethod}
                    onChange={(e) => setCustDeliveryMethod(e.target.value)}
                  >
                    <option value="Email PDF">Email PDF Carrier</option>
                    <option value="EDI Link">EDI Integration Portal</option>
                    <option value="USPS Print">USPS Manual Postage</option>
                    <option value="Web Portal Upload">Customer Vendor Portal</option>
                  </select>
                </div>
              </div>

              {/* Invoicing Requirements Switches */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-50">
                <label className="flex items-start gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={custRequirePo}
                    onChange={(e) => setCustRequirePo(e.target.checked)}
                    className="w-4 h-4 rounded text-orange focus:ring-orange border-slate-300 transition-all cursor-pointer mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-navy-dark group-hover:text-orange transition-colors">Require P.O. / Reference on Load creation</span>
                    <p className="text-[9.5px] text-slate-400">Forces planners to document custom customer reference codes when booking dispatches.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={custRequirePod}
                    onChange={(e) => setCustRequirePod(e.target.checked)}
                    className="w-4 h-4 rounded text-orange focus:ring-orange border-slate-300 transition-all cursor-pointer mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-navy-dark group-hover:text-orange transition-colors">Mandatory signed POD / BOL for factoring</span>
                    <p className="text-[9.5px] text-slate-400">Locks the billing process until documents verifying successful delivery are attached.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Box 5: Integration & Operations Notes */}
            <div className="tms-card p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                <Settings size={16} className="text-slate-400" />
                <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Operational Intelligence & EDI</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">EDI Partner Routing ID</label>
                  <input 
                    type="text"
                    value={custEdiId}
                    onChange={(e) => setCustEdiId(e.target.value)}
                    placeholder="e.g. AMZNEDIXXXX"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all uppercase font-mono"
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Directives & Notes</label>
                  <textarea 
                    rows={1}
                    value={custNotes}
                    onChange={(e) => setCustNotes(e.target.value)}
                    placeholder="e.g. Drivers must check in 30 minutes before appointment. No split loads."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-2 text-sm outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Form Actions */}
            <div className="pt-4 flex items-center gap-4">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-6 py-3.5 border border-slate-200 hover:border-navy text-slate-500 hover:text-navy text-xs font-bold uppercase tracking-widest rounded-xl bg-white transition-all cursor-pointer"
              >
                Discard & Exit
              </button>
              <button
                type="submit"
                className="flex-1 max-w-xs px-8 py-3.5 bg-orange text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-light shadow-lg shadow-orange/15 hover:shadow-orange/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check size={16} /> Save Billing Dossier
              </button>
            </div>

          </div>

          {/* Right Column (Credit Compliance Documents Vault) */}
          <div className="lg:col-span-4 space-y-6 animate-in fade-in duration-350">
            
            {/* Document Vault Attachment zone */}
            <div className="tms-card p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UploadCloud size={16} className="text-orange" />
                  <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Compliance Vault Upload</h3>
                </div>
                <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded tracking-widest font-mono uppercase">SECURE AES</span>
              </div>

              {/* Configure doc details before simulation */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Categorize Document</label>
                  <select 
                    value={selectedDocType}
                    onChange={(e) => setSelectedDocType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2 text-xs outline-none cursor-pointer font-sans"
                  >
                    {docOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Expiration Date</label>
                  <input 
                    type="date"
                    value={docExpiryDate}
                    onChange={(e) => setDocExpiryDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2 text-xs font-mono outline-none"
                  />
                </div>
              </div>

              {/* Interactive upload drag box */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                  dragActive 
                    ? 'border-orange bg-orange/5' 
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-350'
                }`}
              >
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleManualFileChange}
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                />

                {!currentSelectedFile ? (
                  <div className="space-y-2">
                    <UploadCloud className="mx-auto text-slate-300" size={32} />
                    <div>
                      <span className="text-xs font-black text-navy block">Drag & drop files here</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">or click to browse local folders</span>
                    </div>
                    <span className="text-[9px] text-zinc-400 inline-block bg-white border border-slate-100 px-2 py-0.5 rounded shadow-sm font-semibold">PDF, Doc, JPG up to 15MB</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200 text-left relative">
                      <div className="w-8 h-8 rounded bg-orange/10 text-orange flex items-center justify-center shrink-0">
                        <File size={16} />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <span className="text-xs font-black text-navy block truncate">{currentSelectedFile.name}</span>
                        <span className="text-[9px] text-slate-400 font-mono block">{(currentSelectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentSelectedFile(null);
                          setUploadProgress(null);
                          setUploadSuccess(false);
                        }}
                        className="p-1 text-slate-300 hover:text-red-500 transition-colors bg-slate-50 rounded"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    {uploadProgress !== null && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase">
                          <span>Cryptographying...</span>
                          <span className="font-mono">{uploadProgress}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-orange transition-all duration-100"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {!uploadSuccess ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerUploadSimulation();
                        }}
                        disabled={uploadProgress !== null}
                        className="w-full py-1.5 bg-navy text-white hover:bg-navy-light text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                      >
                        {uploadProgress !== null ? 'Uploading Registry...' : 'Apply Crypto Signature'}
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 justify-center text-teal font-black text-[10px] uppercase">
                          <Check size={14} /> Cryptographic Proof OK
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            attachUploadedDoc();
                          }}
                          className="w-full py-1.5 bg-teal text-white hover:bg-teal-700 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all"
                        >
                          Attach to Ledger Profile
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* List of currently attached documents */}
            <div className="tms-card p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-teal" />
                  <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Active Audit Archive ({uploadedDocs.length})</h3>
                </div>
              </div>

              {uploadedDocs.length === 0 ? (
                <div className="text-center py-6">
                  <AlertCircle size={24} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-[10px] text-slate-400 font-bold">No active compliance records connected to this credential.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {uploadedDocs.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 group">
                      <div className="w-8 h-8 rounded bg-teal/10 text-teal flex items-center justify-center shrink-0">
                        <ShieldCheck size={16} />
                      </div>
                      <div className="flex-grow min-w-0">
                        <span className="text-[11px] font-black text-navy block truncate leading-tight">{doc.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-slate-400 font-bold uppercase">{doc.type}</span>
                          <span className="text-slate-300 text-[9px]">•</span>
                          <span className="text-[8.5px] font-mono text-zinc-500 font-bold">Expires: {doc.expiryDate}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteUploadedDoc(doc.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition-all cursor-pointer bg-white border shadow-sm"
                        title="Delete Document"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </form>

      </div>
    );
  }

  // ==========================================
  // RENDER DYNAMIC CUSTOMERS LIST INDEX
  // ==========================================
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* List view header bar */}
      <header className="flex flex-col md:items-center md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-head font-extrabold text-navy-dark">Customer Directory</h2>
          <p className="text-sm text-slate-500">Maintain revenue relationships, credit profiles, and core compliance.</p>
        </div>
        <button 
          onClick={() => {
            resetAllFormStates();
            setIsEditing(false);
            setEditingId(null);
            setShowCreationMode(true);
          }}
          className="inline-flex items-center gap-2 bg-orange text-white px-6 py-2.5 rounded-xl shadow-md font-bold text-sm transition-all hover:bg-orange/90 active:scale-95 cursor-pointer"
        >
          <Plus size={18} />
          New Customer
        </button>
      </header>

      {/* Query Search Bar */}
      <form onSubmit={(e) => e.preventDefault()} className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange transition-colors" size={18} />
        <input 
          type="text"
          placeholder="Filter by name, customer code, city, status, terms..."
          className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-12 py-3 text-sm outline-none focus:border-orange focus:ring-4 focus:ring-orange/5 transition-all shadow-sm font-sans"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button 
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
          >
            <XCircle size={18} />
          </button>
        )}
      </form>

      {/* Empty Search outcome */}
      {filteredCustomers.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl"
        >
           <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
             <Search size={32} />
           </div>
           <h3 className="text-sm font-bold text-navy-dark">No customers found matching "{searchQuery}"</h3>
           <p className="text-xs text-slate-400 mt-1">Try checking for typos or use a different search term.</p>
           <button 
             onClick={() => setSearchQuery('')}
             className="mt-6 px-6 py-2 bg-slate-100 rounded-lg text-xs font-bold text-navy hover:bg-slate-200 transition-all cursor-pointer"
           >
             Clear All Filters
           </button>
        </motion.div>
      )}

      {/* Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.map(customer => {
          const usedPercent = customer.creditLimit > 0 ? Math.round((customer.outstandingBalance / customer.creditLimit) * 100) : 0;
          return (
            <div key={customer.id} className="tms-card flex flex-col hover:border-orange/30 transition-all group relative">
              
              <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-navy-dark group-hover:text-white transition-all">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-navy-dark group-hover:text-orange transition-colors">{customer.name}</h4>
                    <p className="text-[10px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1.5 mt-0.5">
                      <span>{customer.code}</span>
                      {customer.complianceDocs && customer.complianceDocs.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[8.5px] bg-teal/10 text-teal-700 px-1 py-0.2 rounded font-sans shrink-0">
                          <ShieldCheck size={10} /> {customer.complianceDocs.length} Vaulted Docs
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
                    customer.status === 'Active' ? 'bg-green-150 text-green-700' : 
                    customer.status === 'On Hold' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {customer.status}
                  </span>
                  
                  {/* Action overlay for quick editing/deleting */}
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity mt-1 bg-white p-0.5 rounded shadow border">
                    <button 
                      onClick={() => handleEditClick(customer)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-orange transition-colors cursor-pointer"
                      title="Edit Customer Dossier"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(customer.id, customer.name)}
                      className="p-1 hover:bg-red-50 rounded text-slate-500 hover:text-red-600 transition-colors cursor-pointer"
                      title="Archive Customer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-5 flex-1 space-y-4">
                
                {/* Credit Limit utilization track */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400">
                    <span>Credit Utilization</span>
                    <span>{usedPercent}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        usedPercent >= 90 ? 'bg-red-500' : usedPercent >= 70 ? 'bg-amber-500' : 'bg-teal'
                      }`}
                      style={{ width: `${Math.min(100, usedPercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-slate-400">
                    <span>${customer.outstandingBalance.toLocaleString()} used</span>
                    <span>${customer.creditLimit.toLocaleString()} limit</span>
                  </div>
                </div>

                {/* Sub Metadata parameters */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50 text-[11px]">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone size={13} className="text-slate-300 shrink-0" />
                    <span className="truncate">{customer.phone || 'No Phone hotline'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail size={13} className="text-slate-300 shrink-0" />
                    <span className="truncate">{customer.email || 'No Email registered'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <CreditCard size={13} className="text-slate-300 shrink-0" />
                    <span className="font-bold text-navy-dark">{customer.paymentTerms || 'Net 30 Days'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <FileText size={13} className="text-slate-300 shrink-0" />
                    <span className="truncate font-semibold text-zinc-500">{customer.billingDeliveryMethod || 'Email PDF'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 col-span-2 border-t border-slate-50 pt-2 shrink-0">
                    <MapPin size={13} className="text-slate-300 shrink-0" />
                    <span className="truncate text-slate-500">{customer.address.street}, {customer.address.city}, {customer.address.state}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Actions widgets */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button 
                  onClick={() => setAccountingCustomer(customer)}
                  className="flex-1 bg-white border border-slate-200 py-1.5 rounded-lg text-[10px] font-bold text-navy hover:border-navy hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                >
                  <Receipt size={12} />
                  Accounting View
                </button>
                <button 
                  onClick={() => setActiveLoadsCustomer(customer)}
                  className="flex-1 bg-white border border-slate-200 py-1.5 rounded-lg text-[10px] font-bold text-slate-600 hover:border-orange hover:bg-slate-50 transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                >
                  Active Loads ({getCustomerLoads(customer.id).length}) <ExternalLink size={10} />
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* ==========================================
          ACCOUNTING VIEW MODAL
          ========================================== */}
      <AnimatePresence>
        {accountingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-dark/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-55 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded bg-navy text-white flex items-center justify-center">
                    <Receipt size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-navy">{accountingCustomer.name} Financial Audit</h3>
                    <p className="text-xs text-slate-500">Customer Code: <span className="font-mono font-bold text-navy">{accountingCustomer.code}</span></p>
                  </div>
                </div>
                <button 
                  onClick={() => setAccountingCustomer(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-navy cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Main Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Credit Overview Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Unpaid Balance</span>
                    <strong className="text-2xl font-black text-navy-dark mt-1 block">
                      ${accountingCustomer.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </strong>
                    <div className="h-1 w-full bg-slate-200 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-red-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, accountingCustomer.creditLimit > 0 ? (accountingCustomer.outstandingBalance / accountingCustomer.creditLimit) * 100 : 0)}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Approved Credit Limit</span>
                    <strong className="text-2xl font-black text-teal mt-1 block">
                      ${accountingCustomer.creditLimit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </strong>
                    <span className="text-[9px] text-slate-400 mt-2 block font-medium">To modify, use the limits tool on the right</span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Available Credit Flag</span>
                    <strong className={`text-xl font-black mt-1 block ${
                      accountingCustomer.creditLimit - accountingCustomer.outstandingBalance > 0 ? 'text-green-600' : 'text-red-500'
                    }`}>
                      ${Math.max(0, accountingCustomer.creditLimit - accountingCustomer.outstandingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </strong>
                    <div className="mt-2 text-[10px] font-bold text-slate-500">
                      Status: <span className="uppercase text-navy">{accountingCustomer.status}</span>
                    </div>
                  </div>
                </div>

                {/* Audit interactive controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Ledger Form */}
                  <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200/60 space-y-4">
                    <h4 className="text-xs font-black uppercase text-navy tracking-wider flex items-center gap-1.5 border-b pb-2">
                      <DollarSign size={14} className="text-orange" /> Log Financial Action
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase">Apply Customer Payment (Decreases Balance)</label>
                        <div className="flex gap-2 mt-1">
                          <input 
                            type="number"
                            placeholder="e.g. 5000"
                            className="bg-white border rounded-lg px-3 py-1.5 text-xs outline-none flex-1 focus:ring-1 focus:ring-orange/30 focus:border-orange font-mono"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                          />
                          <button 
                            onClick={() => handleApplyPayment(accountingCustomer)}
                            className="bg-teal text-white font-bold text-[11px] px-4 py-1.5 rounded-lg shadow uppercase hover:bg-teal/90 transition-all active:scale-95 cursor-pointer"
                          >
                            Submit Pay
                          </button>
                        </div>
                      </div>

                      <div className="pt-2">
                        <label className="text-[10px] font-extrabold text-slate-500 uppercase">Adjust Customer Credit Limit</label>
                        <div className="flex gap-2 mt-1">
                          <input 
                            type="number"
                            placeholder="e.g. 150000"
                            className="bg-white border rounded-lg px-3 py-1.5 text-xs outline-none flex-1 focus:ring-1 focus:ring-orange/30 focus:border-orange font-mono"
                            value={newCreditLimit}
                            onChange={(e) => setNewCreditLimit(e.target.value)}
                          />
                          <button 
                            onClick={() => handleAdjustCreditLimit(accountingCustomer)}
                            className="bg-navy text-white font-bold text-[11px] px-4 py-1.5 rounded-lg shadow uppercase hover:bg-navy-light transition-all active:scale-95 cursor-pointer"
                          >
                            Set Limit
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200/60 space-y-3">
                    <h4 className="text-xs font-black uppercase text-navy tracking-wider flex items-center gap-1.5 border-b pb-2">
                      <Building2 size={14} className="text-orange" /> Legal Metadata
                    </h4>
                    <ul className="space-y-2 text-xs font-medium text-slate-600">
                      <li className="flex justify-between">
                        <span className="text-slate-400 font-bold">Billing Email</span>
                        <span className="text-navy truncate pl-2">{accountingCustomer.email}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-slate-400 font-bold">Phone Number</span>
                        <span className="text-navy font-mono">{accountingCustomer.phone || 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-slate-400 font-bold">Billing Terms</span>
                        <span className="text-navy font-bold">{accountingCustomer.paymentTerms || 'Net 30'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-slate-400 font-bold">Credit Status Flag</span>
                        <span className={`font-bold ${
                          accountingCustomer.status === 'Active' ? 'text-green-600' : 'text-amber-500'
                        }`}>{accountingCustomer.status}</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Invoice Table list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-navy tracking-wider flex items-center gap-1.5">
                    <FileText size={14} className="text-orange" /> Associated Receivable Invoices
                  </h4>
                  <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                    {getCustomerInvoices(accountingCustomer.id).length === 0 ? (
                      <p className="p-6 text-center text-xs text-slate-400 font-bold">No registered invoices exist for this billing profile.</p>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b">
                            <th className="p-3">Invoice Number</th>
                            <th className="p-3">Billing Date</th>
                            <th className="p-3">Due Date</th>
                            <th className="p-3 text-right">Amount</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-center">Action Toggle</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getCustomerInvoices(accountingCustomer.id).map(inv => (
                            <tr key={inv.id} className="border-b last:border-b-0 hover:bg-slate-50">
                              <td className="p-3 font-mono font-bold text-navy">{inv.invoiceNumber}</td>
                              <td className="p-3 font-medium text-slate-500">{inv.date}</td>
                              <td className="p-3 font-medium text-slate-500">{inv.dueDate}</td>
                              <td className="p-3 text-right font-mono font-bold text-navy">${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  inv.status === 'Paid' ? 'bg-green-100 text-green-700' :
                                  inv.status === 'Sent' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                {inv.status !== 'Paid' ? (
                                  <button 
                                    onClick={() => handleInvoiceStatusChange(accountingCustomer, inv.id, 'Paid')}
                                    className="px-2 py-1 bg-teal/10 text-teal rounded hover:bg-teal hover:text-white transition-all text-[9.5px] font-black uppercase tracking-wider active:scale-95 cursor-pointer"
                                  >
                                    Mark Paid
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-zinc-400 font-black flex items-center justify-center gap-1">
                                    <Check size={12} className="text-green-500" /> Settled
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              {/* Close Footer bar */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
                <button 
                  onClick={() => setAccountingCustomer(null)}
                  className="px-6 py-2 bg-navy text-white text-xs font-bold rounded-lg shadow-sm hover:bg-navy-light transition-all active:scale-95 cursor-pointer"
                >
                  Close Audit Panel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          ACTIVE LOADS VIEW MODAL
          ========================================== */}
      <AnimatePresence>
        {activeLoadsCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-dark/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-extrabold text-navy">Loads Assigned: {activeLoadsCustomer.name}</h3>
                  <p className="text-xs text-slate-500">Live operational manifest lookup and pricing logs</p>
                </div>
                <button 
                  onClick={() => setActiveLoadsCustomer(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {getCustomerLoads(activeLoadsCustomer.id).length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <AlertTriangle className="mx-auto text-amber-500" size={32} />
                    <h4 className="text-sm font-bold text-navy-dark">No live operational loads found for this customer profile.</h4>
                    <p className="text-xs text-slate-400">Loads created under Dispatch and filtered to this customer will show here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getCustomerLoads(activeLoadsCustomer.id).map(load => (
                      <div key={load.id} className="p-4 border border-slate-150 bg-slate-50 rounded-xl space-y-3 hover:border-orange/20 transition-all">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs bg-navy text-white px-2 py-0.5 rounded leading-none">
                              {load.loadNumber}
                            </span>
                            <span className="text-xs font-bold text-navy-dark">{load.commodity}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            load.status === 'Paid' ? 'bg-green-100 text-green-700' :
                            load.status === 'Delivered' || load.status === 'Invoiced' ? 'bg-teal/15 text-teal-700 font-bold' :
                            load.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {load.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1 text-xs">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Pickup Date</span>
                            <span className="font-medium text-navy-dark">{load.pickupDate}</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-450 block">Delivery Date</span>
                            <span className="font-medium text-navy-dark">{load.deliveryDate}</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-450 block">Distance</span>
                            <span className="font-mono font-bold text-navy-dark">{load.miles} mi</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-450 block">Pricing Rate</span>
                            <span className="font-mono font-bold text-teal">${load.rate.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 text-right">
                <button 
                  onClick={() => setActiveLoadsCustomer(null)}
                  className="px-6 py-2 bg-navy text-white text-xs font-bold rounded-lg hover:bg-navy-light transition-all active:scale-95 cursor-pointer"
                >
                  Dismiss Manifesto
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
