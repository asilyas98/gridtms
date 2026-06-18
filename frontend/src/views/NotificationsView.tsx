import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { TmsNotification } from '../types';
import {
  Bell, BellRing, CheckCircle2, AlertTriangle, AlertCircle, Info,
  Clock, Filter, X, ChevronRight, Eye, User, Truck as TruckIcon,
  Package, CreditCard, Shield, FileText, Check, Archive
} from 'lucide-react';

interface NotificationsViewProps {
  navigate: (view: string) => void;
}

const priorityConfig: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  Critical: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', icon: AlertCircle },
  High: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', icon: AlertTriangle },
  Medium: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', icon: Info },
  Low: { color: 'text-slate-500', bg: 'bg-slate-500/10', icon: Clock },
};

const typeIcons: Record<string, React.ElementType> = {
  Expiration: Clock,
  'Filing Deadline': FileText,
  Compliance: Shield,
  Overdue: CreditCard,
  'Missing Document': FileText,
  System: Info,
  Dispatch: Package,
};

const entityNavMap: Record<string, string> = {
  Driver: 'assets',
  Truck: 'assets',
  Trailer: 'assets',
  Load: 'loads',
  Invoice: 'invoices',
  Credential: 'settings',
  Carrier: 'settings',
};

export default function NotificationsView({ navigate }: NotificationsViewProps) {
  const { notifications, markNotificationRead, markAllNotificationsRead, dismissNotification, unreadNotificationCount } = useData();
  
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedNotif, setSelectedNotif] = useState<TmsNotification | null>(null);

  const activeNotifications = useMemo(() => {
    let notifs = notifications.filter(n => n.status !== 'Dismissed');
    if (filterPriority) notifs = notifs.filter(n => n.priority === filterPriority);
    if (filterType) notifs = notifs.filter(n => n.type === filterType);
    if (filterStatus) notifs = notifs.filter(n => n.status === filterStatus);
    return notifs;
  }, [notifications, filterPriority, filterType, filterStatus]);

  const handleOpen = (notif: TmsNotification) => {
    if (notif.status === 'Unread') markNotificationRead(notif.id);
    setSelectedNotif(notif);
  };

  const handleNavigate = (notif: TmsNotification) => {
    if (notif.entityType) {
      const target = entityNavMap[notif.entityType];
      if (target) navigate(target);
    }
  };

  // Unique types for filter
  const notifTypes = [...new Set(notifications.map(n => n.type))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Bell size={24} className="text-orange" />
            Notification Center
            {unreadNotificationCount > 0 && (
              <span className="text-xs font-bold bg-red-500 text-white px-2.5 py-1 rounded-full animate-pulse">
                {unreadNotificationCount} new
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Proactive compliance alerts, filing deadlines, and system notifications (§22)</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={markAllNotificationsRead}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all"
          >
            <Check size={16} />
            Mark All Read
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Unread', value: unreadNotificationCount, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', icon: BellRing },
          { label: 'Critical / High', value: notifications.filter(n => (n.priority === 'Critical' || n.priority === 'High') && n.status !== 'Dismissed').length, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', icon: AlertTriangle },
          { label: 'Open Tasks', value: notifications.filter(n => n.taskStatus === 'Open').length, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', icon: Clock },
          { label: 'Total Active', value: notifications.filter(n => n.status !== 'Dismissed').length, color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-500/10', icon: Bell },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 border border-slate-200/60 dark:border-[#2C2C2E]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wide">{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon size={20} className={stat.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200/60 dark:border-[#2C2C2E] p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-wide">
            <Filter size={14} />
            Filter:
          </div>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="bg-slate-50 dark:bg-[#121214] border border-slate-200/60 dark:border-[#2C2C2E] rounded-xl px-3 py-2 text-sm text-slate-600 dark:text-zinc-300"
          >
            <option value="">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-slate-50 dark:bg-[#121214] border border-slate-200/60 dark:border-[#2C2C2E] rounded-xl px-3 py-2 text-sm text-slate-600 dark:text-zinc-300"
          >
            <option value="">All Types</option>
            {notifTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-50 dark:bg-[#121214] border border-slate-200/60 dark:border-[#2C2C2E] rounded-xl px-3 py-2 text-sm text-slate-600 dark:text-zinc-300"
          >
            <option value="">All Status</option>
            <option value="Unread">Unread</option>
            <option value="Read">Read</option>
          </select>
          {(filterPriority || filterType || filterStatus) && (
            <button
              onClick={() => { setFilterPriority(''); setFilterType(''); setFilterStatus(''); }}
              className="text-xs text-orange hover:underline font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200/60 dark:border-[#2C2C2E] overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-[#2C2C2E]">
          {activeNotifications.length === 0 ? (
            <div className="p-12 text-center text-slate-400 dark:text-zinc-500">
              <CheckCircle2 size={48} className="mx-auto mb-3 opacity-40 text-emerald-400" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs mt-1">No notifications match your current filters</p>
            </div>
          ) : (
            activeNotifications.map(notif => {
              const pConfig = priorityConfig[notif.priority] || priorityConfig.Low;
              const PriorityIcon = pConfig.icon;
              const TypeIcon = typeIcons[notif.type] || Info;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleOpen(notif)}
                  className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-all group hover:bg-slate-50/50 dark:hover:bg-[#121214]/30 ${
                    notif.status === 'Unread' ? 'bg-orange/[0.02] border-l-[3px] border-l-orange' : 'border-l-[3px] border-l-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl ${pConfig.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <PriorityIcon size={18} className={pConfig.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold truncate ${notif.status === 'Unread' ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-zinc-300'}`}>
                        {notif.title}
                      </p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${pConfig.bg} ${pConfig.color} flex-shrink-0`}>
                        {notif.priority}
                      </span>
                      {notif.taskStatus === 'Open' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-500 flex-shrink-0">
                          Task
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 line-clamp-2">{notif.message}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 dark:text-zinc-500">
                      <span className="flex items-center gap-1"><TypeIcon size={11} />{notif.type}</span>
                      {notif.assignedRole && <span>→ {notif.assignedRole}</span>}
                      {notif.dueDate && <span className="flex items-center gap-1"><Clock size={11} />Due: {notif.dueDate}</span>}
                      <span>{new Date(notif.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {notif.entityType && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleNavigate(notif); }}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-blue-500 transition-colors"
                        title="Go to entity"
                      >
                        <ChevronRight size={16} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id); }}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                      title="Dismiss"
                    >
                      <Archive size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelectedNotif(null)}>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl w-full max-w-md border border-slate-200/60 dark:border-[#2C2C2E] shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#2C2C2E]">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Notification Details</h2>
              <button onClick={() => setSelectedNotif(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">Title</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">{selectedNotif.title}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wide">Message</p>
                <p className="text-sm text-slate-600 dark:text-zinc-300 mt-1">{selectedNotif.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Priority', selectedNotif.priority],
                  ['Type', selectedNotif.type],
                  ['Status', selectedNotif.status],
                  ['Entity', selectedNotif.entityType ? `${selectedNotif.entityType}` : '—'],
                  ['Assigned To', selectedNotif.assignedRole || '—'],
                  ['Due Date', selectedNotif.dueDate || '—'],
                  ['Task Status', selectedNotif.taskStatus || '—'],
                  ['Created', new Date(selectedNotif.createdAt).toLocaleString()],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase">{label}</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-zinc-200 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              {selectedNotif.entityType && (
                <button
                  onClick={() => { setSelectedNotif(null); handleNavigate(selectedNotif); }}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange text-white rounded-xl text-sm font-semibold hover:brightness-110 transition-all"
                >
                  Go to {selectedNotif.entityType}
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
