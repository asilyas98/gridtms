import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Link2, 
  ShieldCheck, 
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Driver, ComplianceDocument } from '../../types';
import { uploadFileToSupabase } from '../../lib/storage';
import { backendFetch } from '../../lib/backendApi';

export type DqfCategoryKey = 
  | 'Medical' 
  | 'MVR' 
  | 'CDL' 
  | 'Application' 
  | 'Verification' 
  | 'RoadTest' 
  | 'DrugAlcohol' 
  | 'Clearinghouse' 
  | 'Custom';

export interface DqfCategoryDef {
  key: DqfCategoryKey;
  label: string;
  sublabel: string;
  cfr: string;
  defaultYears: number | null; // null means permanent / no expiration
  syncField?: 'medicalCardExpiry' | 'cdlExpiry' | 'drugTestDate';
  syncLabel?: string;
}

export const DQF_CATEGORIES: DqfCategoryDef[] = [
  {
    key: 'Medical',
    label: 'Medical Examiner Certificate',
    sublabel: 'DOT Form MCSA-5876 (Physical Exam)',
    cfr: '49 CFR § 391.43',
    defaultYears: 2,
    syncField: 'medicalCardExpiry',
    syncLabel: 'Sync to Driver Profile (medicalCardExpiry)'
  },
  {
    key: 'MVR',
    label: 'Annual Motor Vehicle Record (MVR)',
    sublabel: 'State Driving History & Annual Review',
    cfr: '49 CFR § 391.25',
    defaultYears: 1
  },
  {
    key: 'CDL',
    label: 'Commercial Driver License (CDL)',
    sublabel: 'Front & Back License Copy',
    cfr: '49 CFR § 383 / § 391.11',
    defaultYears: 4,
    syncField: 'cdlExpiry',
    syncLabel: 'Sync to Driver Profile (cdlExpiry)'
  },
  {
    key: 'Application',
    label: 'Driver Application (Form 391)',
    sublabel: 'Mandatory 10-Year History Application',
    cfr: '49 CFR § 391.21',
    defaultYears: null
  },
  {
    key: 'Verification',
    label: 'Previous Employment Verification (DOT)',
    sublabel: 'Safety Performance History Inquiry',
    cfr: '49 CFR § 391.23',
    defaultYears: null
  },
  {
    key: 'RoadTest',
    label: 'Road Test Certificate (391.31)',
    sublabel: 'Certificate of Driver Road Evaluation',
    cfr: '49 CFR § 391.31',
    defaultYears: null
  },
  {
    key: 'DrugAlcohol',
    label: 'Drug & Alcohol Screening Result',
    sublabel: 'Pre-Employment / Random Screen Result',
    cfr: '49 CFR Part 40 / § 382.301',
    defaultYears: 1,
    syncField: 'drugTestDate',
    syncLabel: 'Sync to Driver Profile (drugTestDate)'
  },
  {
    key: 'Clearinghouse',
    label: 'FMCSA Clearinghouse Annual Query',
    sublabel: 'Full Query Consent & Verification',
    cfr: '49 CFR § 382.701',
    defaultYears: 1
  },
  {
    key: 'Custom',
    label: 'Custom Compliance / Training Record',
    sublabel: 'Certificates, TWIC, Hazmat, Training',
    cfr: 'Carrier Safety Standards',
    defaultYears: 1
  }
];

