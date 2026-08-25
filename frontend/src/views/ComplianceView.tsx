import React, { useState, useRef } from 'react';
import { 
  ShieldCheck, 
  Truck, 
  User, 
  FileCheck, 
  AlertTriangle, 
  Calendar, 
  Search,
  FileText,
  Activity,
  ChevronRight,
  Download,
  ExternalLink,
  ClipboardCheck,
  Stethoscope,
  Briefcase,
  Plus,
  Edit,
  Upload,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../context/DataContext';
import { Driver, Truck as TruckType, ComplianceDocument } from '../types';
import { getDriverCompliance, getTruckCompliance } from '../utils/complianceHelper';

type ComplianceTab = 'Readiness' | 'General' | 'DQF' | 'HOS' | 'Maintenance' | 'DrugAlcohol' | 'Hazmat';

export default function ComplianceView() {
  const { carrierCompliance, drivers, trucks, updateDriver, updateTruck, setNavigationIntent } = useData();
  const [activeTab, setActiveTab] = useState<ComplianceTab>('Readiness');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedTruck, setSelectedTruck] = useState<TruckType | null>(null);
  const [auditExporting, setAuditExporting] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [uploading, setUploading] = useState<{ id: string, progress: number } | null>(null);
  
  // Dynamic target mapping for uploaded files
  const [uploadTarget, setUploadTarget] = useState<{ type: 'driver' | 'truck'; entityId: string; docName: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadComplete = (fileName: string) => {
    if (!uploadTarget) return;

    const newDoc: ComplianceDocument = {
      id: `doc-${Math.random().toString(36).substr(2, 9)}`,
      name: fileName,
      type: uploadTarget.docName,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Valid'
    };

    if (uploadTarget.type === 'driver') {
      const driver = drivers.find(d => d.id === uploadTarget.entityId);
      if (driver) {
        const existingDocs = driver.complianceDocs || [];
        const updatedDocs = [newDoc, ...existingDocs.filter(d => d.name !== uploadTarget.docName)];
        updateDriver(uploadTarget.entityId, { complianceDocs: updatedDocs });
        if (selectedDriver?.id === uploadTarget.entityId) {
          setSelectedDriver({ ...driver, complianceDocs: updatedDocs });
        }
      }
    } else if (uploadTarget.type === 'truck') {
      const truck = trucks.find(t => t.id === uploadTarget.entityId);
      if (truck) {
        const existingDocs = truck.complianceDocs || [];
        const updatedDocs = [newDoc, ...existingDocs.filter(d => d.name !== uploadTarget.docName)];
        updateTruck(uploadTarget.entityId, { complianceDocs: updatedDocs });
        if (selectedTruck?.id === uploadTarget.entityId) {
          setSelectedTruck({ ...truck, complianceDocs: updatedDocs });
        }
      }
    }

    setUploadTarget(null);
  };

  const simulateUpload = (fileName: string) => {
    setUploading({ id: fileName, progress: 0 });
    const interval = setInterval(() => {
      setUploading(prev => {
        if (!prev) return null;
        if (prev.progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setUploading(null);
            handleUploadComplete(fileName);
          }, 1000);
          return { ...prev, progress: 100 };
        }
        return { ...prev, progress: prev.progress + 10 };
      });
    }, 150);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      simulateUpload(e.target.files[0].name);
    }
  };

  const triggerUpload = () => {
    // Default fallback to general upload if no specific target is set
    if (!uploadTarget && selectedDriver) {
      setUploadTarget({ type: 'driver', entityId: selectedDriver.id, docName: 'Custom Uploaded Record' });
    } else if (!uploadTarget && selectedTruck) {
      setUploadTarget({ type: 'truck', entityId: selectedTruck.id, docName: 'Custom Fuel/Maintenance Log' });
    }
    fileInputRef.current?.click();
  };

  const startUpload = (type: 'driver' | 'truck', entityId: string, docName: string) => {
    setUploadTarget({ type, entityId, docName });
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  const handleRemoveDoc = (type: 'driver' | 'truck', entityId: string, docName: string) => {
    // Removed confirm check

    if (type === 'driver') {
      const driver = drivers.find(d => d.id === entityId);
      if (driver) {
        const existingDocs = driver.complianceDocs || [];
        const updatedDocs = existingDocs.filter(doc => doc.name !== docName);
        updateDriver(entityId, { complianceDocs: updatedDocs });
        if (selectedDriver?.id === entityId) {
          setSelectedDriver({ ...driver, complianceDocs: updatedDocs });
        }
      }
    } else if (type === 'truck') {
      const truck = trucks.find(t => t.id === entityId);
      if (truck) {
        const existingDocs = truck.complianceDocs || [];
        const updatedDocs = existingDocs.filter(doc => doc.name !== docName);
        updateTruck(entityId, { complianceDocs: updatedDocs });
        if (selectedTruck?.id === entityId) {
          setSelectedTruck({ ...truck, complianceDocs: updatedDocs });
        }
      }
    }
    alert(`File for "${docName}" was successfully deleted from the compliant secure storage.`);
  };

  const getDriverMergedDocs = (driver: Driver) => {
    const defaultRequired = [
      { name: 'Driver Application (Form 391)', type: 'Application', date: '2023-11-10', status: 'Completed' },
      { name: 'Previous Employment Verification (DOT)', type: 'Verification', date: '2023-11-12', status: 'Verified' },
      { name: 'Annual Motor Vehicle Record (MVR)', type: 'MVR', date: '2024-03-01', status: 'Current' },
      { name: 'Medical Examiner Certificate', type: 'Medical', date: driver.medicalCardExpiry || '2025-08-15', status: 'Active' },
      { name: 'Road Test Certificate (391.31)', type: 'RoadTest', date: '2023-11-15', status: 'Certified' }
    ];

    const activeDocs = driver.complianceDocs || [];

    return defaultRequired.map(req => {
      const matchedUploaded = activeDocs.find(ad => ad.name === req.name);
      if (matchedUploaded) {
        return {
          name: req.name,
          date: `Uploaded Record (${matchedUploaded.name.substring(0,25)})`,
          status: 'Valid',
          uploaded: true
        };
      }
      return {
        name: req.name,
        date: req.date,
        status: req.status,
        uploaded: false
      };
    });
  };

  const getTruckMergedDocs = (truck: TruckType) => {
    const defaultRequired = [
      { name: 'Annual DOT Inspection Certificate', type: 'DOT Inspection', date: '2024-05-10', status: 'PASS' },
      { name: 'Vehicle Registration (Cab Card)', type: 'Registration', date: truck.registrationExpiry || '2025-12-31', status: 'ON FILE' }
    ];

    const activeDocs = truck.complianceDocs || [];

    return defaultRequired.map(req => {
      const matchedUploaded = activeDocs.find(ad => ad.name === req.name);
      if (matchedUploaded) {
        return {
          name: req.name,
          date: `Uploaded Record (${matchedUploaded.name.substring(0,25)})`,
          status: 'PASS',
          uploaded: true
        };
      }
      return {
        name: req.name,
        date: req.date,
        status: req.status,
        uploaded: false
      };
    });
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTrucks = trucks.filter(t => 
    t.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.makeModel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: ComplianceDocument['status']) => {
    switch (status) {
      case 'Valid': return 'bg-teal text-white';
      case 'Expiring': return 'bg-orange text-white';
      case 'Expired': return 'bg-red-500 text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  const handleAuditExport = () => {
    setAuditExporting(true);
    setTimeout(() => {
      setAuditExporting(false);
      alert('DOT Compliance Package generated and ready for secure transfer (Electronic Data Interchange / Email to Officer).');
    }, 2500);
  };

  const handleMockAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
      alert('Internal Mock Audit complete. Score: 98/100. No critical violations found.');
    }, 3000);
  };

  const handleActionStub = (actionName: string) => {
    alert(`${actionName} triggered. This would typically open a secure form or document portal.`);
  };

  const renderReadinessTab = () => (
    <div className="space-y-8">
      {/* Audit Readiness Score */}
      <div className="bg-navy rounded-[40px] p-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-white/5 -skew-x-12 translate-x-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-4 max-w-lg">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-teal text-white rounded-full text-[11px] font-black uppercase tracking-widest border border-teal/30 shadow-lg shadow-teal/20">
              <ShieldCheck size={14} /> DOT Audit Readiness: HIGH
            </div>
            <h2 className="text-4xl font-black tracking-tight leading-tight">Your fleet is audit-ready and compliant.</h2>
            <p className="text-white/90 text-[15px] font-medium leading-relaxed">All Driver Qualification Files (DQF), HOS logs, and maintenance records are up-to-date. We have verified MCS-150 and MCS-90 records for this period.</p>
            <div className="flex gap-4 pt-4">
              <button 
                onClick={handleAuditExport}
                disabled={auditExporting}
                className="px-8 py-4 bg-teal text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-teal/20 hover:scale-105 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50 disabled:scale-100"
              >
                {auditExporting ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Activity size={16} />
                  </motion.div>
                ) : (
                  <Download size={16} />
                )}
                Generate DOT Audit Package
              </button>
              <button 
                onClick={handleMockAudit}
                disabled={isAuditing}
                className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-white/10 transition-all flex items-center gap-2"
              >
                {isAuditing && (
                   <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <Activity size={14} />
                   </motion.div>
                )}
                {isAuditing ? 'Auditing...' : 'Run Internal Mock Audit'}
              </button>
            </div>
          </div>
          <div className="flex-shrink-0 relative">
             <div className="w-48 h-48 rounded-full border-8 border-teal/20 flex items-center justify-center relative">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                   <circle 
                     cx="96" cy="96" r="88" 
                     fill="none" 
                     stroke="currentColor" 
                     strokeWidth="8" 
                     className="text-teal"
                     strokeDasharray="552.92"
                     strokeDashoffset="27.65" 
                   />
                </svg>
                <div className="text-center">
                   <p className="text-5xl font-black">95%</p>
                   <p className="text-[12px] font-bold text-white/70 uppercase tracking-widest">Compliance</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Critical Checkpoints */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="tms-card p-6 border-l-4 border-teal">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Driver Files</span>
            <ShieldCheck size={16} className="text-teal" />
          </div>
          <h4 className="text-lg font-black text-navy">DQF Management</h4>
          <p className="text-xs text-slate-600 mt-2 font-medium">All 14 drivers have current MVRs, Medical Cards, and applications on file.</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal w-full" />
            </div>
            <span className="text-[11px] font-bold text-navy">100%</span>
          </div>
        </div>
        <div className="tms-card p-6 border-l-4 border-teal">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">HOS Audit</span>
            <ShieldCheck size={16} className="text-teal" />
          </div>
          <h4 className="text-lg font-black text-navy">Weekly ELD Reviews</h4>
          <p className="text-xs text-slate-600 mt-2 font-medium">Log audits for current cycle complete. 0 violations identified in last 7 days.</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-teal w-[98%]" />
            </div>
            <span className="text-[11px] font-bold text-navy">98%</span>
          </div>
        </div>
        <div className="tms-card p-6 border-l-4 border-orange">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Drug & Alcohol</span>
            <AlertTriangle size={16} className="text-orange" />
          </div>
          <h4 className="text-lg font-black text-navy">Random Testing</h4>
          <p className="text-xs text-slate-600 mt-2 font-medium">Q2 Random selection in progress. 4 tests pending collection.</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-orange w-[75%]" />
            </div>
            <span className="text-[11px] font-bold text-navy">75%</span>
          </div>
        </div>
      </div>

      {/* Unified Fleet Compliance "Needs Attention" Sync Hub */}
      {(() => {
        const driversWithIssues = drivers.map(d => ({
          driver: d,
          comp: getDriverCompliance(d)
        })).filter(x => x.comp.status !== 'Compliant');

        const trucksWithIssues = trucks.map(t => ({
          truck: t,
          comp: getTruckCompliance(t)
        })).filter(x => x.comp.status !== 'Compliant');

        const totalAttentionAssets = driversWithIssues.length + trucksWithIssues.length;

        return (
          <div className="tms-card overflow-hidden border-l-4 border-red-500 bg-white">
             <div className="p-6 border-b border-slate-100 bg-red-50/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                   <h3 className="text-sm font-black text-red-700 uppercase tracking-widest flex items-center gap-2">
                     <AlertTriangle size={18} className="text-red-500 animate-pulse" /> Unified FMCSA Compliance Sync Hub
                   </h3>
                   <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">Real-time safety checkpoints & missing documentation sync</p>
                </div>
                <div className="px-3.5 py-1.5 bg-red-100/70 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                   <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                   {totalAttentionAssets} {totalAttentionAssets === 1 ? 'Asset Needs Action' : 'Assets Need Action'}
                </div>
             </div>

             <div className="p-0">
                {totalAttentionAssets === 0 ? (
                  <div className="p-10 text-center bg-slate-50/30 flex flex-col items-center">
                     <ShieldCheck size={40} className="text-teal mb-3" />
                     <p className="text-sm font-black text-navy uppercase tracking-widest">Fleet Compliance fully Cleared</p>
                     <p className="text-xs text-slate-500 font-bold uppercase mt-1">No warnings, expirations, or unassigned records found across all drivers and trailer assets.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                     {/* Driver Audit Synced Sections */}
                     {driversWithIssues.map(({ driver, comp }) => (
                       <div key={driver.id} className="p-6 hover:bg-slate-50/40 transition-colors flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
                          <div className="space-y-3.5 flex-1 min-w-0">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center font-black text-xs shrink-0 font-sans shadow-md">
                                   {driver.name.split(' ').map(n=>n[0]).join('')}
                                </div>
                                <div className="min-w-0">
                                   <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-black text-navy-dark uppercase tracking-tight truncate">{driver.name}</span>
                                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-navy/10 text-navy font-mono uppercase tracking-widest">Driver Profile</span>
                                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-red-100 text-red-700 uppercase tracking-widest">
                                        Safety Score: {comp.score}
                                      </span>
                                   </div>
                                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Assigned Tractor ID: {driver.truckId ? `Unit #${trucks.find(t=>t.id === driver.truckId)?.unitNumber || driver.truckId}` : 'None Assigned'}</p>
                                </div>
                             </div>

                             {/* Specific details of warnings */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 pl-1">
                                {comp.issues.map((issue, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-[11px] p-2 bg-slate-50/50 rounded-lg border border-slate-100 min-w-0">
                                     <AlertTriangle size={12} className={`shrink-0 mt-0.5 ${issue.severity === 'critical' ? 'text-red' : 'text-orange'}`} />
                                     <div className="min-w-0 text-left">
                                        <p className="font-extrabold text-slate-800 leading-tight truncate">{issue.message}</p>
                                        <p className="text-[9.5px] text-slate-500 font-bold mt-0.5 leading-normal">{issue.details}</p>
                                     </div>
                                  </div>
                                ))}
                             </div>
                          </div>

                          <div className="flex flex-col lg:flex-col gap-2 shrink-0 w-full lg:w-auto mt-2 lg:mt-0 justify-end">
                             <button
                                onClick={() => {
                                  setNavigationIntent({ view: 'assets', action: 'edit_driver', driverId: driver.id, tab: 'dossier' });
                                }}
                                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 hover:border-navy text-navy font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                             >
                               <FileText size={12} /> Resolve Issue
                             </button>
                             <span className={`px-3 py-1.5 text-center text-[9px] font-black uppercase tracking-widest rounded-xl ${
                                comp.status === 'Needs Attention' ? 'bg-red-50 text-red' : 'bg-orange/10 text-orange'
                             }`}>
                                {comp.status}
                             </span>
                          </div>
                       </div>
                     ))}

                     {/* Unit Audit Synced Sections */}
                     {trucksWithIssues.map(({ truck, comp }) => {
                       const isTrailer = truck.type.toLowerCase().includes('trailer') || truck.type.toLowerCase().includes('van') || truck.type.toLowerCase().includes('reefer') || truck.type.toLowerCase().includes('flatbed');
                       return (
                         <div key={truck.id} className="p-6 hover:bg-slate-50/40 transition-colors flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
                            <div className="space-y-3.5 flex-1 min-w-0">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-teal flex items-center justify-center shrink-0 shadow-sm relative">
                                     <Truck size={20} />
                                  </div>
                                  <div className="min-w-0 text-left">
                                     <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-black text-navy-dark uppercase tracking-tight">Unit {truck.unitNumber}</span>
                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-teal/10 text-teal font-mono uppercase tracking-widest">{isTrailer ? 'Trailer' : 'Power Unit'}</span>
                                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-teal text-white uppercase tracking-widest font-mono">
                                          Score: {comp.score}
                                        </span>
                                     </div>
                                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{truck.makeModel} · State Registration Expiry: {truck.registrationExpiry || 'Not set'}</p>
                                  </div>
                               </div>

                               {/* Specific details of warnings */}
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 pl-1">
                                  {comp.issues.map((issue, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-[11px] p-2 bg-slate-50/50 rounded-lg border border-slate-100 min-w-0">
                                       <AlertTriangle size={12} className={`shrink-0 mt-0.5 ${issue.severity === 'critical' ? 'text-red' : 'text-orange'}`} />
                                       <div className="min-w-0 text-left">
                                          <p className="font-extrabold text-slate-800 leading-tight truncate">{issue.message}</p>
                                          <p className="text-[9.5px] text-slate-500 font-bold mt-0.5 leading-normal">{issue.details}</p>
                                       </div>
                                    </div>
                                  ))}
                               </div>
                            </div>

                            <div className="flex flex-col lg:flex-col gap-2 shrink-0 w-full lg:w-auto mt-2 lg:mt-0 justify-end">
                               <button
                                  onClick={() => {
                                    setNavigationIntent({ view: 'assets', action: 'edit_truck', truckId: truck.id, tab: 'specs' });
                                  }}
                                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 hover:border-navy text-navy font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                               >
                                 <Activity size={12} /> Resolve Issue
                               </button>
                               <span className={`px-3 py-1.5 text-center text-[9px] font-black uppercase tracking-widest rounded-xl ${
                                  comp.status === 'Needs Attention' ? 'bg-red-50 text-red font-bold' : 'bg-orange/10 text-orange font-bold'
                                }`}>
                                  {comp.status}
                               </span>
                            </div>
                         </div>
                       );
                     })}
                  </div>
                )}
             </div>
          </div>
        );
      })()}

      {/* Audit Readiness Checklist */}
      <div className="tms-card overflow-hidden">
         <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
              <ClipboardCheck size={18} className="text-teal" /> Essential Record Keeping Log
            </h3>
            <div className="flex items-center gap-4">
              <span className="text-[11px] font-bold text-slate-500">Total Records: 48,201</span>
              <button 
                onClick={triggerUpload}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-navy transition-all flex items-center gap-2"
              >
                <Plus size={14} /> Upload Record
              </button>
            </div>
         </div>
         <div className="p-0">
            <table className="w-full text-left">
               <thead className="bg-slate-50 text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">
                  <tr>
                     <th className="p-6">Record Category</th>
                     <th className="p-6">Retention Proof</th>
                     <th className="p-6">Next Required Action</th>
                     <th className="p-6">Safety Status</th>
                  </tr>
               </thead>
               <tbody className="text-xs divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/50 transition-colors">
                     <td className="p-6">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-teal/10 text-teal flex items-center justify-center"><FileText size={16} /></div>
                           <div>
                              <p className="font-bold text-navy-dark">DQ Files (All Drivers)</p>
                              <p className="text-[11px] text-slate-500 font-medium">Application, MVR, Med Card</p>
                           </div>
                        </div>
                     </td>
                     <td className="p-6 font-semibold text-slate-700 italic">Continuous Preservation</td>
                     <td className="p-6 font-medium text-navy">Annual MVR due in 12 days</td>
                     <td className="p-6">
                        <button 
                          onClick={() => handleActionStub('Verify DQ Files')}
                          className="text-teal font-black uppercase text-[11px] hover:underline"
                        >
                          VERIFIED
                        </button>
                     </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                     <td className="p-6">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-orange/10 text-orange flex items-center justify-center"><Calendar size={16} /></div>
                           <div>
                              <p className="font-bold text-navy-dark">HOS Logs (Last 6 Mo)</p>
                              <p className="text-[11px] text-slate-500 font-medium">ELD Records + Receipts</p>
                           </div>
                        </div>
                     </td>
                     <td className="p-6 font-semibold text-slate-700 italic">Retained since 2023-11-01</td>
                     <td className="p-6 font-medium text-navy">Weekly log audit cycle</td>
                     <td className="p-6">
                        <button 
                          onClick={() => handleActionStub('Audit HOS Status')}
                          className="text-teal font-black uppercase text-[11px] hover:underline"
                        >
                          VERIFIED
                        </button>
                     </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                     <td className="p-6">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-navy/5 text-navy flex items-center justify-center"><Truck size={16} /></div>
                           <div>
                              <p className="font-bold text-navy-dark">Maintenance (12 Mo)</p>
                              <p className="text-[11px] text-slate-500 font-medium">DVIRs + Periodic Inspections</p>
                           </div>
                        </div>
                     </td>
                     <td className="p-6 font-semibold text-slate-700 italic">Complete Service Log</td>
                     <td className="p-6 font-medium text-navy">Unit #102 Annual due today</td>
                     <td className="p-6">
                        <button 
                          onClick={() => handleActionStub('Schedule Maintenance Action')}
                          className="text-orange font-black uppercase text-[11px] hover:underline"
                        >
                          ACTION REQ
                        </button>
                     </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                     <td className="p-6">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center"><AlertTriangle size={16} /></div>
                           <div>
                              <p className="font-bold text-navy-dark">Accident Register (3 Yr)</p>
                              <p className="text-[11px] text-slate-500 font-medium">DOT Recordable Crash Log</p>
                           </div>
                        </div>
                     </td>
                     <td className="p-6 font-semibold text-slate-700 italic">No recordable crashes</td>
                     <td className="p-6 font-medium text-navy">No pending investigations</td>
                     <td className="p-6">
                        <button 
                          onClick={() => handleActionStub('Verify Accident Registry')}
                          className="text-teal font-black uppercase text-[11px] hover:underline"
                        >
                          VERIFIED
                        </button>
                     </td>
                  </tr>
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );

  const renderGeneralTab = () => (
    <div className="space-y-8">
      {/* Carrier Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
           <div className="w-12 h-12 rounded-2xl bg-navy/5 text-navy flex items-center justify-center">
             <Briefcase size={24} />
           </div>
           <div>
             <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">DOT Number</p>
             <p className="text-xl font-black text-navy">{carrierCompliance.dotNumber}</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
           <div className="w-12 h-12 rounded-2xl bg-navy/5 text-navy flex items-center justify-center">
             <Activity size={24} />
           </div>
           <div>
             <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">MC Number</p>
             <p className="text-xl font-black text-navy">{carrierCompliance.mcNumber}</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${carrierCompliance.safetyRating === 'Satisfactory' ? 'bg-teal/10 text-teal' : 'bg-orange/10 text-orange'}`}>
             <ShieldCheck size={24} />
           </div>
           <div>
             <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Safety Rating</p>
             <p className="text-xl font-black text-navy">{carrierCompliance.safetyRating}</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
           <div className="w-12 h-12 rounded-2xl bg-teal/10 text-teal flex items-center justify-center">
             <ClipboardCheck size={24} />
           </div>
           <div>
             <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">BOC-3 Status</p>
             <p className="text-xl font-black text-navy">{carrierCompliance.boc3Status}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="tms-card">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-1 items-start">
             <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
               <ShieldCheck size={18} className="text-teal" /> MC/DOT Operations (MCS-150)
             </h3>
             <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tighter">Required Update Frequency: Biennial (Every 2 Years)</p>
          </div>
          <div className="p-6 space-y-4">
             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                   <p className="text-xs font-bold text-navy-dark">MCS-150 Registration Status</p>
                   <p className="text-[11px] text-slate-500 font-medium">Last Filed: {carrierCompliance.mcs150Date}</p>
                </div>
                <div className="text-right">
                   <button 
                     onClick={() => handleActionStub('MCS-150 Update')}
                     className="px-3 py-1 bg-teal/10 text-teal rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-teal hover:text-white transition-all active:scale-95"
                   >
                     CURRENT
                   </button>
                </div>
             </div>
             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                   <p className="text-xs font-bold text-navy-dark">Unified Carrier Registration</p>
                   <p className="text-[11px] text-slate-500 font-medium">2024 UCR Filing</p>
                </div>
                <button 
                   onClick={() => handleActionStub('UCR Filing Status')}
                   className={`px-3 py-1 rounded-full ${carrierCompliance.ucrRegistered ? 'bg-teal/10 text-teal' : 'bg-red-100 text-red-500'} text-[11px] font-black uppercase tracking-widest hover:brightness-95 transition-all active:scale-95`}
                >
                   {carrierCompliance.ucrRegistered ? 'REGISTERED' : 'PENDING'}
                </button>
             </div>
             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                   <p className="text-xs font-bold text-navy-dark">IFTA / Fuel Tax</p>
                   <p className="text-[11px] text-slate-500 font-medium">Quarterly filings up to date</p>
                </div>
                <button 
                  onClick={() => handleActionStub('IFTA Status Details')}
                  className="px-3 py-1 rounded-full bg-teal/10 text-teal text-[11px] font-black uppercase tracking-widest hover:bg-teal hover:text-white transition-all active:scale-95"
                >
                  {carrierCompliance.iftaStatus}
                </button>
             </div>
          </div>
        </div>

        <div className="tms-card">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-1 items-start">
             <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
               <FileCheck size={18} className="text-orange" /> Insurance & Proof (MCS-90)
             </h3>
             <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tighter">Must be maintained for DOT Public Liability</p>
          </div>
          <div className="p-6 space-y-4">
             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-navy shadow-sm">
                      <FileText size={20} />
                   </div>
                   <div>
                      <p className="text-xs font-bold text-navy-dark">Form BMC-91X (Liability / Umbrella)</p>
                      <p className="text-[11px] text-slate-600 font-medium">Expires: {carrierCompliance.insuranceExpiry}</p>
                   </div>
                </div>
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleActionStub('View BMC-91X')}
                      className="px-3 py-1 rounded-full bg-teal/10 text-teal text-[11px] font-black uppercase tracking-widest hover:bg-teal hover:text-white transition-all active:scale-95"
                    >
                      ACTIVE
                    </button>
                    <button 
                       onClick={triggerUpload}
                       className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-navy transition-all"
                       title="Upload New Certificate"
                    >
                       <Upload size={14} />
                    </button>
                    <button 
                       onClick={() => handleActionStub('Archive Insurance Doc')}
                       className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-all"
                       title="Remove/Archive"
                    >
                       <Trash2 size={14} />
                    </button>
                 </div>
             </div>
             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-navy shadow-sm">
                      <FileText size={20} />
                   </div>
                   <div>
                      <p className="text-xs font-bold text-navy-dark">Cargo Insurance (MCS-90 Form)</p>
                      <p className="text-[11px] text-slate-600 font-medium">Expires: {carrierCompliance.cargoInsuranceExpiry}</p>
                   </div>
                </div>
                <button 
                  onClick={() => handleActionStub('View MCS-90')}
                  className="px-3 py-1 rounded-full bg-teal/10 text-teal text-[11px] font-black uppercase tracking-widest hover:bg-teal hover:text-white transition-all active:scale-95"
                >
                  ACTIVE
                </button>
             </div>
          </div>
        </div>
      </div>
      
      <div className="tms-card">
         <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" /> 3-Year Accident Register (49 CFR 390.15)
            </h3>
            <div className="flex gap-3">
              <button 
                onClick={triggerUpload}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black uppercase tracking-widest hover:border-navy transition-all"
              >
                Upload Document
              </button>
              <button 
                onClick={() => handleActionStub('Add Accident Record')}
                className="px-4 py-2 bg-navy text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-navy-light transition-all shadow-md active:scale-95"
              >
                Add Accident Record
              </button>
            </div>
         </div>
         <div className="p-12 text-center">
            <ShieldCheck size={48} className="mx-auto mb-4 text-slate-200" />
            <p className="text-sm font-black text-navy-dark uppercase tracking-widest">No DOT Recordable Accidents Found</p>
            <p className="text-xs mt-2 text-slate-600 font-medium italic">Accident register must be maintained for 3 years even if empty.</p>
         </div>
      </div>
    </div>
  );

  const renderHOSTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <p className="text-[11px] font-black text-slate-500 tracking-widest uppercase mb-1">ELD Audit Status</p>
          <p className="text-base font-black text-navy mb-4">WEEKLY AUDIT COMPLETE</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
             <div className="bg-teal h-full w-full" />
          </div>
          <p className="text-[10px] text-slate-600 mt-2 font-bold uppercase">Cycle Ends: Sun 11:59 PM</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <p className="text-[11px] font-black text-slate-500 tracking-widest uppercase mb-1">Unassigned Mileage</p>
          <p className="text-2xl font-black text-navy">12.4 mi</p>
          <p className="text-[10px] text-orange-600 mt-2 font-bold uppercase">REQUIRES ANNOTATION</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <p className="text-[11px] font-black text-slate-500 tracking-widest uppercase mb-1">Supporting Docs</p>
          <p className="text-2xl font-black text-navy">42/42</p>
          <p className="text-[10px] text-teal mt-2 font-bold uppercase">Tolls & Fuel Matched</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <p className="text-[11px] font-black text-slate-500 tracking-widest uppercase mb-1">Log Retention</p>
          <p className="text-2xl font-black text-navy">180 Days</p>
          <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-tight">Full Archive On-site</p>
        </div>
      </div>

      <div className="tms-card">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
           <h3 className="text-sm font-black text-navy uppercase tracking-widest">Electronic Logging Device (ELD) - Fleet Grid</h3>
           <div className="flex gap-2">
              <button 
                onClick={() => handleActionStub('Audit Annotations')}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-black uppercase tracking-widest hover:border-navy hover:text-navy transition-all shadow-sm active:scale-95"
              >
                Audit Annotations
              </button>
              <button 
                onClick={() => handleActionStub('Export RODS')}
                className="px-4 py-2 bg-navy text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-navy-light transition-all shadow-md active:scale-95"
              >
                Export RODS
              </button>
           </div>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full">
              <thead className="bg-slate-50 text-[11px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-100">
                 <tr>
                    <th className="p-6 text-left">Driver Name</th>
                    <th className="p-6 text-left">Status</th>
                    <th className="p-6 text-left">Log Date</th>
                    <th className="p-6 text-left">Driving Time</th>
                    <th className="p-6 text-left">ELD Malfunction</th>
                    <th className="p-6 text-right">Violation Scan</th>
                 </tr>
              </thead>
              <tbody className="text-xs">
                 {drivers.map(d => (
                   <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50 transition-all">
                      <td className="p-6 font-bold text-navy-dark">{d.name}</td>
                      <td className="p-6">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${d.hosDutyStatus === 'Driving' ? 'bg-teal/5 text-teal border-teal/10' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                           {d.hosDutyStatus}
                        </span>
                      </td>
                      <td className="p-6 text-slate-500 font-mono">2024-05-18</td>
                      <td className="p-6 font-bold text-navy">{d.hosAvailable} Left</td>
                      <td className="p-6"><span className="text-teal font-black">NONE</span></td>
                      <td className="p-6 text-right">
                         {d.hosViolations ? (
                            <span className="text-red-500 font-black flex items-center justify-end gap-1"><AlertTriangle size={14} /> {d.hosViolations} FOUND</span>
                         ) : (
                            <span className="text-teal font-black flex items-center justify-end gap-1"><ShieldCheck size={14} /> CLEAN</span>
                         )}
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );

  const renderDrugAlcoholTab = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="tms-card">
           <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
                <Stethoscope size={18} className="text-teal" /> FMCSA Clearinghouse Compliance
              </h3>
           </div>
           <div className="p-8 space-y-6">
              <div className="flex items-center justify-between p-4 bg-teal/5 border border-teal/10 rounded-2xl">
                 <div>
                    <p className="text-sm font-black text-teal">Annual Query Status (49 CFR 382.701)</p>
                    <p className="text-xs text-teal-dark/60 font-medium">All drivers queried in last 12 months</p>
                 </div>
                 <ShieldCheck size={32} className="text-teal" />
              </div>
              <div className="space-y-4">
                 <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600 uppercase tracking-widest text-[11px]">Pre-employment Screening</span>
                    <button 
                      onClick={() => handleActionStub('PSP Screening Records')}
                      className="text-teal font-black uppercase hover:underline"
                    >
                      MANDATORY COMPLETE
                    </button>
                 </div>
                 <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600 uppercase tracking-widest text-[11px]">Random Pool Provider</span>
                    <span className="text-navy">Standard Compliance Group (SCG)</span>
                 </div>
                 <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600 uppercase tracking-widest text-[11px]">Testing Pool Frequency</span>
                    <span className="text-navy">Quarterly</span>
                 </div>
              </div>
           </div>
        </div>

        <div className="tms-card">
           <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
                <Activity size={18} className="text-orange" /> Random Selection Quota Center
              </h3>
           </div>
           <div className="p-8">
              <div className="space-y-8">
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Drug Testing Progress (50% Requirement)</span>
                       <span className="text-xs font-black text-navy">12/24 Employees Tested</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                       <div className="bg-teal h-full w-[50%]" />
                    </div>
                 </div>
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Alcohol Testing Progress (10% Requirement)</span>
                       <span className="text-xs font-black text-navy">3/5 Employees Tested</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                       <div className="bg-orange h-full w-[60%]" />
                    </div>
                 </div>
                 <div className="p-4 bg-navy text-white rounded-2xl text-center">
                    <p className="text-[11px] font-black uppercase tracking-widest leading-loose">Currently Enrolled: 24 active commercial drivers in verified random pool.</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="tms-card">
         <div className="p-6 border-b border-slate-100">
            <h3 className="text-sm font-black text-navy uppercase tracking-widest">Drug & Alcohol Retention Register (Last 5 Years)</h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full">
               <thead className="bg-slate-50 text-[11px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-100">
                  <tr>
                     <th className="p-6 text-left">Driver Name</th>
                     <th className="p-6 text-left">Clearance Reason</th>
                     <th className="p-6 text-left">Test Date</th>
                     <th className="p-6 text-left">Verification Status</th>
                     <th className="p-6 text-right">Officer Copy</th>
                  </tr>
               </thead>
               <tbody className="text-xs">
                  {drivers.map(d => (
                    <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                       <td className="p-6 font-bold text-navy-dark">{d.name}</td>
                       <td className="p-6 text-slate-600 uppercase text-[11px] font-black tracking-tighter">{d.drugTestDate ? 'RANDOM SELECTION' : 'PRE-EMPLOYMENT'}</td>
                       <td className="p-6 text-slate-600 font-mono italic">{d.drugTestDate || '2023-11-12'}</td>
                       <td className="p-6">
                          <div className="flex items-center gap-2 text-teal font-black uppercase text-[10px] tracking-widest">
                             <ShieldCheck size={12} /> NEGATIVE RESULT
                          </div>
                       </td>
                       <td className="p-6">
                           <div className="flex items-center gap-2">
                             <button 
                               onClick={() => handleActionStub(`Edit Test Record for ${d.name}`)}
                               className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-navy transition-all"
                               title="Edit"
                             >
                                <Edit size={14} />
                             </button>
                             <button 
                               onClick={triggerUpload}
                               className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-navy transition-all"
                               title="Upload New Certificate"
                             >
                                <Upload size={14} />
                             </button>
                             <button 
                               onClick={() => handleActionStub(`Download Test Result for ${d.name}`)}
                               className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-navy transition-all"
                               title="Download PDF"
                             >
                                <Download size={14} />
                             </button>
                             <button 
                               onClick={() => handleActionStub(`Remove Drug/Alcohol Record for ${d.name}`)}
                               className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-all"
                               title="Remove Record"
                             >
                                <Trash2 size={14} />
                             </button>
                           </div>
                        </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );

  const renderDQFTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
          <input 
            type="text" 
            placeholder="Search Driver Files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-navy transition-all"
          />
        </div>
        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-350px)]">
           {filteredDrivers.map(d => (
             <button 
               key={d.id}
               onClick={() => setSelectedDriver(d)}
               className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center justify-between group ${selectedDriver?.id === d.id ? 'bg-navy border-navy text-white shadow-lg' : 'bg-white border-slate-100 hover:border-navy/20'}`}
             >
               <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[11px] ${selectedDriver?.id === d.id ? 'bg-white text-navy' : 'bg-slate-100 text-slate-600'}`}>
                    {d.name.split(' ').map(n=>n[0]).join('')}
                  </div>
                  <div>
                    <p className={`text-[12px] font-black uppercase tracking-tight ${selectedDriver?.id === d.id ? 'text-white' : 'text-navy-dark'}`}>{d.name}</p>
                    <p className={`text-[11px] font-bold ${selectedDriver?.id === d.id ? 'text-white/70' : 'text-slate-500'}`}>CDL Exp: {d.cdlExpiry || 'N/A'}</p>
                  </div>
               </div>
               <ChevronRight size={14} className={selectedDriver?.id === d.id ? 'text-white' : 'text-slate-500 group-hover:text-navy'} />
             </button>
           ))}
        </div>
      </div>

      <div className="lg:col-span-3">
        {selectedDriver ? (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="tms-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-navy to-navy-light text-white border-none shadow-xl">
               <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-white text-navy flex items-center justify-center text-2xl font-black shadow-xl">
                    {selectedDriver.name.split(' ').map(n=>n[0]).join('')}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">{selectedDriver.name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-widest bg-teal text-white shadow-sm`}>
                        DQF COMPLIANT
                      </span>
                      <span className="text-white/90 text-sm font-bold uppercase tracking-tighter">CLASS {selectedDriver.cdlClass} · ENDORSEMENTS: {selectedDriver.endorsements.join(', ')}</span>
                    </div>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleActionStub('Edit Driver Profile')}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[11px] font-black uppercase tracking-widest backdrop-blur-sm transition-all border border-white/10 active:scale-95"
                  >
                    Edit Profile
                  </button>
                  <button 
                    onClick={triggerUpload}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[11px] font-black uppercase tracking-widest backdrop-blur-sm transition-all border border-white/10 active:scale-95"
                  >
                    Upload File
                  </button>
                  <button 
                    onClick={() => handleActionStub('Download Full DQF')}
                    className="p-3 bg-white text-navy rounded-xl shadow-lg hover:scale-110 transition-all active:scale-95"
                  >
                    <Download size={18} />
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="tms-card">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <h4 className="text-[11px] font-black text-navy uppercase tracking-widest">Required DQ Documents</h4>
                  </div>
                  <div className="p-6 space-y-3">
                     {getDriverMergedDocs(selectedDriver).map((doc, idx) => (
                       <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-dotted border-slate-200">
                         <div>
                            <p className="text-xs font-bold text-navy-dark">{doc.name}</p>
                            <p className="text-[11px] text-slate-600 font-bold">Record Date: {doc.date}</p>
                         </div>
                         <div className="flex items-center gap-2">
                            <button 
                               onClick={() => handleActionStub(`Verify ${doc.name}`)}
                               className="text-[11px] font-black text-teal uppercase hover:underline"
                             >
                               {doc.status}
                             </button>
                            <button 
                               onClick={triggerUpload}
                               className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-navy transition-all"
                               title="Upload Update"
                            >
                               <Upload size={14} />
                            </button>
                            <button 
                               onClick={() => handleRemoveDoc('driver', selectedDriver.id, doc.name)}
                               className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-all"
                               title="Remove / Archive"
                            >
                               <Trash2 size={14} />
                            </button>
                         </div>
                       </div>
                     ))}
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="tms-card">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                      <h4 className="text-[11px] font-black text-navy uppercase tracking-widest">License Detail</h4>
                    </div>
                    <div className="p-6 space-y-4">
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600">License Number</span>
                          <span className="text-sm font-black text-navy">****7721</span>
                       </div>
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600">State of Issue</span>
                          <span className="text-sm font-black text-navy">IL</span>
                       </div>
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600">CDL Expiration</span>
                          <span className={`text-sm font-black ${selectedDriver.cdlExpiry ? 'text-navy' : 'text-red-600'}`}>{selectedDriver.cdlExpiry || 'MISSING'}</span>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          </motion.div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 min-h-[400px]">
             <User size={48} className="text-slate-200 mb-4" />
             <h3 className="text-sm font-black text-navy uppercase tracking-widest">Select a Driver File</h3>
             <p className="text-xs text-slate-600 mt-1 uppercase font-bold tracking-tight">Access full DQF and hiring records</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderMaintenanceTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* ... keeping the truck selection logic ... */}
      <div className="lg:col-span-1 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Search Units..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-navy transition-all"
          />
        </div>
        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-350px)]">
           {filteredTrucks.map(t => (
             <button 
               key={t.id}
               onClick={() => setSelectedTruck(t)}
               className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center justify-between group ${selectedTruck?.id === t.id ? 'bg-navy border-navy text-white shadow-lg' : 'bg-white border-slate-100 hover:border-navy/20'}`}
             >
               <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${selectedTruck?.id === t.id ? 'bg-white text-navy' : 'bg-slate-100 text-slate-600'}`}>
                    <Truck size={20} />
                  </div>
                  <div>
                    <p className={`text-[12px] font-black uppercase tracking-tight ${selectedTruck?.id === t.id ? 'text-white' : 'text-navy-dark'}`}>Unit {t.unitNumber}</p>
                    <p className={`text-[10px] font-bold ${selectedTruck?.id === t.id ? 'text-white/70' : 'text-slate-500'}`}>{t.makeModel}</p>
                  </div>
               </div>
               <ChevronRight size={14} className={selectedTruck?.id === t.id ? 'text-white' : 'text-slate-400 group-hover:text-navy'} />
             </button>
           ))}
        </div>
      </div>

      <div className="lg:col-span-3">
        {selectedTruck ? (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="tms-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-teal to-teal-light text-white border-none py-10 px-8">
               <div className="flex items-center gap-8">
                  <div className="w-20 h-20 rounded-3xl bg-white text-teal flex items-center justify-center shadow-2xl rotate-3">
                    <Truck size={40} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter">Unit {selectedTruck.unitNumber}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-white text-teal`}>
                        INSPECTION CURRENT
                      </span>
                      <span className="text-white/70 text-xs font-bold uppercase tracking-widest">{selectedTruck.makeModel}</span>
                    </div>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <button 
                    onClick={triggerUpload}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[11px] font-black uppercase tracking-widest backdrop-blur-sm transition-all border border-white/10 active:scale-95"
                  >
                    Upload Record
                  </button>
                  <button 
                    onClick={() => handleActionStub('New Maintenance Log')}
                    className="px-6 py-3 bg-white text-teal rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all active:scale-95"
                  >
                    New Maintenance Log
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="tms-card">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <h4 className="text-[10px] font-black text-navy uppercase tracking-widest">Equipment Records</h4>
                  </div>
                  <div className="p-6 space-y-4">
                     {getTruckMergedDocs(selectedTruck).map((doc, idx) => (
                       <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div>
                             <p className="text-xs font-bold text-navy-dark">{doc.name}</p>
                             <p className="text-[10px] text-slate-500 font-normal font-mono">Info: {doc.date}</p>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="px-3 py-1 bg-teal/10 text-teal rounded-full text-[10px] font-black uppercase tracking-widest">{doc.status}</span>
                             <button 
                                onClick={() => startUpload('truck', selectedTruck.id, doc.name)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-navy transition-all active:scale-95"
                                title="Upload Certificate"
                             >
                                <Upload size={14} />
                             </button>
                             <button 
                                onClick={() => handleRemoveDoc('truck', selectedTruck.id, doc.name)}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-all active:scale-95"
                                title="Delete/Remove File"
                             >
                                <Trash2 size={14} />
                             </button>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>

               <div className="tms-card">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <h4 className="text-[10px] font-black text-navy uppercase tracking-widest">Maintenance History</h4>
                  </div>
                  <div className="p-6 space-y-3">
                     {[
                       { date: '2024-04-12', task: 'Brake Adjustment & Lining Inspection', cost: '$450.00' },
                       { date: '2024-03-01', task: 'Full PM Service (Oil, Filters, Lube)', cost: '$820.00' },
                       { date: '2024-01-15', task: 'Tire Replacement (Drive Axle 2)', cost: '$1,200.00' }
                     ].map((log, idx) => (
                       <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                         <div>
                            <p className="text-xs font-bold text-navy-dark">{log.task}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{log.date}</p>
                         </div>
                                                   <div className="flex items-center gap-3">
                             <span className="text-[11px] font-black text-navy">{log.cost}</span>
                             <button 
                                onClick={triggerUpload}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-navy transition-all"
                                title="Upload Receipt"
                             >
                                <Upload size={14} />
                             </button>
                             <button 
                                onClick={() => handleActionStub('Remove Log Entry')}
                                className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-all"
                                title="Delete Log"
                             >
                                <Trash2 size={14} />
                             </button>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          </motion.div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 min-h-[400px]">
             <Truck size={48} className="text-slate-200 mb-4" />
             <h3 className="text-sm font-black text-navy uppercase tracking-widest">Equipment Compliance</h3>
             <p className="text-xs text-slate-400 mt-1">Select a unit to view maintenance logs and inspection certificates</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-navy tracking-tight uppercase">Audit & Compliance</h1>
          <p className="text-slate-600 font-bold uppercase tracking-widest text-[11px] mt-1">DOT Audit Readiness Control Center</p>
        </div>
        <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-1">
           {[
             { id: 'Readiness', label: 'Audit Readiness' },
             { id: 'General', label: 'General / Insurance' },
             { id: 'DQF', label: 'Driver Files (DQF)' },
             { id: 'HOS', label: 'HOS & ELD Audit' },
             { id: 'Maintenance', label: 'Asset Maintenance' },
             { id: 'DrugAlcohol', label: 'Drug & Alcohol' },
             { id: 'Hazmat', label: 'Hazmat PHMSA' }
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => {
                 setActiveTab(tab.id as ComplianceTab);
                 setSearchTerm('');
                 setSelectedDriver(null);
                 setSelectedTruck(null);
               }}
               className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-navy text-white shadow-lg' : 'text-slate-500 hover:text-navy hover:bg-slate-50'}`}
             >
               {tab.label}
             </button>
           ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }}
           transition={{ duration: 0.2 }}
        >
          {activeTab === 'Readiness' && renderReadinessTab()}
          {activeTab === 'General' && renderGeneralTab()}
          {activeTab === 'DQF' && renderDQFTab()}
          {activeTab === 'HOS' && renderHOSTab()}
          {activeTab === 'Maintenance' && renderMaintenanceTab()}
          {activeTab === 'DrugAlcohol' && renderDrugAlcoholTab()}
          {activeTab === 'Hazmat' && (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[40px] border border-slate-100 text-center shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8">
                  <span className="px-4 py-1.5 bg-teal text-white rounded-full text-[11px] font-black uppercase tracking-widest">VALID THROUGH 2026</span>
               </div>
               <div className="w-24 h-24 bg-orange/10 rounded-[30px] flex items-center justify-center text-orange mb-8 rotate-6">
                  <ShieldCheck size={48} />
               </div>
               <h2 className="text-3xl font-black text-navy uppercase tracking-tight">PHMSA Hazardous Materials</h2>
               <p className="text-slate-600 max-w-sm mx-auto mt-4 text-sm font-semibold leading-relaxed">Your Hazardous Materials registration is active. Current safety plan and security protocols are verified as of May 1st, 2024.</p>
               <div className="mt-10 flex gap-4">
                  <button 
                    onClick={() => handleActionStub('Download PHMSA Certificate')}
                    className="px-10 py-5 bg-navy text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-navy/20 hover:scale-105 transition-all flex items-center gap-2 active:scale-95"
                  >
                    <Download size={16} /> PHMSA Registration Certificate
                  </button>
                  <button 
                    onClick={() => handleActionStub('View Hazmat Training Records')}
                    className="px-10 py-5 bg-white border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:border-navy hover:text-navy transition-all active:scale-95"
                  >
                    Hazmat Training Records
                  </button>
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange}
      />

      {/* Upload Overlay */}
      <AnimatePresence>
        {uploading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/80 backdrop-blur-md px-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white p-10 rounded-[40px] shadow-2xl text-center max-w-sm w-full"
            >
              <div className="relative w-16 h-16 mx-auto mb-6">
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  className="absolute inset-0 w-16 h-16 bg-teal/10 text-teal rounded-full flex items-center justify-center"
                >
                  <Upload size={32} />
                </motion.div>
              </div>
              <h3 className="text-xl font-black text-navy uppercase tracking-tight mb-2">Uploading File...</h3>
              <p className="text-slate-500 text-sm font-bold mb-6 truncate px-4">{uploading.id}</p>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-4 shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${uploading.progress}%` }}
                  className="h-full bg-teal shadow-lg shadow-teal/20" 
                />
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                <span className="text-teal font-black text-sm">{uploading.progress}%</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
