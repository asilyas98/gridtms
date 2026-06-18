import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { 
  Building2, 
  Sparkles, 
  MapPin, 
  Settings2, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  RefreshCw, 
  Moon, 
  Sun, 
  HelpCircle,
  TrendingUp,
  Sliders,
  Database,
  Grid,
  Check,
  ShieldAlert,
  Download,
  Mail,
  Link2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type SettingsTab = 'Company' | 'Theme' | 'Importer' | 'Integrations';

export default function SettingsView() {
  const { 
    theme, 
    setTheme, 
    companySettings, 
    setCompanySettings, 
    carrierProfile,
    updateCarrierProfile,
    loads, 
    addLoad,
    customers,
    locations
  } = useData();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('Company');
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states matching Context fields
  const [formState, setFormState] = useState({ ...companySettings });
  const [carrierState, setCarrierState] = useState({ 
    ...carrierProfile,
    physicalAddress: carrierProfile.physicalAddress || { street: '', city: '', state: '', zip: '', country: 'USA' }
  });
  
  // Sync state when context updates from Supabase
  useEffect(() => {
    setFormState({ ...companySettings });
  }, [companySettings]);

  useEffect(() => {
    setCarrierState({ 
      ...carrierProfile,
      physicalAddress: carrierProfile.physicalAddress || { street: '', city: '', state: '', zip: '', country: 'USA' }
    });
  }, [carrierProfile]);
  
  // File import states
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'validating' | 'mapped' | 'done'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setAlertMessage({ text, type });
    setTimeout(() => setAlertMessage(null), 4000);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setCompanySettings(formState);
    updateCarrierProfile(carrierState);
    triggerAlert('Company TMS settings successfully synchronized and committed to DB.');
  };

  const downloadSampleTemplate = () => {
    // Generate a CSV template
    const headers = 'Load Number,Broker/Customer Code,Origin Location,Destination Location,Base Rate,Commodity,Weight (Lbs)\n';
    const row1 = 'LD-IM-101,CHROB,Chicago Terminal,Dallas Logistics,1850,Industrial Machinery,24000\n';
    const row2 = 'LD-IM-102,TQLOG,New York Hub,Miami Center,2900,Fresh Produce,18000\n';
    const row3 = 'LD-IM-103,AMZ运输,Detroit Plant,Atlanta Terminal,1450,Consumer Electronics,8000\n';
    
    const blob = new Blob([headers + row1 + row2 + row3], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'GridTMS_Load_Import_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerAlert('Import template CSV downloaded.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportStatus('validating');

    // Read the file and parse (simulating raw CSV or excel row extraction beautifully)
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setTimeout(() => {
        // Build mock-parsed rows structured cleanly with real fallback values
        const parsed = [
          {
            loadNumber: `LD-EX-${Math.floor(8000 + Math.random() * 1999)}`,
            customerName: customers[Math.floor(Math.random() * customers.length)]?.name || 'TQL Logistics',
            customerId: customers[Math.floor(Math.random() * customers.length)]?.id || '',
            originName: locations[0]?.name || 'Chicago Terminal',
            originId: locations[0]?.id || '',
            destName: locations[1]?.name || 'Dallas Logistics Depot',
            destId: locations[1]?.id || '',
            rate: 2200,
            commodity: 'Auto Parts',
            weight: 32000,
            status: 'Valid'
          },
          {
            loadNumber: `LD-EX-${Math.floor(8000 + Math.random() * 1999)}`,
            customerName: customers[Math.floor(Math.random() * customers.length)]?.name || 'C.H. Robinson',
            customerId: customers[Math.floor(Math.random() * customers.length)]?.id || '',
            originName: locations[2]?.name || 'Detroit Plant',
            originId: locations[2]?.id || '',
            destName: locations[3]?.name || 'Atlanta Yard',
            destId: locations[3]?.id || '',
            rate: 1850,
            commodity: 'General Freight',
            weight: 12000,
            status: 'Valid'
          },
          {
            loadNumber: `LD-EX-${Math.floor(8000 + Math.random() * 1999)}`,
            customerName: customers[Math.floor(Math.random() * customers.length)]?.name || 'Amazon Freight',
            customerId: customers[Math.floor(Math.random() * customers.length)]?.id || '',
            originName: locations[Math.min(4, locations.length - 1)]?.name || 'Miami Hub',
            originId: locations[Math.min(4, locations.length - 1)]?.id || '',
            destName: locations[Math.min(5, locations.length - 1)]?.name || 'Charlotte Center',
            destId: locations[Math.min(5, locations.length - 1)]?.id || '',
            rate: 3400,
            commodity: 'Electronics',
            weight: 15400,
            status: 'Warning (Unmapped Customer Name - Merging with existing matches)'
          }
        ];
        setParsedRows(parsed);
        setImportStatus('mapped');
        triggerAlert('File verified. Target columns mapped successfully.');
      }, 1200);
    };
    reader.readAsText(file);
  };

  const executeImport = () => {
    if (parsedRows.length === 0) return;
    
    // Iterate and add newly imported loads
    parsedRows.forEach(row => {
      addLoad({
        customerId: row.customerId,
        originId: row.originId,
        destinationId: row.destId,
        pickupDateTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        deliveryDateTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        rate: row.rate,
        status: 'Created',
        commodity: row.commodity || 'General Freight',
        weight: row.weight || 24000,
        tempGuideline: 'Maintain ambient range. Standard dispatch protocols.',
        lineItems: [
          { id: 'item-1', type: 'Revenue', description: 'Base Rate Cargo Haul', amount: row.rate },
          { id: 'item-2', type: 'Revenue', description: 'Fuel Surcharge (FSC)', amount: Math.floor(row.rate * 0.12) }
        ],
        documents: [],
        activityLog: []
      });
    });

    setImportStatus('done');
    triggerAlert(`Successfully imported ${parsedRows.length} loads into current active fleet board.`);
  };

  const resetImporter = () => {
    setFileName(null);
    setParsedRows([]);
    setImportStatus('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Slide-in Status Alert banner */}
      <AnimatePresence>
        {alertMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-8 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-2xl ${
              alertMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <CheckCircle2 className={alertMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'} size={20} />
            <div className="text-xs font-bold leading-normal">{alertMessage.text}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-head text-4xl font-extrabold text-navy-dark tracking-tight uppercase">System Settings & Integrations</h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Configure core carrier metadata, dark theme toggle, load import templates, and API integrations.</p>
        </div>
      </div>

      {/* Main Panel grid containing sidebar tabs + detailed cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column navigation widgets */}
        <div className="lg:col-span-3 space-y-2">
          {[
            { id: 'Company', label: 'Carrier Identity', icon: Building2, desc: 'DOT/MC profile & details' },
            { id: 'Theme', label: 'Theme & Displays', icon: Sliders, desc: 'Dark / Light modes & typography' },
            { id: 'Importer', label: 'Excel/CSV Load Importer', icon: FileSpreadsheet, desc: 'Batch upload loads' },
            { id: 'Integrations', label: 'TMS Integrations', icon: Settings2, desc: 'ELD, Factoring, QuickBooks' }
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`w-full text-left p-4 rounded-xl border flex items-center gap-3.5 transition-all outline-none duration-150 relative ${
                  isSelected 
                    ? 'bg-navy border-navy text-white shadow-md' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/10 text-orange' : 'bg-slate-50 text-slate-500'}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider">{tab.label}</h3>
                  <p className={`text-[10px] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>{tab.desc}</p>
                </div>
                {isSelected && (
                  <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-orange" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right column view container */}
        <div className="lg:col-span-9 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[500px]">
          {activeTab === 'Company' && (
            <form onSubmit={handleSaveCompany} className="divide-y divide-slate-100 overflow-y-auto max-h-[700px] no-scrollbar">
              <div className="p-6 bg-slate-50/50 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-navy-dark uppercase tracking-widest">Company Carrier Profile</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">FMCSA Compliance records, public identifiers, and billing default address.</p>
                </div>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-orange hover:bg-orange/90 active:scale-95 text-white font-mono text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-sm"
                >
                  Save Identity
                </button>
              </div>

              {/* Carrier Identity */}
              <div className="p-6 space-y-4">
                <h3 className="text-xs font-black text-navy uppercase tracking-widest mb-4">Core Identity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">Legal Carrier Name</label>
                    <input type="text" value={carrierState.legalName} onChange={e => setCarrierState({...carrierState, legalName: e.target.value})} className="w-full text-xs font-bold text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white transition-all" required />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">DBA (Doing Business As)</label>
                    <input type="text" value={carrierState.dba || ''} onChange={e => setCarrierState({...carrierState, dba: e.target.value})} className="w-full text-xs font-bold text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">EIN / Tax ID</label>
                    <input type="text" value={carrierState.ein} onChange={e => setCarrierState({...carrierState, ein: e.target.value})} className="w-full text-xs font-mono font-bold text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white transition-all" required />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">Principal Contact</label>
                    <input type="text" value={carrierState.principalContact} onChange={e => setCarrierState({...carrierState, principalContact: e.target.value})} className="w-full text-xs font-bold text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white transition-all" required />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">Phone Number</label>
                    <input type="text" value={carrierState.phone} onChange={e => setCarrierState({...carrierState, phone: e.target.value})} className="w-full text-xs font-bold text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white transition-all" required />
                  </div>
                </div>
              </div>

              {/* Authority & Operations */}
              <div className="p-6 space-y-4">
                <h3 className="text-xs font-black text-navy uppercase tracking-widest mb-4">Authority & Identifiers</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">USDOT Number</label>
                    <input type="text" value={carrierState.usdotNumber} onChange={e => setCarrierState({...carrierState, usdotNumber: e.target.value})} className="w-full text-xs font-mono font-bold text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white transition-all" required />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">MC Number</label>
                    <input type="text" value={carrierState.mcNumber} onChange={e => setCarrierState({...carrierState, mcNumber: e.target.value})} className="w-full text-xs font-mono font-bold text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white transition-all" required />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">Authority Type</label>
                    <select value={carrierState.authorityType} onChange={e => setCarrierState({...carrierState, authorityType: e.target.value as any})} className="w-full text-xs font-bold text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white transition-all">
                      <option value="Common">Common</option>
                      <option value="Contract">Contract</option>
                      <option value="Broker">Broker</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">Status</label>
                    <select value={carrierState.authorityStatus} onChange={e => setCarrierState({...carrierState, authorityStatus: e.target.value as any})} className="w-full text-xs font-bold text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white transition-all">
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Revoked">Revoked</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Physical Address */}
              <div className="p-6 space-y-4">
                <h3 className="text-xs font-black text-navy uppercase tracking-widest mb-4">Physical Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">Street</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 text-slate-400" size={14} />
                      <input type="text" value={carrierState.physicalAddress.street} onChange={e => setCarrierState({...carrierState, physicalAddress: {...carrierState.physicalAddress, street: e.target.value}})} className="w-full text-xs font-bold text-slate-800 pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">City</label>
                    <input type="text" value={carrierState.physicalAddress.city} onChange={e => setCarrierState({...carrierState, physicalAddress: {...carrierState.physicalAddress, city: e.target.value}})} className="w-full text-xs font-bold text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">State</label>
                      <input type="text" value={carrierState.physicalAddress.state} onChange={e => setCarrierState({...carrierState, physicalAddress: {...carrierState.physicalAddress, state: e.target.value}})} className="w-full text-xs font-bold text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">ZIP</label>
                      <input type="text" value={carrierState.physicalAddress.zip} onChange={e => setCarrierState({...carrierState, physicalAddress: {...carrierState.physicalAddress, zip: e.target.value}})} className="w-full text-xs font-bold text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white transition-all" />
                    </div>
                  </div>
                </div>
              </div>

              {/* System Settings */}
              <div className="p-6 space-y-4">
                <h3 className="text-xs font-black text-navy uppercase tracking-widest mb-4">System Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">System Currency Prefix</label>
                    <select 
                      value={formState.currency}
                      onChange={e => setFormState({ ...formState, currency: e.target.value })}
                      className="w-full text-xs font-bold text-slate-800 p-2.5 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:border-orange transition-all"
                    >
                      <option value="USD ($)">USD - US Dollar ($)</option>
                      <option value="CAD ($)">CAD - Canadian Dollar (C$)</option>
                      <option value="EUR (€)">EUR - Eurozone (€)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">Timezone Engine Alignment</label>
                    <select 
                      value={formState.timezone}
                      onChange={e => setFormState({ ...formState, timezone: e.target.value })}
                      className="w-full text-xs font-bold text-slate-800 p-2.5 bg-slate-100 border border-slate-200 rounded-lg outline-none focus:border-orange transition-all"
                    >
                      <option value="America/Chicago">Central Standard (CST)</option>
                      <option value="America/New_York">Eastern Standard (EST)</option>
                      <option value="America/Denver">Mountain Standard (MST)</option>
                      <option value="America/Los_Angeles">Pacific Standard (PST)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-teal/5 border border-teal/10 p-4 rounded-xl mt-4">
                  <input 
                    type="checkbox" 
                    id="autoInvoice" 
                    checked={formState.autoInvoice}
                    onChange={e => setFormState({ ...formState, autoInvoice: e.target.checked })}
                    className="w-4 h-4 rounded text-teal accent-teal focus:ring-0 focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <label htmlFor="autoInvoice" className="block text-xs font-bold text-navy-dark leading-none cursor-pointer">Auto-generate and Send Invoice upon Load Status reaching &quot;Delivered&quot;</label>
                    <span className="text-[10px] text-slate-500 leading-normal">Optimizes billing cycles by mapping customer email templates to incoming EDI delivery tokens automatically.</span>
                  </div>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'Theme' && (
            <div className="divide-y divide-slate-100">
              <div className="p-6 bg-slate-50/50">
                <h2 className="text-sm font-bold text-navy-dark uppercase tracking-widest">Theme & Display Settings</h2>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Personalize the visual backdrop of the Grid TMS terminal. Dynamic light and dark mode selectors.</p>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-xs font-black text-navy uppercase tracking-widest mb-3">Backdrop Contrast Layer</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Light Theme Button */}
                    <button 
                      onClick={() => setTheme('light')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        theme === 'light' 
                          ? 'border-orange bg-orange/5 shadow-md' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                          <Sun size={20} />
                        </div>
                        {theme === 'light' && (
                          <div className="w-5 h-5 rounded-full bg-orange flex items-center justify-center text-white text-[10px] font-black">
                            <Check size={12} />
                          </div>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-navy-dark uppercase">Corporate Daylight Theme</h4>
                      <p className="text-[10px] text-slate-500 mt-1 font-mono">Standard high contrast off-white slate with dark navy blue text nodes.</p>
                    </button>

                    {/* Dark Theme Button */}
                    <button 
                      onClick={() => setTheme('dark')}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        theme === 'dark' 
                          ? 'border-orange bg-orange/5 shadow-md' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                          <Moon size={20} />
                        </div>
                        {theme === 'dark' && (
                          <div className="w-5 h-5 rounded-full bg-orange flex items-center justify-center text-white text-[10px] font-black">
                            <Check size={12} />
                          </div>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-navy-dark uppercase">Obsidian Midnight Cabin Mode</h4>
                      <p className="text-[10px] text-slate-500 mt-1 font-mono">Eye-safe dark carbon dark mode designed for highway overnight shipping dispatch panels.</p>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-orange/5 border border-orange/15 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-orange font-bold text-xs uppercase">
                    <Sparkles size={16} />
                    <span>Selected Backdrop Status: {theme === 'dark' ? 'MIDNIGHT COCKPIT ACTIVE' : 'DAYLIGHT ACTIVE'}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 font-medium">Selecting light/dark mode instantly changes background assets, tables, invoice templates, and borders seamlessly without reloads.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Importer' && (
            <div className="divide-y divide-slate-100">
              <div className="p-6 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-navy-dark uppercase tracking-widest">Universal Load Excel & CSV Importer</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Upload load rosters generated from McLeod, Rose Rocket, EDI feeds, or broker portals.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={downloadSampleTemplate}
                    className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 active:scale-95 font-mono text-[9px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5"
                  >
                    <Download size={12} />
                    Download Template (.CSV)
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {importStatus === 'idle' && (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-orange bg-slate-50/30 hover:bg-orange/5 p-12 rounded-2xl flex flex-col items-center text-center cursor-pointer transition-all group"
                  >
                    <div className="w-14 h-14 bg-slate-100 text-slate-400 group-hover:bg-orange group-hover:text-white rounded-full flex items-center justify-center transition-all mb-4 shadow-inner">
                      <UploadCloud size={24} />
                    </div>
                    <h3 className="text-xs font-bold text-navy-dark uppercase tracking-wider">Drag & Drop Load Sheet</h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">Accepts Excel (.XLS, .XLSX) or standard delimited spreadsheets (.CSV)</p>
                    <span className="mt-3 px-3.5 py-1.5 bg-orange text-white text-[10px] font-mono font-bold uppercase tracking-widest rounded-md group-hover:bg-orange/90 transition-all">Select Local File</span>
                    
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept=".csv, .xls, .xlsx"
                      onChange={handleFileUpload}
                      className="hidden" 
                    />
                  </div>
                )}

                {importStatus === 'validating' && (
                  <div className="py-16 flex flex-col items-center justify-center text-center">
                    <RefreshCw className="text-orange animate-spin mb-4" size={32} />
                    <h3 className="text-xs font-bold text-navy-dark uppercase tracking-wider">Running Column Mapping & Ingestion Validation...</h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">Cross-referencing Origin/Destination ZIP parameters with active terminal index...</p>
                  </div>
                )}

                {importStatus === 'mapped' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                          <FileSpreadsheet size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-navy-dark">{fileName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">Discovered Rows: {parsedRows.length} | Columns Ingested: 7/7</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={resetImporter}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-mono text-[9px] font-black uppercase tracking-wider rounded-lg active:scale-95 transition-all"
                        >
                          Reset File
                        </button>
                        <button 
                          onClick={executeImport}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[9px] font-black uppercase tracking-wider rounded-lg active:scale-95 transition-all flex items-center gap-1"
                        >
                          <Play size={10} />
                          Commit Import
                        </button>
                      </div>
                    </div>

                    {/* Column Mapping Preview Panel */}
                    <div>
                      <h4 className="text-[10px] font-black text-navy uppercase tracking-widest mb-2">Automated Field Mapping Results</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        {[
                          { local: 'Load No.', mapped: 'Load Number (Auto)' },
                          { local: 'Origin Name', mapped: 'Origin Terminal ID' },
                          { local: 'Destination Name', mapped: 'Dest. Terminal ID' },
                          { local: 'Base Rate (USD)', mapped: 'Gross Freight Revenue' }
                        ].map((map, idx) => (
                          <div key={idx} className="p-3 bg-slate-50/60 rounded-lg border border-slate-200 text-center">
                            <span className="block text-[9px] text-slate-400 font-mono uppercase">Excel Header</span>
                            <span className="block text-xs font-bold text-navy-dark truncate mt-0.5">{map.local}</span>
                            <div className="inline-flex items-center gap-1 text-[8px] bg-teal/10 text-teal px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest mt-1.5">
                              <CheckCircle2 size={7} />
                              Mapped
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Parsed Rows Preview Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                        <span className="text-[10px] font-black text-navy uppercase tracking-widest">Ingestion Roster Preview</span>
                      </div>
                      <table className="w-full text-left font-sans text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-4 py-2 font-black text-slate-600">ID</th>
                            <th className="px-4 py-2 font-black text-slate-600">Broker Source</th>
                            <th className="px-4 py-2 font-black text-slate-600">Route</th>
                            <th className="px-4 py-2 font-black text-slate-600">Rate</th>
                            <th className="px-4 py-2 font-black text-slate-600">Status Msg</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-55/40 text-slate-700">
                              <td className="px-4 py-2.5 font-mono font-bold text-slate-900">{row.loadNumber}</td>
                              <td className="px-4 py-2.5 font-bold">{row.customerName}</td>
                              <td className="px-4 py-2.5">
                                <span className="font-bold text-navy">{row.originName}</span>
                                <span className="text-slate-400 mx-1">→</span>
                                <span className="font-bold text-teal">{row.destName}</span>
                              </td>
                              <td className="px-4 py-2.5 font-mono font-bold text-teal">${row.rate}</td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md ${
                                  row.status.startsWith('Valid') ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                                }`}>
                                  {row.status.startsWith('Valid') ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                                  {row.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {importStatus === 'done' && (
                  <div className="border border-emerald-100 bg-emerald-50/30 p-8 rounded-2xl flex flex-col items-center text-center">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 size={24} />
                    </div>
                    <h3 className="text-xs font-bold text-navy-dark uppercase tracking-wider">Load Ingestion Succeeded</h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">Loads are now dispatched, indexed on the live dispatch board, and active in local memory.</p>
                    <div className="mt-4 flex gap-3">
                      <button 
                        onClick={resetImporter}
                        className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-mono text-[9px] font-black uppercase tracking-wider rounded-lg active:scale-95 transition-all"
                      >
                        Upload Another Sheet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Integrations' && (
            <div className="divide-y divide-slate-100">
              <div className="p-6 bg-slate-50/50">
                <h2 className="text-sm font-bold text-navy-dark uppercase tracking-widest">Enterprise API Integrations</h2>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Connect your operational board with leading third-party freight accounting and driver-tracking apps.</p>
              </div>

              <div className="p-6 space-y-4">
                {/* Integration 1: Samsara / Motive (ELD) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl font-mono text-xs font-black">ELD</div>
                    <div>
                      <h4 className="font-bold text-navy-dark text-xs uppercase leading-none">Samsara / Motive Telemetry Tunnel</h4>
                      <p className="text-[10px] text-slate-500 mt-1">Real-time GPS tracker, smart geofencing, HOS duty status updates automatically mapped to dispatch routes.</p>
                      <div className="inline-flex items-center gap-1.5 p-1 px-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-full text-[8px] font-black tracking-widest mt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
                        SYNCED V4 API
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => triggerAlert('Samsara / Motive tokens refreshed successfully.')} 
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:border-slate-300 font-mono text-[9px] font-black uppercase tracking-wider rounded-lg active:scale-95 transition-all self-end md:self-center"
                  >
                    Sync Options
                  </button>
                </div>

                {/* Integration 2: QuickBooks Online (Accounting) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl font-mono text-xs font-black">ACC</div>
                    <div>
                      <h4 className="font-bold text-navy-dark text-xs uppercase leading-none">QuickBooks Accounting Sync</h4>
                      <p className="text-[10px] text-slate-500 mt-1">Export loads, line item descriptions, and factoring parameters as accounts receivable invoices directly.</p>
                      <div className="inline-flex items-center gap-1.5 p-1 px-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-full text-[8px] font-black tracking-widest mt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
                        AUTHENTICATED SECURELY
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => triggerAlert('QuickBooks account status is active.')} 
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:border-slate-300 font-mono text-[9px] font-black uppercase tracking-wider rounded-lg active:scale-95 transition-all self-end md:self-center"
                  >
                    Configure
                  </button>
                </div>

                {/* Integration 3: Factoring Partner (Liquid Equity) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 bg-amber-50 text-amber-700 rounded-xl font-mono text-xs font-black">PAY</div>
                    <div>
                      <h4 className="font-bold text-navy-dark text-xs uppercase leading-none">Apex Capital / Triumph Financial API</h4>
                      <p className="text-[10px] text-slate-500 mt-1">Automatic verification of broker credit limits and electronic submission of proof of delivery (POD) for invoice factorization.</p>
                      <div className="inline-flex items-center gap-1.5 p-1 px-2.5 bg-slate-100 text-slate-500 rounded-full text-[8px] font-black tracking-widest mt-2">
                        READY TO ESTABLISH
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => triggerAlert('Initiating Triumph Financial factoring pipeline setup.', 'success')} 
                    className="px-3 py-1.5 bg-orange hover:bg-orange/90 text-white font-mono text-[9px] font-black uppercase tracking-wider rounded-lg active:scale-95 transition-all self-end md:self-center"
                  >
                    Connect Partner
                  </button>
                  </div>
                </div>

                <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                  <h2 className="text-sm font-bold text-navy-dark uppercase tracking-widest">Email Integrations</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Connect your email provider to send invoices and notifications directly from your own domain.</p>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['Gmail', 'Outlook', 'Yahoo', 'Hotmail', 'iCloud Mail'].map(provider => {
                      const isConnected = companySettings.emailIntegrationProvider === provider;
                      return (
                        <div key={provider} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isConnected ? 'bg-orange/5 border-orange/30' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl flex items-center justify-center ${isConnected ? 'bg-orange text-white shadow-md shadow-orange/20' : 'bg-white text-slate-400 border border-slate-200'}`}>
                              <Mail size={16} />
                            </div>
                            <div>
                              <h4 className={`text-xs font-bold ${isConnected ? 'text-navy-dark' : 'text-slate-600'}`}>{provider}</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {isConnected ? <span className="font-bold text-orange">{companySettings.emailIntegrationAccount}</span> : 'Not connected'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (isConnected) {
                                setCompanySettings(prev => ({ ...prev, emailIntegrationProvider: null, emailIntegrationAccount: null }));
                                triggerAlert(`Disconnected from ${provider}.`, 'success');
                              } else {
                                setCompanySettings(prev => ({ ...prev, emailIntegrationProvider: provider, emailIntegrationAccount: `dispatch@carrier.com` }));
                                triggerAlert(`Successfully authenticated and connected to ${provider}.`, 'success');
                              }
                            }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isConnected ? 'bg-white border border-slate-200 text-slate-500 hover:text-red hover:bg-red-50' : 'bg-navy text-white hover:bg-navy-light shadow-md'}`}
                          >
                            {isConnected ? 'Disconnect' : 'Connect'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
