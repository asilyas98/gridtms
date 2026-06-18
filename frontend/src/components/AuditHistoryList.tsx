import React, { useEffect, useState } from 'react';
import { AuditLogEntry } from '../types';
import { Shield, Clock, FileText, Package, User } from 'lucide-react';
import { useData } from '../context/DataContext';

interface AuditHistoryListProps {
  entityType?: 'Load' | 'Invoice' | 'Document' | 'Driver' | 'Truck' | 'Trailer' | 'Carrier';
  entityId?: string;
  limit?: number;
}

const actionColors: Record<string, string> = {
  Create: 'bg-emerald-100 text-emerald-700',
  Update: 'bg-blue-100 text-blue-700',
  Delete: 'bg-red-100 text-red-700',
  StatusChange: 'bg-purple-100 text-purple-700',
};

const entityIcons: Record<string, React.ElementType> = {
  Load: Package,
  Invoice: FileText,
  Document: FileText,
  Driver: User,
  Truck: Package,
  Trailer: Package,
  Carrier: Shield,
};

export default function AuditHistoryList({ entityType, entityId, limit = 10 }: AuditHistoryListProps) {
  const { auditLog } = useData();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // We can fetch from API or just use context. 
    // Since DataContext has auditLog, we can filter it locally for instant UI, 
    // or fetch from /api/audit-log. Here we'll just filter context since it's an overlay.
    let filtered = auditLog;
    if (entityType) filtered = filtered.filter(l => l.entityType === entityType);
    if (entityId) filtered = filtered.filter(l => l.entityId === entityId);
    
    // sort by timestamp descending
    filtered = [...filtered].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    setLogs(filtered.slice(0, limit));
    setIsLoading(false);
  }, [auditLog, entityType, entityId, limit]);

  if (isLoading) {
    return <div className="p-4 text-center text-slate-400 text-sm">Loading audit trail...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="p-6 text-center border-2 border-dashed border-slate-100 rounded-2xl">
        <Shield size={24} className="mx-auto text-slate-300 mb-2" />
        <p className="text-sm font-bold text-slate-500">No Audit Logs Found</p>
        <p className="text-[11px] text-slate-400 mt-1">Actions on this entity will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map(log => {
        const Icon = entityIcons[log.entityType] || Shield;
        return (
          <div key={log.id} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${actionColors[log.action] || 'bg-slate-100 text-slate-600'}`}>
              <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {log.action} {log.entityType}
                </p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">{log.description}</p>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 font-medium">
                <span className="flex items-center gap-1"><User size={10} /> {log.userName}</span>
                {log.entityName && <span>• {log.entityName}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
