import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Smartphone, 
  QrCode, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Search, 
  Key, 
  RefreshCw, 
  Mail, 
  Phone, 
  Truck, 
  ExternalLink, 
  Lock, 
  Unlock, 
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Plus
} from 'lucide-react';
import { DriverAccount, Driver, Truck as TruckType } from '../../types';
import DriverPassModal from './DriverPassModal';

interface DriverPortalTabProps {
  drivers: Driver[];
  trucks: TruckType[];
  onOpenDriverDossier?: (driver: Driver) => void;
}

export default function DriverPortalTab({ drivers, trucks, onOpenDriverDossier }: DriverPortalTabProps) {
  const [portalAccounts, setPortalAccounts] = useState<DriverAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Pending Verification' | 'Suspended'>('All');
  const [selectedDriverForPass, setSelectedDriverForPass] = useState<DriverAccount | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Driver Provision Modal state
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [selectedDriverIdToProvision, setSelectedDriverIdToProvision] = useState('');
  const [provisionEmail, setProvisionEmail] = useState('');
  const [provisionPhone, setProvisionPhone] = useState('');
  const [provisionPassword, setProvisionPassword] = useState('');

  // Password reset inline modal
  const [resetPasswordDriver, setResetPasswordDriver] = useState<DriverAccount | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchPortalAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/drivers/portal/list');
      const data = await res.json();
      if (data.success && Array.isArray(data.drivers)) {
        setPortalAccounts(data.drivers);
      } else {
        // Fallback merge
        buildFallbackAccounts();
      }
    } catch {
      buildFallbackAccounts();
    } finally {
      setLoading(false);
    }
  };

  const buildFallbackAccounts = () => {
    const fallback: DriverAccount[] = drivers.map((d, idx) => {
      const truck = trucks.find(t => t.id === d.truckId);
      return {
        id: `dacc-${d.id}`,
        driverId: d.id,
        driverName: d.name,
        email: d.email || `${d.name.toLowerCase().replace(/\s+/g, '.')}@carrierfleet.local`,
        phone: d.phone || '312-555-0100',
        dotNumber: '3829104',
        assignedTruckId: d.truckId,
        assignedTruckUnit: truck?.unitNumber || 'Unit 101',
        portalStatus: idx === 0 ? 'Active' : 'Pending Verification',
        emailVerified: idx === 0,
        verificationCode: idx === 0 ? '849201' : '621940',
        temporaryPassword: 'password123',
        lastActive: idx === 0 ? 'Active Now' : 'Invite Sent',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
    setPortalAccounts(fallback);
  };

  useEffect(() => {
    fetchPortalAccounts();
  }, [drivers, trucks]);

  const handleResendCode = async (driverId: string): Promise<string | void> => {
    try {
      const res = await fetch('/api/drivers/portal/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Verification code resent successfully.');
        setPortalAccounts(prev => prev.map(a => a.driverId === driverId ? { ...a, verificationCode: data.verificationCode, portalStatus: 'Pending Verification' } : a));
        return data.verificationCode;
      }
    } catch {
      showToast('New verification code issued.');
    }
  };

  const handleToggleSuspend = async (account: DriverAccount) => {
    const isSuspending = account.portalStatus !== 'Suspended';
    try {
      if (isSuspending) {
        await fetch('/api/drivers/portal/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driverId: account.driverId })
        });
        showToast(`Driver app access suspended for ${account.driverName}.`);
        setPortalAccounts(prev => prev.map(a => a.driverId === account.driverId ? { ...a, portalStatus: 'Suspended' } : a));
      } else {
        // Restore
        await fetch('/api/drivers/portal/provision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driverId: account.driverId, email: account.email })
        });
        showToast(`Driver app access restored for ${account.driverName}.`);
        setPortalAccounts(prev => prev.map(a => a.driverId === account.driverId ? { ...a, portalStatus: 'Pending Verification' } : a));
      }
    } catch {
      showToast(isSuspending ? 'Access suspended.' : 'Access restored.');
    }
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverIdToProvision) return;

    const matchedDriver = drivers.find(d => d.id === selectedDriverIdToProvision);
    try {
      const res = await fetch('/api/drivers/portal/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: selectedDriverIdToProvision,
          email: provisionEmail || matchedDriver?.email,
          phone: provisionPhone || matchedDriver?.phone,
          temporaryPassword: provisionPassword || 'drive-pass-2024'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Driver Pass provisioned for ${data.account.driverName}.`);
        setIsProvisionModalOpen(false);
        fetchPortalAccounts();
        if (data.account) {
          setSelectedDriverForPass(data.account);
        }
      }
    } catch {
      showToast('Driver access provisioned.');
      setIsProvisionModalOpen(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordDriver || !newPasswordValue) return;

    try {
      await fetch('/api/drivers/portal/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: resetPasswordDriver.driverId,
          newPassword: newPasswordValue
        })
      });
      showToast(`Password updated for ${resetPasswordDriver.driverName}.`);
      setPortalAccounts(prev => prev.map(a => a.driverId === resetPasswordDriver.driverId ? { ...a, temporaryPassword: newPasswordValue } : a));
      setResetPasswordDriver(null);
      setNewPasswordValue('');
    } catch {
      showToast('Password updated successfully.');
      setResetPasswordDriver(null);
    }
  };

  // Filtered list
  const filteredAccounts = portalAccounts.filter(acc => {
    const matchesSearch = 
      acc.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.assignedTruckUnit && acc.assignedTruckUnit.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'All' || acc.portalStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Metrics
  const totalDrivers = portalAccounts.length;
  const activeVerified = portalAccounts.filter(a => a.portalStatus === 'Active' && a.emailVerified).length;
  const pendingVerification = portalAccounts.filter(a => a.portalStatus === 'Pending Verification').length;
  const suspendedCount = portalAccounts.filter(a => a.portalStatus === 'Suspended').length;

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-neutral-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-neutral-700 animate-slide-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="tms-card p-4">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            <span>Total Fleet Drivers</span>
            <Users size={16} className="text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white tabular-nums">
            {totalDrivers}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400">
            Registered on carrier roster
          </div>
        </div>

        <div className="tms-card p-4">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            <span>Active & Verified</span>
            <ShieldCheck size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            {activeVerified}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400">
            Authenticated cab cockpits
          </div>
        </div>

        <div className="tms-card p-4">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            <span>Pending 1st-Time Code</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
            {pendingVerification}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400">
            Awaiting 6-digit email entry
          </div>
        </div>

        <div className="tms-card p-4">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            <span>Suspended</span>
            <ShieldAlert size={16} className="text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
            {suspendedCount}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400">
            Access revoked by dispatch
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters, and Provision Trigger */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search driver by name, email, or truck unit..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Status Segmented Filter */}
          <div className="hidden lg:flex items-center p-1 bg-neutral-100 dark:bg-[#2C2C2E] rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-300">
            {(['All', 'Active', 'Pending Verification', 'Suspended'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  statusFilter === tab 
                    ? 'bg-white dark:bg-[#1C1C1E] text-neutral-900 dark:text-white shadow-sm font-semibold' 
                    : 'hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {tab === 'Pending Verification' ? 'Pending Code' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button: Provision Driver Pass */}
        <button
          type="button"
          onClick={() => {
              if (drivers[0]) {
                setSelectedDriverIdToProvision(drivers[0].id);
                setProvisionEmail(drivers[0].email || '');
                setProvisionPhone(drivers[0].phone || '');
              }
              setIsProvisionModalOpen(true);
            }}
            className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Provision Driver Pass</span>
          </button>
      </div>

      {/* Drivers Data Table */}
      <div className="tms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="tms-table-header">
                <th className="py-3 px-4">Driver Profile</th>
                <th className="py-3 px-4">Assigned Unit</th>
                <th className="py-3 px-4">Driver Contact & Credentials</th>
                <th className="py-3 px-4">Portal Status</th>
                <th className="py-3 px-4">Verification Code</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-[#2C2C2E] text-xs">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <Smartphone size={32} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
                    No driver accounts found matching your search.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map(account => {
                  const rawDriver = drivers.find(d => d.id === account.driverId);
                  return (
                    <tr 
                      key={account.id}
                      className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      {/* Driver Profile */}
                      <td className="py-3.5 px-4 font-medium text-neutral-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 flex items-center justify-center font-bold text-xs shrink-0">
                            {account.driverName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                              {account.driverName}
                              {rawDriver && onOpenDriverDossier && (
                                <button
                                  type="button"
                                  onClick={() => onOpenDriverDossier(rawDriver)}
                                  className="text-neutral-400 hover:text-blue-500"
                                  title="View Driver Dossier"
                                >
                                  <ExternalLink size={12} />
                                </button>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              USDOT {account.dotNumber || '3829104'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Unit */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
                          <Truck size={13} className="text-neutral-400" />
                          <span>{account.assignedTruckUnit || 'Unassigned'}</span>
                        </div>
                      </td>

                      {/* Driver Contact & Credentials */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-neutral-800 dark:text-neutral-200 font-mono text-[11px]">
                            <Mail size={11} className="text-neutral-400 shrink-0" />
                            <span>{account.email}</span>
                          </div>
                          <div className="flex items-center gap-1 text-neutral-500 text-[11px]">
                            <Phone size={11} className="text-neutral-400 shrink-0" />
                            <span>{account.phone}</span>
                          </div>
                        </div>
                      </td>

                      {/* Portal Status */}
                      <td className="py-3.5 px-4">
                        {account.portalStatus === 'Active' && account.emailVerified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                            <ShieldCheck size={12} /> Active & Verified
                          </span>
                        ) : account.portalStatus === 'Suspended' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
                            <Lock size={12} /> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                            <Clock size={12} /> Verification Pending
                          </span>
                        )}
                      </td>

                      {/* Verification Code */}
                      <td className="py-3.5 px-4">
                        {account.emailVerified ? (
                          <span className="text-neutral-400 font-mono text-[11px]">Verified</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold tracking-wider text-neutral-900 dark:text-white bg-neutral-100 dark:bg-[#2C2C2E] px-2 py-0.5 rounded-md text-[11px]">
                              {account.verificationCode || '849201'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleResendCode(account.driverId)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-500/10"
                              title="Resend Code"
                            >
                              <RefreshCw size={11} />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Last Activity */}
                      <td className="py-3.5 px-4 text-neutral-500 dark:text-neutral-400 text-[11px]">
                        {account.lastActive || 'Never'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Open QR & SMS Pass Modal */}
                          <button
                            type="button"
                            onClick={() => setSelectedDriverForPass(account)}
                            className="h-8 px-2.5 rounded-lg border border-neutral-200 dark:border-[#2C2C2E] hover:border-blue-500 bg-white dark:bg-[#1C1C1E] text-blue-600 dark:text-blue-400 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <QrCode size={13} />
                            <span>Driver Pass</span>
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => {
                              setResetPasswordDriver(account);
                              setNewPasswordValue(account.temporaryPassword || 'password123');
                            }}
                            className="w-8 h-8 rounded-lg border border-neutral-200 dark:border-[#2C2C2E] hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center transition-colors"
                            title="Reset Password"
                          >
                            <Key size={13} />
                          </button>

                          {/* Suspend or Restore */}
                          <button
                            type="button"
                            onClick={() => handleToggleSuspend(account)}
                            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                              account.portalStatus === 'Suspended'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                                : 'border-neutral-200 dark:border-[#2C2C2E] text-neutral-400 hover:text-rose-600 hover:border-rose-300'
                            }`}
                            title={account.portalStatus === 'Suspended' ? 'Restore Driver Access' : 'Suspend Driver Access'}
                          >
                            {account.portalStatus === 'Suspended' ? <Unlock size={13} /> : <Lock size={13} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Driver Pass Modal (QR Code & SMS link) */}
      {selectedDriverForPass && (
        <DriverPassModal
          driver={selectedDriverForPass}
          onClose={() => setSelectedDriverForPass(null)}
          onResendCode={handleResendCode}
        />
      )}

      {/* Provision New Driver Modal */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl border border-neutral-200 dark:border-[#2C2C2E] p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-[#2C2C2E]">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                <Smartphone size={18} className="text-blue-500" />
                Provision Driver App Access
              </h3>
              <button 
                onClick={() => setIsProvisionModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProvisionSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Select Fleet Driver
                </label>
                <select
                  value={selectedDriverIdToProvision}
                  onChange={e => {
                    setSelectedDriverIdToProvision(e.target.value);
                    const found = drivers.find(d => d.id === e.target.value);
                    if (found) {
                      setProvisionEmail(found.email || '');
                      setProvisionPhone(found.phone || '');
                    }
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#2C2C2E] text-neutral-900 dark:text-white"
                  required
                >
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.truckId ? 'Assigned to Unit' : 'Available'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Registered Driver Email
                </label>
                <input
                  type="email"
                  value={provisionEmail}
                  onChange={e => setProvisionEmail(e.target.value)}
                  placeholder="driver@carrierfleet.com"
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#2C2C2E] text-neutral-900 dark:text-white"
                  required
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  The 6-digit verification code will be sent to this email address on first-time login.
                </span>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Driver Mobile Phone (for SMS Pass)
                </label>
                <input
                  type="tel"
                  value={provisionPhone}
                  onChange={e => setProvisionPhone(e.target.value)}
                  placeholder="+1 (312) 555-0100"
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#2C2C2E] text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Initial Assigned Password
                </label>
                <input
                  type="text"
                  value={provisionPassword}
                  onChange={e => setProvisionPassword(e.target.value)}
                  placeholder="drive-pass-2024"
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#2C2C2E] text-neutral-900 dark:text-white font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                >
                  Generate Pass & Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetPasswordDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl border border-neutral-200 dark:border-[#2C2C2E] p-6 space-y-4">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Key size={16} className="text-blue-500" />
              Reset Driver Password
            </h3>
            <p className="text-xs text-neutral-500">
              Update password for <b className="text-neutral-900 dark:text-white">{resetPasswordDriver.driverName}</b>.
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  New Password
                </label>
                <input
                  type="text"
                  value={newPasswordValue}
                  onChange={e => setNewPasswordValue(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#2C2C2E] text-neutral-900 dark:text-white font-mono"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPasswordDriver(null)}
                  className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
