import React, { useState, useRef } from 'react';
import { 
  Users, 
  Truck, 
  Plus, 
  Search, 
  MoreVertical, 
  MapPin, 
  Activity, 
  ShieldCheck, 
  Calendar,
  Link,
  Unlink,
  X,
  ArrowLeft,
  UploadCloud,
  Trash2,
  FileText,
  Check,
  AlertCircle,
  File,
  Briefcase,
  ShieldAlert,
  Settings,
  Eye,
  Info
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { motion, AnimatePresence } from 'motion/react';
import { Driver, Truck as TruckType, ComplianceDocument } from '../types';
import { getDriverCompliance, getTruckCompliance } from '../utils/complianceHelper';

export default function AssetsView() {
  const { 
    drivers, 
    trucks, 
    addDriver, 
    updateDriver,
    addTruck, 
    updateTruck,
    assignTruckToDriver,
    recurringRules,
    addRecurringRule,
    updateRecurringRule,
    deleteRecurringRule,
    navigationIntent,
    setNavigationIntent
  } = useData();
  const [activeTab, setActiveTab] = useState<'Drivers' | 'Units'>('Drivers');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom navigation state
  const [showCreationMode, setShowCreationMode] = useState(false);
  const [creationClass, setCreationClass] = useState<'Driver' | 'Truck' | 'Trailer'>('Driver');
  
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [driverModalTab, setDriverModalTab] = useState<'dossier' | 'settlements' | 'changelog' | 'dotAudit'>('dossier');
  const [selectedTruck, setSelectedTruck] = useState<TruckType | null>(null);
  const [truckModalTab, setTruckModalTab] = useState<'specs' | 'dotAudit'>('specs');
  const [showAssignModal, setShowAssignModal] = useState<{driver: Driver} | null>(null);

  React.useEffect(() => {
    if (navigationIntent && navigationIntent.view === 'assets') {
      if (navigationIntent.action === 'edit_driver' && navigationIntent.driverId) {
        const d = drivers.find(drv => drv.id === navigationIntent.driverId);
        if (d) {
          setActiveTab('Drivers');
          setSelectedDriver(d);
          setDriverModalTab((navigationIntent.tab as 'dossier' | 'settlements' | 'changelog' | 'dotAudit') || 'dossier');
        }
      } else if (navigationIntent.action === 'edit_truck' && navigationIntent.truckId) {
        const t = trucks.find(trk => trk.id === navigationIntent.truckId);
        if (t) {
          setActiveTab('Units');
          setSelectedTruck(t);
          setTruckModalTab((navigationIntent.tab as 'specs' | 'dotAudit') || 'specs');
        }
      }
      setNavigationIntent(null);
    }
  }, [navigationIntent, drivers, trucks, setNavigationIntent]);

  // New recurring rules form states inside selected driver profile
  const [newRuleType, setNewRuleType] = useState<'REVENUE' | 'DEDUCTION'>('DEDUCTION');
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleAmount, setNewRuleAmount] = useState('');
  const [newRuleFrequency, setNewRuleFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('WEEKLY');
  const [newRuleStartDate, setNewRuleStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newRuleRateType, setNewRuleRateType] = useState<'FLAT' | 'PERCENTAGE'>('FLAT');

  // Edit forms state for selectedDriver dossier
  const [isEditingDossier, setIsEditingDossier] = useState(false);
  const [editDrvName, setEditDrvName] = useState('');
  const [editDrvPhone, setEditDrvPhone] = useState('');
  const [editDrvEmail, setEditDrvEmail] = useState('');
  const [editDrvAddress, setEditDrvAddress] = useState('');
  const [editDrvType, setEditDrvType] = useState('Company Driver');
  const [editDrvCdlClass, setEditDrvCdlClass] = useState('Class A');
  const [editDrvCdlNumber, setEditDrvCdlNumber] = useState('');
  const [editDrvCdlExpiry, setEditDrvCdlExpiry] = useState('');
  const [editDrvMedicalExpiry, setEditDrvMedicalExpiry] = useState('');
  const [editDrvDrugTestDate, setEditDrvDrugTestDate] = useState('');
  const [editDrvEmergencyName, setEditDrvEmergencyName] = useState('');
  const [editDrvEmergencyPhone, setEditDrvEmergencyPhone] = useState('');

  // Edit forms state for selectedTruck specs
  const [isEditingTruck, setIsEditingTruck] = useState(false);
  const [editTrkType, setEditTrkType] = useState('');
  const [editTrkRegistrationExpiry, setEditTrkRegistrationExpiry] = useState('');
  const [editTrkAnnualInspection, setEditTrkAnnualInspection] = useState('');
  const [editTrkPmStatus, setEditTrkPmStatus] = useState<'Current' | 'Due' | 'Overdue'>('Current');

  // Drag & drop / upload states
  const [uploadedDocs, setUploadedDocs] = useState<ComplianceDocument[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [currentSelectedFile, setCurrentSelectedFile] = useState<File | null>(null);
  const [selectedDocType, setSelectedDocType] = useState('CDL License Scan');
  const [docExpiryDate, setDocExpiryDate] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Field States
  // 1. Driver Fields
  const [drvName, setDrvName] = useState('');
  const [drvPhone, setDrvPhone] = useState('');
  const [drvEmail, setDrvEmail] = useState('');
  const [drvAddress, setDrvAddress] = useState('');
  const [drvType, setDrvType] = useState('Company Driver');
  const [drvCdlClass, setDrvCdlClass] = useState('Class A');
  const [drvCdlNumber, setDrvCdlNumber] = useState('');
  const [drvCdlState, setDrvCdlState] = useState('IL');
  const [drvCdlExpiry, setDrvCdlExpiry] = useState('');
  const [drvMedicalExpiry, setDrvMedicalExpiry] = useState('');
  const [drvDrugTestDate, setDrvDrugTestDate] = useState('');
  const [drvEndorsements, setDrvEndorsements] = useState<string[]>([]);
  const [drvEmergencyName, setDrvEmergencyName] = useState('');
  const [drvEmergencyPhone, setDrvEmergencyPhone] = useState('');

  // 2. Truck Fields
  const [trkUnitNumber, setTrkUnitNumber] = useState('');
  const [trkMakeModel, setTrkMakeModel] = useState('');
  const [trkType, setTrkType] = useState('Tractor (Sleeper)');
  const [trkVin, setTrkVin] = useState('');
  const [trkPlate, setTrkPlate] = useState('');
  const [trkPlateState, setTrkPlateState] = useState('IL');
  const [trkFuel, setTrkFuel] = useState('Diesel');
  const [trkOdometer, setTrkOdometer] = useState('');
  const [trkEldProvider, setTrkEldProvider] = useState('Samsara');
  const [trkEldSerial, setTrkEldSerial] = useState('');
  const [trkPmInterval, setTrkPmInterval] = useState('15,000 mi');
  const [trkRegExpiry, setTrkRegExpiry] = useState('');
  const [trkInspectionExpiry, setTrkInspectionExpiry] = useState('');

  // 3. Trailer Fields
  const [trlUnitNumber, setTrlUnitNumber] = useState('');
  const [trlType, setTrlType] = useState("Dry Van 53'");
  const [trlMakeModel, setTrlMakeModel] = useState('');
  const [trlVin, setTrlVin] = useState('');
  const [trlCapacity, setTrlCapacity] = useState('45,000 lbs');
  const [trlSuspension, setTrlSuspension] = useState('Air Ride');
  const [trlReeferHours, setTrlReeferHours] = useState('');
  const [trlPlate, setTrlPlate] = useState('');
  const [trlPlateState, setTrlPlateState] = useState('IL');
  const [trlRegExpiry, setTrlRegExpiry] = useState('');
  const [trlInspectionExpiry, setTrlInspectionExpiry] = useState('');

  // Endorsement Handler
  const toggleEndorsement = (code: string) => {
    setDrvEndorsements(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleSelectDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setDriverModalTab('dossier');
  };

  const handleCloseDriverModal = () => {
    setSelectedDriver(null);
    setDriverModalTab('dossier');
    setIsEditingDossier(false);
  };

  const handleAddNewRule = async () => {
    if (!newRuleName.trim()) {
      alert("Please enter a rule description.");
      return;
    }
    const amt = parseFloat(newRuleAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid positive amount.");
      return;
    }
    if (!selectedDriver) return;

    await addRecurringRule({
      driverId: selectedDriver.id,
      type: newRuleType,
      name: newRuleName.trim(),
      amount: amt,
      frequency: newRuleFrequency,
      startDate: newRuleStartDate,
      active: true,
      rateType: newRuleRateType
    });

    // Write to driver change log
    const logEntry = {
      id: `log-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      action: `Added recurring pay rule: ${newRuleName.trim()} (${newRuleType === 'REVENUE' ? 'Earn' : 'Deduct'} - ${newRuleRateType === 'PERCENTAGE' ? `${amt}%` : `$${amt.toFixed(2)}`})`,
      user: 'Dispatcher Agent'
    };
    const updatedChangeLogs = [...(selectedDriver.changeLog || []), logEntry];
    updateDriver(selectedDriver.id, { changeLog: updatedChangeLogs });
    setSelectedDriver(prev => prev ? { ...prev, changeLog: updatedChangeLogs } : null);

    setNewRuleName('');
    setNewRuleAmount('');
  };

  const startEditingDossier = () => {
    if (!selectedDriver) return;
    setEditDrvName(selectedDriver.name || '');
    setEditDrvPhone(selectedDriver.phone || '');
    setEditDrvEmail(selectedDriver.email || '');
    setEditDrvAddress(selectedDriver.address || '');
    setEditDrvType(selectedDriver.type || 'Company Driver');
    setEditDrvCdlClass(selectedDriver.cdlClass || 'Class A');
    setEditDrvCdlNumber(selectedDriver.cdlNumber || '');
    setEditDrvCdlExpiry(selectedDriver.cdlExpiry || '');
    setEditDrvMedicalExpiry(selectedDriver.medicalCardExpiry || '');
    setEditDrvDrugTestDate(selectedDriver.drugTestDate || '');
    setEditDrvEmergencyName(selectedDriver.emergencyName || '');
    setEditDrvEmergencyPhone(selectedDriver.emergencyPhone || '');
    setIsEditingDossier(true);
  };

  const handleSaveDossierChanges = () => {
    if (!selectedDriver) return;
    if (!editDrvName.trim()) {
      alert("Name of the driver cannot be empty.");
      return;
    }

    // Compare and build log of changes
    const changesList: string[] = [];
    if (selectedDriver.name !== editDrvName.trim()) {
      changesList.push(`Driver Name updated from "${selectedDriver.name}" to "${editDrvName.trim()}"`);
    }
    if ((selectedDriver.phone || '') !== editDrvPhone.trim()) {
      changesList.push(`Phone updated from "${selectedDriver.phone || 'None'}" to "${editDrvPhone.trim()}"`);
    }
    if ((selectedDriver.email || '') !== editDrvEmail.trim()) {
      changesList.push(`Email updated from "${selectedDriver.email || 'None'}" to "${editDrvEmail.trim()}"`);
    }
    if ((selectedDriver.address || '') !== editDrvAddress.trim()) {
      changesList.push(`Resident Address updated to "${editDrvAddress.trim()}"`);
    }
    if ((selectedDriver.type || '') !== editDrvType) {
      changesList.push(`Employment Type updated from "${selectedDriver.type || 'Company Driver'}" to "${editDrvType}"`);
    }
    if (selectedDriver.cdlClass !== editDrvCdlClass) {
      changesList.push(`CDL Class updated from "${selectedDriver.cdlClass}" to "${editDrvCdlClass}"`);
    }
    if ((selectedDriver.cdlNumber || '') !== editDrvCdlNumber.trim()) {
      changesList.push(`CDL License # updated to "${editDrvCdlNumber.trim()}"`);
    }
    if ((selectedDriver.cdlExpiry || '') !== editDrvCdlExpiry) {
      changesList.push(`CDL Expiry updated from "${selectedDriver.cdlExpiry || 'None'}" to "${editDrvCdlExpiry}"`);
    }
    if ((selectedDriver.medicalCardExpiry || '') !== editDrvMedicalExpiry) {
      changesList.push(`Medical Expiry updated from "${selectedDriver.medicalCardExpiry || 'None'}" to "${editDrvMedicalExpiry}"`);
    }
    if ((selectedDriver.drugTestDate || '') !== editDrvDrugTestDate) {
      changesList.push(`Drug Test Date updated to "${editDrvDrugTestDate}"`);
    }
    if ((selectedDriver.emergencyName || '') !== editDrvEmergencyName.trim()) {
      changesList.push(`Emergency Contact Name updated to "${editDrvEmergencyName.trim()}"`);
    }
    if ((selectedDriver.emergencyPhone || '') !== editDrvEmergencyPhone.trim()) {
      changesList.push(`Emergency Contact Phone updated to "${editDrvEmergencyPhone.trim()}"`);
    }

    let updatedLogs = selectedDriver.changeLog || [];
    if (changesList.length > 0) {
      const logs = changesList.map(item => ({
        id: `log-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        action: item,
        user: 'Dispatcher Agent'
      }));
      updatedLogs = [...logs, ...updatedLogs];
    }

    const payload: Partial<Driver> = {
      name: editDrvName.trim(),
      phone: editDrvPhone.trim(),
      email: editDrvEmail.trim(),
      address: editDrvAddress.trim(),
      type: editDrvType as any,
      cdlClass: editDrvCdlClass as any,
      cdlNumber: editDrvCdlNumber.trim(),
      cdlExpiry: editDrvCdlExpiry,
      medicalCardExpiry: editDrvMedicalExpiry,
      drugTestDate: editDrvDrugTestDate,
      emergencyName: editDrvEmergencyName.trim(),
      emergencyPhone: editDrvEmergencyPhone.trim(),
      changeLog: updatedLogs
    };

    updateDriver(selectedDriver.id, payload);
    setSelectedDriver(prev => prev ? { ...prev, ...payload } : null);
    setIsEditingDossier(false);
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.currentLocation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTrucks = trucks.filter(t => 
    t.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.makeModel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startEditingTruck = () => {
    if (!selectedTruck) return;
    setEditTrkType(selectedTruck.type || '');
    setEditTrkRegistrationExpiry(selectedTruck.registrationExpiry || '');
    setEditTrkAnnualInspection(selectedTruck.annualInspectionExpiry || '');
    setEditTrkPmStatus((selectedTruck.pmStatus as any) || 'Current');
    setIsEditingTruck(true);
  };

  const handleSaveTruckChanges = () => {
    if (!selectedTruck) return;
    
    // Quick validation
    if (!editTrkType.trim()) {
      alert("Unit type cannot be empty.");
      return;
    }

    updateTruck(selectedTruck.id, {
      type: editTrkType.trim(),
      registrationExpiry: editTrkRegistrationExpiry,
      annualInspectionExpiry: editTrkAnnualInspection,
      pmStatus: editTrkPmStatus
    });

    const refreshed = trucks.find(t => t.id === selectedTruck.id);
    if (refreshed) {
      setSelectedTruck({
        ...refreshed,
        type: editTrkType.trim(),
        registrationExpiry: editTrkRegistrationExpiry,
        annualInspectionExpiry: editTrkAnnualInspection,
        pmStatus: editTrkPmStatus
      });
    }
    setIsEditingTruck(false);
  };

  // File drag & drop simulator handlers
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
    setUploadProgress(0);
  };

  const triggerUploadSimulation = () => {
    if (!currentSelectedFile) return;
    
    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null) return null;
        if (prev >= 90) {
          clearInterval(interval);
          setUploadSuccess(true);
          return 100;
        }
        return prev + 15;
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
    
    // Reset file state
    setCurrentSelectedFile(null);
    setUploadProgress(null);
    setUploadSuccess(false);
  };

  const deleteUploadedDoc = (id: string) => {
    setUploadedDocs(prev => prev.filter(d => d.id !== id));
  };

  const resetAllFormStates = () => {
    setUploadedDocs([]);
    setCurrentSelectedFile(null);
    setUploadProgress(null);
    setUploadSuccess(false);

    setDrvName('');
    setDrvPhone('');
    setDrvEmail('');
    setDrvAddress('');
    setDrvType('Company Driver');
    setDrvCdlClass('Class A');
    setDrvCdlNumber('');
    setDrvCdlExpiry('');
    setDrvMedicalExpiry('');
    setDrvDrugTestDate('');
    setDrvEndorsements([]);
    setDrvEmergencyName('');
    setDrvEmergencyPhone('');

    setTrkUnitNumber('');
    setTrkMakeModel('');
    setTrkType('Tractor (Sleeper)');
    setTrkVin('');
    setTrkPlate('');
    setTrkOdometer('');
    setTrkEldSerial('');
    setTrkRegExpiry('');
    setTrkInspectionExpiry('');

    setTrlUnitNumber('');
    setTrlType("Dry Van 53'");
    setTrlMakeModel('');
    setTrlVin('');
    setTrlCapacity('45,000 lbs');
    setTrlReeferHours('');
    setTrlPlate('');
    setTrlRegExpiry('');
    setTrlInspectionExpiry('');
  };

  // Submit Handler
  const handleCreateAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (creationClass === 'Driver') {
      if (!drvName) return;
      
      addDriver({
        name: drvName,
        currentLocation: 'Chicago, IL',
        status: 'Available',
        cdlClass: drvCdlClass,
        endorsements: drvEndorsements,
        hosAvailable: '70:00',
        score: 100,
        medicalCardExpiry: drvMedicalExpiry || undefined,
        cdlExpiry: drvCdlExpiry || undefined,
        drugTestDate: drvDrugTestDate || undefined,
        complianceDocs: uploadedDocs,
        hosDutyStatus: 'Off Duty',
        phone: drvPhone || undefined,
        email: drvEmail || undefined,
        address: drvAddress || undefined,
        type: drvType || undefined,
        cdlNumber: drvCdlNumber || undefined,
        emergencyName: drvEmergencyName || undefined,
        emergencyPhone: drvEmergencyPhone || undefined,
        changeLog: [
          {
            id: `log-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            action: 'Driver profile created',
            user: 'System Dispatcher'
          }
        ]
      });
      setActiveTab('Drivers');
    } else {
      // Tractor or Trailer (Unit)
      const currentUnitNumber = creationClass === 'Truck' ? trkUnitNumber : trlUnitNumber;
      if (!currentUnitNumber) return;

      addTruck({
        unitNumber: currentUnitNumber,
        makeModel: creationClass === 'Truck' 
          ? trkMakeModel || 'Freightliner' 
          : trlMakeModel || 'Great Dane',
        type: creationClass === 'Truck' 
          ? trkType 
          : trlType,
        currentLocation: 'Chicago, IL',
        status: 'Available',
        pmStatus: 'Current',
        registrationExpiry: creationClass === 'Truck' ? (trkRegExpiry || undefined) : (trlRegExpiry || undefined),
        annualInspectionExpiry: creationClass === 'Truck' ? (trkInspectionExpiry || undefined) : (trlInspectionExpiry || undefined),
        complianceDocs: uploadedDocs
      });
      setActiveTab('Units');
    }

    setShowCreationMode(false);
    resetAllFormStates();
  };

  // Pre-configured typical doc types for the specific classes
  const getDocTypeOptions = () => {
    if (creationClass === 'Driver') {
      return [
        'CDL License Scan',
        'Medical Examiner Card',
        'MVR History Report',
        'Drug Screen Consent',
        'W-4 Tax Document',
        'TWIC Card Badge'
      ];
    } else if (creationClass === 'Truck') {
      return [
        'Cab Card / Registration',
        'Annual DOT Inspection',
        'Certificate of Insurance',
        'ELD Regulatory Certificate',
        'IFTA License Copy',
        'Vehicle Title Scan'
      ];
    } else {
      return [
        'Trailer Registration PDF',
        'FHWA Annual Inspection',
        'Reefer Temperature Record',
        'Cargo Securement Log'
      ];
    }
  };

  // Setup specific document type when changing asset type
  React.useEffect(() => {
    const opts = getDocTypeOptions();
    setSelectedDocType(opts[0]);
  }, [creationClass]);

  // View: Immersive Asset Detail Page Creation
  const renderCreationPage = () => {
    const docOptions = getDocTypeOptions();

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Creation Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setShowCreationMode(false);
                resetAllFormStates();
              }}
              className="p-2 border border-slate-200 text-slate-500 hover:text-navy hover:border-navy bg-white rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fleet Administration</span>
                <span className="text-slate-300">/</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-orange">Full Dossier Registry</span>
              </div>
              <h2 className="text-2xl font-head font-extrabold text-navy-dark tracking-tight">Register New Asset</h2>
            </div>
          </div>

          {/* Tab switches for asset categories */}
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/60 max-w-md">
            <button
              type="button"
              onClick={() => setCreationClass('Driver')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                creationClass === 'Driver' 
                  ? 'bg-navy text-white shadow-md' 
                  : 'text-slate-500 hover:text-navy-dark hover:bg-white/50'
              }`}
            >
              <Users size={14} /> Driver
            </button>
            <button
              type="button"
              onClick={() => setCreationClass('Truck')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                creationClass === 'Truck' 
                  ? 'bg-navy text-white shadow-md' 
                  : 'text-slate-500 hover:text-navy-dark hover:bg-white/50'
              }`}
            >
              <Truck size={14} /> Power Unit (Truck)
            </button>
            <button
              type="button"
              onClick={() => setCreationClass('Trailer')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                creationClass === 'Trailer' 
                  ? 'bg-navy text-white shadow-md' 
                  : 'text-slate-500 hover:text-navy-dark hover:bg-white/50'
              }`}
            >
              <Settings size={14} /> Trailer
            </button>
          </div>
        </header>

        {/* Master Data Entry Form */}
        <form onSubmit={handleCreateAssetSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column (Primary Specifications Block) */}
          <div className="lg:col-span-8 space-y-6">
            
            {creationClass === 'Driver' && (
              <>
                {/* Driver - General Info */}
                <div className="tms-card p-6 space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <Users size={16} className="text-orange" />
                        <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Driver Core Profile</h3>
                     </div>
                     <span className="text-[10px] text-slate-400 font-mono">FMCSA Regulated</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Legal Name *</label>
                      <input 
                        type="text" 
                        required 
                        value={drvName} 
                        onChange={(e)=>setDrvName(e.target.value)} 
                        placeholder="e.g. Samuel Patterson"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Driver Status</label>
                        <select 
                          className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                          value={drvType}
                          onChange={(e)=>setDrvType(e.target.value)}
                        >
                          <option>Company Driver</option>
                          <option>Owner Operator</option>
                          <option>Lease Purchase</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CDL Class</label>
                        <select 
                          className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                          value={drvCdlClass}
                          onChange={(e)=>setDrvCdlClass(e.target.value)}
                        >
                          <option>Class A</option>
                          <option>Class B</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
                      <input 
                        type="tel" 
                        value={drvPhone} 
                        onChange={(e)=>setDrvPhone(e.target.value)} 
                        placeholder="+1 (555) 304-9042"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                      <input 
                        type="email" 
                        value={drvEmail} 
                        onChange={(e)=>setDrvEmail(e.target.value)} 
                        placeholder="s.patterson@gridtms.com"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CDL License #</label>
                      <input 
                        type="text" 
                        value={drvCdlNumber} 
                        onChange={(e)=>setDrvCdlNumber(e.target.value)} 
                        placeholder="e.g. DL-IL-3498112"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Residential Address</label>
                    <input 
                      type="text" 
                      value={drvAddress} 
                      onChange={(e)=>setDrvAddress(e.target.value)} 
                      placeholder="Street address, City, State, ZIP code"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Driver - Compliance & Endorsements */}
                <div className="tms-card p-6 space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-teal" />
                        <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">FMCSR regulatory & scheduling</h3>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Calendar size={12} className="text-orange" /> CDL Expiration Date
                      </label>
                      <input 
                        type="date" 
                        value={drvCdlExpiry} 
                        onChange={(e)=>setDrvCdlExpiry(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Calendar size={12} className="text-orange" /> Med Card Expiration Date
                      </label>
                      <input 
                        type="date" 
                        value={drvMedicalExpiry} 
                        onChange={(e)=>setDrvMedicalExpiry(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Calendar size={12} className="text-orange" /> Last Drug Test Date
                      </label>
                      <input 
                        type="date" 
                        value={drvDrugTestDate} 
                        onChange={(e)=>setDrvDrugTestDate(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Endorsements array selects */}
                  <div className="space-y-2 mt-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active CDL Endorsements</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { code: 'H', desc: 'Hazmat' },
                        { code: 'N', desc: 'Tanker (Liquid)' },
                        { code: 'T', desc: 'Doubles / Triples' },
                        { code: 'X', desc: 'Hazmat + Tanker' },
                        { code: 'TWIC', desc: 'TWIC Credential' }
                      ].map(endorse => (
                        <button
                          type="button"
                          key={endorse.code}
                          onClick={() => toggleEndorsement(endorse.code)}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer text-center ${
                            drvEndorsements.includes(endorse.code)
                              ? 'border-orange bg-orange/5 text-orange font-black shadow-inner'
                              : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-300 text-slate-500 font-bold'
                          }`}
                        >
                          <span className="text-sm">{endorse.code}</span>
                          <span className="text-[8px] tracking-wide uppercase mt-0.5 whitespace-nowrap opacity-70">{endorse.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Driver - Emergency Contacts */}
                <div className="tms-card p-6 space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                     <Briefcase size={16} className="text-slate-400" />
                     <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Emergency Backup Contact</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Full Name</label>
                      <input 
                        type="text" 
                        value={drvEmergencyName} 
                        onChange={(e)=>setDrvEmergencyName(e.target.value)} 
                        placeholder="e.g. Linda Patterson (Spouse)"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Phone Number</label>
                      <input 
                        type="tel" 
                        value={drvEmergencyPhone} 
                        onChange={(e)=>setDrvEmergencyPhone(e.target.value)} 
                        placeholder="+1 (555) 304-8911"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {creationClass === 'Truck' && (
              <>
                {/* Truck Info */}
                <div className="tms-card p-6 space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <Truck size={16} className="text-orange" />
                        <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Power Unit Specifications</h3>
                     </div>
                     <span className="text-[10px] text-slate-400 font-mono">Class 8 Tractor</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit ID Number *</label>
                      <input 
                        type="text" 
                        required 
                        value={trkUnitNumber} 
                        onChange={(e)=>setTrkUnitNumber(e.target.value)} 
                        placeholder="e.g. TRK-5042"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Make / Model *</label>
                      <input 
                        type="text" 
                        required 
                        value={trkMakeModel} 
                        onChange={(e)=>setTrkMakeModel(e.target.value)} 
                        placeholder="e.g. 2024 Volvo VNL 860"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configuration Class</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                        value={trkType}
                        onChange={(e)=>setTrkType(e.target.value)}
                      >
                        <option>Tractor (Sleeper)</option>
                        <option>Tractor (Daycab)</option>
                        <option>Straight Box Truck</option>
                        <option>Sprinter Cargo Van</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="col-span-1 md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VIN # (17 characters)</label>
                      <input 
                        type="text" 
                        value={trkVin} 
                        onChange={(e)=>setTrkVin(e.target.value)} 
                        maxLength={17}
                        placeholder="1-FTYE14-A0E0..."
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all uppercase font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">License Plate</label>
                      <input 
                        type="text" 
                        value={trkPlate} 
                        onChange={(e)=>setTrkPlate(e.target.value)} 
                        placeholder="e.g. 3014B-REG"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all uppercase font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plate State</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                        value={trkPlateState}
                        onChange={(e)=>setTrkPlateState(e.target.value)}
                      >
                        {['IL', 'IN', 'OH', 'WI', 'TX', 'MI', 'CA', 'FL', 'IA'].map(st=>(
                          <option key={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fuel System</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                        value={trkFuel}
                        onChange={(e)=>setTrkFuel(e.target.value)}
                      >
                        <option>Diesel (Sulphur-free)</option>
                        <option>EV Power Cell</option>
                        <option>CNG / Propane</option>
                        <option>Hybrid Gas-Diesel</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Starting Odometer</label>
                      <input 
                        type="number" 
                        value={trkOdometer} 
                        onChange={(e)=>setTrkOdometer(e.target.value)} 
                        placeholder="e.g. 142095"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Check Cycle</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                        value={trkPmInterval}
                        onChange={(e)=>setTrkPmInterval(e.target.value)}
                      >
                        <option>10,000 mi</option>
                        <option>15,000 mi</option>
                        <option>20,000 mi</option>
                        <option>30,000 mi</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Truck Licensing/Compliance & Telematics */}
                <div className="tms-card p-6 space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <Activity size={16} className="text-teal" />
                        <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">ELD diagnostics & safety compliance</h3>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ELD Provider Platform</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                        value={trkEldProvider}
                        onChange={(e)=>setTrkEldProvider(e.target.value)}
                      >
                        <option>Samsara Cloud</option>
                        <option>Motive (KeepTruckin)</option>
                        <option>GeoTab Gateway</option>
                        <option>ORBCOMM Smart</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ELD Device Serial / ID</label>
                      <input 
                        type="text" 
                        value={trkEldSerial} 
                        onChange={(e)=>setTrkEldSerial(e.target.value)} 
                        placeholder="e.g. SAM-892305X"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all uppercase font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Calendar size={12} className="text-orange" /> Registration Expiry Date
                      </label>
                      <input 
                        type="date" 
                        value={trkRegExpiry} 
                        onChange={(e)=>setTrkRegExpiry(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Calendar size={12} className="text-orange" /> Annual DOT Inspection Due
                      </label>
                      <input 
                        type="date" 
                        value={trkInspectionExpiry} 
                        onChange={(e)=>setTrkInspectionExpiry(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {creationClass === 'Trailer' && (
              <>
                {/* Trailer Specifications */}
                <div className="tms-card p-6 space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <Settings size={16} className="text-orange" />
                        <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Trailer Specifications</h3>
                     </div>
                     <span className="text-[10px] text-slate-400 font-mono">Chassis Equipment</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trailer ID Number *</label>
                      <input 
                        type="text" 
                        required 
                        value={trlUnitNumber} 
                        onChange={(e)=>setTrlUnitNumber(e.target.value)} 
                        placeholder="e.g. TLR-5301"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trailer Class *</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                        value={trlType}
                        onChange={(e)=>setTrlType(e.target.value)}
                      >
                        <option>Dry Van 53'</option>
                        <option>Reefer 53' (Ambient Control)</option>
                        <option>Flatbed 48'</option>
                        <option>Step Deck 53'</option>
                        <option>RGN (Removable Gooseneck)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Make / Model</label>
                      <input 
                        type="text" 
                        value={trlMakeModel} 
                        onChange={(e)=>setTrlMakeModel(e.target.value)} 
                        placeholder="e.g. 2023 Great Dane Champion"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="col-span-1 md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trailer VIN #</label>
                      <input 
                        type="text" 
                        value={trlVin} 
                        onChange={(e)=>setTrlVin(e.target.value)} 
                        maxLength={17}
                        placeholder="e.g. 5-HVH53A26X..."
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all uppercase font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weight Capacity</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                        value={trlCapacity}
                        onChange={(e)=>setTrlCapacity(e.target.value)}
                      >
                        <option>45,000 lbs</option>
                        <option>48,000 lbs</option>
                        <option>55,000 lbs</option>
                        <option>65,000 lbs (Heavy Haul)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suspension System</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                        value={trlSuspension}
                        onChange={(e)=>setTrlSuspension(e.target.value)}
                      >
                        <option>Air Ride System</option>
                        <option>Dual Spring Suspension</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reefer Diagnostic Hours</label>
                      <input 
                        type="number" 
                        disabled={!trlType.includes('Reefer')}
                        value={trlReeferHours} 
                        onChange={(e)=>setTrlReeferHours(e.target.value)} 
                        placeholder={trlType.includes('Reefer') ? "e.g. 1450" : "N/A (Non-Reefer)"}
                        className="w-full disabled:opacity-40 bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trailer Plate</label>
                      <input 
                        type="text" 
                        value={trlPlate} 
                        onChange={(e)=>setTrlPlate(e.target.value)} 
                        placeholder="TRL-9213"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all uppercase font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Register State</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                        value={trlPlateState}
                        onChange={(e)=>setTrlPlateState(e.target.value)}
                      >
                        {['IL', 'IN', 'OH', 'WI', 'TX', 'MI', 'IA', 'NE'].map(st=>(
                          <option key={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Trailer Compliance Dates */}
                <div className="tms-card p-6 space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <Activity size={16} className="text-teal" />
                        <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Trailer Compliance & Authority</h3>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Calendar size={12} className="text-orange" /> Registration Expiration
                      </label>
                      <input 
                        type="date" 
                        value={trlRegExpiry} 
                        onChange={(e)=>setTrlRegExpiry(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Calendar size={12} className="text-orange" /> FHWA Annual Inspection Date
                      </label>
                      <input 
                        type="date" 
                        value={trlInspectionExpiry} 
                        onChange={(e)=>setTrlInspectionExpiry(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 focus:border-orange focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Bottom Actions Row */}
            <div className="pt-4 flex items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowCreationMode(false);
                  resetAllFormStates();
                }}
                className="px-6 py-3.5 border border-slate-200 hover:border-navy text-slate-500 hover:text-navy text-xs font-bold uppercase tracking-widest rounded-xl bg-white transition-all cursor-pointer"
              >
                Discard & Exit
              </button>
              <button
                type="submit"
                className="flex-1 max-w-xs px-8 py-3.5 bg-orange text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-light shadow-lg shadow-orange/15 hover:shadow-orange/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check size={16} /> Finalize & Commit Asset
              </button>
            </div>
          </div>

          {/* Right Column (Compliance Vault File uploader + Attached Assets Archive) */}
          <div className="lg:col-span-4 space-y-6">
            
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
                    onChange={(e)=>setSelectedDocType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none cursor-pointer text-navy font-bold"
                  >
                    {docOptions.map(opt => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Document Expiration Date</label>
                  <input 
                    type="date" 
                    value={docExpiryDate}
                    onChange={(e)=>setDocExpiryDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none text-navy font-mono"
                  />
                </div>
              </div>

              {/* Drag n drop box */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[140px] ${
                  dragActive 
                    ? 'border-orange bg-orange/5 scale-[0.98]' 
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  onChange={handleManualFileChange}
                />
                
                {currentSelectedFile ? (
                  <div className="space-y-3 w-full">
                    <FileText size={32} className="text-orange mx-auto animate-bounce" />
                    <div className="text-center">
                      <p className="text-xs font-bold text-navy-dark truncate max-w-full px-2" title={currentSelectedFile.name}>
                        {currentSelectedFile.name}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        {(currentSelectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>

                    {uploadProgress === null && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerUploadSimulation();
                        }}
                        className="w-full py-1.5 bg-orange text-white text-[10px] uppercase font-bold rounded-lg hover:brightness-110 active:scale-95 transition-all"
                      >
                        Launch Upload Securing
                      </button>
                    )}

                    {uploadProgress !== null && (
                      <div className="space-y-1.5 px-4">
                        <div className="flex items-center justify-between text-[8px] font-bold text-slate-400">
                          <span>{uploadSuccess ? 'READY FOR ATTACHMENT' : 'ENCRYPTING & UPLOADING'}</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-teal h-full transition-all duration-150" 
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {uploadSuccess && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          attachUploadedDoc();
                        }}
                        className="w-full py-1.5 bg-teal text-white text-[10px] uppercase font-black rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Check size={12} /> Bind File to Dossier
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <UploadCloud size={32} className="text-slate-300 group-hover:text-orange mb-2" />
                    <p className="text-xs font-bold text-navy-dark">Drag & drop compliance doc here</p>
                    <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider">or click to browse local files</p>
                  </>
                )}
              </div>
            </div>

            {/* Document Archive Cabinet */}
            <div className="tms-card p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-teal" />
                  <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Document Vault Archive</h3>
                </div>
                <span className="text-[9px] font-bold text-navy font-mono">({uploadedDocs.length})</span>
              </div>

              {uploadedDocs.length > 0 ? (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                  {uploadedDocs.map(doc => (
                    <div 
                      key={doc.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded bg-teal/10 text-teal flex items-center justify-center shrink-0">
                          <File size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-navy-dark truncate" title={doc.name}>{doc.name}</p>
                          <p className="text-[9px] text-orange tracking-wide uppercase mt-0.5 font-bold">{doc.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shadow-sm shrink-0">
                        <div className="text-right">
                          <span className="block text-[8px] font-bold text-slate-400 uppercase">Exp Date</span>
                          <span className="text-[10px] font-mono text-navy font-bold">{doc.expiryDate}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteUploadedDoc(doc.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-slate-100 bg-slate-50/50 rounded-xl">
                  <Info size={20} className="text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-400 font-medium">No documents attached yet</p>
                  <p className="text-[9px] text-slate-400 max-w-[180px] mx-auto mt-1 leading-normal">
                    Compliance audit files uploaded above will list here before saving.
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {showCreationMode ? (
          <motion.div
            key="creation"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            {renderCreationPage()}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Asset Fleet Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-head font-extrabold text-navy-dark tracking-tight">Asset Management</h2>
                <p className="text-sm text-slate-500">Manage your fleet of drivers and power units.</p>
              </div>
              <div className="flex gap-2">
                 <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm h-10">
                    <button 
                      onClick={() => setActiveTab('Drivers')}
                      className={`px-6 py-1 text-[10px] font-bold uppercase tracking-widest transition-all rounded ${activeTab === 'Drivers' ? 'bg-navy text-white' : 'text-slate-400 hover:text-navy'}`}
                    >
                      Drivers
                    </button>
                    <button 
                      onClick={() => setActiveTab('Units')}
                      className={`px-6 py-1 text-[10px] font-bold uppercase tracking-widest transition-all rounded ${activeTab === 'Units' ? 'bg-navy text-white' : 'text-slate-400 hover:text-navy'}`}
                    >
                      Units
                    </button>
                 </div>
                 <button 
                   onClick={() => {
                     setCreationClass(activeTab === 'Drivers' ? 'Driver' : 'Truck');
                     setShowCreationMode(true);
                   }}
                   className="bg-orange text-white h-10 px-6 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-orange/20 hover:bg-orange-light transition-all flex items-center gap-2 cursor-pointer"
                 >
                   <Plus size={16} /> Add {activeTab === 'Drivers' ? 'Driver' : 'Unit'}
                 </button>
              </div>
            </header>

            {/* Asset Search */}
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange transition-colors" size={18} />
              <input 
                type="text"
                placeholder={`Search ${activeTab.toLowerCase()}...`}
                className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:border-orange focus:ring-4 focus:ring-orange/5 transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Grid display layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTab === 'Drivers' ? (
                filteredDrivers.map(driver => {
                  const assignedTruck = trucks.find(t => t.id === driver.truckId);
                  return (
                    <div 
                      key={driver.id} 
                      onClick={() => handleSelectDriver(driver)}
                      className="tms-card hover:border-orange transition-all group overflow-hidden cursor-pointer"
                    >
                      <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                         <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-navy text-white flex items-center justify-center font-black text-sm relative group-hover:scale-110 transition-transform">
                              {driver.name.split(' ').map(n=>n[0]).join('')}
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${driver.status === 'Available' ? 'bg-teal' : 'bg-orange'}`} />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-navy-dark tracking-tight">{driver.name}</h3>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">CDL {driver.cdlClass} · {driver.status}</p>
                            </div>
                         </div>
                         <button className="text-slate-200 hover:text-navy">
                            <MoreVertical size={16} />
                         </button>
                      </div>
                      
                      {/* Compliance Sync Attention Notice */}
                      {(() => {
                        const comp = getDriverCompliance(driver);
                        if (comp.status !== 'Compliant') {
                          return (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectDriver(driver);
                                setDriverModalTab('dotAudit');
                              }}
                              className={`mx-5 mt-4 p-2.5 rounded-xl border flex items-center justify-between transition-all hover:brightness-95 ${
                                comp.status === 'Needs Attention' 
                                  ? 'bg-red-50/70 border-red-100 text-red-700' 
                                  : 'bg-orange/5 border-orange/10 text-orange'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <AlertCircle size={14} className={comp.status === 'Needs Attention' ? 'text-red-500' : 'text-orange'} />
                                <div className="text-left">
                                  <p className="text-[10px] font-black uppercase tracking-wider leading-none">{comp.status}</p>
                                  <p className="text-[9px] text-slate-500 font-bold mt-0.5">{comp.issues.length} {comp.issues.length === 1 ? 'audit issue' : 'audit issues'}</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border shadow-xs text-navy">
                                Score: {comp.score}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <div className="p-5 space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Location</p>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-navy-dark">
                                <MapPin size={14} className="text-orange" /> {driver.currentLocation}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Safety Rating</p>
                              <div className="flex items-center justify-end gap-2">
                                 <span className="text-xs font-black text-navy">{driver.score}</span>
                                 <ShieldCheck size={14} className="text-teal" />
                              </div>
                            </div>
                         </div>

                         {/* Compliance and docs check on main cards */}
                         <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                           <span>Archived Documents</span>
                           <span className="text-navy font-mono">
                             {(driver.complianceDocs?.length || 0) + (driver.medicalCardExpiry ? 1 : 0)} Vault Docs
                           </span>
                         </div>

                         <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-white transition-colors">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assigned Equipment</p>
                            {assignedTruck ? (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Truck size={14} className="text-navy" />
                                  <span className="text-xs font-bold text-navy">Unit {assignedTruck.unitNumber}</span>
                                  <span className="text-[10px] text-slate-400">· {assignedTruck.makeModel}</span>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    assignTruckToDriver(driver.id, null);
                                  }}
                                  className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-md transition-allcursor-pointer"
                                  title="Unassign Unit"
                                >
                                  <Unlink size={14} />
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowAssignModal({driver});
                                }}
                                className="w-full py-2 border border-dashed border-slate-200 rounded-lg text-[10px] font-bold text-slate-400 uppercase hover:border-orange hover:text-orange transition-all flex items-center justify-center gap-2 cursor-pointer"
                              >
                                <Link size={12} /> Assign Truck
                              </button>
                            )}
                         </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                filteredTrucks.map(truck => {
                  const assignedDriver = drivers.find(d => d.id === truck.driverId);
                  const isTrailer = truck.type.toLowerCase().includes('trailer') || truck.type.toLowerCase().includes('van') || truck.type.toLowerCase().includes('reefer') || truck.type.toLowerCase().includes('flatbed');
                  
                  return (
                    <div 
                      key={truck.id} 
                      onClick={() => setSelectedTruck(truck)}
                      className="tms-card hover:border-teal transition-all group overflow-hidden cursor-pointer"
                    >
                      <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                         <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-50 text-navy flex items-center justify-center group-hover:bg-navy group-hover:text-white transition-all shadow-sm">
                              {isTrailer ? <Settings size={22} className="text-orange group-hover:text-white" /> : <Truck size={24} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-bold text-navy-dark tracking-tight">Unit {truck.unitNumber}</h3>
                                <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${isTrailer ? 'bg-orange/10 text-orange' : 'bg-navy/10 text-navy'}`}>
                                  {isTrailer ? 'Trailer' : 'Power Unit'}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{truck.makeModel}</p>
                            </div>
                         </div>
                         <div className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${truck.status === 'Available' ? 'bg-teal/10 text-teal' : 'bg-orange/10 text-orange'}`}>
                            {truck.status}
                         </div>
                      </div>
                      
                      {/* Compliance Sync Attention Notice */}
                      {(() => {
                        const comp = getTruckCompliance(truck);
                        if (comp.status !== 'Compliant') {
                          return (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTruck(truck);
                                setTruckModalTab('dotAudit');
                              }}
                              className={`mx-5 mt-4 p-2.5 rounded-xl border flex items-center justify-between transition-all hover:brightness-95 ${
                                comp.status === 'Needs Attention' 
                                  ? 'bg-red-50/70 border-red-100 text-red-500' 
                                  : 'bg-orange/5 border-orange/10 text-orange'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <AlertCircle size={14} className={comp.status === 'Needs Attention' ? 'text-red-500' : 'text-orange'} />
                                <div className="text-left">
                                  <p className="text-[10px] font-black uppercase tracking-wider leading-none">{comp.status}</p>
                                  <p className="text-[9px] text-slate-500 font-bold mt-0.5">{comp.issues.length} {comp.issues.length === 1 ? 'record warning' : 'record warnings'}</p>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border shadow-xs text-navy font-sans">
                                Score: {comp.score}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <div className="p-5 space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Equipment Class</p>
                              <p className="text-xs font-bold text-navy truncate" title={truck.type}>{truck.type}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">DOT PM Status</p>
                              <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-teal">
                                <Activity size={14} /> {truck.pmStatus}
                              </div>
                            </div>
                         </div>

                         {/* Documents Counter */}
                         <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                           <span>Regulatory Docs Built</span>
                           <span className="text-navy font-mono">
                             {(truck.complianceDocs?.length || 0) + (truck.registrationExpiry ? 1 : 0)} Documents
                           </span>
                         </div>

                         <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Driver Link</p>
                            <div className="flex items-center gap-2">
                              <Users size={14} className="text-slate-400" />
                              <span className="text-xs font-bold text-navy-dark">
                                {assignedDriver ? assignedDriver.name : 'No Driver Assigned'}
                              </span>
                            </div>
                         </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign Truck Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowAssignModal(null)}
               className="absolute inset-0 bg-navy-dark/60 backdrop-blur-sm shadow-inner"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden border border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                   <h3 className="text-sm font-bold text-navy-dark">Assign Unit to {showAssignModal.driver.name}</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Available Power Units Only</p>
                </div>
                <button onClick={() => setShowAssignModal(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                 {trucks.map(truck => {
                   const isAssigned = !!truck.driverId;
                   return (
                     <button 
                       key={truck.id}
                       disabled={isAssigned}
                       onClick={() => {
                         assignTruckToDriver(showAssignModal.driver.id, truck.id);
                         setShowAssignModal(null);
                       }}
                       className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all text-left cursor-pointer ${isAssigned ? 'opacity-40 border-slate-100 cursor-not-allowed' : 'border-slate-100 hover:border-orange hover:bg-orange/5 group'}`}
                     >
                       <div className="flex items-center gap-3">
                         <Truck size={18} className={isAssigned ? 'text-slate-300' : 'text-navy group-hover:text-orange'} />
                         <div>
                            <p className="text-sm font-bold text-navy-dark">{truck.unitNumber}</p>
                            <p className="text-[10px] text-slate-400">{truck.makeModel}</p>
                         </div>
                       </div>
                       {isAssigned && (
                         <span className="text-[8px] font-bold text-slate-400 uppercase">Busy</span>
                       )}
                     </button>
                   );
                 })}
              </div>

              <div className="p-4 bg-slate-50 text-center">
                 <button onClick={() => setShowAssignModal(null)} className="text-[10px] font-bold text-slate-400 uppercase hover:text-navy cursor-pointer">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>      {/* Driver Profile Modal with Compliance Docs integrated */}
      <AnimatePresence>
        {selectedDriver && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={handleCloseDriverModal}
               className="absolute inset-0 bg-navy-dark/60 backdrop-blur-sm"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-100 font-sans"
            >
              <div className="bg-navy p-8 text-white relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleCloseDriverModal(); }}
                  className="absolute right-6 top-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-white text-navy flex items-center justify-center text-2xl font-black shadow-xl">
                    {selectedDriver.name.split(' ').map(n=>n[0]).join('')}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">{selectedDriver.name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${selectedDriver.status === 'Available' ? 'bg-teal text-white' : 'bg-orange text-white'}`}>
                        {selectedDriver.status}
                      </span>
                      <span className="text-white/60 text-xs font-bold uppercase tracking-tighter">ID: DRV-{selectedDriver.id.slice(-4).toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-tab Navigation */}
              <div className="flex border-b border-slate-100 bg-slate-50/50 px-8">
                <button
                  onClick={() => { setDriverModalTab('dossier'); setIsEditingDossier(false); }}
                  className={`py-3.5 px-6 text-[10px] font-black uppercase tracking-widest relative transition-all cursor-pointer ${
                    driverModalTab === 'dossier' 
                      ? 'text-navy border-b-2 border-orange font-black text-xs' 
                      : 'text-slate-400 hover:text-navy font-bold'
                  }`}
                >
                  Driver Dossier
                </button>
                <button
                  onClick={() => setDriverModalTab('settlements')}
                  className={`py-3.5 px-6 text-[10px] font-black uppercase tracking-widest relative transition-all cursor-pointer ${
                    driverModalTab === 'settlements' 
                      ? 'text-navy border-b-2 border-orange font-black text-xs' 
                      : 'text-slate-400 hover:text-navy font-bold'
                  }`}
                >
                  Settlement Pay Rules
                </button>
                <button
                  onClick={() => setDriverModalTab('changelog')}
                  className={`py-3.5 px-6 text-[10px] font-black uppercase tracking-widest relative transition-all cursor-pointer ${
                    driverModalTab === 'changelog' 
                      ? 'text-navy border-b-2 border-orange font-black text-xs' 
                      : 'text-slate-400 hover:text-navy font-bold'
                  }`}
                >
                  Change Log
                </button>
                <button
                  onClick={() => setDriverModalTab('dotAudit')}
                  className={`py-3.5 px-6 text-[10px] font-black uppercase tracking-widest relative transition-all cursor-pointer flex items-center gap-1.5 ${
                    driverModalTab === 'dotAudit' 
                      ? 'text-navy border-b-2 border-orange font-black text-xs' 
                      : 'text-slate-400 hover:text-navy font-bold'
                  }`}
                >
                  <span>DOT & Safety Audit</span>
                  {(() => {
                    const comp = getDriverCompliance(selectedDriver);
                    if (comp.status !== 'Compliant') {
                      return (
                        <span className={`w-2 h-2 rounded-full ${comp.status === 'Needs Attention' ? 'bg-red border-2 border-white animate-pulse' : 'bg-orange border-2 border-white'}`} />
                      );
                    }
                    return null;
                  })()}
                </button>
              </div>

              {driverModalTab === 'dossier' ? (
                isEditingDossier ? (
                  <div className="p-8 space-y-6 max-h-[440px] overflow-y-auto text-left">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Edit Driver Dossier</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Update registered compliance & core data</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingDossier(false)}
                          className="px-3 py-1.5 border border-slate-200 text-slate-500 hover:text-navy cursor-pointer rounded-lg text-xs font-bold transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveDossierChanges}
                          className="px-3.5 py-1.5 bg-orange text-white hover:bg-orange/90 cursor-pointer rounded-lg text-xs font-extrabold transition-all"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Section: Core Profile Details */}
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1">Core & Contact Details</p>
                        
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Driver Full Name *</label>
                          <input
                            type="text"
                            value={editDrvName}
                            onChange={e => setEditDrvName(e.target.value)}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white font-medium"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Contact Phone *</label>
                          <input
                            type="text"
                            value={editDrvPhone}
                            onChange={e => setEditDrvPhone(e.target.value)}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Contact Email</label>
                          <input
                            type="email"
                            value={editDrvEmail}
                            onChange={e => setEditDrvEmail(e.target.value)}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white font-medium"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Residential Address</label>
                          <textarea
                            value={editDrvAddress}
                            onChange={e => setEditDrvAddress(e.target.value)}
                            rows={2}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white"
                            placeholder="Street, City, State, Zip"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Class Type</label>
                            <select
                              value={editDrvType}
                              onChange={e => setEditDrvType(e.target.value)}
                              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white"
                            >
                              <option>Company Driver</option>
                              <option>Owner Operator</option>
                              <option>Lease Purchase</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">CDL Class</label>
                            <select
                              value={editDrvCdlClass}
                              onChange={e => setEditDrvCdlClass(e.target.value)}
                              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white"
                            >
                              <option>Class A</option>
                              <option>Class B</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Section: Regulatory & Emergency Contact details */}
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1">Compliance & Expirations</p>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">CDL License #</label>
                          <input
                            type="text"
                            value={editDrvCdlNumber}
                            onChange={e => setEditDrvCdlNumber(e.target.value)}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white font-mono uppercase"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">CDL Expiry Date</label>
                            <input
                              type="date"
                              value={editDrvCdlExpiry}
                              onChange={e => setEditDrvCdlExpiry(e.target.value)}
                              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Med Card Expiry</label>
                            <input
                              type="date"
                              value={editDrvMedicalExpiry}
                              onChange={e => setEditDrvMedicalExpiry(e.target.value)}
                              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white font-mono"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Last Drug Test Date</label>
                          <input
                            type="date"
                            value={editDrvDrugTestDate}
                            onChange={e => setEditDrvDrugTestDate(e.target.value)}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white font-mono"
                          />
                        </div>

                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1 pt-2">Emergency Backup Contact</p>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Contact Name</label>
                            <input
                              type="text"
                              value={editDrvEmergencyName}
                              onChange={e => setEditDrvEmergencyName(e.target.value)}
                              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white"
                              placeholder="Jane Doe"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Emergency Phone</label>
                            <input
                              type="text"
                              value={editDrvEmergencyPhone}
                              onChange={e => setEditDrvEmergencyPhone(e.target.value)}
                              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange focus:bg-white font-mono"
                              placeholder="+1 (555) 555-5555"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 space-y-6 max-h-[440px] overflow-y-auto text-left">
                    {/* View mode top edit action header */}
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 bg-white">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registered dossier dossier file</span>
                        <h3 className="text-sm font-black text-navy-dark uppercase tracking-widest mt-0.5">Specifications & details</h3>
                      </div>
                      <button
                        type="button"
                        onClick={startEditingDossier}
                        className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 rounded-lg border border-indigo-200 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Settings size={13} /> Edit Profile Details
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left Column Qualifications, Compliance, Performance, Contacts */}
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Qualifications & Compliance</h4>
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-xs font-bold text-navy-dark">CDL Class</span>
                              <span className="text-xs font-black text-navy">{selectedDriver.cdlClass}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-xs font-bold text-navy-dark">CDL License #</span>
                              <span className="text-xs font-black text-navy font-mono uppercase">{selectedDriver.cdlNumber || 'Not Specified'}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-xs font-bold text-navy-dark">CDL Expiry</span>
                              <span className="text-xs font-black text-navy font-mono">{selectedDriver.cdlExpiry || 'Valid / Active'}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-xs font-bold text-navy-dark">Endorsements</span>
                              <div className="flex gap-1">
                                {selectedDriver.endorsements && selectedDriver.endorsements.length > 0 ? selectedDriver.endorsements.map(e => (
                                  <span key={e} className="w-6 h-6 rounded bg-navy text-white flex items-center justify-center text-[10px] font-bold">{e}</span>
                                )) : <span className="text-[10px] text-slate-400 font-bold uppercase">None</span>}
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-xs font-bold text-navy-dark">Last Drug Test Date</span>
                              <span className="text-xs font-black text-navy font-mono">{selectedDriver.drugTestDate || 'Not Specified'}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-xs font-bold text-navy-dark">HOS Availability</span>
                              <span className="text-xs font-black text-teal flex items-center gap-1">
                                <Activity size={14} /> {selectedDriver.hosAvailable}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Safety Scores */}
                        <div>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Performance Metrics</h4>
                          <div className="p-4 bg-navy/5 rounded-2xl border border-navy/10 flex items-center justify-between">
                             <div>
                               <p className="text-[10px] font-bold text-slate-500 uppercase">Safety Score</p>
                               <p className="text-2xl font-black text-navy">{selectedDriver.score}<span className="text-sm font-bold text-slate-400">/100</span></p>
                             </div>
                             <div className="w-12 h-12 rounded-full border-4 border-teal flex items-center justify-center">
                                <ShieldCheck size={20} className="text-teal" />
                             </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Contact info, Assigned truck, Documents cabinet list */}
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Core Dossier Profiles</h4>
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-xs font-bold text-navy-dark">Driver Employment Type</span>
                              <span className="text-xs font-black text-navy uppercase tracking-tight">{selectedDriver.type || 'Company Driver'}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-xs font-bold text-navy-dark">Contact Phone</span>
                              <span className="text-xs font-black text-navy font-mono">{selectedDriver.phone || 'No phone set'}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-xs font-bold text-navy-dark">Contact Email</span>
                              <span className="text-xs font-black text-navy shrink-0 max-w-[150px] truncate" title={selectedDriver.email}>{selectedDriver.email || 'No email set'}</span>
                            </div>
                            <div className="flex flex-col gap-1 p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-[10px] font-bold text-navy-dark">Residential Address</span>
                              <span className="text-xs font-medium text-slate-600 italic leading-snug">{selectedDriver.address || 'Street address not filed'}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Emergency Backup Contacts</h4>
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-500">Contact Person Name</span>
                              <span className="font-black text-navy-dark">{selectedDriver.emergencyName || 'Not Specified'}</span>
                            </div>
                            <div className="flex justify-between items-center leading-none">
                              <span className="font-bold text-slate-500">Emergency Phone</span>
                              <span className="font-mono font-black text-navy-dark">{selectedDriver.emergencyPhone || 'Not Specified'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Compliance Vault integrations */}
                        <div>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Documents Archive Cabinet</h4>
                          <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                            {selectedDriver.medicalCardExpiry && (
                              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-navy font-bold">
                                <div className="flex items-center gap-2">
                                  <FileText size={14} className="text-teal" />
                                  <div>
                                    <p className="font-bold text-[10px] text-navy-dark">Medical Card Certificate</p>
                                    <p className="text-[8px] text-slate-400 font-medium font-semibold">Auto-Archived Expiry Date</p>
                                  </div>
                                </div>
                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-teal/10 text-teal uppercase font-mono">{selectedDriver.medicalCardExpiry}</span>
                              </div>
                            )}

                            {/* Display custom uploaded vaults files */}
                            {selectedDriver.complianceDocs && selectedDriver.complianceDocs.length > 0 ? (
                              selectedDriver.complianceDocs.map(doc => (
                                <div key={doc.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-navy font-bold">
                                  <div className="flex items-center gap-2">
                                    <FileText size={14} className="text-orange" />
                                    <div className="truncate max-w-[120px]">
                                      <p className="font-bold text-[10px] text-navy-dark truncate" title={doc.name}>{doc.name}</p>
                                      <p className="text-[8px] text-slate-400 font-medium whitespace-nowrap">{doc.type}</p>
                                    </div>
                                  </div>
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-orange/15 text-orange uppercase font-mono">{doc.expiryDate}</span>
                                </div>
                              ))
                            ) : null}

                            {!selectedDriver.medicalCardExpiry && (!selectedDriver.complianceDocs || selectedDriver.complianceDocs.length === 0) && (
                              <div className="text-center py-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                <p className="text-[10px] text-slate-400 italic">No document files attached</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Assigned Asset</h4>
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            {selectedDriver.truckId ? (
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-navy text-white flex items-center justify-center">
                                  <Truck size={24} />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-navy-dark">Unit {trucks.find(t => t.id === selectedDriver.truckId)?.unitNumber}</p>
                                  <p className="text-[10px] text-slate-500 font-medium">{trucks.find(t => t.id === selectedDriver.truckId)?.makeModel}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                 <p className="text-xs text-slate-400 italic">No equipment assigned</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : driverModalTab === 'changelog' ? (
                <div className="p-8 space-y-4 max-h-[440px] overflow-y-auto text-left leading-normal font-sans">
                  <div>
                    <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest mb-1">Driver Dossier Audit Trail</h3>
                    <p className="text-[11px] text-slate-500 font-medium">Historical register of profile configuration adjustments, system additions, and regulatory updates.</p>
                  </div>
                  
                  {(!selectedDriver.changeLog || selectedDriver.changeLog.length === 0) ? (
                    <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                      <p className="text-xs text-slate-400 italic font-medium">No historical change logs recorded for this driver.</p>
                    </div>
                  ) : (
                    <div className="relative border-l border-slate-150 pl-4 space-y-4 ml-2.5 mt-4">
                      {selectedDriver.changeLog.slice().reverse().map((log, index) => (
                        <div key={log.id || index} className="relative">
                          {/* Left bullet marker */}
                          <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-orange border-2 border-white ring-4 ring-white" />
                          <div className="space-y-1">
                            <span className="text-[9.5px] font-mono font-medium text-slate-400">
                              {new Date(log.timestamp).toLocaleString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <p className="text-xs font-bold text-slate-800 leading-normal">{log.action}</p>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-orange/90 bg-orange/5 px-1.5 py-0.5 rounded">
                              By {log.user || 'System Agent'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : driverModalTab === 'dotAudit' ? (
                <div className="p-8 space-y-6 max-h-[440px] overflow-y-auto text-left leading-normal font-sans">
                  {/* Dynamic DOT audit integration view */}
                  {(() => {
                    const comp = getDriverCompliance(selectedDriver);
                    return (
                      <div className="space-y-6">
                        {/* Score Overview card */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-navy to-navy-light text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md border-none">
                          <div className="text-left space-y-2">
                             <div className="flex items-center gap-2">
                               <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-white/10 border border-white/20">
                                 DOT AUDIT RECORD
                               </span>
                             </div>
                             <h3 className="text-xl font-black uppercase tracking-tight">
                               {comp.status === 'Compliant' && '✅ FULLY COMPLIANT'}
                               {comp.status === 'Expiring' && '⚠️ UPCOMING EXPIRATIONS'}
                               {comp.status === 'Needs Attention' && '🚨 COMPLIANCE CRITICAL'}
                             </h3>
                             <p className="text-xs text-slate-200 font-medium leading-relaxed">
                               This profile has been verified against CDL licenses, physical capabilities medical cards, drug tests and archived dossier vaults.
                             </p>
                          </div>
                          
                          <div className="flex flex-col items-center gap-1 shrink-0 bg-white/5 border border-white/10 p-4 rounded-2xl min-w-[135px]">
                             <span className="text-[9px] font-black tracking-widest text-slate-200 uppercase leading-none">SAFETY SCORE</span>
                             <span className="text-4xl font-extrabold font-sans mt-1 leading-none">
                               {comp.score}<span className="text-xs text-white/50">/100</span>
                             </span>
                             <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded mt-2 ${
                               comp.status === 'Compliant' ? 'bg-teal text-white' :
                               comp.status === 'Expiring' ? 'bg-orange text-white' : 'bg-red text-white'
                             }`}>
                               {comp.status}
                             </span>
                          </div>
                        </div>

                        {/* Checklist Section */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1">Compliance Checklist Status</h4>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                             <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                               <div>
                                 <p className="font-bold text-navy">CDL Validation</p>
                                 <p className="text-[10px] text-slate-400 font-medium mt-0.5">CDL Class {selectedDriver.cdlClass}</p>
                               </div>
                               <span className={`font-mono text-[10px] uppercase font-black px-2 py-0.5 rounded ${
                                  selectedDriver.cdlExpiry && new Date(selectedDriver.cdlExpiry) >= new Date('2026-05-25')
                                    ? 'bg-teal/10 text-teal' : 'bg-red-50 text-red font-mono'
                               }`}>
                                 {selectedDriver.cdlExpiry ? `Expires ${selectedDriver.cdlExpiry}` : 'Missing'}
                               </span>
                             </div>

                             <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                               <div>
                                 <p className="font-bold text-navy">Medical Examiner Card</p>
                                 <p className="text-[10px] text-slate-400 font-medium mt-0.5">FMCSA Med Cert status</p>
                               </div>
                               <span className={`font-mono text-[10px] uppercase font-black px-2 py-0.5 rounded ${
                                  selectedDriver.medicalCardExpiry && new Date(selectedDriver.medicalCardExpiry) >= new Date('2026-05-25')
                                    ? 'bg-teal/10 text-teal' : 'bg-red-50 text-red'
                               }`}>
                                 {selectedDriver.medicalCardExpiry ? `Expires ${selectedDriver.medicalCardExpiry}` : 'Missing'}
                               </span>
                             </div>

                             <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                               <div>
                                 <p className="font-bold text-navy">Drug & Alcohol Screening</p>
                                 <p className="text-[10px] text-slate-400 font-medium mt-0.5">Clearinghouse Log</p>
                               </div>
                               <span className={`font-mono text-[10px] uppercase font-black px-2 py-0.5 rounded ${
                                  selectedDriver.drugTestDate && new Date(selectedDriver.drugTestDate) >= new Date('2025-05-25')
                                    ? 'bg-teal/10 text-teal' : 'bg-orange/10 text-orange'
                               }`}>
                                 {selectedDriver.drugTestDate ? `Checked ${selectedDriver.drugTestDate}` : 'Missing'}
                               </span>
                             </div>

                             <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                               <div>
                                 <p className="font-bold text-navy">Assigned Tractor Unit</p>
                                 <p className="text-[10px] text-slate-400 font-medium mt-0.5">Active equipment</p>
                               </div>
                               <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${selectedDriver.truckId ? 'bg-teal/10 text-teal' : 'bg-slate-100 text-slate-500'}`}>
                                 {selectedDriver.truckId ? `Unit #${trucks.find(t => t.id === selectedDriver.truckId)?.unitNumber}` : 'Unassigned'}
                               </span>
                             </div>
                          </div>
                        </div>

                        {/* List of categories of issues */}
                        <div className="space-y-3.5">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1">
                            {comp.issues.length} {comp.issues.length === 1 ? 'Action Required Item' : 'Action Required Items'}
                          </h4>
                          
                          {comp.issues.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 border border-dotted border-slate-200 rounded-2xl flex flex-col items-center">
                              <ShieldCheck size={32} className="text-teal mb-2" />
                              <p className="text-xs font-black text-navy uppercase tracking-wider">Dossier is Fully Verified</p>
                              <p className="text-[11px] text-slate-500 font-bold mt-1">This driver does not have any regulatory gaps or missing files.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {comp.issues.map((issue, idx) => (
                                <div 
                                  key={idx} 
                                  className={`p-4 border rounded-2xl flex items-start gap-3.5 ${
                                    issue.severity === 'critical' ? 'bg-red-50/50 border-red-100' :
                                    issue.severity === 'warning' ? 'bg-orange/5 border-orange/10' :
                                    'bg-sky-50/50 border-sky-100'
                                  }`}
                                >
                                  <div className="mt-0.5">
                                    <AlertCircle size={16} className={
                                      issue.severity === 'critical' ? 'text-red animate-pulse' :
                                      issue.severity === 'warning' ? 'text-orange' : 'text-sky-500'
                                    } />
                                  </div>
                                  <div className="text-left space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[11px] font-black text-slate-800 leading-tight">
                                        {issue.message}
                                      </span>
                                      <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                        issue.severity === 'critical' ? 'bg-red text-white' :
                                        issue.severity === 'warning' ? 'bg-orange text-white' : 'bg-sky-500 text-white'
                                      }`}>
                                        {issue.severity}
                                      </span>
                                      <span className="text-[8px] font-black uppercase tracking-widest text-[#006699]/80 bg-[#006699]/10 px-1.5 py-0.5 rounded">
                                        {issue.category}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                                      {issue.details}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="p-6 md:p-8 space-y-6 max-h-[440px] overflow-y-auto text-left">
                  {/* Global Settlements Rules Configuration Tab */}
                  <div>
                    <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest mb-1.5">Configure Global Pay Rules</h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Set recurring rates, deductions, or allowances for <strong className="text-navy">{selectedDriver.name}</strong>. These rules run automatically but can be unchecked/deleted when processing a paycheck check.
                    </p>
                  </div>

                  {/* Inline Create/Add Rule Form Container */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-3.5">
                    <p className="text-[10px] font-black text-navy uppercase tracking-wider">Add Global Payment Rule</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rule Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Truck Lease Escrow"
                          value={newRuleName}
                          onChange={e => setNewRuleName(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-orange bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Type</label>
                        <select
                          value={newRuleType}
                          onChange={e => setNewRuleType(e.target.value as any)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-orange bg-white cursor-pointer"
                        >
                          <option value="DEDUCTION">Deduction (Withholding)</option>
                          <option value="REVENUE">Revenue (Allowance/Bonus)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Method</label>
                        <select
                          value={newRuleRateType}
                          onChange={e => setNewRuleRateType(e.target.value as any)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-orange bg-white cursor-pointer"
                        >
                          <option value="FLAT">Flat Fee ($)</option>
                          <option value="PERCENTAGE">Percentage (%)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          {newRuleRateType === 'PERCENTAGE' ? 'Rate (%)' : 'Amount ($)'}
                        </label>
                        <input
                          type="number"
                          placeholder={newRuleRateType === 'PERCENTAGE' ? '5.0' : '0.00'}
                          value={newRuleAmount}
                          onChange={e => setNewRuleAmount(e.target.value)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-orange bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Frequency</label>
                        <select
                          value={newRuleFrequency}
                          onChange={e => setNewRuleFrequency(e.target.value as any)}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-orange bg-white cursor-pointer"
                        >
                          <option value="DAILY">Per Day (Daily)</option>
                          <option value="WEEKLY">Per Week (Sunday - Saturday)</option>
                          <option value="MONTHLY">Per Month</option>
                          <option value="QUARTERLY">Per Quarter</option>
                          <option value="YEARLY">Per Year</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Start Date</label>
                        <input
                          type="date"
                          value={newRuleStartDate}
                          onChange={e => setNewRuleStartDate(e.target.value)}
                          className="w-full text-xs p-1.5 rounded-lg border border-slate-200 outline-none focus:border-orange bg-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={handleAddNewRule}
                        className="py-2.5 px-6 bg-[#E8820C] hover:bg-[#E8820C]/90 text-white font-bold text-xs rounded-lg uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Plus size={14} /> Save Rule
                      </button>
                    </div>
                  </div>

                  {/* Existing Rules List */}
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Active Global Rules for Driver</p>
                    
                    {recurringRules.filter(r => r.driverId === selectedDriver.id).length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-slate-200 bg-slate-50/50 rounded-xl">
                        <p className="text-xs text-slate-400 italic">No global pay rules set for this driver yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recurringRules.filter(r => r.driverId === selectedDriver.id).map(rule => (
                          <div 
                            key={rule.id}
                            className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-xl shadow-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-navy-dark">{rule.name}</span>
                                <span className={`text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase leading-none ${
                                  rule.type === 'REVENUE' 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}>
                                  {rule.type === 'REVENUE' ? 'Allowance' : 'Deduction'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                                <span className="uppercase text-orange tracking-wider font-semibold">{rule.frequency}</span>
                                <span className="text-slate-200">&bull;</span>
                                <span className="font-mono text-slate-500 font-medium">Starts: {rule.startDate || 'No start date'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-mono font-bold text-sm text-navy font-black">
                                {rule.rateType === 'PERCENTAGE' ? `${rule.amount}% of Gross` : `$${rule.amount.toFixed(2)}`}
                              </span>

                              {/* Active toggler */}
                              <button
                                onClick={() => updateRecurringRule(rule.id, { active: !rule.active })}
                                className={`px-2 py-0.5 text-[9px] font-black uppercase rounded border transition-colors cursor-pointer ${
                                  rule.active
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-slate-50 border-slate-200 text-slate-400'
                                }`}
                              >
                                {rule.active ? 'Active' : 'Inactive'}
                              </button>

                              <button
                                onClick={() => deleteRecurringRule(rule.id)}
                                className="text-slate-300 hover:text-rose-600 transition-colors p-1"
                                title="Delete Pay Rule"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rules Reporting Tracker Projections (Next 30 Days) */}
                  <div className="p-4 bg-indigo-50/45 border border-indigo-150 rounded-2xl text-left space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-indigo-600" />
                        <h4 className="text-[10px] font-black text-indigo-950 uppercase tracking-widest">Rule Execution Forecast & Reporting Projections (Next 30 Days)</h4>
                      </div>
                      <span className="text-[8px] font-black bg-indigo-10/10 text-indigo-700 uppercase tracking-widest px-2 py-0.5 rounded leading-none">
                        Automatic Tracker Logs
                      </span>
                    </div>
                    
                    <p className="text-[11px] text-indigo-950/70 font-medium leading-relaxed">
                      Below is the projected payout timeline on which this driver's global pay rules will trigger automatically in the TMS system:
                    </p>

                    <div className="space-y-1.5">
                      {(() => {
                        const driverRules = recurringRules.filter(r => r.driverId === selectedDriver.id && r.active);
                        if (driverRules.length === 0) {
                          return (
                            <p className="text-[10px] text-slate-400 italic py-1 leading-none">
                              No active rules to project forecast for. Define and activate rules above first.
                            </p>
                          );
                        }

                        const projectionList: { date: string; ruleName: string; amount: number; type: 'REVENUE' | 'DEDUCTION'; frequency: string }[] = [];
                        const today = new Date();
                        
                        // Forecaster checking dates
                        for (let i = 0; i < 30; i++) {
                          const d = new Date(today);
                          d.setDate(today.getDate() + i);
                          const dateStr = d.toISOString().split('T')[0];

                          driverRules.forEach(rule => {
                            if (rule.startDate && dateStr < rule.startDate) return;

                            let applies = false;
                            if (rule.frequency === 'DAILY') {
                              applies = true;
                            } else if (rule.frequency === 'WEEKLY') {
                              applies = d.getDay() === 0; // Sunday
                            } else if (rule.frequency === 'MONTHLY') {
                              applies = d.getDate() === 1; // 1st
                            } else if (rule.frequency === 'QUARTERLY') {
                              const isQuarterStartMonth = d.getMonth() === 0 || d.getMonth() === 3 || d.getMonth() === 6 || d.getMonth() === 9;
                              applies = isQuarterStartMonth && d.getDate() === 1;
                            } else if (rule.frequency === 'YEARLY') {
                              applies = d.getMonth() === 0 && d.getDate() === 1;
                            }

                            if (applies) {
                              projectionList.push({
                                date: dateStr,
                                ruleName: rule.name,
                                amount: rule.amount,
                                type: rule.type,
                                frequency: rule.frequency
                              });
                            }
                          });
                        }

                        const sortedForecast = projectionList.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10);

                        if (sortedForecast.length === 0) {
                          return (
                            <p className="text-[10px] text-indigo-950/60 italic py-1 leading-none">
                              No execution instances projected in the next 30 days due to start date scheduling parameters.
                            </p>
                          );
                        }

                        return sortedForecast.map((proj, idx) => (
                          <div key={`proj-${idx}`} className="flex justify-between items-center py-1 border-b border-indigo-150/40 text-[10px]">
                            <div className="flex items-center gap-2">
                              <span className="font-mono bg-indigo-10/20 text-indigo-900 font-bold px-1.5 py-0.5 rounded-sm">
                                {new Date(proj.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                              </span>
                              <span className="text-indigo-950 font-bold">{proj.ruleName}</span>
                              <span className="text-[8px] uppercase text-indigo-950/40">({proj.frequency})</span>
                            </div>
                            <span className={`font-mono font-bold ${proj.type === 'REVENUE' ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {proj.type === 'REVENUE' ? '+' : '-'}${proj.amount.toFixed(2)}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              )}

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => {
                    // Quick toggler between tabs
                    setDriverModalTab(driverModalTab === 'dossier' ? 'settlements' : 'dossier');
                  }}
                  className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-navy-dark uppercase tracking-widest hover:border-navy transition-all cursor-pointer"
                >
                  {driverModalTab === 'dossier' ? 'Rules Configuration' : 'Dossier Profile Tab'}
                </button>
                <button 
                  onClick={handleCloseDriverModal}
                  className="flex-1 py-3 bg-navy text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-navy/20 hover:bg-navy-light transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Truck/Unit Profile Modal with Compliance Docs integrated */}
      <AnimatePresence>
        {selectedTruck && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedTruck(null)}
               className="absolute inset-0 bg-navy-dark/60 backdrop-blur-sm"
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-100"
            >
              <div className="bg-teal p-8 text-white relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedTruck(null); }}
                  className="absolute right-6 top-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-white text-teal flex items-center justify-center text-3xl shadow-xl shrink-0">
                    <Truck size={40} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight block">Unit {selectedTruck.unitNumber}</h2>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${selectedTruck.status === 'Available' ? 'bg-white text-teal animate-pulse' : 'bg-orange text-white'}`}>
                        {selectedTruck.status}
                      </span>
                      <span className="text-white/60 text-xs font-bold uppercase tracking-tighter">{selectedTruck.makeModel}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Sub-tab Navigation */}
              <div className="flex border-b border-slate-100 bg-slate-50/50 px-8">
                <button
                  type="button"
                  onClick={() => setTruckModalTab('specs')}
                  className={`py-3.5 px-6 text-[10px] font-black uppercase tracking-widest relative transition-all cursor-pointer ${
                    truckModalTab === 'specs' 
                      ? 'text-navy border-b-2 border-orange font-black text-xs' 
                      : 'text-slate-400 hover:text-navy font-bold'
                  }`}
                >
                  Unit Specifications
                </button>
                <button
                  type="button"
                  onClick={() => setTruckModalTab('dotAudit')}
                  className={`py-3.5 px-6 text-[10px] font-black uppercase tracking-widest relative transition-all cursor-pointer flex items-center gap-1.5 ${
                    truckModalTab === 'dotAudit' 
                      ? 'text-navy border-b-2 border-orange font-black text-xs' 
                      : 'text-slate-400 hover:text-navy font-bold'
                  }`}
                >
                  <span>DOT Audit Verification</span>
                  {(() => {
                    const comp = getTruckCompliance(selectedTruck);
                    if (comp.status !== 'Compliant') {
                      return (
                        <span className={`w-2 h-2 rounded-full ${comp.status === 'Needs Attention' ? 'bg-red border-2 border-white animate-pulse' : 'bg-orange border-2 border-white'}`} />
                      );
                    }
                    return null;
                  })()}
                </button>
              </div>

              {truckModalTab === 'specs' ? (
                isEditingTruck ? (
                  <div className="p-8 max-h-[440px] overflow-y-auto w-full text-left font-sans">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xs font-black text-navy-dark uppercase tracking-widest">Edit Unit Specifications</h3>
                      <div className="flex items-center gap-3">
                        <button 
                          className="px-4 py-2 border border-slate-200 text-slate-500 hover:text-navy hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                          onClick={() => setIsEditingTruck(false)}
                        >
                          Cancel
                        </button>
                        <button 
                          className="px-4 py-2 bg-navy hover:bg-navy-dark text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 cursor-pointer"
                          onClick={handleSaveTruckChanges}
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">General Info</h4>
                        
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Primary Type</label>
                          <select 
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy focus:outline-none focus:border-orange focus:bg-white transition-all font-sans"
                            value={editTrkType}
                            onChange={e => setEditTrkType(e.target.value)}
                          >
                            <option value="Sleeper">Sleeper</option>
                            <option value="Daycab">Daycab</option>
                            <option value="Box Truck">Box Truck</option>
                            <option value="Dry Van Trailer">Dry Van Trailer</option>
                            <option value="Reefer Trailer">Reefer Trailer</option>
                            <option value="Flatbed Trailer">Flatbed Trailer</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Compliance & Status</h4>
                        
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Registration Expiry</label>
                          <input 
                            type="date"
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy focus:outline-none focus:border-orange focus:bg-white transition-all font-mono"
                            value={editTrkRegistrationExpiry}
                            onChange={e => setEditTrkRegistrationExpiry(e.target.value)}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Annual Inspection Expiry (DOT)</label>
                          <input 
                            type="date"
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy focus:outline-none focus:border-orange focus:bg-white transition-all font-mono"
                            value={editTrkAnnualInspection}
                            onChange={e => setEditTrkAnnualInspection(e.target.value)}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">PM Status</label>
                          <select 
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy focus:outline-none focus:border-orange focus:bg-white transition-all font-sans"
                            value={editTrkPmStatus}
                            onChange={e => setEditTrkPmStatus(e.target.value as 'Current' | 'Due' | 'Overdue')}
                          >
                            <option value="Current">Current</option>
                            <option value="Due">Due</option>
                            <option value="Overdue">Overdue</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[440px] overflow-y-auto relative">
                  <button 
                    className="absolute top-6 right-8 text-[9px] font-black uppercase tracking-widest bg-slate-100 hover:bg-navy text-navy hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                    onClick={startEditingTruck}
                  >
                    <Settings size={13} /> Edit Unit Info
                  </button>

                  <div className="space-y-6 text-left">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Specifications</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-xs font-bold text-navy-dark">Primary Type</span>
                          <span className="text-xs font-black text-navy">{selectedTruck.type}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-xs font-bold text-navy-dark">Last Location</span>
                          <span className="text-xs font-black text-navy flex items-center gap-1">
                            <MapPin size={14} className="text-orange" /> {selectedTruck.currentLocation}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Maintenance Status</h4>
                      <div className={`p-4 rounded-2xl border flex items-center justify-between ${selectedTruck.pmStatus === 'Current' ? 'bg-teal/5 border-teal/10' : 'bg-red-50 border-red-100'}`}>
                         <div>
                           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Preventative Maint.</p>
                           <p className={`text-lg font-black ${selectedTruck.pmStatus === 'Current' ? 'text-teal' : 'text-red-500'}`}>{selectedTruck.pmStatus}</p>
                         </div>
                         <Activity size={24} className={selectedTruck.pmStatus === 'Current' ? 'text-teal' : 'text-red-400'} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 text-left">
                    {/* Dynamic compliance documents */}
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Unit Records Vault</h4>
                      <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                        
                        {selectedTruck.registrationExpiry && (
                          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-navy font-bold">
                            <div className="flex items-center gap-2">
                              <FileText size={14} className="text-teal" />
                              <div>
                                <p className="font-bold text-[10px] text-navy-dark">Cab Card / Registration</p>
                                <p className="text-[8px] text-slate-400 font-medium font-sans">Active Compliance File</p>
                              </div>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-teal/10 text-teal uppercase font-mono">{selectedTruck.registrationExpiry}</span>
                          </div>
                        )}

                        {/* Display custom uploaded vaults files for trucks */}
                        {selectedTruck.complianceDocs && selectedTruck.complianceDocs.length > 0 ? (
                          selectedTruck.complianceDocs.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-navy font-bold">
                              <div className="flex items-center gap-2">
                                <FileText size={14} className="text-orange" />
                                <div className="truncate max-w-[120px]">
                                  <p className="font-bold text-[10px] text-navy-dark truncate" title={doc.name}>{doc.name}</p>
                                  <p className="text-[8px] text-slate-400 font-medium whitespace-nowrap">{doc.type}</p>
                                </div>
                              </div>
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-orange/15 text-orange uppercase font-mono">{doc.expiryDate}</span>
                            </div>
                          ))
                        ) : null}

                        {!selectedTruck.registrationExpiry && (!selectedTruck.complianceDocs || selectedTruck.complianceDocs.length === 0) && (
                          <div className="text-center py-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                            <p className="text-[10px] text-slate-400 italic">No asset files archived</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Assigned Driver</h4>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        {selectedTruck.driverId ? (
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-navy text-white flex items-center justify-center font-bold">
                              {drivers.find(d => d.id === selectedTruck.driverId)?.name.split(' ').map(n=>n[0]).join('')}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-navy-dark">{drivers.find(d => d.id === selectedTruck.driverId)?.name}</p>
                              <p className="text-[10px] text-slate-500 font-medium tracking-tight">Active since 05/12/2026</p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                             <p className="text-xs text-slate-400 italic">No driver assigned</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                )
              ) : (
                <div className="p-8 space-y-6 max-h-[440px] overflow-y-auto text-left leading-normal font-sans">
                  {/* Dynamic compliance audit for selectedTruck (Unit: Truck or Trailer) */}
                  {(() => {
                    const comp = getTruckCompliance(selectedTruck);
                    const isTrailer = selectedTruck.type.toLowerCase().includes('trailer') || 
                                      selectedTruck.type.toLowerCase().includes('van') || 
                                      selectedTruck.type.toLowerCase().includes('reefer') || 
                                      selectedTruck.type.toLowerCase().includes('flatbed');
                    const labelStr = isTrailer ? 'Trailer Unit' : 'Power unit';
                    return (
                      <div className="space-y-6">
                        {/* Score Overview Panel */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-teal to-teal-dark text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md border-none">
                          <div className="text-left space-y-2">
                             <div className="flex items-center gap-2">
                               <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-white/10 border border-white/20">
                                 {labelStr.toUpperCase()} COMPLIANCE
                               </span>
                             </div>
                             <h3 className="text-xl font-black uppercase tracking-tight">
                               {comp.status === 'Compliant' && '✅ ASSET VALIDATED'}
                               {comp.status === 'Expiring' && '⚠️ VEHICLE WARNINGS'}
                               {comp.status === 'Needs Attention' && '🚨 REPAIR & CERT REQ'}
                             </h3>
                             <p className="text-xs text-slate-200 font-medium leading-relaxed">
                               Evaluates continuous vehicle compliance including annual DOT inspections, preventive maintenance intervals, state registrations, and and asset files.
                             </p>
                          </div>
                          
                          <div className="flex flex-col items-center gap-1 shrink-0 bg-white/5 border border-white/10 p-4 rounded-2xl min-w-[135px]">
                             <span className="text-[9px] font-black tracking-widest text-slate-200 uppercase leading-none">VEHICLE SCORE</span>
                             <span className="text-4xl font-extrabold font-sans mt-0.5 leading-none">
                               {comp.score}<span className="text-xs text-white/50">/100</span>
                             </span>
                             <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded mt-2 bg-white text-teal`}>
                               {comp.status}
                             </span>
                          </div>
                        </div>

                        {/* Checklist Section */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1">Asset Verification Checklist</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                             <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                               <div>
                                 <p className="font-bold text-navy">Annual DOT Inspection</p>
                                 <p className="text-[10px] text-slate-400 font-medium mt-0.5">Mandatory safety validation</p>
                               </div>
                               <span className={`font-mono text-[10px] uppercase font-black px-2 py-0.5 rounded ${
                                  selectedTruck.annualInspectionExpiry && new Date(selectedTruck.annualInspectionExpiry) >= new Date('2026-05-25')
                                    ? 'bg-teal/10 text-teal' : 'bg-red-50 text-red font-mono'
                               }`}>
                                 {selectedTruck.annualInspectionExpiry ? `Expires ${selectedTruck.annualInspectionExpiry}` : 'Missing'}
                               </span>
                             </div>

                             <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                               <div>
                                 <p className="font-bold text-navy">Plate Registration Card</p>
                                 <p className="text-[10px] text-slate-400 font-medium mt-0.5">State DMV registration</p>
                               </div>
                               <span className={`font-mono text-[10px] uppercase font-black px-2 py-0.5 rounded ${
                                  selectedTruck.registrationExpiry && new Date(selectedTruck.registrationExpiry) >= new Date('2026-05-25')
                                    ? 'bg-teal/10 text-teal' : 'bg-red-50 text-red font-mono'
                               }`}>
                                 {selectedTruck.registrationExpiry ? `Expires ${selectedTruck.registrationExpiry}` : 'Missing'}
                               </span>
                             </div>

                             <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                               <div>
                                 <p className="font-bold text-navy">Preventive Maintenance</p>
                                 <p className="text-[10px] text-slate-400 font-medium mt-0.5">PM Scheduling checklist</p>
                               </div>
                               <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${selectedTruck.pmStatus === 'Current' ? 'bg-teal/10 text-teal' : 'bg-red-50 text-red'}`}>
                                 {selectedTruck.pmStatus}
                               </span>
                             </div>

                             <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                               <div>
                                 <p className="font-bold text-navy">Assigned Operator</p>
                                 <p className="text-[10px] text-slate-400 font-medium mt-0.5">Driver dispatcher link</p>
                               </div>
                               <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${selectedTruck.driverId ? 'bg-teal/10 text-teal' : 'bg-slate-100 text-slate-500'}`}>
                                 {selectedTruck.driverId ? 'Assigned' : isTrailer ? 'Not Required' : 'Unassigned'}
                               </span>
                             </div>
                          </div>
                        </div>

                        {/* List of active warnings */}
                        <div className="space-y-3.5">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1">
                            {comp.issues.length} {comp.issues.length === 1 ? 'Action Required Item' : 'Action Required Items'}
                          </h4>
                          
                          {comp.issues.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 border border-dotted border-slate-200 rounded-2xl flex flex-col items-center">
                              <ShieldCheck size={32} className="text-teal mb-2" />
                              <p className="text-xs font-black text-navy uppercase tracking-wider">Unit Check is fully Cleared</p>
                              <p className="text-[11px] text-slate-500 font-bold mt-1">Plate, inspection certificates and scheduled maintenance log records match the specifications manual.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {comp.issues.map((issue, idx) => (
                                <div 
                                  key={idx} 
                                  className={`p-4 border rounded-2xl flex items-start gap-3.5 ${
                                    issue.severity === 'critical' ? 'bg-red-50/50 border-red-100' :
                                    issue.severity === 'warning' ? 'bg-orange/5 border-orange/10' :
                                    'bg-sky-50/50 border-sky-100'
                                  }`}
                                >
                                  <div className="mt-0.5">
                                    <AlertCircle size={16} className={
                                      issue.severity === 'critical' ? 'text-red animate-pulse' :
                                      issue.severity === 'warning' ? 'text-orange' : 'text-sky-500'
                                    } />
                                  </div>
                                  <div className="text-left space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[11px] font-black text-slate-800 leading-tight">
                                        {issue.message}
                                      </span>
                                      <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                        issue.severity === 'critical' ? 'bg-red text-white' :
                                        issue.severity === 'warning' ? 'bg-orange text-white' : 'bg-sky-500 text-white'
                                      }`}>
                                        {issue.severity}
                                      </span>
                                      <span className="text-[8px] font-black uppercase tracking-widest text-teal/80 bg-teal/10 px-1.5 py-0.5 rounded">
                                        {issue.category}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                                      {issue.details}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-navy-dark uppercase tracking-widest hover:border-navy transition-all cursor-pointer">Service History</button>
                <button 
                  onClick={() => setSelectedTruck(null)}
                  className="flex-1 py-3 bg-teal text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-teal/20 hover:bg-teal-light transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Close Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
