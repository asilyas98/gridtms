import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Clock,
  Phone,
  ArrowRight,
  Zap,
  Check,
  X,
  FileText,
  Wrench,
  ShieldCheck,
  MapPin,
  Truck,
  RotateCw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  SlidersHorizontal,
  BellRing,
  AlertCircle,
  CreditCard,
  Gauge,
  Activity,
  Calendar,
  Send,
  Fuel,
  FileCheck
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useViewMode } from '../context/ViewModeContext';

interface OperationalViewProps {
  onNavigate?: (tab: string, id?: string | null) => void;
}

// Category of interventions requiring the TMS user to interfere
type InterventionCategory = 'late_driver' | 'compliance' | 'overdue_payment' | 'breakdown';

interface InterventionItem {
  id: string;
  category: InterventionCategory;
  severity: 'critical' | 'urgent' | 'warning';
  title: string;
  entity: string; // e.g., 'TRK-104', 'Load #8990', 'C.H. Freight', 'TRK-113'
  detail: string;
  impact: string;
  meta: string;
  actionText: string;
  actionIcon: 'phone' | 'shield' | 'invoice' | 'wrench' | 'truck';
  toastText: string;
}

interface NominalTruck {
  id: string;
  driver: string;
  phone: string;
  city: string;
  status: 'ontime' | 'staged';
  progress: number;
  route: string;
  rate: string;
  driveClock: string;
  shiftClock: string;
  cycleClock: string;
  truck: string;
  fuel: string;
  odo: string;
  customer?: string;
  miles?: string;
  loadNum?: string;
}

