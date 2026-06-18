import React, { useState, useRef } from 'react';
import { 
  MapPin, 
  Map, 
  Navigation, 
  Clock, 
  Building,
  Plus,
  Search,
  Edit2,
  Trash2,
  MapIcon,
  ArrowLeft,
  Check,
  X,
  UploadCloud,
  File,
  ShieldCheck,
  Building2,
  Lock,
  Phone,
  Mail,
  Scale,
  UtilityPole,
  Droplet,
  Truck,
  Forklift,
  Tv,
  HelpCircle,
  AlertTriangle,
  Info,
  Layers,
  Compass,
  Briefcase
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { motion, AnimatePresence } from 'motion/react';
import { Location, Address, ComplianceDocument } from '../types';

export default function LocationsView() {
  const { 
    locations, 
    customers, 
    addLocation, 
    updateLocation, 
    deleteLocation,
    navigationIntent,
    setNavigationIntent
  } = useData();

  // Navigation states
  const [showCreationMode, setShowCreationMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [localIntent, setLocalIntent] = useState<any>(null);

  React.useEffect(() => {
    if (navigationIntent && navigationIntent.view === 'locations' && navigationIntent.action === 'create') {
      setShowCreationMode(true);
      if (navigationIntent.returnTo) setLocalIntent(navigationIntent);
      setNavigationIntent(null);
    }
  }, [navigationIntent, setNavigationIntent]);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');

  // ==========================================
  // Form Field States (Comprehensive TMS Form)
  // ==========================================
  const [locName, setLocName] = useState('');
  const [locType, setLocType] = useState<'Shipper' | 'Consignee' | 'Both' | 'Drop Yard' | 'Terminal'>('Both');
  const [locCustomerIds, setLocCustomerIds] = useState<string[]>([]);
  
  // Physical Address Info
  const [locStreet, setLocStreet] = useState('');
  const [locCity, setLocCity] = useState('');
  const [locState, setLocState] = useState('');
  const [locZip, setLocZip] = useState('');
  const [locCountry, setLocCountry] = useState('USA');
  const [locLat, setLocLat] = useState('');
  const [locLng, setLocLng] = useState('');

  // Operations & Detention Settings
  const [locAvgDetention, setLocAvgDetention] = useState('1h 30m');
  const [locOperatingHours, setLocOperatingHours] = useState('08:00 - 17:00 M-F');
  const [locMaxVehicleHeight, setLocMaxVehicleHeight] = useState('13\'6"');

  // Contact Registry
  const [locContactName, setLocContactName] = useState('');
  const [locContactPhone, setLocContactPhone] = useState('');
  const [locContactEmail, setLocContactEmail] = useState('');

  // Access Details & Amenities Flags
  const [locGateCode, setLocGateCode] = useState('');
  const [locOvernightParking, setLocOvernightParking] = useState(false);
  const [locRestroomsAvailable, setLocRestroomsAvailable] = useState(false);
  const [locScaleOnSite, setLocScaleOnSite] = useState(false);
  const [locForkliftOnSite, setLocForkliftOnSite] = useState(false);
  const [locTwicRequired, setLocTwicRequired] = useState(false);

  // Safety Guidelines
  const [locPpeRequired, setLocPpeRequired] = useState<string[]>([]);
  const [locNotes, setLocNotes] = useState('');

  // Compliance Upload states
  const [uploadedDocs, setUploadedDocs] = useState<ComplianceDocument[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [currentSelectedFile, setCurrentSelectedFile] = useState<File | null>(null);
  const [selectedDocType, setSelectedDocType] = useState('Site Directions & Entry Map');
  const [docExpiryDate, setDocExpiryDate] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lists of available PPEs for simple select toggles
  const ppeOptions = [
    'Steel-Toe Boots',
    'High-Vis Vest',
    'Safety Glasses',
    'Hard Hat',
    'Heavy-Duty Gloves',
    'Hearing Protection',
    'TWIC Access Credentials'
  ];

  // Document Categorization list
  const docOptions = [
    'Site Directions & Entry Map',
    'Access & Safety SOP Rules',
    'Hazmat Site Certificate',
    'Overnight Parking Permit Agreement',
    'Scale Operations Guide',
    'Facility Liability Insurance File',
    'Custom Boundary & Yard PDF'
  ];

  // Helper mapping to check customer names
  const getCustomerName = (ids: string[]) => {
    if (!ids || ids.length === 0) return 'Internal / Shared';
    const names = ids.map(id => customers.find(c => c.id === id)?.name).filter(Boolean);
    return names.length > 0 ? names.join(', ') : 'Internal / Shared';
  };

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

  const triggerUploadSimulation = () => {
    if (!currentSelectedFile) return;
    
    setUploadProgress(15);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null) return null;
        if (prev >= 90) {
          clearInterval(interval);
          setUploadSuccess(true);
          return 100;
        }
        return prev + 20;
      });
    }, 100);
  };

  const attachUploadedDoc = () => {
    if (!currentSelectedFile) return;
    
    const newDoc: ComplianceDocument = {
      id: `doc-${Math.random().toString(36).substr(2, 9)}`,
      name: currentSelectedFile.name,
      type: selectedDocType,
      expiryDate: docExpiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Valid'
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

  const togglePpeOption = (option: string) => {
    setLocPpeRequired(prev => 
      prev.includes(option) 
        ? prev.filter(item => item !== option) 
        : [...prev, option]
    );
  };

  const toggleCustomerAssociation = (custId: string) => {
    setLocCustomerIds(prev => 
      prev.includes(custId) 
        ? prev.filter(id => id !== custId) 
        : [...prev, custId]
    );
  };

  const resetAllFormStates = () => {
    setLocName('');
    setLocType('Both');
    setLocCustomerIds([]);
    setLocStreet('');
    setLocCity('');
    setLocState('');
    setLocZip('');
    setLocCountry('USA');
    setLocLat('');
    setLocLng('');
    setLocAvgDetention('1h 30m');
    setLocOperatingHours('08:00 - 17:00 M-F');
    setLocMaxVehicleHeight('13\'6"');
    setLocContactName('');
    setLocContactPhone('');
    setLocContactEmail('');
    setLocGateCode('');
    setLocOvernightParking(false);
    setLocRestroomsAvailable(false);
    setLocScaleOnSite(false);
    setLocForkliftOnSite(false);
    setLocTwicRequired(false);
    setLocPpeRequired([]);
    setLocNotes('');
    
    setUploadedDocs([]);
    setUploadSuccess(false);
    setUploadProgress(null);
    setCurrentSelectedFile(null);
    setDocExpiryDate('');
  };

  const handleCreateLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locName || !locStreet || !locCity || !locState || !locZip) {
      alert('Please fill out all required company address and facility name fields.');
      return;
    }

    const payload = {
      name: locName,
      type: locType,
      customerIds: locCustomerIds,
      address: {
        street: locStreet,
        city: locCity,
        state: locState,
        zip: locZip,
        country: locCountry,
        lat: locLat ? parseFloat(locLat) : undefined,
        lng: locLng ? parseFloat(locLng) : undefined
      },
      avgDetention: locAvgDetention,
      operatingHours: locOperatingHours,
      maxVehicleHeight: locMaxVehicleHeight,
      contactName: locContactName || undefined,
      contactPhone: locContactPhone || undefined,
      contactEmail: locContactEmail || undefined,
      gateCode: locGateCode || undefined,
      overnightParking: locOvernightParking,
      restroomsAvailable: locRestroomsAvailable,
      scaleOnSite: locScaleOnSite,
      forkliftOnSite: locForkliftOnSite,
      twicRequired: locTwicRequired,
      ppeRequired: locPpeRequired,
      notes: locNotes || undefined,
      complianceDocs: uploadedDocs
    };

    if (isEditing && editingId) {
      updateLocation(editingId, payload);
    } else {
      const newId = addLocation(payload);
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

  const handleEditClick = (loc: Location) => {
    setLocName(loc.name);
    setLocType(loc.type);
    setLocCustomerIds(loc.customerIds || []);
    setLocStreet(loc.address?.street || '');
    setLocCity(loc.address?.city || '');
    setLocState(loc.address?.state || '');
    setLocZip(loc.address?.zip || '');
    setLocCountry(loc.address?.country || 'USA');
    setLocLat(loc.address?.lat !== undefined ? String(loc.address.lat) : '');
    setLocLng(loc.address?.lng !== undefined ? String(loc.address.lng) : '');

    setLocAvgDetention(loc.avgDetention || '1h 30m');
    setLocOperatingHours(loc.operatingHours || '08:00 - 17:00 M-F');
    setLocMaxVehicleHeight(loc.maxVehicleHeight || '13\'6"');
    
    setLocContactName(loc.contactName || '');
    setLocContactPhone(loc.contactPhone || '');
    setLocContactEmail(loc.contactEmail || '');
    
    setLocGateCode(loc.gateCode || '');
    setLocOvernightParking(loc.overnightParking || false);
    setLocRestroomsAvailable(loc.restroomsAvailable || false);
    setLocScaleOnSite(loc.scaleOnSite || false);
    setLocForkliftOnSite(loc.forkliftOnSite || false);
    setLocTwicRequired(loc.twicRequired || false);
    
    setLocPpeRequired(loc.ppeRequired || []);
    setLocNotes(loc.notes || '');
    setUploadedDocs(loc.complianceDocs || []);

    setIsEditing(true);
    setEditingId(loc.id);
    setShowCreationMode(true);
  };

  const handleDeleteClick = (id: string, name: string) => {
    deleteLocation(id);
  };

  const simulateGeocode = () => {
    if (!locStreet || !locCity || !locState) {
      alert('Provide street address, city and state first to generate a coordinates lookup.');
      return;
    }
    // Generate logical Chicago area coordinates of +/-, or mock based on strings
    const hash = locStreet.length + locCity.length;
    const mockLat = (41.8781 + (hash % 100) / 1000).toFixed(4);
    const mockLng = (-87.6298 - (hash % 100) / 1000).toFixed(4);
    setLocLat(mockLat);
    setLocLng(mockLng);
  };

  const filteredLocations = locations.filter(l => {
    const matchesSearch = 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.address?.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.address?.state && l.address.state.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = selectedType === 'All Types' ? true : l.type === selectedType;

    return matchesSearch && matchesType;
  });

  // ==========================================
  // RENDER DYNAMIC FULL-SCREEN FACILITY CREATION PAGE
  // ==========================================
  if (showCreationMode) {
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
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Logistics Node Dispatch</span>
                <span className="text-slate-300">/</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-orange">Facility Profile Registrar</span>
              </div>
              <h2 className="text-2xl font-head font-extrabold text-navy-dark tracking-tight">
                {isEditing ? 'Modify Facility Profile' : 'Register New Facility'}
              </h2>
            </div>
          </div>
        </header>

        {/* Master Entry Form */}
        <form onSubmit={handleCreateLocationSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Specs Column (Left) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Sec 1: General Facility Configuration */}
            <div className="tms-card p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-orange" />
                  <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">General Facility Details</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">TMS Route Engine Linked</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Facility / Yard Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={locName}
                    onChange={(e) => setLocName(e.target.value)}
                    placeholder="e.g. Chicago Logistics Terminal #14"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operations Flow Type</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                    value={locType}
                    onChange={(e) => setLocType(e.target.value as any)}
                  >
                    <option value="Both">Both (Shipper & Consignee)</option>
                    <option value="Shipper">Shipper (Pickup Point)</option>
                    <option value="Consignee">Consignee (Delivery Point)</option>
                    <option value="Terminal">Carrier Terminal / Hub</option>
                    <option value="Drop Yard">Trailer Drop Yard</option>
                  </select>
                </div>
              </div>

              {/* Connected Customers Multi-Select Checkboxes */}
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Associated Accounts / Customers (Shared / Internal if unclicked)</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-150">
                  {customers.map(c => {
                    const isChecked = locCustomerIds.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer text-xs">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCustomerAssociation(c.id)}
                          className="w-3.5 h-3.5 text-orange border-slate-300 rounded focus:ring-orange cursor-pointer"
                        />
                        <span className="font-bold text-navy truncate" title={c.name}>{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sec 2: Geographical Node & Address */}
            <div className="tms-card p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-orange" />
                  <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Geographical Node Configuration</h3>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Street Address *</label>
                  <input 
                    type="text" 
                    required 
                    value={locStreet}
                    onChange={(e) => setLocStreet(e.target.value)}
                    placeholder="e.g. 500 S Butler Drive, Cargo Gate B"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">City *</label>
                    <input 
                      type="text" 
                      required 
                      value={locCity}
                      onChange={(e) => setLocCity(e.target.value)}
                      placeholder="e.g. Chicago"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">State / Province *</label>
                    <input 
                      type="text" 
                      required 
                      value={locState}
                      onChange={(e) => setLocState(e.target.value)}
                      placeholder="e.g. IL"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all uppercase font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zip / Postal Code *</label>
                    <input 
                      type="text" 
                      required 
                      value={locZip}
                      onChange={(e) => setLocZip(e.target.value)}
                      placeholder="e.g. 60605"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Latitude Coordinate</label>
                      <button 
                        type="button"
                        onClick={simulateGeocode}
                        className="text-[9px] text-orange hover:text-orange-light font-black uppercase tracking-wider"
                      >
                        Auto-Target Pin
                      </button>
                    </div>
                    <input 
                      type="text" 
                      value={locLat}
                      onChange={(e) => setLocLat(e.target.value)}
                      placeholder="e.g. 41.8781"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-2 text-xs outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Longitude Coordinate</label>
                    <input 
                      type="text" 
                      value={locLng}
                      onChange={(e) => setLocLng(e.target.value)}
                      placeholder="e.g. -87.6298"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-2 text-xs outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sec 3: Operating Hours, Detention & Access Code */}
            <div className="tms-card p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-orange" />
                  <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Operational Parameters</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Facility Gate/Security Code</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      value={locGateCode}
                      onChange={(e) => setLocGateCode(e.target.value)}
                      placeholder="e.g. #2414"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl pl-9 pr-4 py-3 text-sm outline-none transition-all font-mono font-bold uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Average Detention Window</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none cursor-pointer font-bold text-navy"
                    value={locAvgDetention}
                    onChange={(e) => setLocAvgDetention(e.target.value)}
                  >
                    <option value="0h 30m">0h 30m (Express Loading)</option>
                    <option value="1h 00m">1h 00m (Standard Van)</option>
                    <option value="1h 30m">1h 30m (Average Detention)</option>
                    <option value="2h 15m">2h 15m (Heavy Load/LTL)</option>
                    <option value="3h 30m">3h 30m+ (Slow yard process)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receiving/Shipping Hours</label>
                  <input 
                    type="text" 
                    value={locOperatingHours}
                    onChange={(e) => setLocOperatingHours(e.target.value)}
                    placeholder="e.g. 06:00 - 22:00 M-F or 24/7"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              {/* Physical Amenities switches */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-slate-50">
                
                <label className="flex flex-col justify-between p-3 border border-slate-150 rounded-xl hover:border-orange cursor-pointer transition-all bg-slate-50/30 group">
                  <div className="flex items-center justify-between mb-2">
                    <Compass size={18} className="text-teal" />
                    <input 
                      type="checkbox"
                      checked={locOvernightParking}
                      onChange={(e) => setLocOvernightParking(e.target.checked)}
                      className="w-3.5 h-3.5 text-orange rounded outline-none curor-pointer"
                    />
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-orange transition-colors">Overnight Parking</span>
                </label>

                <label className="flex flex-col justify-between p-3 border border-slate-150 rounded-xl hover:border-orange cursor-pointer transition-all bg-slate-50/30 group">
                  <div className="flex items-center justify-between mb-2">
                    <Droplet size={18} className="text-sky-500" />
                    <input 
                      type="checkbox"
                      checked={locRestroomsAvailable}
                      onChange={(e) => setLocRestroomsAvailable(e.target.checked)}
                      className="w-3.5 h-3.5 text-orange rounded outline-none curor-pointer"
                    />
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-orange transition-colors">Drvr Restrooms</span>
                </label>

                <label className="flex flex-col justify-between p-3 border border-slate-150 rounded-xl hover:border-orange cursor-pointer transition-all bg-slate-50/30 group">
                  <div className="flex items-center justify-between mb-2">
                    <Scale size={18} className="text-orange" />
                    <input 
                      type="checkbox"
                      checked={locScaleOnSite}
                      onChange={(e) => setLocScaleOnSite(e.target.checked)}
                      className="w-3.5 h-3.5 text-orange rounded outline-none curor-pointer"
                    />
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-orange transition-colors">Scale On-Site</span>
                </label>

                <label className="flex flex-col justify-between p-3 border border-slate-150 rounded-xl hover:border-orange cursor-pointer transition-all bg-slate-50/30 group">
                  <div className="flex items-center justify-between mb-2">
                    <Forklift size={18} className="text-indigo-500" />
                    <input 
                      type="checkbox"
                      checked={locForkliftOnSite}
                      onChange={(e) => setLocForkliftOnSite(e.target.checked)}
                      className="w-3.5 h-3.5 text-orange rounded outline-none curor-pointer"
                    />
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-orange transition-colors">Forklift Available</span>
                </label>

                <label className="flex flex-col justify-between p-3 border border-slate-150 rounded-xl hover:border-orange cursor-pointer transition-all bg-slate-50/30 group">
                  <div className="flex items-center justify-between mb-2">
                    <Lock size={18} className="text-rose-500" />
                    <input 
                      type="checkbox"
                      checked={locTwicRequired}
                      onChange={(e) => setLocTwicRequired(e.target.checked)}
                      className="w-3.5 h-3.5 text-orange rounded outline-none curor-pointer"
                    />
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-orange transition-colors">TWIC Required</span>
                </label>

              </div>
            </div>

            {/* Sec 4: Site Supervisor / Contact Registry */}
            <div className="tms-card p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-orange" />
                  <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Yard / Operations Contact Registry</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Site supervisor Name</label>
                  <input 
                    type="text" 
                    value={locContactName}
                    onChange={(e) => setLocContactName(e.target.value)}
                    placeholder="e.g. Raymond Vance"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Direct Desk/Mobile Phone</label>
                  <input 
                    type="tel" 
                    value={locContactPhone}
                    onChange={(e) => setLocContactPhone(e.target.value)}
                    placeholder="e.g. +1 (312) 402-9102"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Facility Operations Email</label>
                  <input 
                    type="email" 
                    value={locContactEmail}
                    onChange={(e) => setLocContactEmail(e.target.value)}
                    placeholder="e.g. chicago-dock14@yardgroup.com"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Sec 5: Safety Guidelines & PPE Constraints */}
            <div className="tms-card p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-rose-500" />
                  <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Site Safety & PPE Enforcement</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                <div className="md:col-span-4 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Mandatory Site PPE</label>
                  <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-150">
                    {ppeOptions.map(option => {
                      const isToggled = locPpeRequired.includes(option);
                      return (
                        <label key={option} className="flex items-center gap-2 px-1 py-1 rounded transition-colors cursor-pointer text-xs">
                          <input 
                            type="checkbox"
                            checked={isToggled}
                            onChange={() => togglePpeOption(option)}
                            className="w-3.5 h-3.5 text-rose-500 border-slate-300 rounded focus:ring-rose-500 cursor-pointer"
                          />
                          <span className={`${isToggled ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>{option}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="md:col-span-8 space-y-4">
                  <div className="grid grid-cols-1 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bridge/Canopy Clearance (Max Height)</label>
                      <input 
                        type="text" 
                        value={locMaxVehicleHeight}
                        onChange={(e) => setLocMaxVehicleHeight(e.target.value)}
                        placeholder="e.g. 13ft 6in or N/A"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yard Operating Guidelines / Driver Directives</label>
                      <textarea
                        rows={3}
                        value={locNotes}
                        onChange={(e) => setLocNotes(e.target.value)}
                        placeholder="e.g. Mandatory drop-and-hook guidelines. No blindside backing allowed. Check-in directly at security gate West. Ensure safety vests are worn at all hours outside truck cab."
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all leading-relaxed"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Form actions save / exit */}
            <div className="pt-4 flex items-center gap-4">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-6 py-3.5 border border-slate-200 hover:border-navy text-slate-500 hover:text-navy text-xs font-bold uppercase tracking-widest rounded-xl bg-white transition-all cursor-pointer"
              >
                Discard & Quit
              </button>
              <button
                type="submit"
                className="flex-1 max-w-xs px-8 py-3.5 bg-orange text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-light shadow-lg shadow-orange/15 hover:shadow-orange/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check size={16} /> Save Facility details
              </button>
            </div>

          </div>

          {/* Site Document Compliance Vault Column (Right) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Sec 6: Facility Documents Vault upload */}
            <div className="tms-card p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UploadCloud size={16} className="text-orange" />
                  <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Facility Documents Vault</h3>
                </div>
                <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-2 py-0.5 rounded tracking-widest font-mono uppercase">SECURE AES</span>
              </div>

              {/* Set doc parameters before simulated upload */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Document Classification</label>
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
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Expiry / Agreement Date</label>
                  <input 
                    type="date"
                    value={docExpiryDate}
                    onChange={(e) => setDocExpiryDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-250 rounded-lg p-2 text-xs font-mono outline-none"
                  />
                </div>
              </div>

              {/* Upload Drop Zone Box */}
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
                      <span className="text-[10px] text-slate-400 block mt-0.5">or click to browse local files</span>
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
                          <span>Processing payload...</span>
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
                        {uploadProgress !== null ? 'Uploading document...' : 'Attach Proof of Option'}
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
                          Attach to Facility Profile
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
                  <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Active Site Records ({uploadedDocs.length})</h3>
                </div>
              </div>

              {uploadedDocs.length === 0 ? (
                <div className="text-center py-6">
                  <MapIcon size={24} className="mx-auto text-slate-350 mb-2" />
                  <p className="text-[10px] text-slate-400 font-bold">No attached files mapped to this location node yet.</p>
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
                          <span className="text-[8.5px] font-mono text-zinc-500 font-bold">Expiry: {doc.expiryDate}</span>
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
  // RENDER DYNAMIC FACILITIES LIST INDEX
  // ==========================================
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header bar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-head font-extrabold text-navy-dark">Location Database</h2>
          <p className="text-sm text-slate-500">Master repository for shippers, consignees, terminals, and drop points.</p>
        </div>
        <button 
          onClick={() => {
            resetAllFormStates();
            setIsEditing(false);
            setEditingId(null);
            setShowCreationMode(true);
          }}
          className="inline-flex items-center gap-2 bg-orange text-white px-6 py-2.5 rounded-lg shadow-sm font-bold text-sm transition-all hover:bg-orange/90 active:scale-95 cursor-pointer"
        >
          <Plus size={18} />
          New Location
        </button>
      </header>

      {/* Filter and search zone */}
      <div className="tms-card flex flex-col sm:flex-row items-stretch sm:items-center p-3 gap-3 bg-slate-50/50">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="Search by facility name or city..." 
            className="w-full bg-white border border-slate-200 rounded-md py-1.5 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-orange/20"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-md outline-none focus:ring-2 focus:ring-orange/20 cursor-pointer"
          >
            <option value="All Types">All Types</option>
            <option value="Shipper">Shipper (Pickups)</option>
            <option value="Consignee">Consignee (Deliveries)</option>
            <option value="Both">Both (Shipper/Consignee)</option>
            <option value="Terminal">Terminal Facility</option>
            <option value="Drop Yard">Trailer Drop Yard</option>
          </select>
          <button 
            onClick={() => {
              setSearchTerm('');
              setSelectedType('All Types');
            }}
            className="p-2 border border-slate-200 bg-white rounded-md hover:bg-slate-50 transition-all text-xs font-bold text-slate-600 active:scale-95 cursor-pointer"
            title="Clear Filters"
          >
            Clear
          </button>
        </div>
      </div>

      {filteredLocations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-200 rounded-2xl">
          <MapIcon size={36} className="text-slate-350 mb-2" />
          <p className="text-xs font-bold text-navy-dark">No facilities registered under this search filter.</p>
          <button 
            onClick={() => { setSearchTerm(''); setSelectedType('All Types'); }}
            className="mt-4 px-4 py-2 bg-slate-100 rounded-md text-[10px] font-bold uppercase tracking-wider text-navy hover:bg-slate-200 transition-all cursor-pointer"
          >
            Reset Catalog Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredLocations.map(location => {
            const docLogsCount = location.complianceDocs?.length || 0;
            return (
              <div key={location.id} className="tms-card hover:border-orange/30 transition-all group overflow-hidden flex flex-col md:flex-row relative bg-white">
                <div className="md:w-36 bg-slate-50 relative group-hover:bg-slate-100 transition-colors flex flex-col items-center justify-center p-4 border-r border-slate-100 min-h-[170px]">
                  <div className="text-slate-350 group-hover:text-slate-400 transition-all scale-125 mb-1">
                    <Map size={32} />
                  </div>
                  <div className="absolute top-3 left-3 bg-white/80 p-1.5 rounded-lg shadow-sm border border-slate-100">
                    <MapPin className="text-orange" size={16} />
                  </div>
                  {location.gateCode && (
                    <div className="mt-2 text-[10px] font-mono font-bold bg-white px-2 py-0.5 border rounded shadow-sm text-navy block">
                      Code: {location.gateCode}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 p-5 overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-navy-dark text-base leading-tight group-hover:text-orange transition-colors truncate">{location.name}</h4>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-400 uppercase mt-1">
                          <Navigation size={10} />
                          {location.address?.city}, {location.address?.state} {location.address?.zip}
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          location.type === 'Terminal' ? 'bg-purple-100 text-purple-700 font-bold' : 
                          location.type === 'Shipper' ? 'bg-blue-100 text-blue-700 font-bold' :
                          location.type === 'Consignee' ? 'bg-amber-100 text-amber-700 font-bold' : 
                          location.type === 'Drop Yard' ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {location.type}
                        </span>
                        
                        {/* Interactive overlay for Quick Actions */}
                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditClick(location)}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-navy transition-colors cursor-pointer border border-transparent hover:border-slate-200 bg-white"
                            title="Edit Facility Details"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(location.id, location.name)}
                            className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-red-500 transition-colors cursor-pointer border border-transparent hover:border-slate-200 bg-white"
                            title="Archive Facility"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Operational parameters cards */}
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <div className="space-y-1">
                        <span className="text-[8.5px] uppercase font-black text-slate-400 tracking-wider block">Connected Accounts</span>
                        <span className="text-navy font-bold line-clamp-1 block leading-tight">{getCustomerName(location.customerIds)}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8.5px] uppercase font-black text-slate-400 tracking-wider block">detention rate / hours</span>
                        <span className="text-slate-600 block leading-tight font-medium">
                          Avg: <strong className="text-navy font-bold">{location.avgDetention || '1h 30m'}</strong>
                        </span>
                      </div>
                    </div>

                    {/* On-Site contact / operating hours indicator */}
                    <div className="space-y-1 mt-3">
                      {location.operatingHours && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock size={13} className="text-slate-400 shrink-0" />
                          <span>Hours: <strong className="text-navy font-semibold">{location.operatingHours}</strong></span>
                        </div>
                      )}
                      {location.contactName && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Building size={13} className="text-slate-400 shrink-0" />
                          <span>Mgr: <strong className="text-navy font-semibold">{location.contactName}</strong> {location.contactPhone && <span className="font-mono text-[10.5px]">({location.contactPhone})</span>}</span>
                        </div>
                      )}
                    </div>

                    {/* Badge capabilities on the card */}
                    <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-slate-100">
                      {location.overnightParking && (
                        <span className="inline-flex items-center gap-1 bg-teal-50 text-teal border border-teal-200 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                          <Check size={10} /> Overnight Parking
                        </span>
                      )}
                      {location.scaleOnSite && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                          <Check size={10} /> On-Site Scale
                        </span>
                      )}
                      {location.forkliftOnSite && (
                        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo border border-indigo-200 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                          <Check size={10} /> Forklift
                        </span>
                      )}
                      {location.restroomsAvailable && (
                        <span className="inline-flex items-center gap-1 bg-sky-50 text-sky-800 border border-sky-200 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                          <Check size={10} /> Restrooms
                        </span>
                      )}
                      {docLogsCount > 0 && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ml-auto">
                          <ShieldCheck size={10} /> {docLogsCount} Attached File{docLogsCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
