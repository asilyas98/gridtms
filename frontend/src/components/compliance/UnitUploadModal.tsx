import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  Calendar, 
  Link2, 
  ShieldCheck, 
  Plus,
  Truck,
  Wrench
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Truck as TruckType, ComplianceDocument } from '../../types';

export type UnitCategoryKey =
  | 'AnnualInspection'
  | 'Registration'
  | 'PMService'
  | 'BrakeCert'
  | 'DVIRRepair'
  | 'ReeferLog'
  | 'Emissions'
  | 'Custom';

export interface UnitCategoryDef {
  key: UnitCategoryKey;
  label: string;
  sublabel: string;
  cfr: string;
  defaultYears: number | null; // null means permanent / no expiration
  syncField?: 'annualInspectionExpiry' | 'registrationExpiry' | 'pmStatus';
  syncLabel?: string;
  forTrailersOnly?: boolean;
}

export const UNIT_CATEGORIES: UnitCategoryDef[] = [
  {
    key: 'AnnualInspection',
    label: 'Annual Periodic DOT Inspection Certificate',
    sublabel: 'Decal / Periodic Form per 49 CFR § 396.17',
    cfr: '49 CFR § 396.17 & § 396.21',
    defaultYears: 1,
    syncField: 'annualInspectionExpiry',
    syncLabel: 'Sync to Unit Profile (annualInspectionExpiry)'
  },
  {
    key: 'Registration',
    label: 'Vehicle Registration (Cab Card)',
    sublabel: 'State Apportioned / IRP Registration Document',
    cfr: 'State DOT & IRP Compliance',
    defaultYears: 1,
    syncField: 'registrationExpiry',
    syncLabel: 'Sync to Unit Profile (registrationExpiry)'
  },
  {
    key: 'PMService',
    label: 'Preventative Maintenance (PM) Work Order',
    sublabel: 'Scheduled Lube, Fluid & Component Safety Inspection',
    cfr: '49 CFR § 396.3',
    defaultYears: 0.5,
    syncField: 'pmStatus',
    syncLabel: 'Update Maintenance Status to Current'
  },
  {
    key: 'BrakeCert',
    label: 'Brake Inspection & Adjustment Certificate',
    sublabel: 'Qualified Brake Inspector Sign-off & Travel Check',
    cfr: '49 CFR § 396.25',
    defaultYears: 1
  },
  {
    key: 'DVIRRepair',
    label: 'Driver Vehicle Inspection (DVIR) Repair Sign-off',
    sublabel: 'Post-Trip Safety Defect Certification & Mechanic Sign-off',
    cfr: '49 CFR § 396.11 / § 396.13',
    defaultYears: null
  },
  {
    key: 'ReeferLog',
    label: 'Reefer Unit Calibration & Service Log',
    sublabel: 'Food Safety Modernization Act Temperature Audit Log',
    cfr: '21 CFR § 1.908 / FSMA',
    defaultYears: 1,
    forTrailersOnly: true
  },
  {
    key: 'Emissions',
    label: 'Emissions & Smoke Opacity Safety Inspection',
    sublabel: 'Clean Truck Check / State Periodic Emissions Testing',
    cfr: 'CARB & Clean Air Standards',
    defaultYears: 1
  },
  {
    key: 'Custom',
    label: 'Shop Work Order / In-Shop Invoice',
    sublabel: 'Tires, Alignment, Transmission, or Scheduled Repairs',
    cfr: 'Fleet Safety Records',
    defaultYears: 1
  }
];

export function guessUnitCategoryFromFilename(filename: string): UnitCategoryKey {
  const f = filename.toLowerCase();
  if (f.includes('annual') || f.includes('inspection') || f.includes('periodic') || f.includes('396.17') || f.includes('sticker') || f.includes('decal')) {
    return 'AnnualInspection';
  }
  if (f.includes('reg') || f.includes('registration') || f.includes('cab') || f.includes('irp') || f.includes('plate')) {
    return 'Registration';
  }
  if (f.includes('pm') || f.includes('lube') || f.includes('oil') || f.includes('fluid') || f.includes('tune')) {
    return 'PMService';
  }
  if (f.includes('brake') || f.includes('slack') || f.includes('lining') || f.includes('drum') || f.includes('rotor')) {
    return 'BrakeCert';
  }
  if (f.includes('dvir') || f.includes('post-trip') || f.includes('pre-trip') || f.includes('defect')) {
    return 'DVIRRepair';
  }
  if (f.includes('reefer') || f.includes('thermo') || f.includes('cooling') || f.includes('temp') || f.includes('fsma')) {
    return 'ReeferLog';
  }
  if (f.includes('emission') || f.includes('carb') || f.includes('smoke') || f.includes('opacity')) {
    return 'Emissions';
  }
  return 'AnnualInspection';
}

function calculateFutureDate(years: number): string {
  const d = new Date();
  if (years === 0.5) {
    d.setMonth(d.getMonth() + 6);
  } else {
    d.setFullYear(d.getFullYear() + years);
  }
  return d.toISOString().split('T')[0];
}

