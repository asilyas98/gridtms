import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Shield, 
  Copy, 
  Check, 
  Lock, 
  Sparkles, 
  Layers, 
  Info,
  CheckCircle2,
  Trash2,
  X,
  FileSpreadsheet,
  AlertTriangle
} from 'lucide-react';
import { CustomRole, UserPermissions, UserModulePermissions, UserActionPermissions } from '../../types';
import { ROLE_PRESETS, EMPTY_ROLE_PERMISSIONS } from '../../lib/permissions';

interface CustomRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (roleData: Omit<CustomRole, 'id' | 'createdAt'>, existingId?: string) => void;
  editingRole?: CustomRole | null;
  existingRoles: CustomRole[];
}

const COLOR_OPTIONS = [
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-50 dark:bg-indigo-950/60', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800', dot: 'bg-indigo-500' },
  { id: 'blue', label: 'Sky Blue', bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-50 dark:bg-purple-950/60', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', dot: 'bg-purple-500' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800', dot: 'bg-rose-500' },
  { id: 'teal', label: 'Teal', bg: 'bg-teal-50 dark:bg-teal-950/60', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800', dot: 'bg-teal-500' },
  { id: 'slate', label: 'Slate', bg: 'bg-slate-100 dark:bg-zinc-800', text: 'text-slate-700 dark:text-zinc-300', border: 'border-slate-300 dark:border-zinc-700', dot: 'bg-slate-500' },
];

const MODULE_DEFINITIONS: { key: keyof UserModulePermissions; label: string; desc: string }[] = [
  { key: 'dashboard', label: 'Executive Dashboard', desc: 'KPI cards, active loads snapshot, operational metrics' },
  { key: 'dispatch', label: 'Dispatch Board', desc: 'Drag-and-drop schedule, assigned equipment, status markers' },
  { key: 'loads', label: 'Loads & Freight', desc: 'Active shipments, commodity tracking, rate con attachments' },
  { key: 'assets', label: 'Fleet Assets', desc: 'Tractor equipment, trailers, CDL drivers, maintenance logs' },
  { key: 'customers', label: 'Customer Accounts', desc: 'Brokers, shippers, consignees, billing terms, credit profiles' },
  { key: 'locations', label: 'Facilities & Stops', desc: 'Warehouses, cross-docks, yard hubs, geocoded pins' },
  { key: 'invoices', label: 'Freight Invoices', desc: 'Customer billing, invoice generation, factoring batch export' },
  { key: 'settlements', label: 'Driver Settlements', desc: 'Pay sheets, mileage rates, split deductions, recurring items' },
  { key: 'compliance', label: 'Safety & Compliance', desc: 'DOT/MC audits, medical cards, IFTA registration, HOS files' },
  { key: 'ai', label: 'AI Operations Co-pilot', desc: 'Intelligent load extraction, lane route optimizations' },
  { key: 'settings', label: 'System Settings', desc: 'Carrier identity, DOT/MC credentials, ELD & factoring partner' },
  { key: 'team', label: 'Team & Permissions', desc: 'Company staff list, invitation links, approval queue' },
];

const ACTION_DEFINITIONS: { key: keyof UserActionPermissions; label: string; desc: string; highRisk?: boolean }[] = [
  { key: 'viewRates', label: 'View Load Rates & Financial Margins', desc: 'Unmask monetary rates, line item margins, and gross billing values', highRisk: true },
  { key: 'createEditLoads', label: 'Create & Modify Dispatches', desc: 'Book loads, adjust route addresses, assign tractors, and change stops' },
  { key: 'deleteRecords', label: 'Delete Entities & Records', desc: 'Permanently remove loads, customers, drivers, or equipment', highRisk: true },
  { key: 'exportData', label: 'Export Data & Factoring Schedules', desc: 'Download CSV spreadsheets, rate confirmations, and accounting PDFs' },
  { key: 'manageDriverPay', label: 'Driver Pay & Settlement Approvals', desc: 'Configure CPM rates, percentage pay, and approve driver payouts', highRisk: true },
  { key: 'manageUsers', label: 'User Admin & Access Management', desc: 'Invite new staff, configure roles, and approve pending registrations', highRisk: true },
  { key: 'editCompanySettings', label: 'Company DOT & Credentials Admin', desc: 'Modify registered USDOT, MC numbers, SCAC codes, and factoring links', highRisk: true },
];

export default function CustomRoleModal({
  isOpen,
  onClose,
  onSave,
  editingRole,
  existingRoles,
}: CustomRoleModalProps) {
  const isEditing = Boolean(editingRole);

  const [step, setStep] = useState<'initial-choice' | 'configure'>(isEditing ? 'configure' : 'initial-choice');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('indigo');
  const [baseRole, setBaseRole] = useState<string>('');
  const [permissions, setPermissions] = useState<UserPermissions>(JSON.parse(JSON.stringify(EMPTY_ROLE_PERMISSIONS)));
  const [nameError, setNameError] = useState<string | null>(null);

  // Initialize state when modal opens or editingRole changes
  useEffect(() => {
    if (editingRole) {
      setName(editingRole.name);
      setDescription(editingRole.description || '');
      setColor(editingRole.color || 'indigo');
      setBaseRole(editingRole.baseRole || '');
      setPermissions(JSON.parse(JSON.stringify(editingRole.permissions)));
      setStep('configure');
      setNameError(null);
    } else {
      setName('');
      setDescription('');
      setColor('indigo');
      setBaseRole('');
      setPermissions(JSON.parse(JSON.stringify(EMPTY_ROLE_PERMISSIONS)));
      setStep('initial-choice');
      setNameError(null);
    }
  }, [editingRole, isOpen]);

  if (!isOpen) return null;

  const handleStartBlank = () => {
    setName('');
    setDescription('');
    setColor('indigo');
    setBaseRole('');
    setPermissions(JSON.parse(JSON.stringify(EMPTY_ROLE_PERMISSIONS)));
    setStep('configure');
  };

  const handleSelectTemplate = (sourceRole: CustomRole | { name: string; description: string; permissions: UserPermissions; color?: string }) => {
    setName(`${sourceRole.name} (Custom)`);
    setDescription(`Tailored permission set derived from ${sourceRole.name}`);
    setColor(sourceRole.color || 'blue');
    setBaseRole(sourceRole.name);
    setPermissions(JSON.parse(JSON.stringify(sourceRole.permissions)));
    setStep('configure');
  };

  const toggleModule = (moduleKey: keyof UserModulePermissions) => {
    setPermissions(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [moduleKey]: !prev.modules[moduleKey],
      },
    }));
  };

  const toggleAction = (actionKey: keyof UserActionPermissions) => {
    setPermissions(prev => ({
      ...prev,
      actions: {
        ...prev.actions,
        [actionKey]: !prev.actions[actionKey],
      },
    }));
  };

  const setAllModules = (val: boolean) => {
    const newModules: UserModulePermissions = { ...permissions.modules };
    MODULE_DEFINITIONS.forEach(m => {
      newModules[m.key] = val;
    });
    setPermissions(prev => ({ ...prev, modules: newModules }));
  };

  const setAllActions = (val: boolean) => {
    const newActions: UserActionPermissions = { ...permissions.actions };
    ACTION_DEFINITIONS.forEach(a => {
      newActions[a.key] = val;
    });
    setPermissions(prev => ({ ...prev, actions: newActions }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setNameError('Please provide a descriptive role name.');
      return;
    }

    // Check duplicate name against other roles (excluding current if editing)
    const duplicate = existingRoles.find(
      r => r.name.toLowerCase() === cleanName.toLowerCase() && r.id !== editingRole?.id
    );
    if (duplicate) {
      setNameError('A role with this name already exists. Please choose a unique title.');
      return;
    }

    onSave(
      {
        name: cleanName,
        description: description.trim() || 'Customized operational role permissions',
        color,
        baseRole: baseRole || undefined,
        permissions,
        isSystem: false,
      },
      editingRole?.id
    );
    onClose();
  };

  const selectedColorConfig = COLOR_OPTIONS.find(c => c.id === color) || COLOR_OPTIONS[0];
  const activeModulesCount = Object.values(permissions.modules).filter(Boolean).length;
  const activeActionsCount = Object.values(permissions.actions).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close custom role modal"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 14 }}
        className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-orange/10 dark:bg-orange/20 border border-orange/20 flex items-center justify-center text-orange">
              <Shield size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {isEditing ? 'Edit Custom Role' : 'Create Custom Role'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Define reusable permission profiles tailored to your fleet&apos;s workflow.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 'initial-choice' && !isEditing ? (
            /* Turn 1 / Step 1: Starting Choice */
            <div className="space-y-6 py-2">
              <div className="text-center max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  How would you like to build this role?
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Start fresh with custom privileges or clone an existing fleet template to save time.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option A: Start from Scratch */}
                <div
                  onClick={handleStartBlank}
                  className="p-5 rounded-2xl border-2 border-slate-200 dark:border-zinc-800 hover:border-orange dark:hover:border-orange bg-slate-50/50 dark:bg-zinc-900/40 hover:bg-white dark:hover:bg-[#1C1C1E] transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="w-10 h-10 rounded-xl bg-orange/10 text-orange flex items-center justify-center font-bold">
                      <Sparkles size={20} />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-orange transition-colors">
                      Start from Scratch
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                      Begin with a clean slate. Turn on only the specific modules and sensitive actions your new staff position needs.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-zinc-800/80 flex items-center text-[11px] font-bold text-orange">
                    Configure Blank Slate →
                  </div>
                </div>

                {/* Option B: Clone Template */}
                <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      <Copy size={18} />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Duplicate Fleet Template
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                      Pre-populate permissions from an existing system or custom role, then tweak the details.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-zinc-800/80 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Choose Source Role
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      {existingRoles.slice(0, 4).map(r => (
                        <button
                          key={r.id}
                          onClick={() => handleSelectTemplate(r)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:border-blue-500 text-[11px] font-semibold text-slate-800 dark:text-zinc-200 flex items-center justify-between group transition-colors"
                        >
                          <span className="truncate">{r.name}</span>
                          <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            Clone →
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Configure Step: Details + Permissions */
            <form id="custom-role-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Back to Choice button if creating */}
              {!isEditing && (
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep('initial-choice')}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 flex items-center gap-1"
                  >
                    ← Back to start options
                  </button>
                  {baseRole && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                      Based on: {baseRole}
                    </span>
                  )}
                </div>
              )}

              {/* Role General Info */}
              <div className="bg-slate-50 dark:bg-zinc-900/60 p-4.5 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Role Profile Identity
                  </label>
                  {/* Live Badge Preview */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Preview:</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1.5 ${selectedColorConfig.bg} ${selectedColorConfig.text} ${selectedColorConfig.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedColorConfig.dot}`} />
                      {name.trim() || 'Role Name'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Role Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Role Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setNameError(null);
                      }}
                      placeholder="e.g. Night Operations Lead, Freight Broker"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-orange focus:ring-1 focus:ring-orange"
                    />
                    {nameError && (
                      <p className="text-[10px] text-rose-500 font-medium pt-0.5">{nameError}</p>
                    )}
                  </div>

                  {/* Color Selector */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Badge Accent Color
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {COLOR_OPTIONS.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setColor(c.id)}
                          title={c.label}
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${c.dot} ${
                            color === c.id ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110' : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          {color === c.id && <Check size={11} className="text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Role Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief summary of duties and responsibilities (e.g. Handles weekend dispatches and emergency load reassignments)"
                    className="w-full px-3.5 py-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-800 dark:text-zinc-200 outline-none focus:border-orange"
                  />
                </div>
              </div>

              {/* Module Visibility Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Layers size={14} className="text-blue-500" />
                      TMS Module Access
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Select navigation modules visible to members assigned this role ({activeModulesCount} of {MODULE_DEFINITIONS.length} enabled).
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAllModules(true)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300 dark:text-zinc-700">|</span>
                    <button
                      type="button"
                      onClick={() => setAllModules(false)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {MODULE_DEFINITIONS.map(({ key, label, desc }) => {
                    const isEnabled = Boolean(permissions.modules[key]);
                    return (
                      <div
                        key={key}
                        onClick={() => toggleModule(key)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                          isEnabled
                            ? 'bg-slate-50 dark:bg-zinc-900/80 border-slate-300 dark:border-zinc-700'
                            : 'bg-white dark:bg-[#1C1C1E] border-slate-200/70 dark:border-zinc-800/60 opacity-60'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {label}
                            </span>
                            {!isEnabled && <Lock size={10} className="text-slate-400" />}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight mt-0.5 line-clamp-1">
                            {desc}
                          </p>
                        </div>

                        {/* Switch */}
                        <div className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center p-0.5 flex-shrink-0 ${
                          isEnabled ? 'bg-orange' : 'bg-slate-300 dark:bg-zinc-700'
                        }`}>
                          <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                            isEnabled ? 'translate-x-3.5' : 'translate-x-0'
                          }`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sensitive Action Privileges Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Shield size={14} className="text-orange" />
                      Sensitive Operational Actions
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      High-sensitivity financial controls, deletion rights, and carrier administrative permissions ({activeActionsCount} of {ACTION_DEFINITIONS.length} allowed).
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAllActions(true)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300 dark:text-zinc-700">|</span>
                    <button
                      type="button"
                      onClick={() => setAllActions(false)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {ACTION_DEFINITIONS.map(({ key, label, desc, highRisk }) => {
                    const isAllowed = Boolean(permissions.actions[key]);
                    return (
                      <div
                        key={key}
                        onClick={() => toggleAction(key)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                          isAllowed
                            ? 'bg-slate-50 dark:bg-zinc-900/80 border-slate-300 dark:border-zinc-700'
                            : 'bg-white dark:bg-[#1C1C1E] border-slate-200/70 dark:border-zinc-800/60 opacity-60'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {label}
                            </span>
                            {highRisk && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60">
                                Protected
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight mt-0.5">
                            {desc}
                          </p>
                        </div>

                        {/* Switch */}
                        <div className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center p-0.5 flex-shrink-0 ${
                          isAllowed ? 'bg-orange' : 'bg-slate-300 dark:bg-zinc-700'
                        }`}>
                          <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                            isAllowed ? 'translate-x-3.5' : 'translate-x-0'
                          }`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>

          {step === 'configure' ? (
            <button
              type="submit"
              form="custom-role-form"
              className="px-5 py-2.5 bg-orange hover:bg-orange-dark text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Check size={14} />
              {isEditing ? 'Save Changes' : 'Create & Save Role'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartBlank}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
            >
              Continue to Permissions →
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
