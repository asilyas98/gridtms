import React, { useEffect } from 'react';
import { X, Download, FileText, ShieldCheck, Calendar, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface PreviewDocData {
  name: string;
  type: string;
  url?: string;
  expiryDate?: string;
  status?: string;
  entityName: string;
  entityType: 'driver' | 'truck';
}

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: PreviewDocData | null;
  onDownload?: (doc: PreviewDocData) => void;
}

export default function DocumentPreviewModal({
  isOpen,
  onClose,
  doc,
  onDownload
}: DocumentPreviewModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !doc) return null;

  const isPdf = doc.url?.includes('application/pdf') || doc.url?.toLowerCase().endsWith('.pdf');
  const isImage = doc.url?.startsWith('data:image') || /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.url || '');

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-4xl h-[85vh] bg-white dark:bg-[#121214] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2C2C2E] overflow-hidden flex flex-col"
      >
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#2C2C2E] flex items-center justify-between bg-slate-50/70 dark:bg-[#1C1C1E]/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-[#007AFF] flex items-center justify-center font-bold shrink-0">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm md:text-base font-semibold text-slate-900 dark:text-white truncate">
                  {doc.name}
                </h3>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-200/60 dark:bg-zinc-800 text-slate-700 dark:text-slate-300">
                  {doc.entityName}
                </span>
                {doc.status && (
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    doc.status === 'Valid' ? 'bg-teal/15 text-teal' : doc.status === 'Expiring' ? 'bg-orange/15 text-orange' : 'bg-red-50 text-red-500'
                  }`}>
                    {doc.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{doc.type}</span>
                {doc.expiryDate && (
                  <>
                    <span>·</span>
                    <span className="font-mono">Expires: {doc.expiryDate}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onDownload && (
              <button
                onClick={() => onDownload(doc)}
                className="px-3 py-1.5 bg-[#007AFF] hover:bg-blue-600 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                title="Download document"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Download</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Close viewer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Viewport Content */}
        <div className="flex-1 bg-slate-100/50 dark:bg-black/30 overflow-auto p-4 flex items-center justify-center">
          {doc.url ? (
            isImage ? (
              <div className="max-w-full max-h-full flex items-center justify-center p-2">
                <img
                  src={doc.url}
                  alt={doc.name}
                  className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-md border border-slate-200 dark:border-zinc-800"
                />
              </div>
            ) : isPdf ? (
              <object
                data={doc.url}
                type="application/pdf"
                className="w-full h-full rounded-xl border border-slate-200 dark:border-zinc-800 shadow-inner bg-white"
              >
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <FileText size={48} className="text-slate-400 mb-3" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    PDF Document Ready
                  </p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Your browser does not support embedded PDF viewing.
                  </p>
                  <a
                    href={doc.url}
                    download={doc.name}
                    className="px-4 py-2 bg-[#007AFF] text-white rounded-xl text-xs font-semibold flex items-center gap-2"
                  >
                    <Download size={14} /> Download Document
                  </a>
                </div>
              </object>
            ) : (
              <iframe
                src={doc.url}
                title={doc.name}
                className="w-full h-full rounded-xl border border-slate-200 dark:border-zinc-800 shadow-inner bg-white"
              />
            )
          ) : (
            /* Document Dossier Certificate Preview */
            <div className="max-w-xl w-full bg-white dark:bg-[#18181A] rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-lg p-8 space-y-6">
              <div className="border-b border-slate-100 dark:border-zinc-800 pb-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
                    FMCSA Certified Record Dossier
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {doc.type}
                  </h4>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ShieldCheck size={22} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Target Entity</p>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{doc.entityName}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Record Classification</p>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{doc.type}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl">
                  <p className="text-[10px] uppercase font-bold text-slate-400">File Reference</p>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5 truncate">{doc.name}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Audit Status</p>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                    <ShieldCheck size={14} /> Verified in Compliance Vault
                  </p>
                </div>
              </div>

              {doc.expiryDate && (
                <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-[#007AFF]" />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Regulatory Expiration:</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{doc.expiryDate}</span>
                </div>
              )}

              <div className="pt-2 text-center text-xs text-slate-400">
                Official Commercial Motor Vehicle / Driver Qualification Record archived in TMS compliance database.
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
