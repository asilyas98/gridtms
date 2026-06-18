import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { TmsDocument } from '../types';
import {
  FolderOpen, Search, Filter, Upload, Download, FileText, Trash2, Eye,
  Calendar, User, Truck as TruckIcon, Building2, Shield, Package, X, Plus, ChevronDown
} from 'lucide-react';

const DOCUMENT_TYPES = [
  'BOL', 'POD', 'Rate Confirmation', 'Lumper Receipt', 'Scale Ticket', 'Invoice',
  'Settlement', 'Insurance Certificate', 'Medical Card', 'CDL', 'MVR', 'Drug Test',
  'Employment Application', 'Road Test Certificate', 'Annual Inspection', 'DVIR',
  'Registration', 'Title', 'Lease Agreement', 'W-9', 'Authority Letter', 'BOC-3',
  'Policy Document', 'Photo', 'Other'
];

const ENTITY_TYPES = ['Load', 'Driver', 'Truck', 'Trailer', 'Customer', 'Carrier', 'Credential'] as const;

const entityIcons: Record<string, React.ElementType> = {
  Load: Package,
  Driver: User,
  Truck: TruckIcon,
  Trailer: TruckIcon,
  Customer: Building2,
  Carrier: Shield,
  Credential: Shield,
};

export default function DocumentsView() {
  const { documents, addTmsDocument, removeTmsDocument, drivers, trucks, trailers, customers, loads } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterEntityType, setFilterEntityType] = useState<string>('');
  const [filterDocType, setFilterDocType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<TmsDocument | null>(null);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    name: '',
    type: 'Other',
    entityType: 'Carrier' as TmsDocument['entityType'],
    entityId: 'carrier-1',
    effectiveDate: '',
    expirationDate: '',
    notes: '',
  });

  const filteredDocs = useMemo(() => {
    let docs = [...documents];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter(d => d.name.toLowerCase().includes(q) || d.type.toLowerCase().includes(q));
    }
    if (filterEntityType) docs = docs.filter(d => d.entityType === filterEntityType);
    if (filterDocType) docs = docs.filter(d => d.type === filterDocType);
    if (filterStatus) docs = docs.filter(d => d.status === filterStatus);
    return docs.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
  }, [documents, searchQuery, filterEntityType, filterDocType, filterStatus]);

  const getEntityName = (doc: TmsDocument): string => {
    switch (doc.entityType) {
      case 'Driver': return drivers.find(d => d.id === doc.entityId)?.name || doc.entityId;
      case 'Truck': return trucks.find(t => t.id === doc.entityId)?.unitNumber || doc.entityId;
      case 'Trailer': return trailers.find(t => t.id === doc.entityId)?.unitNumber || doc.entityId;
      case 'Customer': return customers.find(c => c.id === doc.entityId)?.name || doc.entityId;
      case 'Load': return loads.find(l => l.id === doc.entityId)?.loadNumber || doc.entityId;
      case 'Carrier': return 'Grid Transport Corp';
      default: return doc.entityId;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Valid': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
      case 'Expiring': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
      case 'Expired': return 'bg-red-500/10 text-red-600 dark:text-red-400';
      case 'Archived': return 'bg-slate-500/10 text-slate-500';
      default: return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    }
  };

  const handleUpload = () => {
    if (!uploadForm.name) return;
    addTmsDocument({
      name: uploadForm.name,
      type: uploadForm.type as TmsDocument['type'],
      entityType: uploadForm.entityType,
      entityId: uploadForm.entityId,
      uploadDate: new Date().toISOString().split('T')[0],
      effectiveDate: uploadForm.effectiveDate || undefined,
      expirationDate: uploadForm.expirationDate || undefined,
      status: uploadForm.expirationDate ? 'Valid' : undefined,
      uploadedBy: 'Admin User',
      notes: uploadForm.notes || undefined,
    });
    setShowUploadModal(false);
    setUploadForm({ name: '', type: 'Other', entityType: 'Carrier', entityId: 'carrier-1', effectiveDate: '', expirationDate: '', notes: '' });
  };

  // Stats
  const totalDocs = documents.length;
  const expiringDocs = documents.filter(d => d.status === 'Expiring').length;
  const expiredDocs = documents.filter(d => d.status === 'Expired').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <FolderOpen size={24} className="text-orange" />
            Document Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Universal document store — every file, organized by entity (§10)</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange text-white rounded-xl text-sm font-semibold hover:brightness-110 transition-all shadow-sm"
          >
            <Upload size={16} />
            Upload Document
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all">
            <Download size={16} />
            Bulk Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Documents', value: totalDocs, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Valid', value: totalDocs - expiringDocs - expiredDocs, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Expiring Soon', value: expiringDocs, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Expired', value: expiredDocs, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 border border-slate-200/60 dark:border-[#2C2C2E]">
            <p className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wide">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200/60 dark:border-[#2C2C2E] p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[240px] bg-slate-50 dark:bg-[#121214] rounded-xl px-3 py-2 border border-slate-200/60 dark:border-[#2C2C2E]">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search documents by name or type..."
              className="bg-transparent border-none outline-none text-sm w-full placeholder-slate-400"
            />
          </div>
          <select
            value={filterEntityType}
            onChange={e => setFilterEntityType(e.target.value)}
            className="bg-slate-50 dark:bg-[#121214] border border-slate-200/60 dark:border-[#2C2C2E] rounded-xl px-3 py-2 text-sm text-slate-600 dark:text-zinc-300 min-w-[140px]"
          >
            <option value="">All Entities</option>
            {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filterDocType}
            onChange={e => setFilterDocType(e.target.value)}
            className="bg-slate-50 dark:bg-[#121214] border border-slate-200/60 dark:border-[#2C2C2E] rounded-xl px-3 py-2 text-sm text-slate-600 dark:text-zinc-300 min-w-[160px]"
          >
            <option value="">All Types</option>
            {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-50 dark:bg-[#121214] border border-slate-200/60 dark:border-[#2C2C2E] rounded-xl px-3 py-2 text-sm text-slate-600 dark:text-zinc-300 min-w-[120px]"
          >
            <option value="">All Status</option>
            <option value="Valid">Valid</option>
            <option value="Expiring">Expiring</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200/60 dark:border-[#2C2C2E] overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-[#2C2C2E] bg-slate-50/50 dark:bg-[#121214]/50">
          <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
            {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-[#2C2C2E]">
          {filteredDocs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-zinc-500">
              <FolderOpen size={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No documents found</p>
              <p className="text-xs mt-1">Adjust your filters or upload a new document</p>
            </div>
          ) : (
            filteredDocs.map(doc => {
              const EntityIcon = entityIcons[doc.entityType] || FileText;
              return (
                <div key={doc.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/50 dark:hover:bg-[#121214]/30 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-orange/10 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-orange" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{doc.name}</p>
                      {doc.status && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusColor(doc.status)}`}>
                          {doc.status}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400 dark:text-zinc-500">
                      <span className="flex items-center gap-1">
                        <EntityIcon size={12} />
                        {doc.entityType}: {getEntityName(doc)}
                      </span>
                      <span>Type: {doc.type}</span>
                      <span>Uploaded: {doc.uploadDate}</span>
                      {doc.expirationDate && <span>Expires: {doc.expirationDate}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setSelectedDoc(doc)}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-blue-500 transition-colors"
                      title="View details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => removeTmsDocument(doc.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl w-full max-w-lg border border-slate-200/60 dark:border-[#2C2C2E] shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#2C2C2E]">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Upload Document</h2>
              <button onClick={() => setShowUploadModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">Document Name *</label>
                <input
                  type="text"
                  value={uploadForm.name}
                  onChange={e => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 w-full bg-slate-50 dark:bg-[#121214] border border-slate-200/60 dark:border-[#2C2C2E] rounded-xl px-3 py-2.5 text-sm"
                  placeholder="e.g., CDL Copy - Marcus Williams"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">Document Type</label>
                  <select
                    value={uploadForm.type}
                    onChange={e => setUploadForm(prev => ({ ...prev, type: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 dark:bg-[#121214] border border-slate-200/60 dark:border-[#2C2C2E] rounded-xl px-3 py-2.5 text-sm"
                  >
                    {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">Entity Type</label>
                  <select
                    value={uploadForm.entityType}
                    onChange={e => setUploadForm(prev => ({ ...prev, entityType: e.target.value as TmsDocument['entityType'] }))}
                    className="mt-1 w-full bg-slate-50 dark:bg-[#121214] border border-slate-200/60 dark:border-[#2C2C2E] rounded-xl px-3 py-2.5 text-sm"
                  >
                    {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">Effective Date</label>
                  <input
                    type="date"
                    value={uploadForm.effectiveDate}
                    onChange={e => setUploadForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 dark:bg-[#121214] border border-slate-200/60 dark:border-[#2C2C2E] rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">Expiration Date</label>
                  <input
                    type="date"
                    value={uploadForm.expirationDate}
                    onChange={e => setUploadForm(prev => ({ ...prev, expirationDate: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 dark:bg-[#121214] border border-slate-200/60 dark:border-[#2C2C2E] rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">Notes</label>
                <textarea
                  value={uploadForm.notes}
                  onChange={e => setUploadForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="mt-1 w-full bg-slate-50 dark:bg-[#121214] border border-slate-200/60 dark:border-[#2C2C2E] rounded-xl px-3 py-2.5 text-sm resize-none h-20"
                  placeholder="Optional notes..."
                />
              </div>
              <div className="border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-xl p-6 text-center">
                <Upload size={24} className="mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-zinc-400">Drop file here or click to browse</p>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">PDF, JPG, PNG up to 10MB</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-[#2C2C2E] flex items-center justify-end gap-3">
              <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadForm.name}
                className="px-5 py-2 bg-orange text-white text-sm font-semibold rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Upload Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelectedDoc(null)}>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl w-full max-w-md border border-slate-200/60 dark:border-[#2C2C2E] shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#2C2C2E]">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Document Details</h2>
              <button onClick={() => setSelectedDoc(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {[
                ['Name', selectedDoc.name],
                ['Type', selectedDoc.type],
                ['Entity', `${selectedDoc.entityType}: ${getEntityName(selectedDoc)}`],
                ['Upload Date', selectedDoc.uploadDate],
                ['Effective Date', selectedDoc.effectiveDate || '—'],
                ['Expiration Date', selectedDoc.expirationDate || '—'],
                ['Status', selectedDoc.status || '—'],
                ['Uploaded By', selectedDoc.uploadedBy || '—'],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase">{label}</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