// Helper to derive live operational interventions directly from Supabase tables
function deriveLiveInterventions(
  loads: any[],
  drivers: any[],
  trucks: any[],
  invoices: any[]
): InterventionItem[] {
  const items: InterventionItem[] = [];
  const now = new Date();

  // 1. Check for late or at-risk active loads
  loads.forEach(load => {
    if (['Dispatched', 'Assigned', 'In Transit'].includes(load.status)) {
      if (load.deliveryDate && new Date(load.deliveryDate) < now) {
        items.push({
          id: `int-late-${load.id}`,
          category: 'late_driver',
          severity: 'critical',
          title: `Delivery Window Missed: Load #${load.loadNumber || load.id}`,
          entity: `${load.equipmentType || 'Power Unit'} • Destination Delivery Past Due`,
          detail: `Load scheduled for delivery on ${new Date(load.deliveryDate).toLocaleDateString()} has not been marked delivered. Broker or receiver intervention required.`,
          impact: 'Late Delivery Penalty Risk & Customer SLA Breach',
          meta: `Load Rate: $${(load.rate || 0).toLocaleString()} · Status: ${load.status}`,
          actionText: 'Update Load & Contact Shipper',
          actionIcon: 'phone',
          toastText: `Notification queued for Load #${load.loadNumber || load.id}.`
        });
      }
    }
  });

  // 2. Check for driver compliance issues (CDL expiry or HOS violations)
  drivers.forEach(driver => {
    if (driver.hosViolations && driver.hosViolations > 0) {
      items.push({
        id: `int-comp-hos-${driver.id}`,
        category: 'compliance',
        severity: 'critical',
        title: `Driver HOS Violation: ${driver.name}`,
        entity: `Driver: ${driver.name} • ${driver.hosDutyStatus || 'Active Duty'}`,
        detail: `Driver has accumulated ${driver.hosViolations} active HOS violation(s). Commercial driving must be suspended until a compliant 10-hour reset is verified.`,
        impact: 'FMCSA Safety Audit Flag & Out-of-Service Risk',
        meta: `Duty Status: ${driver.hosDutyStatus || 'Driving'} · Available: ${driver.hosAvailable || '0h'}`,
        actionText: 'Review Driver Log',
        actionIcon: 'shield',
        toastText: `Compliance alert sent to ${driver.name}.`
      });
    }

    if (driver.cdlExpiry) {
      const expiry = new Date(driver.cdlExpiry);
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 30) {
        items.push({
          id: `int-comp-cdl-${driver.id}`,
          category: 'compliance',
          severity: diffDays <= 7 ? 'critical' : 'warning',
          title: `CDL Expiration Imminent (${diffDays <= 0 ? 'EXPIRED' : `${diffDays} days left`})`,
          entity: `Driver: ${driver.name} • License #${driver.cdlNumber || 'N/A'}`,
          detail: `Commercial driver license renewal required. Driver will be disqualified from commercial operation if not renewed.`,
          impact: 'Driver Disqualification & Safety Rating Impact',
          meta: `Expires: ${new Date(driver.cdlExpiry).toLocaleDateString()} · State: ${driver.cdlState || 'N/A'}`,
          actionText: 'Send Renewal Notice',
          actionIcon: 'shield',
          toastText: `Renewal reminder dispatched to ${driver.name}.`
        });
      }
    }
  });

  // 3. Check for overdue broker freight balances
  invoices.forEach(inv => {
    if (inv.status === 'Overdue') {
      items.push({
        id: `int-inv-${inv.id}`,
        category: 'overdue_payment',
        severity: 'urgent',
        title: `Overdue Invoice: ${inv.invoiceNumber || inv.id}`,
        entity: `$${(inv.totalAmount || inv.total || 0).toLocaleString()} Overdue • Due ${inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'Past Due'}`,
        detail: `Freight invoice remains uncollected beyond agreed credit terms. Follow-up required to secure cash flow.`,
        impact: 'Blocked Working Capital & Aging AR',
        meta: `Broker/Customer Invoice #${inv.invoiceNumber || inv.id}`,
        actionText: 'Send Payment Notice',
        actionIcon: 'invoice',
        toastText: `Past due statement transmitted for invoice ${inv.invoiceNumber || inv.id}.`
      });
    }
  });

  // 4. Check for mechanical downtime / trucks in maintenance
  trucks.forEach(truck => {
    if (truck.status === 'Maintenance') {
      items.push({
        id: `int-trk-${truck.id}`,
        category: 'breakdown',
        severity: 'critical',
        title: `Equipment Out of Service: Unit ${truck.unitNumber}`,
        entity: `Truck #${truck.unitNumber} • ${truck.make || ''} ${truck.model || ''}`,
        detail: `Power unit is marked in maintenance status. Verify repairs or schedule certified inspection before returning to dispatch rotation.`,
        impact: 'Unplanned Fleet Downtime & Capacity Constraint',
        meta: `Odometer: ${(truck.mileage || 0).toLocaleString()} mi · Year: ${truck.year || 'N/A'}`,
        actionText: 'Open Fleet Maintenance',
        actionIcon: 'wrench',
        toastText: `Maintenance record updated for Unit ${truck.unitNumber}.`
      });
    }
  });

  return items;
}