export interface StagedUnitItem {
  id: string;
  file: File;
  name: string;
  category: UnitCategoryKey;
  expiryDate: string;
  noExpiration: boolean;
  syncToProfile: boolean;
}

interface UnitUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  truck: TruckType;
  initialFiles?: File[];
  targetCategory?: string; // Pre-bound category if launched from a specific checklist row
  onSave: (stagedItems: StagedUnitItem[]) => Promise<void>;
}

export default function UnitUploadModal({
  isOpen,
  onClose,
  truck,
  initialFiles = [],
  targetCategory,
  onSave
}: UnitUploadModalProps) {
  const [items, setItems] = useState<StagedUnitItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  const isTrailer = truck.type?.toLowerCase().includes('trailer') || 
                    truck.type?.toLowerCase().includes('van') || 
                    truck.type?.toLowerCase().includes('reefer') || 
                    truck.type?.toLowerCase().includes('flatbed');

  // Filter categories appropriate for this unit type
  const availableCategories = UNIT_CATEGORIES.filter(c => {
    if (c.forTrailersOnly && !isTrailer) return false;
    return true;
  });

  useEffect(() => {
    if (!isOpen) {
      setItems([]);
      return;
    }

    if (initialFiles.length > 0) {
      const staged: StagedUnitItem[] = initialFiles.map(file => {
        let catKey: UnitCategoryKey = 'AnnualInspection';

        if (targetCategory) {
          const match = availableCategories.find(c => 
            c.key.toLowerCase() === targetCategory.toLowerCase() ||
            c.label.toLowerCase() === targetCategory.toLowerCase() ||
            targetCategory.toLowerCase().includes(c.key.toLowerCase()) ||
            (targetCategory.toLowerCase().includes('inspection') && c.key === 'AnnualInspection') ||
            (targetCategory.toLowerCase().includes('registration') && c.key === 'Registration')
          );
          if (match) catKey = match.key;
        } else {
          catKey = guessUnitCategoryFromFilename(file.name);
        }

        const catDef = availableCategories.find(c => c.key === catKey) || availableCategories[0];
        const isPermanent = catDef.defaultYears === null;
        const initialExpiry = isPermanent ? '' : calculateFutureDate(catDef.defaultYears || 1);

        return {
          id: `staged-${Math.random().toString(36).substring(2, 9)}`,
          file,
          name: file.name,
          category: catKey,
          expiryDate: initialExpiry,
          noExpiration: isPermanent,
          syncToProfile: Boolean(catDef.syncField)
        };
      });
      setItems(staged);
    }
  }, [isOpen, initialFiles, targetCategory, isTrailer]);

  const handleAddMoreFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles: File[] = Array.from(e.target.files);

    const staged: StagedUnitItem[] = newFiles.map((file: File) => {
      const catKey = guessUnitCategoryFromFilename(file.name);
      const catDef = availableCategories.find(c => c.key === catKey) || availableCategories[0];
      const isPermanent = catDef.defaultYears === null;

      return {
        id: `staged-${Math.random().toString(36).substring(2, 9)}`,
        file,
        name: file.name,
        category: catKey,
        expiryDate: isPermanent ? '' : calculateFutureDate(catDef.defaultYears || 1),
        noExpiration: isPermanent,
        syncToProfile: Boolean(catDef.syncField)
      };
    });

    setItems(prev => [...prev, ...staged]);
    e.target.value = '';
  };

  const handleCategoryChange = (itemId: string, newCatKey: UnitCategoryKey) => {
    const catDef = availableCategories.find(c => c.key === newCatKey) || availableCategories[0];
    const isPermanent = catDef.defaultYears === null;

    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        category: newCatKey,
        noExpiration: isPermanent,
        expiryDate: isPermanent ? '' : (item.expiryDate || calculateFutureDate(catDef.defaultYears || 1)),
        syncToProfile: Boolean(catDef.syncField)
      };
    }));
  };

  const handleExpiryChange = (itemId: string, date: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        expiryDate: date,
        noExpiration: false
      };
    }));
  };

  const handlePresetYears = (itemId: string, years: number) => {
    const dateStr = calculateFutureDate(years);
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        expiryDate: dateStr,
        noExpiration: false
      };
    }));
  };

  const handleToggleNoExpiration = (itemId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const nextNoExp = !item.noExpiration;
      return {
        ...item,
        noExpiration: nextNoExp,
        expiryDate: nextNoExp ? '' : calculateFutureDate(1)
      };
    }));
  };

  const handleToggleSync = (itemId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        syncToProfile: !item.syncToProfile
      };
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const handleSubmit = async () => {
    if (items.length === 0) return;

    for (const item of items) {
      if (!item.noExpiration && !item.expiryDate) {
        alert(`Please specify an expiration date for "${item.name}" or select "Permanent Record".`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setUploadProgress('Processing and attaching equipment compliance records...');
      await onSave(items);
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      alert(`Failed to save equipment files: ${err?.message || 'Unknown error'}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-3xl bg-white dark:bg-[#121214] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2C2C2E] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#2C2C2E] flex items-center justify-between bg-slate-50/70 dark:bg-[#1C1C1E]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              {isTrailer ? <Wrench size={20} /> : <Truck size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {isTrailer ? 'Trailer Maintenance & Inspection Intake' : 'Power Unit Inspection & PM Intake'}
                </h3>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-200/60 dark:bg-zinc-800 text-slate-700 dark:text-slate-300">
                  Unit #{truck.unitNumber}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300">
                  {isTrailer ? 'Trailer' : 'Tractor'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Classify equipment inspection certificates and sync regulatory dates with FMCSA 49 CFR Part 396.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable File List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="py-12 px-6 text-center border-2 border-dashed border-slate-200 dark:border-[#2C2C2E] rounded-2xl bg-slate-50/50 dark:bg-[#18181B]/40">
              <Upload size={36} className="mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                No equipment files queued for upload
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Select inspection certificates, cab cards, or PM work orders to attach to this unit.
              </p>
              <button
                onClick={() => addMoreInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                Browse Files
              </button>
            </div>
          ) : (
            items.map((item, index) => {
              const selectedCatDef = availableCategories.find(c => c.key === item.category) || availableCategories[0];
              const fileSizeKb = Math.round(item.file.size / 1024);

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#18181A] shadow-sm hover:border-slate-300 dark:hover:border-zinc-700 transition-colors space-y-4"
                >
                  {/* Top line: file name & delete action */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate" title={item.name}>
                          {item.name}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                          {fileSizeKb} KB · Document #{index + 1}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isSubmitting}
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors shrink-0"
                      title="Remove file"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Classification Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Category Selector */}
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        Government Inspection & Record Type
                      </label>
                      <select
                        value={item.category}
                        onChange={(e) => handleCategoryChange(item.id, e.target.value as UnitCategoryKey)}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                      >
                        {availableCategories.map(cat => (
                          <option key={cat.key} value={cat.key}>
                            {cat.label} ({cat.cfr})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                        {selectedCatDef.sublabel}
                      </p>
                    </div>

                    {/* Expiration Date Section */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Inspection Validity / Expiration Date
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                          <input
                            type="checkbox"
                            checked={item.noExpiration}
                            onChange={() => handleToggleNoExpiration(item.id)}
                            disabled={isSubmitting}
                            className="rounded border-slate-300 text-teal-600 focus:ring-0"
                          />
                          <span>Permanent Record</span>
                        </label>
                      </div>

                      {item.noExpiration ? (
                        <div className="px-3 py-2 bg-slate-100 dark:bg-zinc-800/60 rounded-xl text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          <span>Retained record (Historical shop work order / repair sign-off)</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="date"
                            value={item.expiryDate}
                            onChange={(e) => handleExpiryChange(item.id, e.target.value)}
                            disabled={isSubmitting}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                          />
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-400">Presets:</span>
                            <button
                              type="button"
                              onClick={() => handlePresetYears(item.id, 1)}
                              disabled={isSubmitting}
                              className="px-2 py-0.5 text-[10px] font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 transition-colors"
                            >
                              +1 Year (Annual DOT)
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePresetYears(item.id, 0.5)}
                              disabled={isSubmitting}
                              className="px-2 py-0.5 text-[10px] font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 transition-colors"
                            >
                              +6 Months (Semi-Annual PM)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile Synchronization Checkbox */}
                  {selectedCatDef.syncField && (
                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        <Link2 size={14} className={item.syncToProfile ? 'text-teal-600' : 'text-slate-400'} />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {selectedCatDef.syncLabel || 'Sync expiration date directly to unit profile'}
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.syncToProfile}
                          onChange={() => handleToggleSync(item.id)}
                          disabled={isSubmitting || item.noExpiration}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-600"></div>
                      </label>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Add more files row */}
          {items.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => addMoreInputRef.current?.click()}
                disabled={isSubmitting}
                className="w-full py-3 border border-dashed border-slate-300 dark:border-zinc-700 hover:border-slate-400 dark:hover:border-zinc-600 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 bg-slate-50/50 dark:bg-zinc-900/30 transition-all hover:bg-slate-100/50"
              >
                <Plus size={14} />
                <span>Add More Certificates or Work Orders</span>
              </button>
            </div>
          )}

          <input
            ref={addMoreInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            onChange={handleAddMoreFiles}
            className="hidden"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-[#2C2C2E] bg-slate-50/70 dark:bg-[#1C1C1E]/50 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {isSubmitting ? (
              <span className="flex items-center gap-2 text-teal-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping" />
                {uploadProgress || 'Saving unit compliance files...'}
              </span>
            ) : (
              <span>
                {items.length} {items.length === 1 ? 'record' : 'records'} ready to commit
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || items.length === 0}
              className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <ShieldCheck size={14} />
              <span>Save & Attach to Unit Records</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