export function guessCategoryFromFilename(filename: string): DqfCategoryKey {
  const f = filename.toLowerCase();
  if (f.includes('med') || f.includes('physical') || f.includes('mcsa') || f.includes('5876') || f.includes('doctor')) {
    return 'Medical';
  }
  if (f.includes('mvr') || f.includes('motor') || f.includes('violation') || f.includes('driving')) {
    return 'MVR';
  }
  if (f.includes('cdl') || f.includes('license') || f.includes('licence')) {
    return 'CDL';
  }
  if (f.includes('app') || f.includes('employment') || f.includes('hire') || f.includes('391.21')) {
    return 'Application';
  }
  if (f.includes('verif') || f.includes('history') || f.includes('inquiry') || f.includes('previous')) {
    return 'Verification';
  }
  if (f.includes('road') || f.includes('roadtest') || f.includes('391.31') || f.includes('evaluation')) {
    return 'RoadTest';
  }
  if (f.includes('drug') || f.includes('alcohol') || f.includes('screen') || f.includes('tox') || f.includes('panel')) {
    return 'DrugAlcohol';
  }
  if (f.includes('clear') || f.includes('clearinghouse') || f.includes('query')) {
    return 'Clearinghouse';
  }
  return 'Medical';
}

function calculateFutureDate(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
}

export interface StagedItem {
  id: string;
  file: File;
  name: string;
  category: DqfCategoryKey;
  expiryDate: string;
  noExpiration: boolean;
  syncToProfile: boolean;
  extractedFields?: Record<string, string | null>;
  aiConfidence?: number;
}

async function fileAsBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

interface DqfUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  driver: Driver;
  initialFiles?: File[];
  targetCategory?: string; // Pre-bound category if launched from a specific checklist row
  onSave: (stagedItems: StagedItem[]) => Promise<void>;
}

