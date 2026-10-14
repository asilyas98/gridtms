import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Building2, ShieldCheck, UserCheck, Clock, CheckCircle2, AlertCircle, ArrowRight, Lock, KeyRound } from 'lucide-react';
import { EmployeeInvite } from '../../types';

interface EmployeeRegisterModalProps {
  initialToken?: string;
  onClose: () => void;
  onSuccess: (carrierName: string, applicantName: string) => void;
}

export default function EmployeeRegisterModal({ initialToken = '', onClose, onSuccess }: EmployeeRegisterModalProps) {
  const [tokenInput, setTokenInput] = useState(initialToken);
  const [invite, setInvite] = useState<EmployeeInvite | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [companyDetails, setCompanyDetails] = useState<{ carrierName: string; role: string } | null>(null);

  // Look up invite by token from localStorage
  const lookupToken = (tokenToFind: string) => {
    setError(null);
    if (!tokenToFind.trim()) {
      setError('Please paste or enter your invitation code.');
      return;
    }

    try {
      const savedInvitesStr = localStorage.getItem('gridtms_employee_invites');
      const invites: EmployeeInvite[] = savedInvitesStr ? JSON.parse(savedInvitesStr) : [];
      const found = invites.find(inv => inv.token.trim() === tokenToFind.trim());

      if (!found) {
        // Check if there is an existing pending or registered user with this token
        setError('Invitation token not found or already invalidated. Please verify the link provided by your company admin.');
        setInvite(null);
        return;
      }

      if (found.status === 'Expired' || new Date(found.expiresAt).getTime() < Date.now()) {
        setError('This invitation has expired. Contact your carrier administrator for a new invite.');
        setInvite(null);
        return;
      }

      setInvite(found);
      setForm(prev => ({
        ...prev,
        name: found.name || '',
      }));
    } catch (e) {
      setError('Failed to validate invitation.');
    }
  };

  useEffect(() => {
    if (initialToken) {
      lookupToken(initialToken);
    }
  }, [initialToken]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;

    if (!form.name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Mark invite as accepted in storage
      const savedInvitesStr = localStorage.getItem('gridtms_employee_invites');
      let invites: EmployeeInvite[] = savedInvitesStr ? JSON.parse(savedInvitesStr) : [];
      invites = invites.map(i => i.token === invite.token ? { ...i, status: 'Accepted' } : i);
      localStorage.setItem('gridtms_employee_invites', JSON.stringify(invites));

      // 2. Add or update user with 'Pending Approval' status linked to this company
      const savedUsersStr = localStorage.getItem('gridtms_team_users');
      let users = savedUsersStr ? JSON.parse(savedUsersStr) : [];

      const existingIndex = users.findIndex((u: any) => u.email.toLowerCase() === invite.email.toLowerCase() || u.inviteToken === invite.token);
      
      const updatedUser = {
        id: existingIndex >= 0 ? users[existingIndex].id : `user-${Date.now()}`,
        name: form.name.trim(),
        email: invite.email,
        phone: form.phone.trim() || undefined,
        role: invite.role,
        status: 'Pending Approval' as const, // Strict admin review requirement
        companyId: invite.companyId,
        companyName: invite.companyName,
        inviteToken: invite.token,
        registeredAt: new Date().toISOString(),
        lastActive: 'Application Pending Review',
        avatarInitials: form.name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'EU',
        isCustomPermissions: false,
        permissions: existingIndex >= 0 ? users[existingIndex].permissions : undefined,
      };

      if (existingIndex >= 0) {
        users[existingIndex] = { ...users[existingIndex], ...updatedUser };
      } else {
        users.push(updatedUser);
      }
      localStorage.setItem('gridtms_team_users', JSON.stringify(users));

      // Trigger custom window event to immediately notify context if loaded
      window.dispatchEvent(new Event('storage'));

      setCompanyDetails({
        carrierName: invite.companyName,
        role: invite.role,
      });
      setSubmittedSuccess(true);
    } catch (err: any) {
      setError('An error occurred during account registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Dim backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 text-slate-900 overflow-hidden"
      >
        {/* Apple style sub-header badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange/10 border border-orange/20 text-orange font-bold text-[11px] uppercase tracking-wider">
            <ShieldCheck size={14} />
            Carrier Employee Onboarding
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {submittedSuccess ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-sm">
              <Clock size={32} />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Registration Submitted
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Linked to {companyDetails?.carrierName}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-semibold">Company Affiliation:</span>
                <span className="font-bold text-slate-900">{companyDetails?.carrierName}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-semibold">Requested Role:</span>
                <span className="font-bold text-orange">{companyDetails?.role}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-semibold">Account State:</span>
                <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full text-[10px]">
                  Pending Administrator Approval
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Per your company&apos;s security protocol, an Owner or Super Admin must review and approve your account before you can log in and view fleet operations.
            </p>

            <button
              onClick={() => {
                onSuccess(companyDetails?.carrierName || '', form.name);
                onClose();
              }}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
            >
              Return to Login Gate
            </button>
          </div>
        ) : !invite ? (
          /* Step 1: Input or Confirm Invite Token */
          <div className="space-y-5">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Join Trucking Company
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-normal">
                Enter the secure invitation token or click the link sent in your carrier invitation email to link your account to your trucking company.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Company Invitation Token
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="e.g. inv_ab12cd34_..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-orange focus:bg-white transition-all pr-10"
                />
                <KeyRound size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Tip: Administrators can copy the secure link directly from Team & Permissions.
              </p>
            </div>

            <button
              onClick={() => lookupToken(tokenInput)}
              className="w-full py-3.5 bg-orange hover:bg-orange-dark text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              Verify Company Link
              <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          /* Step 2: Fill in Credentials and Link Account */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Complete Employee Profile
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Set your login credentials to join your fleet.
              </p>
            </div>

            {/* Linked Carrier Confirmation Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange/10 text-orange flex items-center justify-center font-bold flex-shrink-0">
                <Building2 size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {invite.companyName}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                    VERIFIED CARRIER
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  DOT: {invite.dotNumber || 'Verified'} · MC: {invite.mcNumber || 'Active'} · Role: <span className="font-bold text-slate-700">{invite.role}</span>
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Jordan Miller"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-orange focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                  Company Email
                </label>
                <input
                  type="email"
                  disabled
                  value={invite.email}
                  className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 (555) 012-3456"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-orange focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min 8 characters"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-orange focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="Repeat password"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-orange focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-800 leading-normal flex items-start gap-2">
              <Clock size={15} className="mt-0.5 flex-shrink-0 text-amber-600" />
              <span>
                <strong>Approval Requirement:</strong> Upon submission, your profile will be sent to the carrier administrator for review and activation.
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setInvite(null)}
                className="py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Change Code
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-orange hover:bg-orange-dark text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Submitting Application...' : 'Register Under Carrier'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
