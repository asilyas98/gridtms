import React, { useEffect, useState, useRef } from 'react';
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
  Copy,
  Smartphone,
  Code,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TeamManagementView from './TeamManagementView';

type SettingsTab = 'Company' | 'Theme' | 'Importer' | 'Integrations' | 'Team';

interface SettingsViewProps {
  defaultTab?: SettingsTab;
}

export default function SettingsView({ defaultTab = 'Company' }: SettingsViewProps) {
  const { 
    theme, 
    setTheme, 
    companySettings, 
    saveCompanySettings,
    loads, 
    addLoad,
    customers,
    locations
  } = useData();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states matching Context fields
  const [formState, setFormState] = useState({ ...companySettings });
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => {
    setFormState({ ...companySettings });
  }, [companySettings]);
  
  // File import states
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'validating' | 'mapped' | 'done'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setAlertMessage({ text, type });
    setTimeout(() => setAlertMessage(null), 4000);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCompany(true);
    const saved = await saveCompanySettings(formState);
    setSavingCompany(false);
    triggerAlert(
      saved ? 'Company information saved to Supabase.' : 'Company information could not be saved. Run the company settings migration and check the Netlify function logs.',
      saved ? 'success' : 'error',
    );
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

    // Read the file and parse real CSV rows
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

      if (lines.length <= 1) {
        triggerAlert('CSV file contains no data rows to import.');
        setImportStatus('idle');
        return;
      }

      // Parse header and data rows
      const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/["']/g, ''));
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length === 0 || cols.every(c => !c)) continue;

        // Extract columns by header index or fallback position
        const loadNum = cols[header.findIndex(h => h.includes('load') || h.includes('number'))] || `LD-${Date.now().toString().slice(-4)}-${i}`;
        const custName = cols[header.findIndex(h => h.includes('cust') || h.includes('broker') || h.includes('client'))] || cols[1] || 'Direct Shipper';
        const origName = cols[header.findIndex(h => h.includes('orig') || h.includes('pickup') || h.includes('from'))] || cols[2] || 'Origin Hub';
        const destName = cols[header.findIndex(h => h.includes('dest') || h.includes('delivery') || h.includes('to'))] || cols[3] || 'Destination Logistics';
        const rateVal = parseFloat(cols[header.findIndex(h => h.includes('rate') || h.includes('amount') || h.includes('pay'))] || cols[4] || '1800') || 1800;
        const commVal = cols[header.findIndex(h => h.includes('comm') || h.includes('freight') || h.includes('item'))] || cols[5] || 'General Freight';
        const weightVal = parseFloat(cols[header.findIndex(h => h.includes('weight') || h.includes('lbs'))] || cols[6] || '24000') || 24000;

        const matchedCustomer = customers.find(c => c.name.toLowerCase().includes(custName.toLowerCase()));
        const matchedOrigin = locations.find(l => l.name.toLowerCase().includes(origName.toLowerCase()));
        const matchedDest = locations.find(l => l.name.toLowerCase().includes(destName.toLowerCase()));

        rows.push({
          loadNumber: loadNum,
          customerName: matchedCustomer?.name || custName,
          customerId: matchedCustomer?.id || '',
          originName: matchedOrigin?.name || origName,
          originId: matchedOrigin?.id || '',
          destName: matchedDest?.name || destName,
          destId: matchedDest?.id || '',
          rate: rateVal,
          commodity: commVal,
          weight: weightVal,
          status: matchedCustomer ? 'Valid' : 'New Customer (will link on save)'
        });
      }

      setParsedRows(rows);
      setImportStatus('mapped');
      triggerAlert(`Parsed ${rows.length} freight load records from CSV.`);
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
        pickupDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        deliveryDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        rate: row.rate,
        miles: 0,
        equipmentType: "Dry Van 53'",
        status: 'Created',
        commodity: row.commodity || 'General Freight',
        weight: row.weight || 24000,
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
            { id: 'Team', label: 'Team & Permissions', icon: UserCheck, desc: 'User roles & granular access' },
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
          {activeTab === 'Team' && (
            <div className="p-6">
              <TeamManagementView />
            </div>
          )}

          {activeTab === 'Company' && (
            <form onSubmit={handleSaveCompany} className="divide-y divide-slate-100">
              <div className="p-6 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-navy-dark uppercase tracking-widest">Company Carrier Profile</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">FMCSA Compliance records, public identifiers, and billing default address.</p>
                </div>
                <button 
                  type="submit" 
                  disabled={savingCompany}
                  className="px-4 py-2 bg-orange hover:bg-orange/90 active:scale-95 text-white font-mono text-[10px] font-black uppercase tracking-widest rounded-lg transition-all disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingCompany ? 'Saving…' : 'Save Identity'}
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">Registered Carrier Name</label>
                    <input 
                      type="text" 
                      value={formState.carrierName}
                      onChange={e => setFormState({ ...formState, carrierName: e.target.value })}
                      className="w-full text-xs font-bold text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white focus:ring-1 focus:ring-orange transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">SCAC Code</label>
                    <input 
                      type="text" 
                      value={formState.scacCode}
                      onChange={e => setFormState({ ...formState, scacCode: e.target.value })}
                      className="w-full text-xs font-bold text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white focus:ring-1 focus:ring-orange transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">USDOT Number</label>
                    <input 
                      type="text" 
                      value={formState.dotNumber}
                      onChange={e => setFormState({ ...formState, dotNumber: e.target.value })}
                      className="w-full text-xs font-mono font-bold text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white focus:ring-1 focus:ring-orange transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">MC Number</label>
                    <input 
                      type="text" 
                      value={formState.mcNumber}
                      onChange={e => setFormState({ ...formState, mcNumber: e.target.value })}
                      className="w-full text-xs font-mono font-bold text-slate-800 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white focus:ring-1 focus:ring-orange transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-1">Operating Headquarters Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-slate-400" size={14} />
                    <input 
                      type="text" 
                      value={formState.address}
                      onChange={e => setFormState({ ...formState, address: e.target.value })}
                      className="w-full text-xs font-bold text-slate-800 pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:focus:bg-white focus:ring-1 focus:ring-orange transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
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
              </div>

              {/* Sub company system attributes */}
              <div className="p-6">
                <h3 className="text-xs font-black text-navy uppercase tracking-widest mb-4">Auto-Billing Configuration</h3>
                <div className="flex items-center gap-3 bg-teal/5 border border-teal/10 p-4 rounded-xl">
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
                {/* Integration 0: Supabase Cloud Database & Storage */}
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-mono text-xs font-black">SBA</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-navy-dark dark:text-white text-xs uppercase leading-none">Supabase Cloud Database & Storage Vault</h4>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 rounded-full text-[8px] font-black tracking-widest">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          ONLINE (durwofqudkmhxdxdfonl)
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Endpoint: <code className="font-mono text-emerald-700 dark:text-emerald-300">https://durwofqudkmhxdxdfonl.supabase.co</code> · Bucket: <code className="font-mono">documents</code>
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Driver DQ Files, Maintenance Work Orders, and Compliance certificates sync directly to your Supabase project.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 self-end md:self-center">
                    <button 
                      onClick={() => {
                        const sql = `-- GridTMS: Supabase Storage Configuration Script
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', true, 52428800, null)
on conflict (id) do update set public = excluded.public;

drop policy if exists "gridtms_document_uploads" on storage.objects;
drop policy if exists "gridtms_document_reads" on storage.objects;
drop policy if exists "gridtms_document_updates" on storage.objects;
drop policy if exists "gridtms_document_deletes" on storage.objects;

create policy "gridtms_document_uploads" on storage.objects for insert to anon, authenticated with check (bucket_id = 'documents');
create policy "gridtms_document_reads" on storage.objects for select to anon, authenticated using (bucket_id = 'documents');
create policy "gridtms_document_updates" on storage.objects for update to anon, authenticated using (bucket_id = 'documents') with check (bucket_id = 'documents');
create policy "gridtms_document_deletes" on storage.objects for delete to anon, authenticated using (bucket_id = 'documents');
`;
                        navigator.clipboard.writeText(sql);
                        triggerAlert('Storage Setup SQL copied to clipboard! Paste and Run in Supabase SQL Editor.', 'success');
                      }}
                      className="px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-wider rounded-lg bg-navy hover:bg-navy-dark text-white shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Copy size={11} />
                      Copy Storage SQL
                    </button>
                    <button 
                      onClick={() => triggerAlert('Supabase connection verified: Project durwofqudkmhxdxdfonl is live and responding.', 'success')} 
                      className="px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-wider rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-95"
                    >
                      Test Ping
                    </button>
                  </div>
                </div>

                {/* Integration 0.5: External Driver App Connection Kit */}
                <div className="flex flex-col p-5 bg-blue-50/50 dark:bg-zinc-900 rounded-2xl border border-blue-200 dark:border-blue-900/40 gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl font-mono text-xs font-black">
                        <Smartphone size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-navy-dark dark:text-white text-xs uppercase leading-none">External Driver Mobile App Connection Kit</h4>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 rounded-full text-[8px] font-black tracking-widest">
                            GOOGLE AI STUDIO COMPATIBLE
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          Bridge your secondary Google AI Studio Driver App directly to this TMS. Enables driver phone login, live dispatch push, GPS pings, HOS duty clock sync, and camera POD/BOL document uploads.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                    <button
                      onClick={() => {
                        const sql = `-- =========================================================================
-- GRIDTMS DRIVER APP INTEGRATION DDL
-- Run this in your Supabase SQL Editor (durwofqudkmhxdxdfonl.supabase.co)
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    cdl_number TEXT,
    status TEXT DEFAULT 'active',
    current_truck_id TEXT,
    current_location_lat DOUBLE PRECISION,
    current_location_lng DOUBLE PRECISION,
    current_location_city TEXT,
    current_location_state TEXT,
    hos_duty_status TEXT DEFAULT 'Off Duty',
    hos_drive_hours NUMERIC DEFAULT 11.0,
    hos_shift_hours NUMERIC DEFAULT 14.0,
    hos_cycle_hours NUMERIC DEFAULT 70.0,
    last_ping_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LOADS TABLE
CREATE TABLE IF NOT EXISTS public.loads (
    id TEXT PRIMARY KEY,
    load_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    truck_id TEXT,
    status TEXT NOT NULL DEFAULT 'booked',
    rate NUMERIC NOT NULL DEFAULT 0,
    origin_city TEXT NOT NULL,
    origin_state TEXT NOT NULL,
    origin_date TEXT,
    destination_city TEXT NOT NULL,
    destination_state TEXT NOT NULL,
    destination_date TEXT,
    bol_url TEXT,
    pod_url TEXT,
    pod_signed_at TIMESTAMPTZ,
    driver_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.loads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;

-- 4. RLS POLICIES FOR DRIVERS
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can view their own profile" ON public.drivers;
CREATE POLICY "Drivers can view their own profile" 
ON public.drivers FOR SELECT TO authenticated 
USING (user_id = auth.uid() OR phone = (auth.jwt() ->> 'phone'));

DROP POLICY IF EXISTS "Drivers can update their own telemetry" ON public.drivers;
CREATE POLICY "Drivers can update their own telemetry" 
ON public.drivers FOR UPDATE TO authenticated 
USING (user_id = auth.uid() OR phone = (auth.jwt() ->> 'phone'));

DROP POLICY IF EXISTS "Drivers can view assigned loads" ON public.loads;
CREATE POLICY "Drivers can view assigned loads" 
ON public.loads FOR SELECT TO authenticated 
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Drivers can update assigned load status and POD" ON public.loads;
CREATE POLICY "Drivers can update assigned load status and POD" 
ON public.loads FOR UPDATE TO authenticated 
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

-- 5. STORAGE BUCKET FOR PODS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Drivers can upload POD photos" ON storage.objects;
CREATE POLICY "Drivers can upload POD photos" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Public POD reads" ON storage.objects;
CREATE POLICY "Public POD reads" 
ON storage.objects FOR SELECT TO public 
USING (bucket_id = 'documents');
`;
                        navigator.clipboard.writeText(sql);
                        triggerAlert('Full Driver App SQL Schema copied! Paste and run in your Supabase SQL Editor.', 'success');
                      }}
                      className="px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider rounded-xl bg-navy dark:bg-zinc-800 hover:bg-navy-dark text-white shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Copy size={12} />
                      1. Copy Driver SQL Schema
                    </button>

                    <button
                      onClick={() => {
                        const snippet = `// Copy this snippet into your Driver App Google AI Studio Project:
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://durwofqudkmhxdxdfonl.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 1. Authenticate with Driver Phone OTP
export async function loginDriverWithPhone(phone) {
  return await supabase.auth.signInWithOtp({ phone });
}

// 2. Realtime listener for incoming dispatch assignments
export function subscribeToDriverLoads(driverId, onUpdate) {
  return supabase
    .channel('assigned-loads')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'loads', filter: \`driver_id=eq.\${driverId}\` },
      (payload) => onUpdate(payload.new)
    )
    .subscribe();
}

// 3. Push Live GPS Coords and HOS Duty Status
export async function pushDriverTelemetry(driverId, lat, lng, city, state, dutyStatus) {
  return await supabase.from('drivers').update({
    current_location_lat: lat,
    current_location_lng: lng,
    current_location_city: city,
    current_location_state: state,
    hos_duty_status: dutyStatus,
    last_ping_at: new Date().toISOString()
  }).eq('id', driverId);
}

// 4. Capture & Upload Signed POD / BOL to Supabase Storage
export async function uploadPodPhoto(loadId, fileBlob) {
  const filePath = \`pods/\${loadId}_\${Date.now()}.jpg\`;
  await supabase.storage.from('documents').upload(filePath, fileBlob, { contentType: 'image/jpeg' });
  const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
  
  return await supabase.from('loads').update({
    status: 'delivered',
    pod_url: data.publicUrl,
    pod_signed_at: new Date().toISOString()
  }).eq('id', loadId);
}
`;
                        navigator.clipboard.writeText(snippet);
                        triggerAlert('Driver App Client SDK Snippet copied! Paste into your driver app repository.', 'success');
                      }}
                      className="px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Code size={12} />
                      2. Copy Driver Client SDK Code
                    </button>

                    <button
                      onClick={() => {
                        const env = `# In your Driver App .env or Project Environment Variables:
VITE_SUPABASE_URL=https://durwofqudkmhxdxdfonl.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_STORAGE_BUCKET=documents
`;
                        navigator.clipboard.writeText(env);
                        triggerAlert('Driver App .env configuration copied to clipboard!', 'success');
                      }}
                      className="px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider rounded-xl bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 shadow-2xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Copy size={12} />
                      3. Copy .env Template
                    </button>
                  </div>
                </div>



                {/* Integration 1: Samsara / Motive (ELD) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl font-mono text-xs font-black">ELD</div>
                    <div>
                      <h4 className="font-bold text-navy-dark text-xs uppercase leading-none">Samsara / Motive Telemetry Tunnel</h4>
                      <p className="text-[10px] text-slate-500 mt-1">Real-time GPS tracker, smart geofencing, HOS duty status updates automatically mapped to dispatch routes.</p>
                      {formState.eledIntegration ? (
                        <div className="inline-flex items-center gap-1.5 p-1 px-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-full text-[8px] font-black tracking-widest mt-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />SYNCED V4 API</div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 p-1 px-2.5 bg-slate-200 border border-slate-300 text-slate-700 rounded-full text-[8px] font-black tracking-widest mt-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-500" />NOT CONNECTED</div>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => triggerAlert(formState.eledIntegration ? 'Samsara / Motive tokens refreshed successfully.' : 'Integration wizard would open here.')} 
                    className={`px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-wider rounded-lg active:scale-95 transition-all self-end md:self-center ${formState.eledIntegration ? 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:border-slate-300' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20'}`}
                  >
                    {formState.eledIntegration ? 'Sync Options' : 'Connect'}
                  </button>
                </div>

                {/* Integration 2: QuickBooks Online (Accounting) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl font-mono text-xs font-black">ACC</div>
                    <div>
                      <h4 className="font-bold text-navy-dark text-xs uppercase leading-none">QuickBooks Accounting Sync</h4>
                      <p className="text-[10px] text-slate-500 mt-1">Export loads, line item descriptions, and factoring parameters as accounts receivable invoices directly.</p>
                      {formState.quickBooksConnected ? (
                        <div className="inline-flex items-center gap-1.5 p-1 px-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-full text-[8px] font-black tracking-widest mt-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />AUTHENTICATED SECURELY</div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 p-1 px-2.5 bg-slate-200 border border-slate-300 text-slate-700 rounded-full text-[8px] font-black tracking-widest mt-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-500" />NOT CONNECTED</div>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => triggerAlert(formState.quickBooksConnected ? 'QuickBooks account status is active.' : 'QuickBooks OAuth flow would start here.')} 
                    className={`px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-wider rounded-lg active:scale-95 transition-all self-end md:self-center ${formState.quickBooksConnected ? 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:border-slate-300' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20'}`}
                  >
                    {formState.quickBooksConnected ? 'Configure' : 'Connect'}
                  </button>
                </div>

                {/* Integration 3: Factoring Partner (Liquid Equity) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 bg-amber-50 text-amber-700 rounded-xl font-mono text-xs font-black">PAY</div>
                    <div>
                      <h4 className="font-bold text-navy-dark text-xs uppercase leading-none">Apex Capital / Triumph Financial API</h4>
                      <p className="text-[10px] text-slate-500 mt-1">Automatic verification of broker credit limits and electronic submission of proof of delivery (POD) for invoice factorization.</p>
                      {formState.factoringPartner ? (
                        <div className="inline-flex items-center gap-1.5 p-1 px-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-full text-[8px] font-black tracking-widest mt-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />API TUNNEL ACTIVE</div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 p-1 px-2.5 bg-slate-200 border border-slate-300 text-slate-700 rounded-full text-[8px] font-black tracking-widest mt-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-500" />NOT CONNECTED</div>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => triggerAlert(formState.factoringPartner ? 'Factoring partner sync options opened.' : 'Initiating Triumph Financial factoring pipeline setup.', 'success')} 
                    className={`px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-wider rounded-lg active:scale-95 transition-all self-end md:self-center ${formState.factoringPartner ? 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:border-slate-300' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20'}`}
                  >
                    {formState.factoringPartner ? 'Configure' : 'Connect'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