export default function DqfUploadModal({
  isOpen,
  onClose,
  driver,
  initialFiles = [],
  targetCategory,
  onSave
}: DqfUploadModalProps) {
  const [items, setItems] = useState<StagedItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  // Initialize staged items whenever modal opens or initialFiles change
  useEffect(() => {
    if (!isOpen) {
      setItems([]);
      return;
    }

    if (initialFiles.length > 0) {
      const staged: StagedItem[] = initialFiles.map(file => {
        let catKey: DqfCategoryKey = 'Medical';

        if (targetCategory) {
          const match = DQF_CATEGORIES.find(c => 
            c.key.toLowerCase() === targetCategory.toLowerCase() ||
            c.label.toLowerCase() === targetCategory.toLowerCase() ||
            targetCategory.toLowerCase().includes(c.key.toLowerCase())
          );
          if (match) catKey = match.key;
        } else {
          catKey = guessCategoryFromFilename(file.name);
        }

        const catDef = DQF_CATEGORIES.find(c => c.key === catKey) || DQF_CATEGORIES[0];
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
  }, [isOpen, initialFiles, targetCategory]);

  const handleAddMoreFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles: File[] = Array.from(e.target.files);

    const staged: StagedItem[] = newFiles.map((file: File) => {
      const catKey = guessCategoryFromFilename(file.name);
      const catDef = DQF_CATEGORIES.find(c => c.key === catKey) || DQF_CATEGORIES[0];
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

  const handleCategoryChange = (itemId: string, newCatKey: DqfCategoryKey) => {
    const catDef = DQF_CATEGORIES.find(c => c.key === newCatKey) || DQF_CATEGORIES[0];
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

    // Validate that items with expiration have a date
    for (const item of items) {
      if (!item.noExpiration && !item.expiryDate) {
        alert(`Please specify an expiration date for "${item.name}" or check "No Expiration Date".`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setUploadProgress('LlamaIndex is labeling and parsing documents...');
      const analyzed: StagedItem[] = [];
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        setUploadProgress(`Analyzing document ${index + 1} of ${items.length}...`);
        try {
          const result = await backendFetch('/documents/analyze', {
            method: 'POST',
            body: JSON.stringify({ file_name: item.file.name, content_type: item.file.type, data_base64: await fileAsBase64(item.file) }),
          });
          const category = DQF_CATEGORIES.some(c => c.key === result.category) ? result.category as DqfCategoryKey : item.category;
          const categoryDef = DQF_CATEGORIES.find(c => c.key === category);
          analyzed.push({
            ...item,
            category,
            expiryDate: result.expiration_date || item.expiryDate,
            noExpiration: result.expiration_date ? false : item.noExpiration,
            syncToProfile: Boolean(categoryDef?.syncField),
            extractedFields: result.fields || {},
            aiConfidence: result.confidence,
          });
        } catch (error) {
          console.warn('AI document analysis unavailable; using manual labels.', error);
          analyzed.push(item);
        }
      }
      setUploadProgress('Saving labeled documents and extracted fields...');
      await onSave(analyzed);
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      alert(`Failed to save compliance files: ${err?.message || 'Unknown error'}`);
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
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-[#007AFF] flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Driver Qualification File Intake
                </h3>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-200/60 dark:bg-zinc-800 text-slate-700 dark:text-slate-300">
                  {driver.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Accurately classify each document and set expiration dates to synchronize with the driver profile.
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
                No files queued for upload
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Select documents to stage and label them for FMCSA audit compliance.
              </p>
              <button
                onClick={() => addMoreInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-[#007AFF] hover:bg-blue-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                Browse Files
              </button>
            </div>
          ) : (
            items.map((item, index) => {
              const selectedCatDef = DQF_CATEGORIES.find(c => c.key === item.category) || DQF_CATEGORIES[0];
              const fileSizeKb = Math.round(item.file.size / 1024);

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-[#2C2C2E] bg-white dark:bg-[#18181A] shadow-sm hover:border-slate-300 dark:hover:border-zinc-700 transition-colors space-y-4"
                >
                  {/* Top line: file name & delete action */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
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
                        FMCSA Document Type
                      </label>
                      <select
                        value={item.category}
                        onChange={(e) => handleCategoryChange(item.id, e.target.value as DqfCategoryKey)}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[#007AFF]"
                      >
                        {DQF_CATEGORIES.map(cat => (
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
                          Expiration Date
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                          <input
                            type="checkbox"
                            checked={item.noExpiration}
                            onChange={() => handleToggleNoExpiration(item.id)}
                            disabled={isSubmitting}
                            className="rounded border-slate-300 text-[#007AFF] focus:ring-0"
                          />
                          <span>Does Not Expire</span>
                        </label>
                      </div>

                      {item.noExpiration ? (
                        <div className="px-3 py-2 bg-slate-100 dark:bg-zinc-800/60 rounded-xl text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          <span>Permanent / Retained throughout driver tenure</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="date"
                            value={item.expiryDate}
                            onChange={(e) => handleExpiryChange(item.id, e.target.value)}
                            disabled={isSubmitting}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-[#007AFF]"
                          />
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-400">Presets:</span>
                            <button
                              type="button"
                              onClick={() => handlePresetYears(item.id, 1)}
                              disabled={isSubmitting}
                              className="px-2 py-0.5 text-[10px] font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 transition-colors"
                            >
                              +1 Year (Annual)
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePresetYears(item.id, 2)}
                              disabled={isSubmitting}
                              className="px-2 py-0.5 text-[10px] font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 transition-colors"
                            >
                              +2 Years (DOT Physical)
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
                        <Link2 size={14} className={item.syncToProfile ? 'text-[#007AFF]' : 'text-slate-400'} />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {selectedCatDef.syncLabel || 'Sync expiration date directly to driver profile'}
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
                        <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#007AFF]"></div>
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
                <span>Add More Documents to Queue</span>
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
              <span className="flex items-center gap-2 text-[#007AFF] font-medium">
                <span className="w-2 h-2 rounded-full bg-[#007AFF] animate-ping" />
                {uploadProgress || 'Saving documents...'}
              </span>
            ) : (
              <span>
                {items.length} {items.length === 1 ? 'document' : 'documents'} ready to commit
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
              className="px-5 py-2 text-xs font-semibold text-white bg-[#007AFF] hover:bg-blue-600 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <ShieldCheck size={14} />
              <span>Save & Attach to DQF</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
