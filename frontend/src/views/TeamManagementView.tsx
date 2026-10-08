import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  UserPlus, 
  Lock, 
  Check, 
  AlertTriangle, 
  Trash2, 
  ChevronRight,
  ShieldCheck,
  Eye,
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  Building2,
  KeyRound,
  Filter,
  Plus,
  Edit3,
  Layers,
  Sparkles,
  Info,
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useData } from '../context/DataContext';
import { CompanyUser, UserRole, UserPermissions, EmployeeInvite, CustomRole } from '../types';
import { ROLE_PRESETS, getRolePermissions, getRoleColor } from '../lib/permissions';
import CustomRoleModal from '../components/team/CustomRoleModal';
import { AccountCheckResult } from '../lib/accountValidation';

const ROLE_COLOR_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/60', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800', dot: 'bg-indigo-500' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/60', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', dot: 'bg-purple-500' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800', dot: 'bg-rose-500' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-950/60', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800', dot: 'bg-teal-500' },
  slate: { bg: 'bg-slate-100 dark:bg-zinc-800', text: 'text-slate-700 dark:text-zinc-300', border: 'border-slate-300 dark:border-zinc-700', dot: 'bg-slate-500' },
};

export default function TeamManagementView() {
  const { 
    teamUsers, 
    employeeInvites,
    customRoles,
    currentUser, 
    setCurrentUser, 
    updateUserRole, 
    updateUserPermissions, 
    inviteTeamUser, 
    deleteTeamUser,
    approveTeamUser,
    rejectTeamUser,
    createCustomRole,
    updateCustomRole,
    deleteCustomRole,
    duplicateCustomRole,
    canPerformAction,
    companySettings,
    validateEmployeeEmail,
  } = useData();

  const [activeTab, setActiveTab] = useState<'members' | 'roles'>('members');
  const [selectedUser, setSelectedUser] = useState<CompanyUser | null>(null);
  
  // Invite Member Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<EmployeeInvite | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Dispatcher' as UserRole,
  });

  // Pre-invite email validation state
  const [emailValidation, setEmailValidation] = useState<AccountCheckResult | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // Debounced email availability check
  useEffect(() => {
    const rawEmail = inviteForm.email.trim();
    if (!rawEmail || !rawEmail.includes('@') || rawEmail.length < 5) {
      setEmailValidation(null);
      setIsCheckingEmail(false);
      return;
    }

    setIsCheckingEmail(true);
    const timer = setTimeout(() => {
      const result = validateEmployeeEmail(rawEmail);
      setEmailValidation(result);
      setIsCheckingEmail(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [inviteForm.email, validateEmployeeEmail]);

  // Custom Role Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<CustomRole | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Pending Approval' | 'Invited'>('All');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [savedAlert, setSavedAlert] = useState<string | null>(null);

  const canManage = canPerformAction('manageUsers');

  // Count pending reviews
  const pendingApprovalCount = teamUsers.filter(u => u.status === 'Pending Approval').length;
  const customRolesCount = customRoles.filter(r => !r.isSystem).length;

  const triggerAlert = (msg: string) => {
    setSavedAlert(msg);
    setTimeout(() => setSavedAlert(null), 3500);
  };

  const filteredUsers = teamUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleToggleModule = (moduleKey: keyof UserPermissions['modules']) => {
    if (!selectedUser) return;
    const currentVal = selectedUser.permissions.modules[moduleKey];
    updateUserPermissions(selectedUser.id, {
      modules: { ...selectedUser.permissions.modules, [moduleKey]: !currentVal },
    });
    setSelectedUser(prev => prev ? {
      ...prev,
      isCustomPermissions: true,
      permissions: {
        ...prev.permissions,
        modules: { ...prev.permissions.modules, [moduleKey]: !currentVal },
      }
    } : null);
    triggerAlert('Module permission updated.');
  };

  const handleToggleAction = (actionKey: keyof UserPermissions['actions']) => {
    if (!selectedUser) return;
    const currentVal = selectedUser.permissions.actions[actionKey];
    updateUserPermissions(selectedUser.id, {
      actions: { ...selectedUser.permissions.actions, [actionKey]: !currentVal },
    });
    setSelectedUser(prev => prev ? {
      ...prev,
      isCustomPermissions: true,
      permissions: {
        ...prev.permissions,
        actions: { ...prev.permissions.actions, [actionKey]: !currentVal },
      }
    } : null);
    triggerAlert('Operational action permission updated.');
  };

  const handleRoleChange = (role: UserRole) => {
    if (!selectedUser) return;
    updateUserRole(selectedUser.id, role);
    const rolePerms = getRolePermissions(role, customRoles);
    setSelectedUser(prev => prev ? {
      ...prev,
      role,
      isCustomPermissions: false,
      permissions: JSON.parse(JSON.stringify(rolePerms)),
    } : null);
    triggerAlert(`Assigned role changed to ${role}. Baseline permissions applied.`);
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.name || !inviteForm.email) return;

    // Explicit pre-flight validation check
    const validation = validateEmployeeEmail(inviteForm.email);
    if (!validation.isAvailable) {
      setEmailValidation(validation);
      if (validation.association === 'current') {
        triggerAlert(`Cannot invite: ${validation.message}`);
      } else {
        triggerAlert('This email address is already registered with an existing account.');
      }
      return;
    }

    try {
      const basePermissions = getRolePermissions(inviteForm.role, customRoles);

      const generated = inviteTeamUser({
        name: inviteForm.name.trim(),
        email: inviteForm.email.trim(),
        phone: inviteForm.phone || undefined,
        role: inviteForm.role,
        status: 'Invited',
        isCustomPermissions: false,
        permissions: JSON.parse(JSON.stringify(basePermissions)),
      });

      setCreatedInvite(generated);
      setInviteForm({
        name: '',
        email: '',
        phone: '',
        role: 'Dispatcher',
      });
      setEmailValidation(null);
      triggerAlert(`Invitation generated for ${generated.name}. Token created.`);
    } catch (err: any) {
      triggerAlert(err?.message || 'Unable to create invitation.');
    }
  };

  const copyToClipboard = (text: string, isLink: boolean) => {
    navigator.clipboard.writeText(text);
    if (isLink) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleApprove = (userId: string, name: string) => {
    approveTeamUser(userId);
    if (selectedUser?.id === userId) {
      setSelectedUser(prev => prev ? { ...prev, status: 'Active', lastActive: 'Approved Just Now' } : null);
    }
    triggerAlert(`Account approved: ${name} now has full operational access.`);
  };

  const handleReject = (userId: string, name: string) => {
    rejectTeamUser(userId);
    if (selectedUser?.id === userId) {
      setSelectedUser(prev => prev ? { ...prev, status: 'Suspended', lastActive: 'Application Rejected' } : null);
    }
    triggerAlert(`Account rejected: ${name} will not be granted access.`);
  };

  const handleSaveCustomRole = (
    roleData: Omit<CustomRole, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    if (existingId) {
      updateCustomRole(existingId, roleData);
      triggerAlert(`Role "${roleData.name}" updated successfully.`);
    } else {
      const created = createCustomRole(roleData);
      triggerAlert(`New role "${created.name}" created and saved.`);
    }
  };

  const handleDuplicateRole = (sourceRole: CustomRole) => {
    const cloned = duplicateCustomRole(sourceRole.id, `${sourceRole.name} (Copy)`);
    triggerAlert(`Role duplicated as "${cloned.name}".`);
    setEditingRole(cloned);
    setIsRoleModalOpen(true);
  };

  const handleDeleteRoleConfirm = () => {
    if (!roleToDelete) return;
    const res = deleteCustomRole(roleToDelete.id);
    if (res.success) {
      triggerAlert(`Custom role "${roleToDelete.name}" deleted.`);
    } else {
      triggerAlert(res.message || 'Unable to delete role.');
    }
    setRoleToDelete(null);
  };

  const getBadgeStyle = (roleName: string) => {
    const colorKey = getRoleColor(roleName, customRoles);
    return ROLE_COLOR_STYLES[colorKey] || ROLE_COLOR_STYLES.indigo;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {savedAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-8 z-[120] flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900 text-white shadow-xl text-xs font-semibold border border-slate-700 backdrop-blur-xs"
          >
            <Check size={16} className="text-emerald-400 flex-shrink-0" />
            <span>{savedAlert}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-head text-3xl font-extrabold text-navy-dark dark:text-white tracking-tight uppercase">
              Team & Permissions
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider bg-orange/10 text-orange border border-orange/20">
              {teamUsers.length} MEMBERS
            </span>
            {customRolesCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {customRolesCount} CUSTOM ROLES
              </span>
            )}
            {pendingApprovalCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                {pendingApprovalCount} AWAITING REVIEW
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Cryptographically link dispatchers to {companySettings?.carrierName || 'Apex Logistics Freight LLC'}. Create custom roles, manage permissions, and review employee access.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={() => {
                setEditingRole(null);
                setIsRoleModalOpen(true);
              }}
              className="px-3.5 py-2.5 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
            >
              <Plus size={14} className="text-orange" />
              New Role
            </button>
            <button
              onClick={() => {
                setCreatedInvite(null);
                setIsInviteModalOpen(true);
              }}
              className="px-4 py-2.5 bg-orange hover:bg-orange-dark text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all active:scale-95"
            >
              <UserPlus size={15} />
              Invite Member
            </button>
          </div>
        )}
      </div>

      {/* Apple-style Segmented View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'members'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60'
          }`}
        >
          <Users size={15} />
          <span>Team Members & Review</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] ${
            activeTab === 'members'
              ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
              : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
          }`}>
            {teamUsers.length}
          </span>
          {pendingApprovalCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'roles'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/60'
          }`}
        >
          <Shield size={15} />
          <span>Roles & Permission Profiles</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] ${
            activeTab === 'roles'
              ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
              : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
          }`}>
            {customRoles.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Members & Approval Queue */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          {/* Pending Approval Review Queue Banner if any */}
          {pendingApprovalCount > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                    {pendingApprovalCount} Employee Registration(s) Pending Review
                  </h3>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    Prospective employees have registered using your company invitation token. As carrier administrator, you must manually review and activate their accounts before they can access company dispatch or financial records.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setStatusFilter('Pending Approval');
                  const firstPending = teamUsers.find(u => u.status === 'Pending Approval');
                  if (firstPending) setSelectedUser(firstPending);
                }}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap shadow-xs"
              >
                Review Queue
              </button>
            </div>
          )}

          {/* Main Grid: Left Member List, Right Permission Drawer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Table / Cards */}
            <div className={`space-y-4 ${selectedUser ? 'lg:col-span-6 xl:col-span-7' : 'lg:col-span-12'}`}>
              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white dark:bg-[#1C1C1E] p-3 rounded-2xl border border-slate-200 dark:border-zinc-800">
                <input
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange flex-1"
                />

                {/* Role Filter Dropdown */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none focus:border-orange text-slate-700 dark:text-zinc-300"
                >
                  <option value="All">All Roles</option>
                  <optgroup label="Custom Roles">
                    {customRoles.filter(r => !r.isSystem).map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="System Standard">
                    {customRoles.filter(r => r.isSystem).map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </optgroup>
                </select>
                
                {/* Status Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {(['All', 'Active', 'Pending Approval', 'Invited'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-tight whitespace-nowrap transition-colors ${
                        statusFilter === s
                          ? 'bg-navy text-white'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900'
                      }`}
                    >
                      {s === 'Pending Approval' ? `Pending (${teamUsers.filter(u => u.status === 'Pending Approval').length})` : s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Members Table */}
              <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs">
                <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                  {filteredUsers.map(user => {
                    const isSelected = selectedUser?.id === user.id;
                    const isCurrentActive = currentUser?.id === user.id;
                    const isPending = user.status === 'Pending Approval';
                    const isInvited = user.status === 'Invited';
                    const isSuspended = user.status === 'Suspended';
                    const roleBadge = getBadgeStyle(user.role);
                    const isCustomRole = customRoles.some(r => r.name === user.role && !r.isSystem);

                    return (
                      <div
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className={`p-4 flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-orange/5 dark:bg-orange/10'
                            : isPending
                            ? 'bg-amber-50/40 hover:bg-amber-50/80 dark:bg-amber-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-zinc-900/50'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 border ${
                            isPending 
                              ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-200' 
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-zinc-700'
                          }`}>
                            {user.avatarInitials || 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-slate-900 dark:text-white text-xs truncate">
                                {user.name}
                              </h3>
                              {isCurrentActive && (
                                <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded text-[8px] font-bold font-mono">
                                  YOU (ACTIVE)
                                </span>
                              )}
                              {isPending && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[8px] font-bold font-mono">
                                  AWAITING APPROVAL
                                </span>
                              )}
                              {isInvited && (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[8px] font-bold font-mono">
                                  INVITED
                                </span>
                              )}
                              {isSuspended && (
                                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded text-[8px] font-bold font-mono">
                                  REJECTED / SUSPENDED
                                </span>
                              )}
                              {user.isCustomPermissions && (
                                <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 rounded text-[8px] font-bold font-mono">
                                  CUSTOMIZED
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                              {user.email} {user.phone && `· ${user.phone}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Action buttons if in pending state */}
                          {isPending && canManage && (
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleApprove(user.id, user.name)}
                                title="Approve employee for operational access"
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
                              >
                                <CheckCircle2 size={12} />
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(user.id, user.name)}
                                title="Reject registration"
                                className="px-2 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[10px] font-bold transition-all"
                              >
                                <XCircle size={12} />
                              </button>
                            </div>
                          )}

                          <div className="text-right">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${roleBadge.dot}`} />
                              <span>{user.role}</span>
                              {isCustomRole && (
                                <span className="text-[8px] opacity-75 font-mono">(Custom)</span>
                              )}
                            </span>
                            <div className="text-[9px] text-slate-400 dark:text-zinc-500 mt-0.5">
                              {user.lastActive || 'Today'}
                            </div>
                          </div>

                          <ChevronRight size={16} className={`text-slate-400 transition-transform ${isSelected ? 'rotate-90 text-orange' : ''}`} />
                        </div>
                      </div>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <div className="p-12 text-center text-slate-400 text-xs font-mono">
                      No matching team members found.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Detailed Granular Permissions Editor */}
            {selectedUser && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-6 xl:col-span-5 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 space-y-6 shadow-sm"
              >
                {/* Header with Switch Test User button */}
                <div className="flex items-start justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange/10 text-orange flex items-center justify-center font-bold text-sm">
                      {selectedUser.avatarInitials || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-navy-dark dark:text-white leading-tight">
                          {selectedUser.name}
                        </h3>
                        {selectedUser.status === 'Pending Approval' && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[8px] font-bold font-mono rounded">
                            PENDING APPROVAL
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedUser.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedUser.status === 'Active' && (
                      <button
                        onClick={() => {
                          setCurrentUser(selectedUser);
                          triggerAlert(`Switched active context to ${selectedUser.name} (${selectedUser.role})`);
                        }}
                        className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                        title="Simulate this user's view in GridTMS"
                      >
                        Simulate Role
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Approve / Reject Actions in Drawer if Pending */}
                {selectedUser.status === 'Pending Approval' && canManage && (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <Clock size={14} className="text-amber-600" />
                        Pending Admin Review
                      </span>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">
                        Registered via Token
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-normal">
                      Confirm permissions and activate this account. Once approved, {selectedUser.name} can sign in and operate dispatch workflows.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleApprove(selectedUser.id, selectedUser.name)}
                        className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                      >
                        <CheckCircle2 size={14} />
                        Approve Account
                      </button>
                      <button
                        onClick={() => handleReject(selectedUser.id, selectedUser.name)}
                        className="px-3 py-2 rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}

                {/* Company Linking Info */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Building2 size={13} className="text-slate-400" />
                      Company Affiliation
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">
                      {selectedUser.companyName || companySettings.carrierName || 'Apex Logistics Freight LLC'}
                    </span>
                  </div>
                  {selectedUser.inviteToken && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/60 dark:border-zinc-800">
                      <span>Token Bound</span>
                      <span className="font-mono text-slate-600 dark:text-zinc-400 text-[10px]">{selectedUser.inviteToken}</span>
                    </div>
                  )}
                </div>

                {/* Role Preset Selector (Supports Custom Roles!) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Assigned Role Profile
                    </label>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRole(null);
                          setIsRoleModalOpen(true);
                        }}
                        className="text-[10px] text-orange hover:underline font-bold flex items-center gap-1"
                      >
                        + Create New Role
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedUser.role}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    disabled={!canManage}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none focus:border-orange text-slate-900 dark:text-white"
                  >
                    {customRoles.filter(r => !r.isSystem).length > 0 && (
                      <optgroup label="Company Custom Roles">
                        {customRoles.filter(r => !r.isSystem).map(r => (
                          <option key={r.id} value={r.name}>{r.name} (Custom)</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Standard System Presets">
                      {customRoles.filter(r => r.isSystem).map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </optgroup>
                  </select>
                  <p className="text-[10px] text-slate-400">
                    Switching roles applies saved baseline permissions. You can fine-tune specific modules or sensitive actions below.
                  </p>
                </div>

                {/* High Sensitivity Action Privileges */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                      <Shield size={12} className="text-orange" />
                      Sensitive Operational Actions
                    </label>
                  </div>

                  <div className="space-y-2">
                    {[
                      { key: 'viewRates', label: 'View Load Rates & Financial Margins', desc: 'See carrier rates, gross profits, and pricing metrics' },
                      { key: 'createEditLoads', label: 'Create & Modify Dispatches', desc: 'Book loads, edit stops, and assign equipment' },
                      { key: 'deleteRecords', label: 'Delete Entities & Records', desc: 'Remove loads, assets, locations, or customers' },
                      { key: 'exportData', label: 'Export Data & Factoring Schedules', desc: 'Download CSV spreadsheets, rate confirmations, and invoice PDFs' },
                      { key: 'manageDriverPay', label: 'Driver Pay & Settlement Approvals', desc: 'Modify CPM rates, add recurring deductions, and finalize settlements' },
                      { key: 'manageUsers', label: 'Company User & Permissions Admin', desc: 'Invite new members, manage team permissions, and assign roles' },
                      { key: 'editCompanySettings', label: 'Company DOT & Credentials Admin', desc: 'Modify registered USDOT, MC numbers, SCAC codes, and factoring links' },
                    ].map(({ key, label, desc }) => {
                      const allowed = Boolean(selectedUser.permissions.actions[key as keyof UserPermissions['actions']]);

                      return (
                        <div 
                          key={key}
                          onClick={() => canManage && handleToggleAction(key as keyof UserPermissions['actions'])}
                          className={`flex items-start justify-between p-3 rounded-xl border transition-all ${
                            canManage ? 'cursor-pointer' : 'cursor-default'
                          } ${
                            allowed 
                              ? 'bg-slate-50 dark:bg-zinc-900/80 border-slate-200 dark:border-zinc-800' 
                              : 'bg-white dark:bg-[#1C1C1E] border-slate-100 dark:border-zinc-800/60 opacity-60'
                          }`}
                        >
                          <div className="pr-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">{label}</span>
                              {!allowed && <Lock size={11} className="text-slate-400" />}
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 leading-tight">{desc}</p>
                          </div>

                          <div className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center p-0.5 flex-shrink-0 ${
                            allowed ? 'bg-orange' : 'bg-slate-300 dark:bg-zinc-700'
                          }`}>
                            <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                              allowed ? 'translate-x-3.5' : 'translate-x-0'
                            }`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Module Visibility Toggles */}
                <div className="space-y-3 pt-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-blue-500" />
                    TMS Module Access
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'dashboard', label: 'Dashboard' },
                      { key: 'dispatch', label: 'Dispatch' },
                      { key: 'loads', label: 'Loads' },
                      { key: 'assets', label: 'Assets' },
                      { key: 'customers', label: 'Customers' },
                      { key: 'locations', label: 'Locations' },
                      { key: 'invoices', label: 'Invoices' },
                      { key: 'settlements', label: 'Settlements' },
                      { key: 'compliance', label: 'Compliance' },
                      { key: 'ai', label: 'AI Assistant' },
                      { key: 'settings', label: 'System Settings' },
                      { key: 'team', label: 'Team Admin' },
                    ].map(({ key, label }) => {
                      const allowed = Boolean(selectedUser.permissions.modules[key as keyof UserPermissions['modules']]);

                      return (
                        <button
                          key={key}
                          disabled={!canManage}
                          onClick={() => handleToggleModule(key as keyof UserPermissions['modules'])}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                            allowed
                              ? 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white'
                              : 'bg-transparent border-slate-100 dark:border-zinc-800/60 text-slate-400 line-through'
                          }`}
                        >
                          <span>{label}</span>
                          {allowed ? (
                            <Check size={14} className="text-emerald-600" />
                          ) : (
                            <Lock size={12} className="text-slate-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Danger Zone: Delete user */}
                {canManage && selectedUser.id !== currentUser.id && (
                  <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">Revoke company access</span>
                    <button
                      onClick={() => {
                        if (confirm(`Remove ${selectedUser.name} from the company?`)) {
                          deleteTeamUser(selectedUser.id);
                          setSelectedUser(null);
                          triggerAlert('Team member removed.');
                        }
                      }}
                      className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      Delete Member
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Role Profiles & Custom Roles */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Top Info Banner */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center flex-shrink-0">
                <SlidersHorizontal size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Role-Based Access Control (RBAC)
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 max-w-2xl leading-relaxed">
                  Tailor roles to mirror your dispatch office operations. Custom roles can be created from scratch or cloned from standard presets, then assigned to new invitees and existing members.
                </p>
              </div>
            </div>

            {canManage && (
              <button
                onClick={() => {
                  setEditingRole(null);
                  setIsRoleModalOpen(true);
                }}
                className="px-4 py-2.5 bg-orange hover:bg-orange-dark text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all active:scale-95 flex-shrink-0"
              >
                <Plus size={15} />
                Create Role
              </button>
            )}
          </div>

          {/* Custom Roles Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Carrier Custom Roles ({customRoles.filter(r => !r.isSystem).length})
                </h2>
              </div>
              <span className="text-[10px] text-slate-400">
                Created specifically for {companySettings?.carrierName || 'this fleet'}
              </span>
            </div>

            {customRoles.filter(r => !r.isSystem).length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#1C1C1E] rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-orange/10 text-orange mx-auto flex items-center justify-center">
                  <Shield size={22} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">No custom roles created yet</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Build specialized roles for your operations like Night Dispatchers, Billing Clerks, or Yard Leads.
                  </p>
                </div>
                {canManage && (
                  <button
                    onClick={() => {
                      setEditingRole(null);
                      setIsRoleModalOpen(true);
                    }}
                    className="px-4 py-2 bg-orange hover:bg-orange-dark text-white rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5"
                  >
                    <Plus size={13} />
                    Create First Custom Role
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customRoles.filter(r => !r.isSystem).map(role => {
                  const badgeStyle = ROLE_COLOR_STYLES[role.color || 'indigo'] || ROLE_COLOR_STYLES.indigo;
                  const assignedCount = teamUsers.filter(u => u.role === role.name).length;
                  const enabledModules = Object.values(role.permissions.modules).filter(Boolean).length;
                  const enabledActions = Object.values(role.permissions.actions).filter(Boolean).length;

                  return (
                    <div
                      key={role.id}
                      className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-zinc-700 transition-all shadow-xs"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                            <span className={`w-2 h-2 rounded-full ${badgeStyle.dot}`} />
                            {role.name}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-md text-[9px] font-bold font-mono">
                            CUSTOM
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed min-h-[36px]">
                          {role.description}
                        </p>

                        {/* Stats Badges */}
                        <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-zinc-800/80 text-center">
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">{assignedCount}</div>
                            <div className="text-[9px] uppercase tracking-wider text-slate-400">Members</div>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">{enabledModules}/12</div>
                            <div className="text-[9px] uppercase tracking-wider text-slate-400">Modules</div>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">{enabledActions}/7</div>
                            <div className="text-[9px] uppercase tracking-wider text-slate-400">Actions</div>
                          </div>
                        </div>

                        {/* Sensitive Actions Summary */}
                        <div className="space-y-1 text-[10px]">
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Rate & Margin Access:</span>
                            <span className={role.permissions.actions.viewRates ? 'font-bold text-emerald-600' : 'text-slate-400'}>
                              {role.permissions.actions.viewRates ? 'Visible' : 'Hidden'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Load Booking:</span>
                            <span className={role.permissions.actions.createEditLoads ? 'font-bold text-emerald-600' : 'text-slate-400'}>
                              {role.permissions.actions.createEditLoads ? 'Allowed' : 'Disabled'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-500">
                            <span>Driver Pay & Settlements:</span>
                            <span className={role.permissions.actions.manageDriverPay ? 'font-bold text-emerald-600' : 'text-slate-400'}>
                              {role.permissions.actions.manageDriverPay ? 'Allowed' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      {canManage && (
                        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              setEditingRole(role);
                              setIsRoleModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
                          >
                            <Edit3 size={12} />
                            Edit
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDuplicateRole(role)}
                              title="Duplicate role"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              <Copy size={13} />
                            </button>
                            <button
                              onClick={() => setRoleToDelete(role)}
                              title="Delete role"
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* System Standard Presets Section */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Standard Fleet Presets ({customRoles.filter(r => r.isSystem).length})
              </h2>
              <span className="text-[10px] text-slate-400">
                Pre-configured baseline templates
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customRoles.filter(r => r.isSystem).map(role => {
                const badgeStyle = ROLE_COLOR_STYLES[role.color || 'slate'] || ROLE_COLOR_STYLES.slate;
                const assignedCount = teamUsers.filter(u => u.role === role.name).length;
                const enabledModules = Object.values(role.permissions.modules).filter(Boolean).length;
                const enabledActions = Object.values(role.permissions.actions).filter(Boolean).length;

                return (
                  <div
                    key={role.id}
                    className="bg-white dark:bg-[#1C1C1E] rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 flex flex-col justify-between space-y-4 shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                          <span className={`w-2 h-2 rounded-full ${badgeStyle.dot}`} />
                          {role.name}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-500 rounded-md text-[9px] font-bold font-mono">
                          SYSTEM
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed min-h-[36px]">
                        {role.description}
                      </p>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-zinc-800/80 text-center">
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">{assignedCount}</div>
                          <div className="text-[9px] uppercase tracking-wider text-slate-400">Members</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">{enabledModules}/12</div>
                          <div className="text-[9px] uppercase tracking-wider text-slate-400">Modules</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">{enabledActions}/7</div>
                          <div className="text-[9px] uppercase tracking-wider text-slate-400">Actions</div>
                        </div>
                      </div>

                      {/* Sensitive Actions Summary */}
                      <div className="space-y-1 text-[10px]">
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Rate & Margin Access:</span>
                          <span className={role.permissions.actions.viewRates ? 'font-bold text-emerald-600' : 'text-slate-400'}>
                            {role.permissions.actions.viewRates ? 'Visible' : 'Hidden'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Load Booking:</span>
                          <span className={role.permissions.actions.createEditLoads ? 'font-bold text-emerald-600' : 'text-slate-400'}>
                            {role.permissions.actions.createEditLoads ? 'Allowed' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500">
                          <span>Driver Pay & Settlements:</span>
                          <span className={role.permissions.actions.manageDriverPay ? 'font-bold text-emerald-600' : 'text-slate-400'}>
                            {role.permissions.actions.manageDriverPay ? 'Allowed' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Clone Preset Action */}
                    {canManage && (
                      <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end">
                        <button
                          onClick={() => handleDuplicateRole(role)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-orange hover:bg-orange/10 transition-colors flex items-center gap-1.5"
                        >
                          <Copy size={12} />
                          Duplicate as Custom Role
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal with Secure Token Display & Role Picker */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close invite modal"
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setIsInviteModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="text-orange" size={20} />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {createdInvite ? 'Invitation Generated & Linked' : 'Invite Team Member'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  ×
                </button>
              </div>

              {createdInvite ? (
                /* Display Generated Token & Onboarding Link */
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                    <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                        Company Token Created
                      </h4>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                        This token securely binds <strong>{createdInvite.name}</strong> to <strong>{createdInvite.companyName}</strong> (DOT: {createdInvite.dotNumber || 'Verified'}) with initial role <strong>{createdInvite.role}</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Token Box */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Single-Use Invite Token
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={createdInvite.token}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-zinc-200 outline-none"
                      />
                      <button
                        onClick={() => copyToClipboard(createdInvite.token, false)}
                        className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all flex-shrink-0"
                      >
                        {copiedToken ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        {copiedToken ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Direct Link Box */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                      Direct Onboarding URL
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/?invite=${createdInvite.token}`}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-mono text-slate-600 dark:text-zinc-400 outline-none truncate"
                      />
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/?invite=${createdInvite.token}`, true)}
                        className="px-3 py-2.5 bg-orange hover:bg-orange-dark text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all flex-shrink-0"
                      >
                        {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                        {copiedLink ? 'Link Copied' : 'Copy Link'}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 text-[11px] text-slate-500 space-y-1">
                    <p className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-zinc-300">
                      <Clock size={13} className="text-amber-500" />
                      Admin Review Required On Signup
                    </p>
                    <p className="text-[10px]">
                      When {createdInvite.name} registers with this link, they will be placed in your <strong>Pending Approval</strong> queue. You will need to click &quot;Approve&quot; in this panel before they gain access.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsInviteModalOpen(false)}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                  >
                    Done
                  </button>
                </div>
              ) : (
                /* Step 1: Input Details */
                <form onSubmit={handleInviteSubmit} className="space-y-4 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                      placeholder="e.g. Jordan Miller"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        Email Address
                      </label>
                      {isCheckingEmail && (
                        <span className="text-[10px] text-slate-400 font-mono animate-pulse">
                          Verifying availability...
                        </span>
                      )}
                    </div>
                    <input
                      type="email"
                      required
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      placeholder="jordan@fleetcarrier.com"
                      className={`w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border rounded-xl text-xs outline-none transition-colors ${
                        emailValidation && !emailValidation.isAvailable
                          ? emailValidation.association === 'current'
                            ? 'border-amber-400 dark:border-amber-600 focus:border-amber-500'
                            : 'border-rose-400 dark:border-rose-600 focus:border-rose-500'
                          : emailValidation?.isAvailable
                          ? 'border-emerald-400 dark:border-emerald-600 focus:border-emerald-500'
                          : 'border-slate-200 dark:border-zinc-800 focus:border-orange'
                      }`}
                    />

                    {/* Contextual Email Account Verification Notice */}
                    {emailValidation && !emailValidation.isAvailable && (
                      <div className="mt-2">
                        {emailValidation.association === 'current' ? (
                          /* Associated with Current Account - Shows Account Type & Status */
                          <div className="p-3 rounded-xl border border-amber-200/90 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                              <div className="flex-1 space-y-1">
                                <p className="font-semibold text-xs text-amber-950 dark:text-amber-100">
                                  Email already associated with this company
                                </p>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                                  <span>Account Type: <strong className="font-semibold text-amber-950 dark:text-amber-100">{emailValidation.accountType}</strong></span>
                                  <span>·</span>
                                  <span>Status: <strong className="font-semibold text-amber-950 dark:text-amber-100">{emailValidation.status}</strong></span>
                                </div>
                                {emailValidation.suggestedAction && (
                                  <p className="text-[10px] text-amber-700 dark:text-amber-300/80 leading-normal">
                                    {emailValidation.suggestedAction}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* External Account - Shows Generic Notice for Cross-Tenant Privacy */
                          <div className="p-3 rounded-xl border border-rose-200/90 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/20 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                            <div className="flex items-start gap-2">
                              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                              <div className="flex-1 space-y-0.5">
                                <p className="font-semibold text-xs text-rose-950 dark:text-rose-100">
                                  {emailValidation.message}
                                </p>
                                {emailValidation.suggestedAction && (
                                  <p className="text-[10px] text-rose-700 dark:text-rose-300/80 leading-normal">
                                    {emailValidation.suggestedAction}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {emailValidation && emailValidation.isAvailable && inviteForm.email.trim() && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Email address is available for invitation.</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                      Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={inviteForm.phone}
                      onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:border-orange"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        Assigned Role Profile
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsInviteModalOpen(false);
                          setEditingRole(null);
                          setIsRoleModalOpen(true);
                        }}
                        className="text-[10px] text-orange hover:underline font-bold"
                      >
                        + Create New Role
                      </button>
                    </div>
                    <select
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as UserRole })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none focus:border-orange text-slate-900 dark:text-white"
                    >
                      {customRoles.filter(r => !r.isSystem).length > 0 && (
                        <optgroup label="Company Custom Roles">
                          {customRoles.filter(r => !r.isSystem).map(r => (
                            <option key={r.id} value={r.name}>{r.name} (Custom)</option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Standard System Presets">
                        {customRoles.filter(r => r.isSystem).map(r => (
                          <option key={r.id} value={r.name}>{r.name}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsInviteModalOpen(false);
                        setEmailValidation(null);
                      }}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCheckingEmail || (emailValidation !== null && !emailValidation.isAvailable)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all ${
                        isCheckingEmail || (emailValidation !== null && !emailValidation.isAvailable)
                          ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed'
                          : 'bg-orange hover:bg-orange-dark text-white'
                      }`}
                    >
                      {isCheckingEmail ? 'Verifying...' : 'Generate Secure Invite'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Role Creation / Editing Modal */}
      <CustomRoleModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setEditingRole(null);
        }}
        onSave={handleSaveCustomRole}
        editingRole={editingRole}
        existingRoles={customRoles}
      />

      {/* Delete Role Confirmation Dialog */}
      <AnimatePresence>
        {roleToDelete && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close delete modal"
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
              onClick={() => setRoleToDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 space-y-4"
            >
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Delete Custom Role &quot;{roleToDelete.name}&quot;?
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  This role definition will be permanently removed. Any team members currently assigned to this role will automatically fall back to <strong>{roleToDelete.baseRole || 'Fleet Viewer'}</strong>.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRoleToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-50"
                >
                  Keep Role
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRoleConfirm}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider"
                >
                  Yes, Delete Role
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
