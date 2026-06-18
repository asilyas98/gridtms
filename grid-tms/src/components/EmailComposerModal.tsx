import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Send, Mail, Paperclip, FileText } from 'lucide-react';
import { Invoice, Customer } from '../types';
import { useData } from '../context/DataContext';

interface Props {
  invoice: Invoice;
  customer?: Customer;
  onClose: () => void;
  onSend: (emailData: { to: string; subject: string; body: string }) => void;
}

export default function EmailComposerModal({ invoice, customer, onClose, onSend }: Props) {
  const { companySettings } = useData();
  
  const [toEmail, setToEmail] = useState(customer?.email || '');
  const [subject, setSubject] = useState(`Invoice ${invoice.invoiceNumber} from ${companySettings.carrierName}`);
  const defaultBody = `Hello ${customer?.name || 'Customer'},\n\nPlease find attached the invoice ${invoice.invoiceNumber} for load ${invoice.loadId}.\n\nTotal Due: $${invoice.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}\nDue Date: ${invoice.dueDate}\n\nThank you for your business!\n\nBest regards,\n${companySettings.carrierName}`;
  const [body, setBody] = useState(defaultBody);

  const handleSend = () => {
    onSend({ to: toEmail, subject, body });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden relative flex flex-col font-sans"
      >
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-orange/10 text-orange flex items-center justify-center">
              <Mail size={16} />
            </span>
            Compose Email
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-navy transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-4 text-left">
          {/* Sender Context Badge */}
          <div className="flex items-center justify-between p-3 bg-slate-100 rounded-xl border border-slate-200">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">From</span>
             {companySettings.emailIntegrationProvider ? (
               <span className="text-[11px] font-bold text-navy flex items-center gap-1.5">
                 <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
                 {companySettings.emailIntegrationAccount} <span className="text-slate-400 font-normal">via {companySettings.emailIntegrationProvider}</span>
               </span>
             ) : (
               <span className="text-[11px] font-bold text-slate-500">System Default <span className="text-slate-400 font-normal">(no-reply@gridtms.com)</span></span>
             )}
          </div>

          <div className="space-y-1.5 flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">To</label>
            <input 
              type="email" 
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-navy focus:outline-none focus:border-orange transition-all w-full"
            />
          </div>

          <div className="space-y-1.5 flex flex-col">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Subject</label>
            <input 
              type="text" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-navy focus:outline-none focus:border-orange transition-all w-full"
            />
          </div>

          <div className="space-y-1.5 flex flex-col flex-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Message Body</label>
            <textarea 
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-orange resize-none transition-all w-full"
            />
          </div>

          <div className="space-y-2 mt-4">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1"><Paperclip size={12}/> Attachments</label>
            <div className="flex flex-col gap-2">
               <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                 <div className="p-2 bg-red-50 text-red rounded-lg"><FileText size={16}/></div>
                 <div className="flex-1">
                    <p className="text-xs font-bold text-navy">{invoice.invoiceNumber}.pdf</p>
                    <p className="text-[10px] text-slate-500">Auto-generated Invoice PDF</p>
                 </div>
               </div>
               {invoice.documents && invoice.documents.map(doc => (
                 <div key={doc.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                   <div className="p-2 bg-slate-100 text-slate-400 rounded-lg"><FileText size={16}/></div>
                   <div className="flex-1">
                      <p className="text-xs font-bold text-navy">{doc.name}.pdf</p>
                      <p className="text-[10px] text-slate-500">{doc.type}</p>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button 
            onClick={onClose}
            className="py-3 px-6 bg-white text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-200"
          >
            Cancel
          </button>
          <button 
            onClick={handleSend}
            className="py-3 px-6 bg-orange text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange/90 transition-all shadow-lg shadow-orange/20 flex justify-center items-center gap-2"
          >
            <Send size={14} /> Send Email
          </button>
        </div>
      </motion.div>
    </div>
  );
}
