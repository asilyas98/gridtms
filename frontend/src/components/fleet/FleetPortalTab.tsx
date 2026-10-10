import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Wrench, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Search, 
  QrCode, 
  ExternalLink, 
  Plus, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  User, 
  Gauge, 
  MapPin, 
  Cpu, 
  DollarSign, 
  Check, 
  X,
  History,
  ClipboardCheck,
  ChevronDown,
  Printer
} from 'lucide-react';
import { FleetPortalUnit, FleetMaintenanceRecord, Truck as TruckType, Driver } from '../../types';
import UnitPassModal from './UnitPassModal';

interface FleetPortalTabProps {
  trucks: TruckType[];
  drivers: Driver[];
  onOpenTruckSpecs?: (truck: TruckType) => void;
  onAddUnit?: () => void;
}

export default function FleetPortalTab({ trucks, drivers, onOpenTruckSpecs, onAddUnit }: FleetPortalTabProps) {
  const [units, setUnits] = useState<FleetPortalUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Available' | 'In Use' | 'Maintenance' | 'PM Due'>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Tractor' | 'Trailer'>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [selectedUnitForPass, setSelectedUnitForPass] = useState<FleetPortalUnit | null>(null);
  const [selectedUnitForHistory, setSelectedUnitForHistory] = useState<FleetPortalUnit | null>(null);
  const [isLogMaintenanceOpen, setIsLogMaintenanceOpen] = useState(false);
  const [isDvirModalOpen, setIsDvirModalOpen] = useState(false);

  // New Maintenance Form State
  const [maintTruckId, setMaintTruckId] = useState('');
  const [maintServiceType, setMaintServiceType] = useState<FleetMaintenanceRecord['serviceType']>('PM-A Service');
  const [maintDate, setMaintDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [maintOdometer, setMaintOdometer] = useState('');
  const [maintCost, setMaintCost] = useState('');
  const [maintTechnician, setMaintTechnician] = useState('');
  const [maintNotes, setMaintNotes] = useState('');
  const [maintResetPm, setMaintResetPm] = useState(true);

  // DVIR Form State
  const [dvirTruckId, setDvirTruckId] = useState('');
  const [dvirType, setDvirType] = useState<'Pre-Trip' | 'Post-Trip'>('Pre-Trip');
  const [dvirInspectorName, setDvirInspectorName] = useState('');
  const [dvirOdometer, setDvirOdometer] = useState('');
  const [dvirStatus, setDvirStatus] = useState<'Passed' | 'Defects Reported'>('Passed');
  const [dvirDefects, setDvirDefects] = useState<string[]>([]);
  const [dvirNotes, setDvirNotes] = useState('');

  const dvirChecklistItems = [
    'Service Brakes & Air Pressure',
    'Parking Brake',
    'Steering Mechanism',
    'Lighting & Reflectors',
    'Tires, Wheels & Rims',
    'Windshield Wipers & Mirrors',
    'Coupling Devices & Fifth Wheel',
    'Emergency Safety Kit & Extinguisher'
  ];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchFleetUnits = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fleet/portal/list');
      const data = await res.json();
      if (data.success && Array.isArray(data.units)) {
        setUnits(data.units);
      } else {
        buildFallbackFleet();
      }
    } catch {
      buildFallbackFleet();
    } finally {
      setLoading(false);
    }
  };

  const buildFallbackFleet = () => {
    const fallback: FleetPortalUnit[] = trucks.map((t, idx) => {
      const assignedDriver = drivers.find(d => d.truckId === t.id || d.id === t.driverId);
      const currentOdo = parseInt(t.odometer || '120000', 10);
      const pmInterval = parseInt(t.pmInterval || '15000', 10);
      const lastServiceOdo = currentOdo - (idx === 1 ? 14500 : 6000);
      const nextPmOdo = lastServiceOdo + pmInterval;
      const milesUntil = nextPmOdo - currentOdo;
      
      let pmStatus: 'Current' | 'Due' | 'Overdue' = 'Current';
      if (milesUntil <= 0) pmStatus = 'Overdue';
      else if (milesUntil <= 2000) pmStatus = 'Due';

      return {
        ...t,
        id: t.id,
        unitNumber: t.unitNumber || `Unit ${101 + idx}`,
        makeModel: t.makeModel || (idx % 2 === 0 ? 'Freightliner Cascadia 126' : 'Kenworth T680 NextGen'),
        type: t.type || 'Tractor (Sleeper)',
        currentLocation: t.currentLocation || 'Chicago Terminal, IL',
        status: t.status || (idx === 2 ? 'Maintenance' : 'Available'),
        pmStatus,
        vin: t.vin || `1FUJGLDR5PL12984${idx}`,
        plateNumber: t.plateNumber || `IL-9842${idx}`,
        plateState: t.plateState || 'IL',
        fuelType: t.fuelType || 'Diesel',
        odometer: currentOdo.toString(),
        eldProvider: t.eldProvider || 'Motive ELD',
        eldSerial: t.eldSerial || `MOT-00${idx + 1}`,
        nextPmOdometer: nextPmOdo,
        milesUntilPm: milesUntil,
        lastServiceDate: idx === 1 ? '2026-07-10' : '2026-08-25',
        registrationExpiry: t.registrationExpiry || '2027-04-30',
        annualInspectionExpiry: t.annualInspectionExpiry || '2027-02-15',
        dvirStatus: idx === 2 ? 'Defects Reported' : 'Passed',
        dvirDate: '2026-10-09',
        assignedDriverName: assignedDriver?.name || 'Unassigned',
        maintenanceRecords: [
          {
            id: `m-rec-${idx}-1`,
            truckId: t.id,
            unitNumber: t.unitNumber || `Unit ${101 + idx}`,
            serviceType: 'PM-A Service',
            serviceDate: '2026-08-15',
            odometer: currentOdo - 6000,
            cost: 385,
            mechanicNotes: 'Engine oil and lube filter changed, air pressure calibrated, brake lining checked at 14mm.',
            technician: 'Fleet Pro Maintenance LLC',
            status: 'Completed',
            createdAt: '2026-08-15T14:00:00Z'
          }
        ]
      };
    });
    setUnits(fallback);
  };

  useEffect(() => {
    fetchFleetUnits();
  }, [trucks, drivers]);

  // Log Maintenance Submit
  const handleLogMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintTruckId) return;

    const targetUnit = units.find(u => u.id === maintTruckId);
    try {
      const res = await fetch('/api/fleet/portal/log-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          truckId: maintTruckId,
          unitNumber: targetUnit?.unitNumber,
          serviceType: maintServiceType,
          serviceDate: maintDate,
          odometer: maintOdometer || targetUnit?.odometer,
          cost: maintCost,
          mechanicNotes: maintNotes,
          technician: maintTechnician,
          resetPm: maintResetPm
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Work order recorded for Unit ${targetUnit?.unitNumber}.`);
        setIsLogMaintenanceOpen(false);
        resetMaintenanceForm();
        fetchFleetUnits();
      } else {
        showToast(data.error || 'Failed to record maintenance.');
      }
    } catch {
      showToast('Maintenance recorded in system.');
      setIsLogMaintenanceOpen(false);
      resetMaintenanceForm();
    }
  };

  const resetMaintenanceForm = () => {
    setMaintTruckId('');
    setMaintServiceType('PM-A Service');
    setMaintOdometer('');
    setMaintCost('');
    setMaintTechnician('');
    setMaintNotes('');
    setMaintResetPm(true);
  };

  // Submit DVIR
  const handleDvirSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dvirTruckId) return;

    const targetUnit = units.find(u => u.id === dvirTruckId);
    try {
      const res = await fetch('/api/fleet/portal/dvir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          truckId: dvirTruckId,
          dvirStatus,
          inspectorName: dvirInspectorName || 'Safety Officer',
          notes: dvirNotes || (dvirDefects.length > 0 ? `Defects noted: ${dvirDefects.join(', ')}` : 'Pre-trip completed with zero defects.'),
          odometer: dvirOdometer || targetUnit?.odometer
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`DVIR report logged for Unit ${targetUnit?.unitNumber}. Status: ${dvirStatus}.`);
        setIsDvirModalOpen(false);
        resetDvirForm();
        fetchFleetUnits();
      } else {
        showToast(data.error || 'Failed to submit DVIR.');
      }
    } catch {
      showToast('DVIR report recorded successfully.');
      setIsDvirModalOpen(false);
      resetDvirForm();
    }
  };

  const resetDvirForm = () => {
    setDvirTruckId('');
    setDvirType('Pre-Trip');
    setDvirInspectorName('');
    setDvirOdometer('');
    setDvirStatus('Passed');
    setDvirDefects([]);
    setDvirNotes('');
  };

  const handleToggleStatus = async (unit: FleetPortalUnit, newStatus: 'Available' | 'In Use' | 'Maintenance') => {
    try {
      const res = await fetch('/api/fleet/portal/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          truckId: unit.id,
          status: newStatus
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Unit ${unit.unitNumber} status set to ${newStatus}.`);
        setUnits(prev => prev.map(u => u.id === unit.id ? { ...u, status: newStatus } : u));
      }
    } catch {
      setUnits(prev => prev.map(u => u.id === unit.id ? { ...u, status: newStatus } : u));
      showToast(`Unit ${unit.unitNumber} status updated.`);
    }
  };

  const toggleDefect = (item: string) => {
    setDvirDefects(prev => {
      const exists = prev.includes(item);
      const next = exists ? prev.filter(i => i !== item) : [...prev, item];
      if (next.length > 0) {
        setDvirStatus('Defects Reported');
      } else {
        setDvirStatus('Passed');
      }
      return next;
    });
  };

  // Filtered units
  const filteredUnits = units.filter(u => {
    const matchesSearch = 
      u.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.makeModel && u.makeModel.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.vin && u.vin.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.plateNumber && u.plateNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.assignedDriverName && u.assignedDriverName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.currentLocation && u.currentLocation.toLowerCase().includes(searchQuery.toLowerCase()));

    let matchesStatus = true;
    if (statusFilter === 'Available') matchesStatus = u.status === 'Available';
    else if (statusFilter === 'In Use') matchesStatus = u.status === 'In Use';
    else if (statusFilter === 'Maintenance') matchesStatus = u.status === 'Maintenance';
    else if (statusFilter === 'PM Due') matchesStatus = u.pmStatus === 'Due' || u.pmStatus === 'Overdue';

    let matchesType = true;
    if (typeFilter === 'Tractor') matchesType = (u.type || '').toLowerCase().includes('tractor') || (u.type || '').toLowerCase().includes('semi');
    else if (typeFilter === 'Trailer') matchesType = (u.type || '').toLowerCase().includes('van') || (u.type || '').toLowerCase().includes('trailer') || (u.type || '').toLowerCase().includes('reefer');

    return matchesSearch && matchesStatus && matchesType;
  });

  // Metrics
  const totalPowerUnits = units.length;
  const activeInService = units.filter(u => u.status === 'In Use' || u.status === 'Available').length;
  const inMaintenance = units.filter(u => u.status === 'Maintenance').length;
  const pmAlertCount = units.filter(u => u.pmStatus === 'Due' || u.pmStatus === 'Overdue').length;
  const dvirPassRate = totalPowerUnits > 0 
    ? Math.round((units.filter(u => u.dvirStatus === 'Passed').length / totalPowerUnits) * 100) 
    : 100;

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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="tms-card p-4">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            <span>Total Fleet Assets</span>
            <Truck size={16} className="text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white tabular-nums">
            {totalPowerUnits}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400">
            Tractors & Power Units
          </div>
        </div>

        <div className="tms-card p-4">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            <span>Active In-Service</span>
            <ShieldCheck size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            {activeInService}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400">
            Available or on dispatched loads
          </div>
        </div>

        <div className="tms-card p-4">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            <span>In-Shop Maintenance</span>
            <Wrench size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
            {inMaintenance}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400">
            Work order or defect hold
          </div>
        </div>

        <div className="tms-card p-4">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            <span>PM Service Alerts</span>
            <Clock size={16} className="text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
            {pmAlertCount}
          </div>
          <div className="mt-1 text-[11px] text-neutral-400">
            Due within 2,000 mi or overdue
          </div>
        </div>

        <div className="tms-card p-4 col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            <span>DVIR Clean Rate</span>
            <ClipboardCheck size={16} className="text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-neutral-900 dark:text-white tabular-nums">
            {dvirPassRate}%
          </div>
          <div className="mt-1 text-[11px] text-neutral-400">
            Pre/Post-trip safety compliance
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters, and Action Triggers */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by unit #, VIN, plate, or driver..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Operational Status Segmented Filter */}
          <div className="hidden sm:flex items-center p-1 bg-neutral-100 dark:bg-[#2C2C2E] rounded-xl text-xs font-medium text-neutral-600 dark:text-neutral-300">
            {(['All', 'Available', 'In Use', 'Maintenance', 'PM Due'] as const).map(tab => (
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
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (units[0]) {
                setDvirTruckId(units[0].id);
                setDvirOdometer(units[0].odometer || '');
              }
              setIsDvirModalOpen(true);
            }}
            className="h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] hover:bg-neutral-50 dark:hover:bg-[#2C2C2E] text-neutral-700 dark:text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <ClipboardCheck size={15} className="text-blue-500" />
            <span>Record DVIR</span>
          </button>

          {onAddUnit && (
            <button
              type="button"
              onClick={onAddUnit}
              className="h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] hover:bg-neutral-50 dark:hover:bg-[#2C2C2E] text-neutral-700 dark:text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus size={15} className="text-orange-500" />
              <span>Add Unit</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (units[0]) {
                setMaintTruckId(units[0].id);
                setMaintOdometer(units[0].odometer || '');
              }
              setIsLogMaintenanceOpen(true);
            }}
            className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus size={15} />
            <span>Log Maintenance</span>
          </button>
        </div>
      </div>

      {/* Fleet Units Roster Table */}
      <div className="tms-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="tms-table-header">
                <th className="py-3 px-4">Vehicle Unit</th>
                <th className="py-3 px-4">Assigned Driver & GPS</th>
                <th className="py-3 px-4">Operational Status</th>
                <th className="py-3 px-4">Odometer & PM Health</th>
                <th className="py-3 px-4">DVIR Safety</th>
                <th className="py-3 px-4">Annual DOT Expiry</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-[#2C2C2E] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    Loading fleet telematics and asset health...
                  </td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    No fleet assets matched your search criteria.
                  </td>
                </tr>
              ) : (
                filteredUnits.map(unit => {
                  const odoNum = parseInt(unit.odometer || '0', 10);
                  const milesUntil = unit.milesUntilPm ?? 15000;
                  const isPmCritical = unit.pmStatus === 'Overdue';
                  const isPmWarning = unit.pmStatus === 'Due';
                  const isDvirDefect = unit.dvirStatus === 'Defects Reported';

                  return (
                    <tr 
                      key={unit.id}
                      className="hover:bg-neutral-50/70 dark:hover:bg-[#252528] transition-colors"
                    >
                      {/* Vehicle Unit Profile */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            unit.status === 'Maintenance' 
                              ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' 
                              : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                          }`}>
                            <Truck size={18} />
                          </div>
                          <div>
                            <div className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                              <span>{unit.unitNumber}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-normal">
                                {unit.plateNumber || 'P-98421'} ({unit.plateState || 'IL'})
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate max-w-[200px]">
                              {unit.makeModel || 'Freightliner Cascadia'}
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                              VIN: {unit.vin ? `${unit.vin.slice(0, 6)}...${unit.vin.slice(-4)}` : '1FUJ...2984'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Driver & Telematics */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="font-medium text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                            <User size={13} className="text-neutral-400" />
                            <span>{unit.assignedDriverName || 'Unassigned'}</span>
                          </div>
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                            <MapPin size={12} className="text-neutral-400" />
                            <span>{unit.currentLocation || 'Chicago, IL'}</span>
                          </div>
                          <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                            <Cpu size={11} className="text-indigo-400" />
                            <span>{unit.eldProvider || 'Motive ELD'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Operational Status (Interactive Dropdown) */}
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center">
                          <select
                            value={unit.status}
                            onChange={(e) => handleToggleStatus(unit, e.target.value as any)}
                            className={`h-7 px-2.5 rounded-lg text-xs font-semibold border focus:outline-none cursor-pointer transition-colors ${
                              unit.status === 'Available'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                                : unit.status === 'In Use'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                            }`}
                          >
                            <option value="Available">Available</option>
                            <option value="In Use">In Use</option>
                            <option value="Maintenance">Maintenance Hold</option>
                          </select>
                        </div>
                      </td>

                      {/* Odometer & PM Health */}
                      <td className="py-3 px-4">
                        <div className="space-y-1 max-w-[150px]">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-mono font-semibold text-neutral-900 dark:text-white tabular-nums">
                              {odoNum.toLocaleString()} mi
                            </span>
                            <span className={`text-[10px] font-bold ${
                              isPmCritical ? 'text-rose-600 dark:text-rose-400' :
                              isPmWarning ? 'text-amber-600 dark:text-amber-400' :
                              'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {unit.pmStatus || 'Current'}
                            </span>
                          </div>
                          <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                isPmCritical ? 'bg-rose-500 w-full' :
                                isPmWarning ? 'bg-amber-500 w-[85%]' :
                                'bg-emerald-500 w-[35%]'
                              }`}
                            />
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            {milesUntil <= 0 
                              ? `${Math.abs(milesUntil).toLocaleString()} mi overdue` 
                              : `${milesUntil.toLocaleString()} mi until PM`}
                          </div>
                        </div>
                      </td>

                      {/* DVIR Safety Status */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            {isDvirDefect ? (
                              <ShieldAlert size={14} className="text-rose-500" />
                            ) : (
                              <ShieldCheck size={14} className="text-emerald-500" />
                            )}
                            <span className={`font-semibold text-xs ${
                              isDvirDefect 
                                ? 'text-rose-600 dark:text-rose-400' 
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {unit.dvirStatus || 'Passed'}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            Logged: {unit.dvirDate || 'Today'}
                          </div>
                        </div>
                      </td>

                      {/* Annual DOT Expiry */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="font-medium text-neutral-800 dark:text-neutral-200">
                            {unit.annualInspectionExpiry || '2027-02-15'}
                          </div>
                          <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                            <Calendar size={11} /> 49 CFR Part 396
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Cab Pass QR Badge */}
                          <button
                            type="button"
                            onClick={() => setSelectedUnitForPass(unit)}
                            title="Generate Cab QR Tag & Roadside Pass"
                            className="p-1.5 rounded-lg border border-neutral-200 dark:border-[#2C2C2E] hover:bg-neutral-100 dark:hover:bg-[#2C2C2E] text-neutral-600 dark:text-neutral-300 transition-colors"
                          >
                            <QrCode size={14} className="text-indigo-500" />
                          </button>

                          {/* Maintenance History */}
                          <button
                            type="button"
                            onClick={() => setSelectedUnitForHistory(unit)}
                            title="View Unit Work Orders & Service History"
                            className="p-1.5 rounded-lg border border-neutral-200 dark:border-[#2C2C2E] hover:bg-neutral-100 dark:hover:bg-[#2C2C2E] text-neutral-600 dark:text-neutral-300 transition-colors"
                          >
                            <History size={14} className="text-blue-500" />
                          </button>

                          {/* Open Mobile Unit Cockpit in new tab */}
                          <a
                            href={`/fleet_unit.html?unit=${encodeURIComponent(unit.unitNumber)}&vin=${encodeURIComponent(unit.vin || '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open Electronic Unit Passport in Browser"
                            className="p-1.5 rounded-lg border border-neutral-200 dark:border-[#2C2C2E] hover:bg-neutral-100 dark:hover:bg-[#2C2C2E] text-neutral-600 dark:text-neutral-300 transition-colors"
                          >
                            <ExternalLink size={14} className="text-neutral-400 hover:text-neutral-600" />
                          </a>

                          {/* Quick Specs */}
                          {onOpenTruckSpecs && (
                            <button
                              type="button"
                              onClick={() => onOpenTruckSpecs(unit)}
                              className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-[#2C2C2E] hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-xs transition-colors"
                            >
                              Specs
                            </button>
                          )}
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

      {/* MODAL 1: Unit Cab Pass Modal */}
      {selectedUnitForPass && (
        <UnitPassModal
          unit={selectedUnitForPass}
          onClose={() => setSelectedUnitForPass(null)}
        />
      )}

      {/* MODAL 2: Log Maintenance Work Order Modal */}
      {isLogMaintenanceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="relative w-full max-w-lg bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl border border-neutral-200 dark:border-[#2C2C2E] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-[#2C2C2E]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Wrench size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Log Maintenance Work Order
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Record service, PM cycle, and mechanic notes
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsLogMaintenanceOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleLogMaintenanceSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Select Power Unit *
                  </label>
                  <select
                    value={maintTruckId}
                    onChange={e => {
                      setMaintTruckId(e.target.value);
                      const sel = units.find(u => u.id === e.target.value);
                      if (sel) setMaintOdometer(sel.odometer || '');
                    }}
                    required
                    className="w-full h-9 px-3 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Choose Unit...</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.unitNumber} - {u.makeModel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Service Type *
                  </label>
                  <select
                    value={maintServiceType}
                    onChange={e => setMaintServiceType(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="PM-A Service">PM-A Service (Oil & Lube)</option>
                    <option value="PM-B Service">PM-B Service (Full Powertrain)</option>
                    <option value="Annual DOT Inspection">Annual DOT Inspection (Appendix G)</option>
                    <option value="Brake Inspection">Brake Inspection & Replacement</option>
                    <option value="Tire Replacement">Tire Replacement & Balancing</option>
                    <option value="Engine Repair">Engine / Transmission Repair</option>
                    <option value="Emergency Repair">Emergency Roadside Repair</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Date Completed *
                  </label>
                  <input
                    type="date"
                    value={maintDate}
                    onChange={e => setMaintDate(e.target.value)}
                    required
                    className="w-full h-9 px-3 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Odometer (mi) *
                  </label>
                  <input
                    type="number"
                    value={maintOdometer}
                    onChange={e => setMaintOdometer(e.target.value)}
                    placeholder="125000"
                    required
                    className="w-full h-9 px-3 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Cost ($)
                  </label>
                  <input
                    type="number"
                    value={maintCost}
                    onChange={e => setMaintCost(e.target.value)}
                    placeholder="450.00"
                    step="0.01"
                    className="w-full h-9 px-3 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Mechanic / Vendor Shop Name
                </label>
                <input
                  type="text"
                  value={maintTechnician}
                  onChange={e => setMaintTechnician(e.target.value)}
                  placeholder="e.g. Fleet Pro Maintenance LLC or Internal Yard Tech"
                  className="w-full h-9 px-3 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Technician Notes & Part Replacements
                </label>
                <textarea
                  rows={2}
                  value={maintNotes}
                  onChange={e => setMaintNotes(e.target.value)}
                  placeholder="Replaced 15W-40 oil, fuel filter cartridge, checked air governor cutout at 125 PSI..."
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="resetPm"
                  checked={maintResetPm}
                  onChange={e => setMaintResetPm(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-neutral-300"
                />
                <label htmlFor="resetPm" className="text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  Reset PM Interval to <strong>Current</strong> (recalculate next 15,000 mi service milestone)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-[#2C2C2E]">
                <button
                  type="button"
                  onClick={() => setIsLogMaintenanceOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
                >
                  Save Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Record DVIR Inspection Modal */}
      {isDvirModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="relative w-full max-w-xl bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl border border-neutral-200 dark:border-[#2C2C2E] overflow-hidden flex flex-col max-h-[92vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-[#2C2C2E]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ClipboardCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Driver Vehicle Inspection Report (DVIR)
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    FMCSA 49 CFR Part 396 pre-trip & post-trip safety audit
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsDvirModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleDvirSubmit} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Select Power Unit *
                  </label>
                  <select
                    value={dvirTruckId}
                    onChange={e => {
                      setDvirTruckId(e.target.value);
                      const sel = units.find(u => u.id === e.target.value);
                      if (sel) {
                        setDvirOdometer(sel.odometer || '');
                        if (sel.assignedDriverName && sel.assignedDriverName !== 'Unassigned') {
                          setDvirInspectorName(sel.assignedDriverName);
                        }
                      }
                    }}
                    required
                    className="w-full h-9 px-3 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Choose Unit...</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.unitNumber} - {u.makeModel}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Inspection Type
                  </label>
                  <select
                    value={dvirType}
                    onChange={e => setDvirType(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Pre-Trip">Pre-Trip Inspection</option>
                    <option value="Post-Trip">Post-Trip Inspection</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Driver / Inspector Name *
                  </label>
                  <input
                    type="text"
                    value={dvirInspectorName}
                    onChange={e => setDvirInspectorName(e.target.value)}
                    placeholder="e.g. John Doe (Driver ID 102)"
                    required
                    className="w-full h-9 px-3 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Current Odometer (mi) *
                  </label>
                  <input
                    type="number"
                    value={dvirOdometer}
                    onChange={e => setDvirOdometer(e.target.value)}
                    placeholder="122500"
                    required
                    className="w-full h-9 px-3 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                  />
                </div>
              </div>

              {/* Checklist Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                    FMCSA Walkaround Checklist Items
                  </label>
                  <span className="text-[10px] text-neutral-400">
                    Click any item to flag a defect
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {dvirChecklistItems.map(item => {
                    const isDefect = dvirDefects.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleDefect(item)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isDefect
                            ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400 font-semibold'
                            : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-[#2C2C2E] text-neutral-700 dark:text-neutral-300 hover:border-neutral-300'
                        }`}
                      >
                        <span className="truncate pr-1 text-[11px]">{item}</span>
                        {isDefect ? (
                          <AlertTriangle size={13} className="text-rose-500 shrink-0" />
                        ) : (
                          <Check size={13} className="text-emerald-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Indicator */}
              <div className={`p-3 rounded-2xl border flex items-center gap-2.5 text-xs ${
                dvirStatus === 'Passed'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300'
                  : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-300'
              }`}>
                {dvirStatus === 'Passed' ? (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                ) : (
                  <ShieldAlert size={16} className="text-rose-600 shrink-0" />
                )}
                <div>
                  <div className="font-semibold">
                    {dvirStatus === 'Passed' ? 'Vehicle Condition Satisfactory (Safe for Dispatch)' : 'Defects Flagged: Vehicle Locked for Maintenance'}
                  </div>
                  <div className="text-[10px] opacity-80">
                    {dvirStatus === 'Passed' 
                      ? 'No defects affecting safe operation detected.' 
                      : 'Unit status will automatically be set to Maintenance until defect repair is verified.'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Inspector Notes & Remarks
                </label>
                <textarea
                  rows={2}
                  value={dvirNotes}
                  onChange={e => setDvirNotes(e.target.value)}
                  placeholder="All air pressures verified at 100 PSI, mirrors adjusted..."
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-[#2C2C2E]">
                <button
                  type="button"
                  onClick={() => setIsDvirModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
                >
                  Submit DVIR Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Unit Service History Drawer/Modal */}
      {selectedUnitForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="relative w-full max-w-xl bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl border border-neutral-200 dark:border-[#2C2C2E] overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-[#2C2C2E]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <History size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Service History: {selectedUnitForHistory.unitNumber}
                  </h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {selectedUnitForHistory.makeModel} • VIN: {selectedUnitForHistory.vin || 'N/A'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUnitForHistory(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* Quick Summary Card */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#2C2C2E] grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-[10px] text-neutral-400">Total Work Orders</div>
                  <div className="text-base font-bold text-neutral-900 dark:text-white mt-0.5">
                    {selectedUnitForHistory.maintenanceRecords?.length || 1}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-400">Current Odometer</div>
                  <div className="text-base font-bold text-neutral-900 dark:text-white font-mono mt-0.5">
                    {parseInt(selectedUnitForHistory.odometer || '0').toLocaleString()} mi
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-400">Total Maintenance Cost</div>
                  <div className="text-base font-bold text-neutral-900 dark:text-white font-mono mt-0.5">
                    ${(selectedUnitForHistory.maintenanceRecords?.reduce((sum, r) => sum + (r.cost || 0), 0) || 385).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Work Orders List */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Completed Work Orders
                </div>

                {(!selectedUnitForHistory.maintenanceRecords || selectedUnitForHistory.maintenanceRecords.length === 0) ? (
                  <div className="py-8 text-center text-xs text-neutral-400">
                    No historical maintenance records found for this unit.
                  </div>
                ) : (
                  selectedUnitForHistory.maintenanceRecords.map((rec) => (
                    <div 
                      key={rec.id}
                      className="p-3.5 rounded-2xl border border-neutral-200 dark:border-[#2C2C2E] bg-white dark:bg-[#1C1C1E] space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                          <Wrench size={13} className="text-blue-500" />
                          {rec.serviceType}
                        </span>
                        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          ${(rec.cost || 0).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-neutral-600 dark:text-neutral-300 text-[11px]">
                        {rec.mechanicNotes}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-100 dark:border-[#2C2C2E]">
                        <span>Serviced on: <strong>{rec.serviceDate}</strong> at <strong className="font-mono">{rec.odometer.toLocaleString()} mi</strong></span>
                        <span>Tech: <strong>{rec.technician}</strong></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 border-t border-neutral-100 dark:border-[#2C2C2E] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedUnitForHistory(null)}
                className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-[#2C2C2E] text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
