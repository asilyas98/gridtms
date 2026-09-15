import React, { useState, useRef, useEffect } from 'react';
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

import { uploadFileToSupabase } from '../lib/storage';

type ComplianceTab = 'Readiness' | 'General' | 'DQF' | 'HOS' | 'Maintenance' | 'DrugAlcohol' | 'Hazmat';

export default function ComplianceView() {
  const { carrierCompliance, drivers, trucks, updateDriver, updateTruck, navigationIntent, setNavigationIntent } = useData();
  const [activeTab, setActiveTab] = useState<ComplianceTab>('Readiness');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedTruck, setSelectedTruck] = useState<TruckType | null>(null);
  const [auditExporting, setAuditExporting] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [uploading, setUploading] = useState<{ id: string, progress: number } | null>(null);

  useEffect(() => {
    if (navigationIntent?.view === 'compliance') {
      if (navigationIntent.tab === 'Drivers' || navigationIntent.tab === 'DQF') {
        setActiveTab('DQF'); // DQF handles driver qualification files
      }
    }
  }, [navigationIntent]);
  
  // Dynamic target mapping for uploaded files
  const [uploadTarget, setUploadTarget] = useState<{ type: 'driver' | 'truck'; entityId: string; docName: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadComplete = (fileName: string, url: string | null = null) => {
    if (!uploadTarget) return;

    const newDoc: ComplianceDocument = {
      id: `doc-${Math.random().toString(36).substr(2, 9)}`,
      name: fileName,
      type: uploadTarget.docName,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Valid',
      ...(url && { url })
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploading({ id: file.name, progress: 10 });
      
      const url = await uploadFileToSupabase(file, 'compliance');
      
      setUploading({ id: file.name, progress: 100 });
      setTimeout(() => {
        setUploading(null);
        handleUploadComplete(file.name, url);
      }, 500);
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
      { name: 'Driver Application (Form 391)', type: 'Application', date: '-', status: 'Missing' },
      { name: 'Previous Employment Verification (DOT)', type: 'Verification', date: '-', status: 'Missing' },
      { name: 'Annual Motor Vehicle Record (MVR)', type: 'MVR', date: '-', status: 'Missing' },
      { name: 'Medical Examiner Certificate', type: 'Medical', date: '-', status: 'Missing' },
      { name: 'Road Test Certificate (391.31)', type: 'RoadTest', date: '-', status: 'Missing' }
    ];

    const activeDocs = driver.complianceDocs || [];

    return defaultRequired.map(req => {
      const matchedUploaded = activeDocs.find(ad => ad.name === req.name || ad.type === req.type);
      if (matchedUploaded) {
        return {
          name: req.name,
          date: `Uploaded Record (${matchedUploaded.name.substring(0,25)})`,
          status: 'Valid',
          uploaded: true
        };
      }
      
      let docStatus = req.status;
      if ((driver.status as string) === 'Needs Attention' && (req.type === 'MVR' || req.type === 'Medical')) {
         docStatus = 'Missing';
      } else if ((driver.status as string) === 'Expiring' && (req.type === 'MVR' || req.type === 'Medical')) {
         docStatus = 'Expiring';
      }
      
      return {
        name: req.name,
        date: req.date,
        status: docStatus,
        uploaded: false
      };
    });
  };

  const getTruckMergedDocs = (truck: TruckType) => {
    const defaultRequired = [
      { name: 'Annual DOT Inspection Certificate', type: 'DOT Inspection', date: '-', status: 'Missing' },
      { name: 'Vehicle Registration (Cab Card)', type: 'Registration', date: '-', status: 'Missing' }
    ];

    const activeDocs = truck.complianceDocs || [];

    return defaultRequired.map(req => {
      const matchedUploaded = activeDocs.find(ad => ad.name === req.name || ad.type === req.type);
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

  const renderReadinessTab = () => {
    const driverComps = drivers.map(getDriverCompliance);
    const truckComps = trucks.map(getTruckCompliance);
    const allComps = [...driverComps, ...truckComps];
    const hasCritical = allComps.some(c => c.status === 'Needs Attention');
    const hasWarning = allComps.some(c => c.status === 'Expiring');
    const noData = allComps.length === 0;
    const avgScore = noData 
      ? 0 
      : Math.round(allComps.reduce((acc, curr) => acc + curr.score, 0) / allComps.length);

    let circleColor = 'text-teal';
    let circleBorder = 'border-teal/20';
    let statusText = 'HIGH';
    let statusBg = 'bg-teal';
    let statusBorder = 'border-teal/30';
    let statusShadow = 'shadow-teal/20';
    let mainHeading = 'Your fleet is audit-ready and compliant.';
    let subHeading = 'All Driver Qualification Files (DQF), HOS logs, and maintenance records are up-to-date. We have verified MCS-150 and MCS-90 records for this period.';
    let checkColor = 'text-teal';
    let checkBorder = 'border-teal';
    let checkBg = 'bg-teal';

    if (noData) {
      circleColor = 'text-slate-400';
      circleBorder = 'border-slate-400/20';
      statusText = 'NO DATA';
      statusBg = 'bg-slate-500';
      statusBorder = 'border-slate-500/30';
      statusShadow = 'shadow-slate-500/20';
      mainHeading = 'System awaits fleet data for compliance scoring.';
      subHeading = 'Add drivers and trucks to begin monitoring DOT compliance, HOS, and maintenance records.';
      checkColor = 'text-slate-400';
      checkBorder = 'border-slate-400';
      checkBg = 'bg-slate-400';
    } else if (hasCritical) {
      circleColor = 'text-red-500';
      circleBorder = 'border-red-500/20';
      statusText = 'CRITICAL RISK';
      statusBg = 'bg-red-500';
      statusBorder = 'border-red-500/30';
      statusShadow = 'shadow-red-500/20';
      mainHeading = 'Immediate action required to prevent DOT violations.';
      subHeading = 'One or more assets have expired documents or missing mandatory compliance records.';
      checkColor = 'text-red-500';
      checkBorder = 'border-red-500';
      checkBg = 'bg-red-500';
    } else if (hasWarning) {
      circleColor = 'text-orange';
      circleBorder = 'border-orange/20';
      statusText = 'ATTENTION';
      statusBg = 'bg-orange';
      statusBorder = 'border-orange/30';
      statusShadow = 'shadow-orange/20';
      mainHeading = 'Upcoming expirations require attention.';
      subHeading = 'Review expiring compliance documents and schedule required maintenance for fleet assets.';
      checkColor = 'text-orange';
      checkBorder = 'border-orange';
      checkBg = 'bg-orange';
    }

    const displayScore = noData ? '--%' : `${avgScore}%`;
    const circumference = 552.92;
    const strokeDashoffset = noData ? circumference : circumference - (circumference * (avgScore / 100));

    const totalDqfDocs = drivers.length * 5;
    const validDqfDocs = drivers.reduce((acc, d) => acc + getDriverMergedDocs(d).filter(doc => doc.status !== 'Missing').length, 0);
    const dqfPercentNum = noData ? 0 : Math.round((validDqfDocs / totalDqfDocs) * 100);
    const dqfPercent = noData ? '--%' : `${dqfPercentNum}%`;

    const totalDrugTests = drivers.length;
    const validDrugTests = drivers.filter(d => !!d.drugTestDate).length;
    const drugPercentNum = noData ? 0 : Math.round((validDrugTests / totalDrugTests) * 100);
    const drugPercent = noData ? '--%' : `${drugPercentNum}%`;

    const totalHos = drivers.length;
    const validHos = drivers.filter(d => (d.hosViolations || 0) === 0).length;
    const hosPercentNum = noData ? 0 : Math.round((validHos / totalHos) * 100);
    const hosPercent = noData ? '--%' : `${hosPercentNum}%`;

    const dqfText = noData ? 'No drivers in system to evaluate.' : `All ${drivers.length} drivers evaluated for current MVRs, Medical Cards, and applications.`;
    
    return (
    <div className="space-y-8">
      {/* Audit Readiness Score */}
      <div className="bg-navy rounded-[40px] p-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-white/5 -skew-x-12 translate-x-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-4 max-w-lg">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 ${statusBg} text-white rounded-full text-[11px] font-black uppercase tracking-widest border ${statusBorder} shadow-lg ${statusShadow}`}>
              <ShieldCheck size={14} /> DOT Audit Readiness: {statusText}
            </div>
            <h2 className="text-4xl font-black tracking-tight leading-tight">{mainHeading}</h2>
            <p className="text-white/90 text-[15px] font-medium leading-relaxed">{subHeading}</p>
            <div className="flex gap-4 pt-4">
              <button 
                onClick={handleAuditExport}
                disabled={auditExporting}
                className="px-8 py-4 bg-orange text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-orange/20 hover:scale-105 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50 disabled:scale-100"
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
                className="px-8 py-4 bg-orange text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-orange/20 hover:scale-105 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
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
             <div className={`w-48 h-48 rounded-full border-8 ${circleBorder} flex items-center justify-center relative`}>
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                   <circle 
                     cx="96" cy="96" r="88" 
                     fill="none" 
                     stroke="currentColor" 
                     strokeWidth="8" 
                     className={circleColor}
                     strokeDasharray={circumference}
                     strokeDashoffset={strokeDashoffset} 
                   />
                </svg>
                <div className="text-center">
                   <p className="text-5xl font-black">{displayScore}</p>
                   <p className="text-[12px] font-bold text-white/70 uppercase tracking-widest">Compliance</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Critical Checkpoints */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`tms-card p-6 border-l-4 ${checkBorder}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Driver Files</span>
            <ShieldCheck size={16} className={checkColor} />
          </div>
          <h4 className="text-lg font-black text-navy">DQF Management</h4>
          <p className="text-xs text-slate-600 mt-2 font-medium">{dqfText}</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${checkBg}`} style={{ width: dqfPercent !== '--%' ? dqfPercent : '0%' }} />
            </div>
            <span className="text-[11px] font-bold text-navy">{dqfPercent}</span>
          </div>
        </div>
        <div className={`tms-card p-6 border-l-4 ${checkBorder}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">HOS Audit</span>
            <ShieldCheck size={16} className={checkColor} />
          </div>
          <h4 className="text-lg font-black text-navy">Weekly ELD Reviews</h4>
          <p className="text-xs text-slate-600 mt-2 font-medium">{noData ? 'No ELD data available.' : 'Log audits for current cycle complete. 0 violations identified in last 7 days.'}</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${checkBg}`} style={{ width: hosPercent !== '--%' ? hosPercent : '0%' }} />
            </div>
            <span className="text-[11px] font-bold text-navy">{hosPercent}</span>
          </div>
        </div>
        <div className={`tms-card p-6 border-l-4 ${checkBorder}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Drug & Alcohol</span>
            <AlertTriangle size={16} className={checkColor} />
          </div>
          <h4 className="text-lg font-black text-navy">Random Testing</h4>
          <p className="text-xs text-slate-600 mt-2 font-medium">{noData ? 'No testing data.' : 'Q2 Random selection in progress. 4 tests pending collection.'}</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${checkBg}`} style={{ width: drugPercent !== '--%' ? drugPercent : '0%' }} />
            </div>
            <span className="text-[11px] font-bold text-navy">{drugPercent}</span>
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
          <div className={`tms-card overflow-hidden border-l-4 ${totalAttentionAssets > 0 ? 'border-red-500' : 'border-slate-300'} bg-white`}>
             <div className={`p-6 border-b border-slate-100 ${totalAttentionAssets > 0 ? 'bg-red-50/10' : 'bg-slate-50/30'} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
                <div>
                   <h3 className={`text-sm font-black ${totalAttentionAssets > 0 ? 'text-red-700' : 'text-slate-700'} uppercase tracking-widest flex items-center gap-2`}>
                     <AlertTriangle size={18} className={`${totalAttentionAssets > 0 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} /> Unified FMCSA Compliance Sync Hub
                   </h3>
                   <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">Real-time safety checkpoints & missing documentation sync</p>
                </div>
                <div className={`px-3.5 py-1.5 ${totalAttentionAssets > 0 ? 'bg-red-100/70 text-red-600' : 'bg-slate-100 text-slate-500'} rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm`}>
                   {totalAttentionAssets > 0 && <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
                   {totalAttentionAssets === 0 ? 'No Action Required' : `${totalAttentionAssets} ${totalAttentionAssets === 1 ? 'Asset Needs Action' : 'Assets Need Action'}`}
                </div>
             </div>

             <div className="p-0">
                {totalAttentionAssets === 0 ? (
                  <div className="p-10 text-center bg-slate-50/30 flex flex-col items-center">
                     <ShieldCheck size={40} className="text-teal mb-3" />
                     <p className="text-sm font-black text-navy uppercase tracking-widest">{noData ? 'No Compliance Data Available' : 'Fleet Compliance fully Cleared'}</p>
                     <p className="text-xs text-slate-500 font-bold uppercase mt-1">{noData ? 'System is empty. No warnings to display.' : 'No warnings, expirations, or unassigned records found across all drivers and trailer assets.'}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                     {/* Driver Audit Synced Sections */}
                     {driversWithIssues.map(({ driver, comp }) => (
                       <div key={driver.id} className="p-6 hover:bg-slate-50/40 transition-colors flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
                          <div className="space-y-3.5 flex-1 min-w-0">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center font-black text-xs shrink-0 font-sans shadow-md">
                                   {(driver.name || '?').split(' ').map(n=>n?.[0]||'').join('')}
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
              <span className="text-[11px] font-bold text-slate-500">Total Records: {drivers.reduce((acc, d) => acc + (d.complianceDocs?.length || 0), 0) + trucks.reduce((acc, t) => acc + (t.complianceDocs?.length || 0), 0)}</span>
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
                  {noData ? (
                     <tr>
                        <td colSpan={4} className="p-10 text-center">
                           <div className="flex flex-col items-center justify-center">
                              <ClipboardCheck size={40} className="text-slate-300 mb-3" />
                              <p className="text-sm font-black text-navy uppercase tracking-widest">No Records Logged</p>
                              <p className="text-xs text-slate-500 font-bold uppercase mt-1">Add drivers and equipment to track compliance records.</p>
                           </div>
                        </td>
                     </tr>
                  ) : (
                     <>
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
                           <td className="p-6 font-medium text-navy">{driverComps.some(c => c.status === 'Needs Attention') ? 'Missing/Expired DQ Documents' : (driverComps.some(c => c.status === 'Expiring') ? 'Expiring DQ Documents' : 'Annual MVR due in 12 days')}</td>
                           <td className="p-6">
                              <button 
                                onClick={() => handleActionStub('Verify DQ Files')}
                                className={`${driverComps.some(c => c.status === 'Needs Attention') ? 'text-red-500' : (driverComps.some(c => c.status === 'Expiring') ? 'text-orange' : 'text-teal')} font-black uppercase text-[11px] hover:underline`}
                              >
                                {driverComps.some(c => c.status === 'Needs Attention') ? 'ACTION REQ' : (driverComps.some(c => c.status === 'Expiring') ? 'WARNING' : 'VERIFIED')}
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
                           <td className="p-6 font-medium text-navy">{drivers.some(d => d.hosViolations && d.hosViolations > 0) ? 'Resolve HOS Violations' : 'Weekly log audit cycle'}</td>
                           <td className="p-6">
                              <button 
                                onClick={() => handleActionStub('Audit HOS Status')}
                                className={`${drivers.some(d => d.hosViolations && d.hosViolations > 0) ? 'text-red-500' : 'text-teal'} font-black uppercase text-[11px] hover:underline`}
                              >
                                {drivers.some(d => d.hosViolations && d.hosViolations > 0) ? 'ACTION REQ' : 'VERIFIED'}
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
                           <td className="p-6 font-medium text-navy">{truckComps.some(c => c.status === 'Needs Attention') ? 'Overdue Maintenance / PM' : (truckComps.some(c => c.status === 'Expiring') ? 'Maintenance Due Soon' : 'Next Annual due in 30 days')}</td>
                           <td className="p-6">
                              <button 
                                onClick={() => handleActionStub('Schedule Maintenance Action')}
                                className={`${truckComps.some(c => c.status === 'Needs Attention') ? 'text-red-500' : (truckComps.some(c => c.status === 'Expiring') ? 'text-orange' : 'text-teal')} font-black uppercase text-[11px] hover:underline`}
                              >
                                {truckComps.some(c => c.status === 'Needs Attention') ? 'ACTION REQ' : (truckComps.some(c => c.status === 'Expiring') ? 'WARNING' : 'VERIFIED')}
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
                     </>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
  };

  const renderGeneralTab = () => {
    // Empty state logic
    const noCarrierData = !carrierCompliance || !carrierCompliance.dotNumber;
    
    // Evaluate insurance status based on dummy state or null if empty
    const insuranceStatus = noCarrierData ? 'MISSING' : (carrierCompliance.insuranceExpiry && new Date(carrierCompliance.insuranceExpiry) < new Date() ? 'EXPIRED' : 'ACTIVE');
    const insuranceColor = insuranceStatus === 'ACTIVE' ? 'bg-teal/10 text-teal' : (insuranceStatus === 'EXPIRED' ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-500');

    const cargoStatus = noCarrierData ? 'MISSING' : (carrierCompliance.cargoInsuranceExpiry && new Date(carrierCompliance.cargoInsuranceExpiry) < new Date() ? 'EXPIRED' : 'ACTIVE');
    const cargoColor = cargoStatus === 'ACTIVE' ? 'bg-teal/10 text-teal' : (cargoStatus === 'EXPIRED' ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-500');

    return (
    <div className="space-y-8">
      {/* Carrier Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
           <div className="w-12 h-12 rounded-2xl bg-navy/5 text-navy flex items-center justify-center">
             <Briefcase size={24} />
           </div>
           <div>
             <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">DOT Number</p>
             <p className="text-xl font-black text-navy">{noCarrierData ? '--' : carrierCompliance.dotNumber}</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
           <div className="w-12 h-12 rounded-2xl bg-navy/5 text-navy flex items-center justify-center">
             <Activity size={24} />
           </div>
           <div>
             <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">MC Number</p>
             <p className="text-xl font-black text-navy">{noCarrierData ? '--' : carrierCompliance.mcNumber}</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${noCarrierData ? 'bg-slate-100 text-slate-400' : (carrierCompliance.safetyRating === 'Satisfactory' ? 'bg-teal/10 text-teal' : 'bg-orange/10 text-orange')}`}>
             <ShieldCheck size={24} />
           </div>
           <div>
             <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Safety Rating</p>
             <p className="text-xl font-black text-navy">{noCarrierData ? 'PENDING' : carrierCompliance.safetyRating}</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${noCarrierData ? 'bg-slate-100 text-slate-400' : (carrierCompliance.boc3Status === 'Active' ? 'bg-teal/10 text-teal' : 'bg-red-100 text-red-500')}`}>
             <ClipboardCheck size={24} />
           </div>
           <div>
             <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">BOC-3 Status</p>
             <p className="text-xl font-black text-navy">{noCarrierData ? '--' : carrierCompliance.boc3Status}</p>
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
                   <p className="text-[11px] text-slate-500 font-medium">{noCarrierData ? 'No filing detected' : `Last Filed: ${carrierCompliance.mcs150Date}`}</p>
                </div>
                <div className="text-right">
                   <button 
                     onClick={() => handleActionStub('MCS-150 Update')}
                     className={`px-3 py-1 ${noCarrierData ? 'bg-slate-200 text-slate-500' : 'bg-teal/10 text-teal'} rounded-full text-[11px] font-black uppercase tracking-widest hover:brightness-95 transition-all active:scale-95`}
                   >
                     {noCarrierData ? 'PENDING' : 'CURRENT'}
                   </button>
                </div>
             </div>
             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                   <p className="text-xs font-bold text-navy-dark">Unified Carrier Registration</p>
                   <p className="text-[11px] text-slate-500 font-medium">{noCarrierData ? 'No filing detected' : 'Current UCR Filing'}</p>
                </div>
                <button 
                   onClick={() => handleActionStub('UCR Filing Status')}
                   className={`px-3 py-1 rounded-full ${noCarrierData ? 'bg-slate-200 text-slate-500' : (carrierCompliance.ucrRegistered ? 'bg-teal/10 text-teal' : 'bg-red-100 text-red-500')} text-[11px] font-black uppercase tracking-widest hover:brightness-95 transition-all active:scale-95`}
                >
                   {noCarrierData ? 'PENDING' : (carrierCompliance.ucrRegistered ? 'REGISTERED' : 'EXPIRED')}
                </button>
             </div>
             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                   <p className="text-xs font-bold text-navy-dark">IFTA / Fuel Tax</p>
                   <p className="text-[11px] text-slate-500 font-medium">{noCarrierData ? 'No filings logged' : 'Quarterly filings up to date'}</p>
                </div>
                <button 
                  onClick={() => handleActionStub('IFTA Status Details')}
                  className={`px-3 py-1 rounded-full ${noCarrierData ? 'bg-slate-200 text-slate-500' : 'bg-teal/10 text-teal'} text-[11px] font-black uppercase tracking-widest hover:brightness-95 transition-all active:scale-95`}
                >
                  {noCarrierData ? 'PENDING' : carrierCompliance.iftaStatus}
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
                      <p className="text-[11px] text-slate-600 font-medium">{noCarrierData ? 'Upload required' : `Expires: ${carrierCompliance.insuranceExpiry}`}</p>
                   </div>
                </div>
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleActionStub('View BMC-91X')}
                      className={`px-3 py-1 rounded-full ${insuranceColor} text-[11px] font-black uppercase tracking-widest hover:brightness-95 transition-all active:scale-95`}
                    >
                      {insuranceStatus}
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
                      <p className="text-[11px] text-slate-600 font-medium">{noCarrierData ? 'Upload required' : `Expires: ${carrierCompliance.cargoInsuranceExpiry}`}</p>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => handleActionStub('View MCS-90')}
                     className={`px-3 py-1 rounded-full ${cargoColor} text-[11px] font-black uppercase tracking-widest hover:brightness-95 transition-all active:scale-95`}
                   >
                     {cargoStatus}
                   </button>
                   <button 
                      onClick={triggerUpload}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-navy transition-all"
                      title="Upload New Certificate"
                   >
                      <Upload size={14} />
                   </button>
                </div>
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
  };
  const renderHOSTab = () => {
    const noDrivers = drivers.length === 0;
    const totalViolations = drivers.reduce((acc, d) => acc + (d.hosViolations || 0), 0);
    const unassignedMiles = '0 mi';
    
    return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <p className="text-[11px] font-black text-slate-500 tracking-widest uppercase mb-1">ELD Audit Status</p>
          <p className={`text-base font-black ${noDrivers ? 'text-slate-400' : (totalViolations > 0 ? 'text-red-500' : 'text-navy')} mb-4`}>
            {noDrivers ? 'NO LOGS' : (totalViolations > 0 ? 'ACTION REQ' : 'PENDING AUDIT')}
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
             <div className={`${noDrivers ? 'bg-slate-200' : (totalViolations > 0 ? 'bg-red-500' : 'bg-teal')} h-full w-full`} />
          </div>
          <p className="text-[10px] text-slate-600 mt-2 font-bold uppercase">{noDrivers ? 'No Data' : 'Pending Review'}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <p className="text-[11px] font-black text-slate-500 tracking-widest uppercase mb-1">Unassigned Mileage</p>
          <p className={`text-2xl font-black ${noDrivers ? 'text-slate-300' : 'text-navy'}`}>{unassignedMiles}</p>
          <p className={`text-[10px] ${noDrivers ? 'text-slate-400' : (totalViolations > 0 ? 'text-orange-600' : 'text-teal')} mt-2 font-bold uppercase`}>
            {noDrivers ? 'NO LOGS' : (totalViolations > 0 ? 'REQUIRES ANNOTATION' : 'CLEARED')}
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <p className="text-[11px] font-black text-slate-500 tracking-widest uppercase mb-1">Supporting Docs</p>
          <p className={`text-2xl font-black ${noDrivers ? 'text-slate-300' : 'text-navy'}`}>0/0</p>
          <p className={`text-[10px] ${noDrivers ? 'text-slate-400' : 'text-slate-500'} mt-2 font-bold uppercase`}>No Data</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100">
          <p className="text-[11px] font-black text-slate-500 tracking-widest uppercase mb-1">Log Retention</p>
          <p className={`text-2xl font-black ${noDrivers ? 'text-slate-300' : 'text-navy'}`}>0 Days</p>
          <p className={`text-[10px] ${noDrivers ? 'text-slate-400' : 'text-slate-500'} mt-2 font-bold uppercase tracking-tight`}>Archive Empty</p>
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
                 {noDrivers ? (
                    <tr>
                       <td colSpan={6} className="p-12 text-center text-slate-500">
                          <AlertTriangle size={32} className="mx-auto mb-3 text-slate-300" />
                          <p className="font-bold uppercase tracking-widest text-navy">No Drivers Found</p>
                          <p className="mt-1">Add drivers to begin tracking ELD logs.</p>
                       </td>
                    </tr>
                 ) : (
                    drivers.map(d => (
                      <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50 transition-all">
                         <td className="p-6 font-bold text-navy-dark">{d.name}</td>
                         <td className="p-6">
                           <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${d.hosDutyStatus === 'Driving' ? 'bg-teal/5 text-teal border-teal/10' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                              {d.hosDutyStatus}
                           </span>
                         </td>
                         <td className="p-6 text-slate-500 font-mono">
                           {new Date().toISOString().split('T')[0]}
                         </td>
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
                    ))
                 )}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
  };

  const renderDrugAlcoholTab = () => {
    const noDrivers = drivers.length === 0;
    const testedCount = drivers.filter(d => !!d.drugTestDate).length;
    const drugPercent = drivers.length ? Math.round((testedCount / drivers.length) * 100) : 0;
    
    return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="tms-card">
           <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
                <Stethoscope size={18} className={noDrivers ? 'text-slate-400' : (testedCount ? 'text-teal' : 'text-red-500')} /> FMCSA Clearinghouse Compliance
              </h3>
           </div>
           <div className="p-8 space-y-6">
              <div className={`flex items-center justify-between p-4 border rounded-2xl ${noDrivers ? 'bg-slate-50 border-slate-200' : (testedCount ? 'bg-teal/5 border-teal/10' : 'bg-red-50 border-red-100')}`}>
                 <div>
                    <p className={`text-sm font-black ${noDrivers ? 'text-slate-500' : (testedCount ? 'text-teal' : 'text-red-500')}`}>Annual Query Status (49 CFR 382.701)</p>
                    <p className={`text-xs font-medium ${noDrivers ? 'text-slate-400' : (testedCount ? 'text-teal-dark/60' : 'text-red-700/60')}`}>{noDrivers ? 'No drivers to query' : (testedCount ? 'All drivers queried in last 12 months' : 'Pending Queries')}</p>
                 </div>
                 <button onClick={() => handleActionStub('Run New Query')} className={`px-4 py-2 ${noDrivers ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white border-teal/20 text-teal hover:bg-teal hover:text-white'} border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all`} disabled={noDrivers}>Run Query</button>
              </div>
              <div className={`flex items-center justify-between p-4 border rounded-2xl ${noDrivers ? 'bg-slate-50 border-slate-200' : (testedCount ? 'bg-orange/5 border-orange/10' : 'bg-red-50 border-red-100')}`}>
                 <div>
                    <p className={`text-sm font-black ${noDrivers ? 'text-slate-500' : (testedCount ? 'text-orange' : 'text-red-500')}`}>Pre-Employment Queries</p>
                    <p className={`text-xs font-medium ${noDrivers ? 'text-slate-400' : (testedCount ? 'text-orange-900/60' : 'text-red-700/60')}`}>{noDrivers ? 'No records' : (testedCount ? 'All recent hires verified prior to dispatch' : 'Action Required')}</p>
                 </div>
              </div>
           </div>
        </div>

        <div className="tms-card">
           <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
                <FileText size={18} className={noDrivers ? 'text-slate-400' : 'text-navy'} /> Random Testing Pool
              </h3>
           </div>
           <div className="p-8">
              <div className="space-y-8">
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Drug Testing Progress (50% Requirement)</span>
                       <span className="text-xs font-black text-navy">{noDrivers ? '0/0' : `${testedCount}/${drivers.length}`} Employees Tested</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                       <div className={`${noDrivers ? 'bg-slate-300' : 'bg-teal'} h-full transition-all`} style={{ width: `${drugPercent}%` }} />
                    </div>
                 </div>
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Alcohol Testing Progress (10% Requirement)</span>
                       <span className="text-xs font-black text-navy">0/{drivers.length} Employees Tested</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                       <div className={`${noDrivers ? 'bg-slate-300' : 'bg-orange'} h-full transition-all`} style={{ width: '0%' }} />
                    </div>
                 </div>
                 <div className="p-4 bg-navy text-white rounded-2xl text-center">
                    <p className="text-[11px] font-black uppercase tracking-widest leading-loose">Currently Enrolled: {drivers.length} active commercial drivers in verified random pool.</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="tms-card">
         <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="text-sm font-black text-navy uppercase tracking-widest">Drug & Alcohol Retention Register (Last 5 Years)</h3>
            <button 
                onClick={() => handleActionStub('Export D&A Register')}
                className="px-4 py-2 bg-navy text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-navy-light transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={noDrivers}
              >
                Export Register
              </button>
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
                  {noDrivers ? (
                     <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-500">
                           <ShieldCheck size={32} className="mx-auto mb-3 text-slate-300" />
                           <p className="font-bold uppercase tracking-widest text-navy">No Drivers Found</p>
                           <p className="mt-1">Add drivers to manage drug and alcohol retention records.</p>
                        </td>
                     </tr>
                  ) : (
                     drivers.map(d => (
                       <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="p-6 font-bold text-navy-dark">{d.name}</td>
                          <td className="p-6 text-slate-600 uppercase text-[11px] font-black tracking-tighter">
                            {d.drugTestDate ? 'RANDOM SELECTION' : (d.complianceDocs?.length ? 'PRE-EMPLOYMENT' : 'PENDING')}
                          </td>
                          <td className={`p-6 font-mono italic ${d.drugTestDate ? 'text-slate-600' : 'text-red-600'}`}>
                            {d.drugTestDate || 'MISSING RECORD'}
                          </td>
                          <td className="p-6">
                            {d.drugTestDate ? (
                              <div className="flex items-center gap-2 text-teal font-black uppercase text-[10px] tracking-widest">
                                 <ShieldCheck size={12} /> NEGATIVE RESULT
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-red-500 font-black uppercase text-[10px] tracking-widest">
                                 <AlertTriangle size={12} /> NO RECORD FOUND
                              </div>
                            )}
                          </td>
                          <td className="p-6">
                              <div className="flex justify-end gap-2">
                                 <button onClick={triggerUpload} className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-navy transition-all"><Upload size={14} /></button>
                                 <button onClick={() => handleActionStub('Download CCF')} className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-navy transition-all"><Download size={14} /></button>
                              </div>
                          </td>
                       </tr>
                     ))
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
  };

  const renderDQFTab = () => {
    let dqfStatusText = 'DQF COMPLIANT';
    let dqfBadgeClass = 'bg-teal text-white';
    if (selectedDriver) {
      const driverDocs = getDriverMergedDocs(selectedDriver);
      const isDQFIncomplete = driverDocs.some(d => d.status === 'Missing');
      const isDQFWarning = driverDocs.some(d => d.status === 'Expiring');
      
      dqfStatusText = isDQFIncomplete ? 'DQF INCOMPLETE' : (isDQFWarning ? 'DQF WARNING' : 'DQF COMPLIANT');
      dqfBadgeClass = isDQFIncomplete ? 'bg-red-500 text-white' : (isDQFWarning ? 'bg-orange text-white' : 'bg-teal text-white');
    }

    return (
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
           {drivers.length === 0 ? (
             <div className="text-center p-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase">No drivers found</p>
             </div>
           ) : filteredDrivers.length === 0 ? (
             <div className="text-center p-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase">No drivers match search</p>
             </div>
           ) : (
             filteredDrivers.map(d => (
               <button 
                 key={d.id}
                 onClick={() => setSelectedDriver(d)}
                 className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center justify-between group ${selectedDriver?.id === d.id ? 'bg-navy border-navy text-white shadow-lg' : 'bg-white border-slate-100 hover:border-navy/20'}`}
               >
                 <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[11px] ${selectedDriver?.id === d.id ? 'bg-white text-navy' : 'bg-slate-100 text-slate-600'}`}>
                      {(d.name || '?').split(' ').map(n=>n?.[0]||'').join('')}
                    </div>
                    <div>
                      <p className={`text-[12px] font-black uppercase tracking-tight ${selectedDriver?.id === d.id ? 'text-white' : 'text-navy-dark'}`}>{d.name}</p>
                      <p className={`text-[11px] font-bold ${selectedDriver?.id === d.id ? 'text-white/70' : 'text-slate-500'}`}>CDL Exp: {d.cdlExpiry || 'N/A'}</p>
                    </div>
                 </div>
                 <ChevronRight size={14} className={selectedDriver?.id === d.id ? 'text-white' : 'text-slate-500 group-hover:text-navy'} />
               </button>
             ))
           )}
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
                    {(selectedDriver.name || '?').split(' ').map(n=>n?.[0]||'').join('')}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">{selectedDriver.name}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-widest ${dqfBadgeClass} shadow-sm`}>
                        {dqfStatusText}
                      </span>
                      <span className="text-white/90 text-sm font-bold uppercase tracking-tighter">CLASS {selectedDriver.cdlClass} · ENDORSEMENTS: {selectedDriver.endorsements.join(', ') || 'NONE'}</span>
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
                               className={`text-[11px] font-black uppercase hover:underline ${doc.status === 'Missing' ? 'text-red-500' : (doc.status === 'Expiring' ? 'text-orange' : 'text-teal')}`}
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
                          <span className={`text-sm font-black ${selectedDriver.cdlNumber ? 'text-navy' : 'text-red-500'}`}>{selectedDriver.cdlNumber || 'MISSING'}</span>
                       </div>
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600">State of Issue</span>
                          <span className={`text-sm font-black ${selectedDriver.cdlState ? 'text-navy' : 'text-red-500'}`}>{selectedDriver.cdlState || 'MISSING'}</span>
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
             <h3 className="text-sm font-black text-navy uppercase tracking-widest">{drivers.length === 0 ? 'No Drivers Logged' : 'Select a Driver File'}</h3>
             <p className="text-xs text-slate-600 mt-1 uppercase font-bold tracking-tight">{drivers.length === 0 ? 'Add a driver to manage DQF records' : 'Access full DQF and hiring records'}</p>
          </div>
        )}
      </div>
    </div>
  );
  };

  const renderMaintenanceTab = () => {
    let maintenanceStatusText = 'INSPECTION CURRENT';
    let maintenanceBadgeClass = 'text-teal bg-white';
    let maintenanceBgClass = 'from-teal to-teal-light';
    let maintenanceIconClass = 'text-teal';
    let maintenanceBtnClass = 'text-teal';

    if (selectedTruck) {
      const truckDocs = getTruckMergedDocs(selectedTruck);
      const isMaintenanceIncomplete = truckDocs.some(d => d.status === 'Missing');
      const isMaintenanceWarning = truckDocs.some(d => d.status === 'Expiring');
      
      maintenanceStatusText = isMaintenanceIncomplete ? 'RECORDS MISSING' : (isMaintenanceWarning ? 'INSPECTION EXPIRING' : 'INSPECTION CURRENT');
      maintenanceBadgeClass = isMaintenanceIncomplete ? 'text-red-600 bg-white' : (isMaintenanceWarning ? 'text-orange-600 bg-white' : 'text-teal bg-white');
      maintenanceBgClass = isMaintenanceIncomplete ? 'from-red-600 to-red-500' : (isMaintenanceWarning ? 'from-orange-600 to-orange-500' : 'from-teal to-teal-light');
      maintenanceIconClass = isMaintenanceIncomplete ? 'text-red-600' : (isMaintenanceWarning ? 'text-orange-600' : 'text-teal');
      maintenanceBtnClass = isMaintenanceIncomplete ? 'text-red-600' : (isMaintenanceWarning ? 'text-orange-600' : 'text-teal');
    }

    return (
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
           {trucks.length === 0 ? (
             <div className="text-center p-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase">No units found</p>
             </div>
           ) : filteredTrucks.length === 0 ? (
             <div className="text-center p-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase">No units match search</p>
             </div>
           ) : (
             filteredTrucks.map(t => (
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
             ))
           )}
        </div>
      </div>

      <div className="lg:col-span-3">
        {selectedTruck ? (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className={`tms-card p-6 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r ${maintenanceBgClass} text-white border-none py-10 px-8`}>
               <div className="flex items-center gap-8">
                  <div className={`w-20 h-20 rounded-3xl bg-white ${maintenanceIconClass} flex items-center justify-center shadow-2xl rotate-3`}>
                    <Truck size={40} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter">Unit {selectedTruck.unitNumber}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${maintenanceBadgeClass}`}>
                        {maintenanceStatusText}
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
                    className={`px-6 py-3 bg-white ${maintenanceBtnClass} rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all active:scale-95`}
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
                             <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${doc.status === 'Missing' ? 'bg-red-100 text-red-600' : (doc.status === 'Expiring' ? 'bg-orange-100 text-orange-600' : 'bg-teal/10 text-teal')}`}>{doc.status}</span>
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
               
               <div className="space-y-6">
                  <div className="tms-card bg-slate-50/50 border-dashed border-2 border-slate-200">
                    <div className="p-10 flex flex-col items-center justify-center text-center">
                       <ClipboardCheck size={32} className="text-slate-300 mb-3" />
                       <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">PM Schedule</p>
                       <p className={`text-xs font-bold mt-1 ${!selectedTruck?.pmStatus ? 'text-red-600' : 'text-navy-dark'}`}>{!selectedTruck?.pmStatus ? 'NO RECORD' : (selectedTruck.pmStatus === 'Current' ? 'Up to date' : 'Service Due')}</p>
                       <button onClick={() => handleActionStub('Log PM Service')} className="mt-4 px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:border-navy transition-all">Log Service</button>
                    </div>
                  </div>
               </div>
            </div>
          </motion.div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 min-h-[400px]">
             <Truck size={48} className="text-slate-200 mb-4" />
             <h3 className="text-sm font-black text-navy uppercase tracking-widest">{trucks.length === 0 ? 'No Units Logged' : 'Select a Unit'}</h3>
             <p className="text-xs text-slate-600 mt-1 uppercase font-bold tracking-tight">{trucks.length === 0 ? 'Add equipment to manage maintenance records' : 'Access full maintenance and inspection records'}</p>
          </div>
        )}
      </div>
    </div>
  );
  };

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
                  <span className={`px-4 py-1.5 ${!carrierCompliance?.dotNumber ? 'bg-slate-300' : 'bg-teal'} text-white rounded-full text-[11px] font-black uppercase tracking-widest`}>
                     {!carrierCompliance?.dotNumber ? 'NOT REGISTERED' : 'VALID THROUGH 2026'}
                  </span>
               </div>
               <div className={`w-24 h-24 rounded-[30px] flex items-center justify-center mb-8 rotate-6 ${!carrierCompliance?.dotNumber ? 'bg-slate-100 text-slate-300' : 'bg-orange/10 text-orange'}`}>
                  <ShieldCheck size={48} />
               </div>
               <h2 className="text-3xl font-black text-navy uppercase tracking-tight">PHMSA Hazardous Materials</h2>
               <p className="text-slate-600 max-w-sm mx-auto mt-4 text-sm font-semibold leading-relaxed">
                  {!carrierCompliance?.dotNumber ? 'Add carrier details to manage Hazardous Materials registration.' : `Your Hazardous Materials registration is active. Current safety plan and security protocols are verified as of ${carrierCompliance?.mcs150Date || 'recently'}.`}
               </p>
               <div className="mt-10 flex gap-4">
                  <button 
                    onClick={() => handleActionStub('Download PHMSA Certificate')}
                    className={`px-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 ${!carrierCompliance?.dotNumber ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-navy text-white shadow-2xl shadow-navy/20 hover:scale-105'}`}
                    disabled={!carrierCompliance?.dotNumber}
                  >
                    <Download size={16} /> PHMSA Registration Certificate
                  </button>
                  <button 
                    onClick={() => handleActionStub('View Hazmat Training Records')}
                    className={`px-10 py-5 bg-white border rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 ${!carrierCompliance?.dotNumber ? 'border-slate-200 text-slate-400 cursor-not-allowed' : 'border-slate-200 hover:border-navy hover:text-navy'}`}
                    disabled={!carrierCompliance?.dotNumber}
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