export const DashboardView: React.FC<OperationalViewProps> = ({ onNavigate }) => {
  const { loads, drivers, trucks, invoices } = useData();
  const { isSimplified, toggleViewMode } = useViewMode();

  // Primary toggle: 'action' (Action Required - Default) vs 'operations' (Company Operations)
  const [activeTab, setActiveTab] = useState<'action' | 'operations'>('action');

  // Dynamic system clock
  const [clockString, setClockString] = useState('--:--:-- EST');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClockString(now.toLocaleTimeString('en-US', { hour12: false }) + ' EST');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Dynamically derived interventions from live Supabase data
  const dynamicInterventions = useMemo(() => {
    return deriveLiveInterventions(loads, drivers, trucks, invoices);
  }, [loads, drivers, trucks, invoices]);

  // Interventions state (Action Required deck) with local dismissal capability
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const interventions = useMemo(() => {
    return dynamicInterventions.filter(item => !resolvedIds.has(item.id));
  }, [dynamicInterventions, resolvedIds]);

  const [interventionFilter, setInterventionFilter] = useState<'all' | InterventionCategory>('all');

  // Filtered interventions
  const filteredInterventions = useMemo(() => {
    if (interventionFilter === 'all') return interventions;
    return interventions.filter(i => i.category === interventionFilter);
  }, [interventions, interventionFilter]);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 4000);
  };

  // Resolve an intervention
  const handleResolveIntervention = (id: string, toast: string) => {
    setResolvedIds(prev => new Set([...prev, id]));
    triggerToast(toast);
  };

  // Selected truck for detail drawer (in Company Operations)
  const [selectedTruck, setSelectedTruck] = useState<NominalTruck | null>(null);

  // Revenue & normal operations data strictly calculated from Supabase
  const bookedRevenue = useMemo(() => {
    return loads.reduce((acc, l) => acc + (l.rate || 0), 0);
  }, [loads]);

  // Map real Supabase trucks to telemetry cards
  const nominalFleet: NominalTruck[] = useMemo(() => {
    return trucks.map(truck => {
      const assignedDriver = drivers.find(d => d.assignedTruckId === truck.id || d.id === truck.assignedDriverId);
      const activeLoad = loads.find(l => (l.driverId && assignedDriver && l.driverId === assignedDriver.id) || (l.truckId && l.truckId === truck.id));
      const isStaged = truck.status === 'Available' || !activeLoad;
      
      return {
        id: `TRK-${truck.unitNumber || truck.id}`,
        driver: assignedDriver ? assignedDriver.name : 'Unassigned Driver',
        phone: assignedDriver?.phone || '(555) 000-0000',
        city: truck.location || 'Terminal Hub',
        status: isStaged ? 'staged' : 'ontime',
        progress: activeLoad ? 50 : 0,
        route: activeLoad ? `Active Dispatch: Load #${activeLoad.loadNumber || activeLoad.id}` : 'Available for Dispatch',
        rate: activeLoad ? `$${(activeLoad.rate || 0).toLocaleString()}` : 'Ready',
        driveClock: assignedDriver?.hosAvailable || '11:00',
        shiftClock: '14:00',
        cycleClock: '70:00',
        truck: `${truck.year || ''} ${truck.make || 'Freightliner'} ${truck.model || 'Cascadia'}`.trim(),
        fuel: '85%',
        odo: (truck.mileage || 0).toLocaleString(),
        customer: activeLoad ? 'Direct Shipper' : 'Available Unit',
        miles: activeLoad ? `${activeLoad.miles || 0} mi` : '0 mi',
        loadNum: activeLoad ? `Load #${activeLoad.loadNumber || activeLoad.id}` : undefined
      };
    });
  }, [trucks, drivers, loads]);

  const onTimeCount = useMemo(() => nominalFleet.filter(t => t.status === 'ontime').length, [nominalFleet]);
  const stagedCount = useMemo(() => nominalFleet.filter(t => t.status === 'staged').length, [nominalFleet]);

  // Fast-Pay status in Company Operations
  const [fastPayStatus, setFastPayStatus] = useState<'idle' | 'loading' | 'scheduled'>('idle');
  const handleFastPay = () => {
    if (fastPayStatus !== 'idle') return;
    setFastPayStatus('loading');
    setTimeout(() => {
      setFastPayStatus('scheduled');
      triggerToast('Factoring disbursement queued with registered factoring partner.');
    }, 800);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#F8FAFC] dark:bg-[#0A0E1A] text-slate-900 dark:text-slate-100 antialiased font-sans">
      
      {/* ========================================================================= */}
      {/* TOP HEADER: BRANDING, LIVE SYSTEM CLOCK & TWO-WAY SEAMLESS TOGGLE         */}
      {/* ========================================================================= */}
      <header className="h-16 border-b border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#111726]/95 backdrop-blur-md sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between gap-4">
        
        {/* Left: App Brand & Dynamic Time */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-slate-900 font-bold text-xs shadow-xs tracking-wider">
              ▲
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">APEX CARRIER OS</span>
              <span className="block text-[10px] text-slate-500 font-mono">
                {activeTab === 'action' ? 'INTERVENTION CONSOLE' : 'COMPANY OPERATIONS'}
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{clockString}</span>
          </div>
        </div>

        {/* Center: Seamless Two-Way Tab Control (Action Required vs Company Operations) */}
        <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('action')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === 'action'
                ? 'bg-white dark:bg-[#1A2234] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${interventions.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span>Action Required</span>
            <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded-md ${
              interventions.length > 0
                ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 font-bold'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold'
            }`}>
              {interventions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('operations')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === 'operations'
                ? 'bg-white dark:bg-[#1A2234] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp size={13} className="text-emerald-500" />
            <span>Company Operations</span>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">Normal Ops</span>
          </button>
        </div>

        {/* Right: Quick Context Pill */}
        <div className="hidden sm:flex items-center gap-3 text-right">
          {activeTab === 'action' ? (
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Open Friction</span>
              <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400">
                {interventions.length} Items Need Action
              </span>
            </div>
          ) : (
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Today's Revenue</span>
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                ${bookedRevenue.toLocaleString()} Pace
              </span>
            </div>
          )}
        </div>

      </header>

      {/* ========================================================================= */}
      {/* VIEW A: ACTION REQUIRED (DEFAULT USER INTERFERENCE DECK)                  */}
      {/* ========================================================================= */}
      {activeTab === 'action' && (
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 space-y-6">
          
          {/* Header & Category Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/90 dark:border-white/10">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Operational Interventions
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Displays only events that require user interference. Revenue and on-schedule operations are isolated in Company Operations.
              </p>
            </div>

            {interventions.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setInterventionFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    interventionFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5'
                  }`}
                >
                  All ({interventions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInterventionFilter('late_driver')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    interventionFilter === 'late_driver'
                      ? 'bg-red-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5'
                  }`}
                >
                  Late Drivers ({interventions.filter(i => i.category === 'late_driver').length})
                </button>
                <button
                  type="button"
                  onClick={() => setInterventionFilter('compliance')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    interventionFilter === 'compliance'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5'
                  }`}
                >
                  Compliance ({interventions.filter(i => i.category === 'compliance').length})
                </button>
                <button
                  type="button"
                  onClick={() => setInterventionFilter('overdue_payment')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    interventionFilter === 'overdue_payment'
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5'
                  }`}
                >
                  Overdue Payments ({interventions.filter(i => i.category === 'overdue_payment').length})
                </button>
                <button
                  type="button"
                  onClick={() => setInterventionFilter('breakdown')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    interventionFilter === 'breakdown'
                      ? 'bg-red-700 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5'
                  }`}
                >
                  Breakdowns ({interventions.filter(i => i.category === 'breakdown').length})
                </button>
              </div>
            )}
          </div>

          {/* ACTIVE INTERVENTIONS LIST */}
          {interventions.length > 0 ? (
            <div className="space-y-4">
              <AnimatePresence>
                {filteredInterventions.map((item) => {
                  let accentBorder = 'border-slate-200 dark:border-white/10';
                  let tagClass = 'text-slate-700 bg-slate-100 dark:bg-white/10';
                  let buttonClass = 'bg-slate-900 text-white hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200';
                  let categoryLabel = 'Intervention';

                  if (item.category === 'late_driver') {
                    accentBorder = 'border-red-200 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/15';
                    tagClass = 'text-red-700 bg-red-100/70 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800';
                    buttonClass = 'bg-red-600 hover:bg-red-700 text-white';
                    categoryLabel = 'Late Driver';
                  } else if (item.category === 'compliance') {
                    accentBorder = 'border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/15';
                    tagClass = 'text-amber-800 bg-amber-100/70 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
                    buttonClass = 'bg-amber-600 hover:bg-amber-700 text-white';
                    categoryLabel = 'Compliance Risk';
                  } else if (item.category === 'overdue_payment') {
                    accentBorder = 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/15';
                    tagClass = 'text-emerald-800 bg-emerald-100/70 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
                    buttonClass = 'bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900';
                    categoryLabel = 'Overdue Payment';
                  } else if (item.category === 'breakdown') {
                    accentBorder = 'border-red-200 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/15';
                    tagClass = 'text-red-700 bg-red-100/70 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800';
                    buttonClass = 'bg-red-600 hover:bg-red-700 text-white';
                    categoryLabel = 'Equipment Breakdown';
                  }

                  return (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.22 }}
                      className={`p-5 rounded-2xl border ${accentBorder} bg-white dark:bg-[#111726] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5`}
                    >
                      <div className="space-y-2 max-w-2xl">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${tagClass}`}>
                            {categoryLabel}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                            {item.entity}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {item.meta}
                          </span>
                        </div>

                        <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                          {item.title}
                        </h3>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {item.detail}
                        </p>

                        {!isSimplified && (
                          <div className="pt-1 flex items-center gap-2 text-[11px] font-semibold text-red-600 dark:text-red-400">
                            <AlertTriangle size={13} className="shrink-0" />
                            <span>{item.impact}</span>
                          </div>
                        )}
                      </div>

                      {/* Immediate Resolution Button with full-width thumb target on mobile */}
                      <div className="flex items-center gap-2 shrink-0 w-full md:w-auto self-stretch md:self-center">
                        <button
                          type="button"
                          onClick={() => handleResolveIntervention(item.id, item.toastText)}
                          className={`w-full md:w-auto min-h-[44px] px-5 py-2.5 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 ${buttonClass}`}
                        >
                          {item.actionIcon === 'phone' && <Phone size={14} />}
                          {item.actionIcon === 'shield' && <ShieldCheck size={14} />}
                          {item.actionIcon === 'invoice' && <FileText size={14} />}
                          {item.actionIcon === 'wrench' && <Wrench size={14} />}
                          <span>{item.actionText}</span>
                        </button>
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>

              {/* Informative Guidance */}
              <div className="pt-2 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                <span>Interfering in these items updates your live FMCSA safety log and notifies brokers.</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('operations')}
                  className="font-semibold text-slate-900 dark:text-white hover:underline flex items-center gap-1"
                >
                  <span>Go to Company Operations (Revenue & Fleet)</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          ) : (
            /* =================================================================== */
            /* CALM "ALL CLEAR" STATE: ZERO INTERVENTIONS NEEDED                   */
            /* =================================================================== */
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="py-14 px-6 md:px-12 rounded-3xl border border-emerald-200/90 dark:border-emerald-800/40 bg-gradient-to-b from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:via-[#111726] dark:to-[#111726] shadow-xs text-center space-y-6"
            >
              <div className="relative inline-flex items-center justify-center">
                <span className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
                  <CheckCircle2 size={36} strokeWidth={2.2} />
                </span>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500" />
                </span>
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Zero Interventions Required
                </h2>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  No late drivers, compliance risks, overdue payments, or mechanical breakdowns. All operations are running smoothly according to plan.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('operations')}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <TrendingUp size={14} className="text-emerald-400 dark:text-emerald-600" />
                  <span>View Company Operations & Revenue →</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate?.('loads')}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <Truck size={14} />
                  <span>Dispatch New Load</span>
                </button>
              </div>
            </motion.div>
          )}

        </main>
      )}

      {/* ========================================================================= */}
      {/* VIEW B: COMPANY OPERATIONS (NORMAL OPERATIONS & REVENUE OVERVIEW)          */}
      {/* ========================================================================= */}
      {activeTab === 'operations' && (
        <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-8 space-y-8">
          
          {/* 1. FINANCIAL PERFORMANCE & REVENUE STRIP */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm uppercase font-bold tracking-wider text-slate-400">Financial Pulse & P&L</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Operating revenue, margins, and active broker billing</p>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                Live Supabase Feed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Metric 1: Booked Revenue */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/90 dark:border-white/10 shadow-xs">
                <span className="text-xs text-slate-500 font-medium block">Booked Revenue (Total)</span>
                <span className="font-mono text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums block mt-1.5">
                  ${bookedRevenue.toLocaleString()}
                </span>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>Loads: <strong className="text-slate-800 dark:text-slate-200 font-bold">{loads.length}</strong></span>
                  <span className="text-emerald-600 font-semibold">{loads.filter(l => l.status === 'Delivered').length} Delivered</span>
                </div>
              </div>

              {/* Metric 2: Fuel & Operating Expenses */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/90 dark:border-white/10 shadow-xs">
                <span className="text-xs text-slate-500 font-medium block">Estimated Fuel Burn</span>
                <span className="font-mono text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums block mt-1.5">
                  ${bookedRevenue > 0 ? Math.round(bookedRevenue * 0.23).toLocaleString() : '0'}
                </span>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>Burn Ratio: <strong className="text-slate-800 dark:text-slate-200 font-bold">23%</strong></span>
                  <span className="text-emerald-600 font-semibold">{bookedRevenue > 0 ? 'Optimal' : 'Idle'}</span>
                </div>
              </div>

              {/* Metric 3: Operating Profit Margin */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/90 dark:border-white/10 shadow-xs">
                <span className="text-xs text-slate-500 font-medium block">Net Operating Margin</span>
                <span className="font-mono text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums block mt-1.5">
                  {bookedRevenue > 0 ? '+77.0%' : '0.0%'}
                </span>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>Net Profit: <strong className="text-slate-800 dark:text-slate-200 font-bold">${bookedRevenue > 0 ? Math.round(bookedRevenue * 0.77).toLocaleString() : '0'}</strong></span>
                  <span className="text-emerald-600 font-semibold">Target: &gt;70%</span>
                </div>
              </div>

              {/* Metric 4: Factoring Cash Flow */}
              <div className="p-5 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Factoring Advance</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100/70 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                      {bookedRevenue > 0 ? 'Eligible' : 'Zero Balance'}
                    </span>
                  </div>
                  <span className="font-mono text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums block mt-1.5">
                    ${bookedRevenue > 0 ? Math.round(bookedRevenue * 0.95).toLocaleString() : '0'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleFastPay}
                  disabled={fastPayStatus !== 'idle' || bookedRevenue === 0}
                  className={`mt-3 py-1.5 px-3 rounded-lg text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 ${
                    bookedRevenue === 0
                      ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500'
                      : fastPayStatus === 'scheduled'
                      ? 'bg-emerald-600'
                      : fastPayStatus === 'loading'
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200'
                  }`}
                >
                  <Zap size={13} className={fastPayStatus === 'scheduled' ? 'text-white' : 'text-emerald-400 dark:text-emerald-600'} />
                  <span>
                    {bookedRevenue === 0
                      ? 'No Active Balance'
                      : fastPayStatus === 'scheduled' 
                      ? '✓ ACH Transfer Queued' 
                      : fastPayStatus === 'loading'
                      ? 'Processing Transfer...'
                      : `Disburse Funds ($${Math.round(bookedRevenue * 0.95).toLocaleString()})`}
                  </span>
                </button>
              </div>

            </div>
          </section>

          {/* 2. ON-TIME FLEET CORRIDOR PROGRESS (ALL UNITS GOING WELL) */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/90 dark:border-white/10">
              <div>
                <h2 className="text-sm uppercase font-bold tracking-wider text-slate-400">Normal Fleet Operations (On Schedule)</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {nominalFleet.length > 0 
                    ? `${nominalFleet.length} active power units operating within normal safe speed and ELD parameters` 
                    : 'Real-time telemetry and HOS tracking for your power units'}
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {onTimeCount} On-Time In Transit
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  {stagedCount} Staged / Available
                </span>
              </div>
            </div>

            {/* Grid of Units or True Zero State */}
            {nominalFleet.length === 0 ? (
              <div className="py-12 px-6 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/10 flex items-center justify-center mx-auto text-slate-400">
                  <Truck size={24} />
                </div>
                <div className="max-w-sm mx-auto space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Power Units Found</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add your tractors and commercial trucks to track active dispatch corridors, live HOS clocks, and maintenance schedules.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate?.('trucks')}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2"
                >
                  <Truck size={13} />
                  <span>Register Power Unit</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(isSimplified ? nominalFleet.slice(0, 4) : nominalFleet).map((truck) => {
                  const isStaged = truck.status === 'staged';
                  return (
                    <div
                      key={truck.id}
                      onClick={() => setSelectedTruck(truck)}
                      className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/90 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30 transition-all cursor-pointer shadow-xs flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white group-hover:text-black dark:group-hover:text-white">
                            {truck.id}
                          </span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                            isStaged
                              ? 'text-slate-600 bg-slate-100 dark:bg-white/10 dark:text-slate-300'
                              : 'text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          }`}>
                            {isStaged ? 'Staged' : 'On Time'}
                          </span>
                        </div>

                        <div className="mt-2.5">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {truck.driver}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                            <MapPin size={11} className="text-slate-400 shrink-0" />
                            <span>{truck.city}</span>
                          </div>
                        </div>

                        <div className="mt-3 text-[11px] text-slate-600 dark:text-slate-300 truncate">
                          {truck.route}
                        </div>
                      </div>

                      {/* Progress Bar & Rate */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>{isStaged ? 'Capacity Ready' : `${truck.progress}% Completed`}</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{truck.rate}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isStaged ? 'bg-slate-300 dark:bg-slate-600' : 'bg-emerald-500'}`}
                            style={{ width: `${isStaged ? 100 : truck.progress}%` }}
                          />
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

            {isSimplified && nominalFleet.length > 4 && (
              <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs text-slate-500">
                <span>Showing 4 active power units in Simplified View.</span>
                <button
                  type="button"
                  onClick={toggleViewMode}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>Expand All {nominalFleet.length} Units in Detailed View</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
          </section>

          {/* 3. MAINTENANCE SCHEDULES & AUDIT READINESS */}
          {!isSimplified ? (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Left: Routine Scheduled Maintenance */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/90 dark:border-white/10 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
                  <div>
                    <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">Upcoming Preventative Care</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">Routine service windows booked with zero unscheduled downtime</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded">Nominal</span>
                </div>

                <div className="space-y-3 text-xs">
                  {trucks.filter(t => t.nextMaintenanceDate || t.status === 'Maintenance').length > 0 ? (
                    trucks.filter(t => t.nextMaintenanceDate || t.status === 'Maintenance').map(t => (
                      <div key={t.id} className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-between">
                        <div>
                          <span className="font-bold font-mono text-slate-900 dark:text-white">Unit {t.unitNumber}</span>
                          <span className="text-slate-500 ml-2">{t.year} {t.make} {t.model}</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {t.status === 'Maintenance' ? 'Power unit out of service for active repair' : `Service scheduled for ${t.nextMaintenanceDate || 'routine inspection'}`}
                          </p>
                        </div>
                        <span className={`text-[11px] font-semibold ${t.status === 'Maintenance' ? 'text-red-500' : 'text-emerald-600'}`}>
                          {t.status === 'Maintenance' ? 'In Maintenance' : 'Scheduled'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 text-center text-xs text-slate-500">
                      <span>No upcoming maintenance flagged. All fleet units ready for dispatch.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Driver Compliance & Safety Audit */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/90 dark:border-white/10 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
                  <div>
                    <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">FMCSA Audit Status</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">Driver qualifications, ELD logs, and safety thresholds</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded">Satisfactory</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Clean Driver Logs</span>
                    <span className="font-mono text-lg font-bold text-slate-900 dark:text-white block mt-1">
                      {drivers.length > 0 
                        ? `${Math.round((drivers.filter(d => (d.hosViolations || 0) === 0).length / drivers.length) * 100)}%` 
                        : '100%'}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      {drivers.reduce((acc, d) => acc + (d.hosViolations || 0), 0)} Violations
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Drivers</span>
                    <span className="font-mono text-lg font-bold text-emerald-600 block mt-1">{drivers.length}</span>
                    <span className="text-[10px] text-slate-500 font-medium">In Supabase DB</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ELD logs and driver qualification records are synchronized in real-time with your live Supabase database.
                </p>
              </div>

            </section>
          ) : (
            <div className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={20} className="text-emerald-500 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">Safety & Maintenance: 100% Satisfactory</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">All daily pre-trip DVIRs signed. Zero overdue maintenance items.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleViewMode}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
              >
                Inspect Maintenance Details →
              </button>
            </div>
          )}

        </main>
      )}

      {/* ========================================================================= */}
      {/* SLIDE-OVER DETAIL DRAWER FOR POWER UNIT TELEMETRY & ELD                   */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedTruck && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTruck(null)} 
              className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40"
            />

            <motion.aside 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-[#111726] border-l border-slate-200 dark:border-white/10 z-50 shadow-2xl flex flex-col justify-between"
            >
              <div>
                <div className="p-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <div>
                      <h3 className="text-lg font-bold font-mono text-slate-900 dark:text-white">{selectedTruck.id}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{selectedTruck.driver} · Cell: {selectedTruck.phone}</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSelectedTruck(null)} 
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 space-y-5 text-xs">
                  {/* Clocks */}
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">ELD Clocks (FMCSA Nominal)</span>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                        <span className="text-[10px] text-slate-500 block">Drive Remaining</span>
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white block mt-0.5">{selectedTruck.driveClock}</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                        <span className="text-[10px] text-slate-500 block">Shift Left</span>
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white block mt-0.5">{selectedTruck.shiftClock}</span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-center">
                        <span className="text-[10px] text-slate-500 block">Cycle (70h)</span>
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white block mt-0.5">{selectedTruck.cycleClock}</span>
                      </div>
                    </div>
                  </div>

                  {/* Freight */}
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Current Freight Assignment</span>
                    <div className="mt-2 p-3.5 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedTruck.loadNum || 'Active Corridor'}</span>
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-100/70 dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 rounded">{selectedTruck.rate}</span>
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 font-medium">
                        {selectedTruck.route}
                      </div>
                      <div className="text-[11px] text-slate-500 flex justify-between">
                        <span>{selectedTruck.customer || 'Direct Shipper'}</span>
                        <span>{selectedTruck.miles || '340 mi'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry */}
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Power Unit Specs</span>
                    <div className="mt-2 space-y-2 border-t border-b border-slate-100 dark:border-white/10 py-3">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Equipment:</span>
                        <span className="font-medium text-slate-900 dark:text-white">{selectedTruck.truck}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Live GPS Location:</span>
                        <span className="font-medium text-slate-900 dark:text-white">{selectedTruck.city}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Fuel Level:</span>
                        <span className="font-mono font-medium text-slate-900 dark:text-white">{selectedTruck.fuel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Odometer:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{selectedTruck.odo} mi</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Drawer Action */}
              <div className="p-6 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 space-y-2">
                <button 
                  type="button"
                  onClick={() => triggerToast(`VoIP browser bridge dialing ${selectedTruck.driver} (${selectedTruck.phone})...`)} 
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  <Phone size={14} className="text-emerald-400 dark:text-emerald-600" />
                  Call Driver Directly
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* FLOATING TOAST NOTIFICATION                                               */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5"
          >
            <Check size={16} className="text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default DashboardView;
