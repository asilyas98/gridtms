import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Send, Save, CreditCard, Building, Paperclip, CheckSquare, Plus, Trash2, Printer, Download, CheckCircle2, Circle, Eye, Upload } from 'lucide-react';
import { Load, Invoice, Customer, LoadLineItem } from '../types';

interface Props {
  load: Load;
  customer?: Customer;
  onClose: () => void;
  onGenerate: (overrides: Partial<Invoice>, updatedLineItems: LoadLineItem[]) => void;
  onAddDocumentToLoad?: (loadId: string, docData: { name: string; type: string }) => void;
}

export default function InvoiceBuilderModal({ load, customer, onClose, onGenerate, onAddDocumentToLoad }: Props) {
  const [terms, setTerms] = useState<string>('Net 30');
  const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [dueDate, setDueDate] = useState<string>(defaultDueDate);
  const [method, setMethod] = useState<'Email' | 'Factoring' | 'Mail'>('Factoring');
  const [notes, setNotes] = useState<string>('');
  const [showDocs, setShowDocs] = useState<boolean>(false);
  const [localDocs, setLocalDocs] = useState<any[]>(load.documents || []);
  const [selectedDocs, setSelectedDocs] = useState<string[]>((load.documents || []).map(d => d.id));
  
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState('BOL');
  const [uploadSaveToLoad, setUploadSaveToLoad] = useState(true);

  const [lineItems, setLineItems] = useState<LoadLineItem[]>(
    load.lineItems && load.lineItems.length > 0 
      ? load.lineItems 
      : [{ id: `item-base-${Date.now()}`, description: 'Linehaul Freight Charges', amount: load.rate, type: 'Revenue' }]
  );

  useEffect(() => {
    let days = 0;
    if (terms === 'Net 15') days = 15;
    else if (terms === 'Net 30') days = 30;
    else if (terms === 'Net 60') days = 60;
    else if (terms === 'Due on Receipt') days = 0;
    
    if (terms !== 'Custom') {
      const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      setDueDate(date.toISOString().split('T')[0]);
    }
  }, [terms]);

  // Auto calculation matching logic
  const itemsTotal = lineItems
      .filter(i => i.type === 'Revenue')
      .reduce((sum, item) => sum + item.amount, 0);
  const finalAmount = itemsTotal > 0 ? itemsTotal : load.rate;
  const invNumber = `INV-${new Date().getFullYear()}-XXXXX`;

  const handleGenerate = () => {
    const attachedDocuments = localDocs.filter(d => selectedDocs.includes(d.id));
    onGenerate({
      dueDate,
      method,
      notes,
      amount: finalAmount,
      documents: attachedDocuments
    }, lineItems);
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { id: `item-${Date.now()}`, description: '', amount: 0, type: 'Revenue' }]);
  };

  const updateLineItem = (id: string, updates: Partial<LoadLineItem>) => {
    setLineItems(lineItems.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const handleUploadSave = () => {
    if (!uploadName) return;
    const newDoc = { id: `doc-new-${Date.now()}`, name: uploadName, type: uploadType, status: 'Valid' as any, expiryDate: '' };
    setLocalDocs([...localDocs, newDoc]);
    setSelectedDocs([...selectedDocs, newDoc.id]);
    if (uploadSaveToLoad && onAddDocumentToLoad) {
      onAddDocumentToLoad(load.id, { name: uploadName, type: uploadType });
    }
    setIsUploading(false);
    setUploadName('');
    setUploadType('BOL');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden relative flex flex-col md:flex-row h-[85vh] font-sans"
      >
        {/* Left Side: Configuration Builder */}
        <div className="w-full md:w-[40%] bg-slate-50 flex flex-col border-r border-slate-200">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white">
            <h2 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-orange/10 text-orange flex items-center justify-center">
                <FileText size={16} />
              </span>
              Invoice Builder
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-navy cursor-pointer transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-6 text-left">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Generation Settings</h3>
              
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Invoicing Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Email', 'Factoring', 'Mail'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border ${
                        method === m 
                          ? 'bg-navy text-white border-navy shadow-md' 
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {m === 'Email' && <Send size={12} className="mx-auto mb-1" />}
                      {m === 'Factoring' && <Building size={12} className="mx-auto mb-1" />}
                      {m === 'Mail' && <FileText size={12} className="mx-auto mb-1" />}
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {method === 'Factoring' && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest mb-1 items-center flex gap-1.5"><CheckSquare size={12}/> Notice of Assignment Applied</p>
                  <p className="text-[10px] text-blue-600/80 leading-tight">Factoring company NOA verbiage and remit-to address will automatically be injected into the final invoice PDF.</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <div className="space-y-1.5 flex flex-col flex-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Payment Terms</label>
                  <select 
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-navy focus:outline-none focus:border-orange font-mono transition-all"
                  >
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div className="space-y-1.5 flex flex-col flex-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Due Date</label>
                  <input 
                    type="date" 
                    value={dueDate}
                    disabled={terms !== 'Custom'}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={`p-3 border border-slate-200 rounded-xl text-xs font-bold text-navy focus:outline-none focus:border-orange font-mono transition-all ${terms !== 'Custom' ? 'bg-slate-100 opacity-70' : 'bg-white'}`}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Line Items & Amounts</h3>
                <button 
                  onClick={handleAddLineItem}
                  className="text-[9px] font-black text-orange hover:text-orange/80 uppercase tracking-widest flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12}/> Add Item
                </button>
              </div>
              
              <div className="space-y-2">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={item.description}
                      onChange={e => updateLineItem(item.id, { description: e.target.value })}
                      placeholder="Description"
                      className="flex-[2] p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-navy focus:outline-none focus:border-orange font-mono"
                    />
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 font-bold">$</span>
                      <input 
                        type="number" 
                        value={item.amount}
                        onChange={e => updateLineItem(item.id, { amount: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2 pl-6 bg-white border border-slate-200 rounded-lg text-xs font-bold text-navy focus:outline-none focus:border-orange font-mono text-right"
                      />
                    </div>
                    {lineItems.length > 1 && (
                      <button 
                        onClick={() => removeLineItem(item.id)}
                        className="p-2 text-slate-400 hover:text-red hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 size={14}/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between items-center bg-slate-100 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Total Invoice Amount</span>
                <span className="text-sm font-black text-navy border-b border-navy pb-0.5">${finalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Customizations</h3>
              
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Invoice Notes / Memo</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Thank you for your business..."
                  rows={3}
                  className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-navy focus:outline-none focus:border-orange resize-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <div 
                  onClick={() => setShowDocs(!showDocs)}
                  className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-200 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                      <Paperclip size={14} />
                    </span>
                    <div>
                      <p className="text-[10px] font-black text-navy uppercase tracking-widest leading-none">Attach Documents</p>
                      <p className="text-[9px] text-slate-500 font-bold mt-1">Bind BOL / Lumper receipts to PDF</p>
                    </div>
                  </div>
                  <div className={`${selectedDocs.length > 0 ? 'bg-orange/10 text-orange border-orange/20' : 'bg-white text-navy border-slate-200'} text-[10px] font-bold px-2 py-1 rounded-md border transition-colors`}>
                    {selectedDocs.length} Attached
                  </div>
                </div>

                <AnimatePresence>
                  {showDocs && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-2 space-y-1 bg-white border border-slate-200 rounded-xl mt-2">
                        {localDocs.length === 0 && !isUploading && (
                          <div className="p-3 bg-orange/5 border border-orange/20 rounded-xl text-center">
                            <p className="text-[10px] font-bold text-orange">No documents have been uploaded for this load yet.</p>
                          </div>
                        )}
                        {localDocs.map(doc => {
                          const isSelected = selectedDocs.includes(doc.id);
                          return (
                            <div 
                              key={doc.id}
                              onClick={() => {
                                if (isSelected) setSelectedDocs(selectedDocs.filter(id => id !== doc.id));
                                else setSelectedDocs([...selectedDocs, doc.id]);
                              }}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-orange/5 border-orange/10 border' : 'hover:bg-slate-50 border border-transparent'}`}
                            >
                              <div className="flex items-center gap-2">
                                {isSelected ? <CheckCircle2 size={16} className="text-orange" /> : <Circle size={16} className="text-slate-300" />}
                                <span className={`text-xs font-bold ${isSelected ? 'text-navy' : 'text-slate-600'}`}>{doc.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{doc.type}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingDoc(doc.name);
                                  }}
                                  className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-navy transition-all"
                                  title="View Document"
                                >
                                  <Eye size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {!isUploading && (
                          <button 
                            onClick={() => setIsUploading(true)}
                            className="w-full mt-2 py-2 border-2 border-dashed border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:border-orange hover:text-orange transition-all flex items-center justify-center gap-2"
                          >
                            <Upload size={14} /> Upload New Document
                          </button>
                        )}
                        {isUploading && (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 mt-2">
                            <div>
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1">Select File</label>
                              <input 
                                type="file"
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setUploadName(file.name.split('.')[0]);
                                  }
                                }}
                                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:bg-orange/10 file:text-orange hover:file:bg-orange/20 cursor-pointer"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1">Document Name</label>
                              <input 
                                type="text"
                                value={uploadName}
                                onChange={e => setUploadName(e.target.value)}
                                placeholder="e.g. Scale Ticket"
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-navy focus:outline-none focus:border-orange"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1">Document Type</label>
                              <select 
                                value={uploadType}
                                onChange={e => setUploadType(e.target.value)}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-navy focus:outline-none focus:border-orange"
                              >
                                <option value="BOL">BOL</option>
                                <option value="Lumper">Lumper</option>
                                <option value="Scale Ticket">Scale Ticket</option>
                                <option value="Receipt">Receipt</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-2 px-1">
                              <input 
                                type="checkbox" 
                                id="saveToLoad"
                                checked={uploadSaveToLoad}
                                onChange={e => setUploadSaveToLoad(e.target.checked)}
                                className="rounded text-orange focus:ring-orange"
                              />
                              <label htmlFor="saveToLoad" className="text-[10px] font-bold text-slate-600">Save to load permanently</label>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                              <button onClick={() => setIsUploading(false)} className="flex-1 py-2 text-[10px] font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-all">Cancel</button>
                              <button onClick={handleUploadSave} className="flex-[2] py-2 bg-orange text-white text-[10px] font-bold rounded-lg hover:bg-orange/90 transition-all shadow-sm">Save & Attach</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border-t border-slate-200 flex items-center gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handleGenerate}
              className="flex-[2] py-3 px-4 bg-orange text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange/90 transition-all shadow-lg shadow-orange/20 flex justify-center items-center gap-2 cursor-pointer"
            >
              <Save size={14} /> Generate & Send Invoice
            </button>
          </div>
        </div>

        {/* Right Side: PDF Visual Preview */}
        <div className="hidden md:flex flex-col flex-1 bg-slate-100 text-left">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-green pb-1" />
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live PDF Preview</span>
             </div>
             <div className="flex gap-2">
                <button 
                  onClick={() => window.print()}
                  className="p-1.5 text-slate-400 hover:text-navy bg-white border border-slate-200 rounded-md cursor-pointer transition-all"
                  title="Print Invoice"
                >
                  <Printer size={14}/>
                </button>
                <button 
                  onClick={() => alert("Downloading PDF Bundle...")}
                  className="p-1.5 text-slate-400 hover:text-navy bg-white border border-slate-200 rounded-md cursor-pointer transition-all"
                  title="Download PDF"
                >
                  <Download size={14}/>
                </button>
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 flex justify-center items-start">
            {/* The PDF Document Mock */}
            <div className="w-full max-w-[600px] bg-white shadow-xl shadow-slate-200 border border-slate-200 aspect-[8.5/11] flex flex-col text-slate-800 scale-[0.95] origin-top">
               {/* PDF Header */}
               <div className="p-8 border-b-2 border-slate-800 flex justify-between items-start">
                  <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">INVOICE</h1>
                    <p className="text-sm font-mono text-slate-500 mt-1">{invNumber}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Date: {new Date().toISOString().split('T')[0]}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-bold text-red">Due: {dueDate}</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-bold tracking-tight text-navy">Alpha Logistics TMS</h2>
                    <p className="text-xs text-slate-500 mt-1">123 Freight Way, Suite 100</p>
                    <p className="text-xs text-slate-500">Chicago, IL 60601</p>
                    <p className="text-xs text-slate-500 mt-2 flex items-center justify-end gap-1"><CreditCard size={12}/> Pay Online</p>
                  </div>
               </div>

               {/* PDF Bill To */}
               <div className="px-8 py-6 flex justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Bill To</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{customer?.name || 'Customer Name'}</p>
                    <p className="text-xs text-slate-600">
                      {customer?.address 
                        ? `${customer.address.street}, ${customer.address.city}, ${customer.address.state} ${customer.address.zip}` 
                        : '123 Customer St'}
                    </p>
                    <p className="text-xs text-slate-600">{customer?.email || 'ap@customer.com'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Load Info</p>
                    <p className="text-sm font-mono text-slate-900 mt-1">{load.loadNumber}</p>
                    <p className="text-xs text-slate-600">Delivered: {load.deliveryDate}</p>
                  </div>
               </div>

               {/* Notice of Assignment Placeholder */}
               {method === 'Factoring' && (
                  <div className="mx-8 mb-6 p-4 border border-blue-200 bg-blue-50 text-xs text-blue-900 flex gap-3">
                     <Building size={20} className="shrink-0 opacity-50"/>
                     <div>
                        <p className="font-bold border-b border-blue-200 pb-1 mb-1 tracking-wider uppercase text-[10px]">Notice of Assignment</p>
                        <p className="font-medium text-[11px] leading-relaxed">This account has been assigned to and is payable ONLY to: <strong>Apex Capital Corp</strong>. Remit to: Dept 1234, PO Box 5678, Dallas, TX.</p>
                     </div>
                  </div>
               )}

               {/* Line Items */}
               <div className="px-8 flex-1">
                 <table className="w-full text-sm">
                   <thead>
                     <tr className="border-b border-slate-200">
                       <th className="pb-2 text-left font-bold text-[10px] uppercase tracking-widest text-slate-400">Description</th>
                       <th className="pb-2 text-right font-bold text-[10px] uppercase tracking-widest text-slate-400">Amount</th>
                     </tr>
                   </thead>
                   <tbody className="font-mono text-slate-600 border-b border-slate-200">
                     {lineItems.filter(i => i.type === 'Revenue').map((item, idx) => (
                       <tr key={idx}>
                         <td className="py-3 text-left font-sans font-medium text-xs text-slate-800">{item.description || 'Custom Item'}</td>
                         <td className="py-3 text-right font-medium text-xs text-slate-800">${item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>

               {/* Totals & Notes */}
               <div className="p-8 flex items-start justify-between bg-slate-50 mt-auto border-t border-slate-200">
                 <div className="w-1/2">
                   {notes && (
                      <div className="text-xs text-slate-600">
                        <span className="font-black text-[10px] uppercase tracking-widest block mb-1 text-slate-400">Notes & Memos:</span>
                        <span className="italic block whitespace-pre-wrap">{notes}</span>
                      </div>
                   )}
                 </div>
                 <div className="w-full max-w-[200px] text-right">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-1">Total Due</p>
                    <p className="text-3xl font-black text-slate-900 border-t-2 border-slate-800 pt-1">${finalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                 </div>
               </div>
            </div>
          </div>
        </div>

      </motion.div>

      {/* Document Viewer Modal Overlay */}
      <AnimatePresence>
        {viewingDoc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-navy/90 backdrop-blur-md flex flex-col items-center justify-center p-8"
          >
            <div className="w-full max-w-3xl bg-white flex flex-col rounded-xl overflow-hidden shadow-2xl h-[90vh]">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-navy flex items-center gap-2"><FileText size={16} /> Viewing Document: {viewingDoc}</h3>
                <button onClick={() => setViewingDoc(null)} className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-navy transition-all"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-8">
                {/* Mock rendering of a document */}
                <div className="bg-white w-full max-w-[600px] aspect-[8.5/11] border border-slate-200 shadow-sm flex flex-col items-center justify-start relative p-12">
                  <div className="w-full h-40 border-4 border-slate-100 border-dashed rounded-lg flex items-center justify-center opacity-50 mb-12">
                    <p className="text-slate-300 font-bold uppercase tracking-widest text-xl text-center px-4">{viewingDoc} PREVIEW</p>
                  </div>
                  <div className="w-full space-y-4">
                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                    <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                    <div className="h-4 bg-slate-100 rounded w-4/6"></div>
                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                    <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
