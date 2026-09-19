import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  Search,
  CheckCircle2,
  AlertCircle,
  Download,
  X,
  CreditCard,
  Plus,
  Trash2,
  Calendar,
  User,
  Check,
  Percent,
  Calculator,
  CloudLightning,
  Coins,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Sparkles,
  Info,
  Printer,
  Mail,
  Send,
  RefreshCw,
  Edit
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { Driver, Load, Settlement, RecurringRule } from '../types';
import { motion, AnimatePresence } from 'motion/react';

// Help functions to align date range starting on Sunday and ending on Saturday
const getWeekRange = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const sun = new Date(d);
  sun.setDate(d.getDate() - day);
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);

  const formatDate = (dateObj: Date) => {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    start: formatDate(sun),
    end: formatDate(sat)
  };
};

export default function SettlementsView() {
  const { loads, drivers, recurringRules, addRecurringRule, updateRecurringRule, deleteRecurringRule, navigationIntent, setNavigationIntent } = useData();

  useEffect(() => {
    if (navigationIntent && navigationIntent.view === 'settlements') {
      if (navigationIntent.searchQuery) {
        setSearchQuery(navigationIntent.searchQuery);
      }
      setNavigationIntent(null);
    }
  }, [navigationIntent, setNavigationIntent]);

  // API Linked States
  const [apiSettlements, setApiSettlements] = useState<Settlement[]>([]);
  const [calculationConnected, setCalculationConnected] = useState(true);
  const [expandedSettleId, setExpandedSettleId] = useState<string | null>(null);
  
  // Interactive Filter States
  const [searchQuery, setSearchQuery] = useState('');
  
  // Primary Calculator state
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [editingSettlementId, setEditingSettlementId] = useState<string | null>(null);
  const [calcDriverId, setCalcDriverId] = useState('');

  // Document Viewer Modal State
  const [selectedSettlementForDoc, setSelectedSettlementForDoc] = useState<Settlement | null>(null);
  const [isEmailingDoc, setIsEmailingDoc] = useState(false);
  const [isCastingDoc, setIsCastingDoc] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);
  const [mobileStatusMessage, setMobileStatusMessage] = useState<string | null>(null);
  
  // Sunday to Saturday period dates (Autopopulate initialized to Sunday/Saturday of May 25, 2026 week)
  const [settlementPeriodStart, setSettlementPeriodStart] = useState('2026-05-24');
  const [settlementPeriodEnd, setSettlementPeriodEnd] = useState('2026-05-30');

  // Global driver pay setting for this payroll
  const [globalPayMethod, setGlobalPayMethod] = useState<'CPM' | 'PERCENTAGE' | 'FLAT'>('CPM');
  const [globalPayRate, setGlobalPayRate] = useState('0.65');

  // Per-load custom payment overrides mapping: { [loadId]: { customized: boolean, payMethod: 'CPM'|'PERCENTAGE'|'FLAT', payRate: string } }
  const [customPayConfigs, setCustomPayConfigs] = useState<Record<string, {
    customized: boolean;
    payMethod: 'CPM' | 'PERCENTAGE' | 'FLAT';
    payRate: string;
  }>>({});

  // Dedicated per-load custom additions or subtractions: { [loadId]: { id: string, name: string, amount: string }[] }
  const [loadCustomRevenues, setLoadCustomRevenues] = useState<Record<string, { id: string; name: string; amount: string }[]>>({});
  const [loadCustomDeductions, setLoadCustomDeductions] = useState<Record<string, { id: string; name: string; amount: string }[]>>({});

  // Dynamic custom earnings and custom deductions specifically for this paycheck
  const [customEarnFields, setCustomEarnFields] = useState<{ id: string; name: string; amount: string }[]>([]);
  const [customDeductFields, setCustomDeductFields] = useState<{ id: string; name: string; amount: string }[]>([]);

  // Driver visible note
  const [notes, setNotes] = useState('');

  // Fixed/Accessorial values
  const [fuelSurcharge, setFuelSurcharge] = useState('250');
  const [detentionPay, setDetentionPay] = useState('75');
  const [fuelAdvanceDeduction, setFuelAdvanceDeduction] = useState('150');
  const [insuranceDeduction, setInsuranceDeduction] = useState('80');
  const [eldFeeDeduction, setEldFeeDeduction] = useState('15');

  // Batch disbursement states
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchMethod, setBatchMethod] = useState<'ACH' | 'Wire' | 'Comdata'>('ACH');

  // Recurring Rules States & Handlers
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [recurringDriverId, setRecurringDriverId] = useState('');
  const [recurringType, setRecurringType] = useState<'REVENUE' | 'DEDUCTION'>('DEDUCTION');
  const [recurringName, setRecurringName] = useState('');
  const [recurringAmount, setRecurringAmount] = useState('');
  const [recurringFrequency, setRecurringFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('WEEKLY');
  const [ruleSelections, setRuleSelections] = useState<Record<string, boolean>>({});
  const [showRefNumbers, setShowRefNumbers] = useState(true);

  // Helper to check if a recurring frequency rule matches the periodStart date
  const shouldRuleApply = (rule: RecurringRule, periodStartStr: string) => {
    // Check start date condition if present
    if (rule.startDate && periodStartStr) {
      if (periodStartStr < rule.startDate) {
        return false; // Does not apply if the period starts before the rule's start date
      }
    }

    const { frequency } = rule;
    if (frequency === 'DAILY') return true;
    if (frequency === 'WEEKLY') return true;
    
    const parts = periodStartStr.split('-');
    if (parts.length !== 3) return false;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-11
    const day = parseInt(parts[2], 10);
    
    const d = new Date(year, month, day);
    const dayOfMonth = d.getDate();
    const monthIdx = d.getMonth(); // 0-11
    
    if (frequency === 'MONTHLY') {
      return dayOfMonth <= 7;
    }
    
    if (frequency === 'QUARTERLY') {
      const isQuarterStartMonth = monthIdx === 0 || monthIdx === 3 || monthIdx === 6 || monthIdx === 9;
      return isQuarterStartMonth && dayOfMonth <= 7;
    }
    
    if (frequency === 'YEARLY') {
      return monthIdx === 0 && dayOfMonth <= 7;
    }
    
    return false;
  };

  const loadRecurringRules = async () => {
    // Loaded dynamically via context
  };

  // Suggest & auto-select active recurring rules when driver or period start is modified
  useEffect(() => {
    if (!calcDriverId) {
      setRuleSelections({});
      return;
    }
    
    const selections: Record<string, boolean> = {};
    const driverRules = recurringRules.filter(r => r.driverId === calcDriverId && r.active);
    
    driverRules.forEach(r => {
      selections[r.id] = shouldRuleApply(r, settlementPeriodStart);
    });
    
    setRuleSelections(selections);
  }, [calcDriverId, settlementPeriodStart, recurringRules]);

  // Create state for adding a rule inline during check calculation
  const [showInlineAddRule, setShowInlineAddRule] = useState(false);
  const [inlineRuleName, setInlineRuleName] = useState('');
  const [inlineRuleType, setInlineRuleType] = useState<'REVENUE' | 'DEDUCTION'>('DEDUCTION');
  const [inlineRuleAmount, setInlineRuleAmount] = useState('');
  const [inlineRuleFrequency, setInlineRuleFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('WEEKLY');
  const [inlineRuleStartDate, setInlineRuleStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [inlineRuleRateType, setInlineRuleRateType] = useState<'FLAT' | 'PERCENTAGE'>('FLAT');

  const handleCreateRecurringRuleInline = async (driverId: string) => {
    if (!inlineRuleName.trim()) {
      alert("Please enter a rule description.");
      return;
    }
    const amt = parseFloat(inlineRuleAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid positive amount.");
      return;
    }

    const payload = {
      driverId,
      type: inlineRuleType,
      name: inlineRuleName.trim(),
      amount: amt,
      frequency: inlineRuleFrequency,
      startDate: inlineRuleStartDate,
      active: true,
      rateType: inlineRuleRateType
    };

    const newRuleId = await addRecurringRule(payload);
    if (newRuleId) {
      // Auto-select this newly created rule for the paycheck
      setRuleSelections(prev => ({
        ...prev,
        [newRuleId]: true
      }));
    }

    setInlineRuleName('');
    setInlineRuleAmount('');
    setShowInlineAddRule(false);
  };

  // Trigger loading list of settlements from backend or fallback local storage
  const loadSettlementsFromApi = async () => {
    try {
      const res = await fetch('/api/settlements');
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        setApiSettlements(json.data);
        setCalculationConnected(true);
      }
    } catch (err) {
      console.warn("Express backend server offline or loading local list fallback.", err);
      setCalculationConnected(false);
      // Fallback populated local list mirroring actual loads
      setApiSettlements([
        {
          id: 'set-1',
          settlementNumber: 'SET-2601',
          driverId: 'd1',
          periodStart: '2024-03-10',
          periodEnd: '2024-03-16',
          payMethod: 'CPM',
          payRate: 0.65,
          basePay: 780.00,
          fuelSurcharge: 150.00,
          detentionPay: 50.00,
          fuelAdvanceDeduction: 100.00,
          insuranceDeduction: 80.00,
          eldFeeDeduction: 15.00,
          grossEarnings: 980.00,
          deductions: 195.00,
          netPay: 785.00,
          status: 'APPROVED',
          notes: 'Great schedule completion Marcus! Thanks for covering the holiday weekend split.',
          customRevenues: [
            { id: '1', name: 'Extra Stop-off Incentive', amount: 50.00 }
          ],
          customDeductions: []
        },
        {
          id: 'set-2',
          settlementNumber: 'SET-2602',
          driverId: 'd2',
          periodStart: '2024-03-17',
          periodEnd: '2024-03-23',
          payMethod: 'PERCENTAGE',
          payRate: 0.25,
          basePay: 625.00,
          fuelSurcharge: 120.00,
          detentionPay: 0.00,
          fuelAdvanceDeduction: 0.00,
          insuranceDeduction: 80.00,
          eldFeeDeduction: 15.00,
          grossEarnings: 745.00,
          deductions: 95.00,
          netPay: 650.00,
          status: 'RATE_MATCHED',
          notes: 'Custom load rate split applied to General Merchandise pickup.',
          customRevenues: [],
          customDeductions: [
            { id: '1', name: 'Uniform Vest Replacement', amount: 35.00 }
          ]
        }
      ]);
    }
  };

  useEffect(() => {
    loadSettlementsFromApi();
    loadRecurringRules();
  }, []);

  // Filter loads delivered strictly in the chosen Sunday-to-Saturday week
  const loadsInPeriod = useMemo(() => {
    return loads.filter(l => {
      if (!l.deliveryDate) return false;
      return l.deliveryDate >= settlementPeriodStart && l.deliveryDate <= settlementPeriodEnd;
    });
  }, [loads, settlementPeriodStart, settlementPeriodEnd]);

  // Group weekly loads per driver
  const driversWithLoadsInfo = useMemo(() => {
    const mapping: Record<string, Load[]> = {};
    loadsInPeriod.forEach(l => {
      if (l.driverId) {
        if (!mapping[l.driverId]) {
          mapping[l.driverId] = [];
        }
        mapping[l.driverId].push(l);
      }
    });
    return mapping;
  }, [loadsInPeriod]);

  // Handle shift week
  const handleShiftWeek = (direction: 'PREV' | 'NEXT') => {
    const currentStart = new Date(settlementPeriodStart + 'T00:00:00');
    const dayShift = direction === 'PREV' ? -7 : 7;
    currentStart.setDate(currentStart.getDate() + dayShift);
    
    const nextRange = getWeekRange(currentStart.toISOString().split('T')[0]);
    setSettlementPeriodStart(nextRange.start);
    setSettlementPeriodEnd(nextRange.end);
  };

  // Jump to specific test range where mock data already resides
  const handleJumpToMockLoadsRange = (start: string, end: string) => {
    setSettlementPeriodStart(start);
    setSettlementPeriodEnd(end);
  };

  // Autocomplete pay method settings when active driver is assigned
  useEffect(() => {
    if (!calcDriverId) return;

    const matchedLoads = driversWithLoadsInfo[calcDriverId] || [];
    
    // Choose sensible default based on driver ID
    let initialMethod: 'CPM' | 'PERCENTAGE' | 'FLAT' = 'CPM';
    let initialRate = '0.65';

    if (calcDriverId === 'd2') { // Sarah Jenkins
      initialMethod = 'PERCENTAGE';
      initialRate = '0.28';
    } else if (calcDriverId === 'd3') { // David Kim
      initialMethod = 'FLAT';
      initialRate = '1100';
    }

    setGlobalPayMethod(initialMethod);
    setGlobalPayRate(initialRate);

    // Initialize per-load custom pay setups as disabled by default
    const configs: Record<string, any> = {};
    matchedLoads.forEach(load => {
      configs[load.id] = {
        customized: false,
        payMethod: initialMethod,
        payRate: initialRate
      };
    });
    setCustomPayConfigs(configs);
    
    // Reset driver notes and custom inputs for a clean payload
    setNotes('');
    setCustomEarnFields([]);
    setCustomDeductFields([]);
  }, [calcDriverId, settlementPeriodStart, settlementPeriodEnd]);

  // Handle snapping of start date/end date to Sunday and Saturday if changed manually
  const handleManualDateChange = (type: 'START' | 'END', val: string) => {
    if (type === 'START') {
      const snapped = getWeekRange(val);
      setSettlementPeriodStart(snapped.start);
      setSettlementPeriodEnd(snapped.end);
    } else {
      const snapped = getWeekRange(val);
      setSettlementPeriodStart(snapped.start);
      setSettlementPeriodEnd(snapped.end);
    }
  };

  // Safe toggler for customizing pay configuration for a given load
  const handleToggleCustomizeLoad = (loadId: string, enabled: boolean) => {
    setCustomPayConfigs(prev => {
      const current = prev[loadId] || { payMethod: globalPayMethod, payRate: globalPayRate };
      return {
        ...prev,
        [loadId]: {
          ...current,
          customized: enabled,
          // Prefill with global method and rate if customized is being turned on
          payMethod: current.payMethod || globalPayMethod,
          payRate: current.payRate || globalPayRate
        }
      };
    });
  };

  // Helper to change custom rate details per load
  const handleUpdateCustomLoadRate = (loadId: string, field: 'payMethod' | 'payRate', val: string) => {
    setCustomPayConfigs(prev => {
      const current = prev[loadId] || { customized: true, payMethod: globalPayMethod, payRate: globalPayRate };
      return {
        ...prev,
        [loadId]: {
          ...current,
          [field]: val
        }
      };
    });
  };

  // Custom arrays fields controls
  const handleAddCustomEarn = () => {
    const nextId = 'earn-' + Math.random().toString(36).substr(2, 5);
    setCustomEarnFields(prev => [...prev, { id: nextId, name: 'Extra Layover Allowance', amount: '150' }]);
  };

  const handleEditCustomEarn = (id: string, key: 'name' | 'amount', val: string) => {
    setCustomEarnFields(prev => prev.map(f => f.id === id ? { ...f, [key]: val } : f));
  };

  const handleRemoveCustomEarn = (id: string) => {
    setCustomEarnFields(prev => prev.filter(f => f.id !== id));
  };

  const handleAddCustomDeduct = () => {
    const nextId = 'deduct-' + Math.random().toString(36).substr(2, 5);
    setCustomDeductFields(prev => [...prev, { id: nextId, name: 'Toll Transponder Balance', amount: '45' }]);
  };

  const handleEditCustomDeduct = (id: string, key: 'name' | 'amount', val: string) => {
    setCustomDeductFields(prev => prev.map(f => f.id === id ? { ...f, [key]: val } : f));
  };

  const handleRemoveCustomDeduct = (id: string) => {
    setCustomDeductFields(prev => prev.filter(f => f.id !== id));
  };

  const getComputedRuleAmountGlobal = (rule: RecurringRule, baseVal: number) => {
    if (rule.rateType === 'PERCENTAGE') {
      return baseVal * (rule.amount / 100);
    }
    return rule.amount;
  };

  // Live client-side interactive calculation engine mimicking backend
  const calculatedOutput = useMemo(() => {
    const activeDriverLoads = driversWithLoadsInfo[calcDriverId] || [];
    
    // 1. Calculate base payout sum by aggregating individual load outcomes
    let calculatedBase = 0;
    
    activeDriverLoads.forEach(l => {
      const config = customPayConfigs[l.id];
      const isCustom = config?.customized;
      const method = isCustom ? config.payMethod : globalPayMethod;
      const rateNum = parseFloat(isCustom ? config.payRate : globalPayRate) || 0;

      if (method === 'CPM') {
        calculatedBase += l.miles * rateNum;
      } else if (method === 'PERCENTAGE') {
        calculatedBase += l.rate * rateNum;
      } else { // FLAT
        calculatedBase += rateNum;
      }
    });

    // Fallback: If driver is picked but has 0 assigned loads, allow flat rate direct configuration
    if (activeDriverLoads.length === 0 && calcDriverId) {
      const flatSum = parseFloat(globalPayRate) || 0;
      if (globalPayMethod === 'FLAT') {
        calculatedBase = flatSum;
      } else {
        calculatedBase = 0;
      }
    }

    // 2. Accessorials
    const fs = parseFloat(fuelSurcharge) || 0;
    const dp = parseFloat(detentionPay) || 0;

    // 3. Dynamic custom earnings
    const customEarnTotal = customEarnFields.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
    
    // Sum of all per-load specific custom revenues
    let loadSpecificEarnSum = 0;
    activeDriverLoads.forEach(l => {
      const loadRevs = loadCustomRevenues[l.id] || [];
      loadRevs.forEach(r => {
        loadSpecificEarnSum += parseFloat(r.amount) || 0;
      });
    });

    // 4. Standard offsets
    const fa = parseFloat(fuelAdvanceDeduction) || 0;
    const ins = parseFloat(insuranceDeduction) || 0;
    const eld = parseFloat(eldFeeDeduction) || 0;

    // 5. Dynamic custom deductions
    const customDeductTotal = customDeductFields.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);

    // Sum of all per-load specific custom deductions
    let loadSpecificDeductSum = 0;
    activeDriverLoads.forEach(l => {
      const loadDeds = loadCustomDeductions[l.id] || [];
      loadDeds.forEach(d => {
        loadSpecificDeductSum += parseFloat(d.amount) || 0;
      });
    });

    // 6. Active checkbox selected recurring rules for driver
    const selectedRules = recurringRules.filter(r => r.driverId === calcDriverId && r.active && ruleSelections[r.id]);
    const recurringEarningsTotal = selectedRules
      .filter(r => r.type === 'REVENUE')
      .reduce((sum, r) => sum + getComputedRuleAmountGlobal(r, calculatedBase || 0), 0);
    const recurringDeductionsTotal = selectedRules
      .filter(r => r.type === 'DEDUCTION')
      .reduce((sum, r) => sum + getComputedRuleAmountGlobal(r, calculatedBase || 0), 0);

    const grossEarnings = calculatedBase + fs + dp + customEarnTotal + recurringEarningsTotal + loadSpecificEarnSum;
    const totalDeductions = fa + ins + eld + customDeductTotal + recurringDeductionsTotal + loadSpecificDeductSum;
    const netPay = grossEarnings - totalDeductions;

    return {
      basePay: parseFloat(calculatedBase.toFixed(2)),
      fuelSurcharge: parseFloat(fs.toFixed(2)),
      detentionPay: parseFloat(dp.toFixed(2)),
      customEarnTotal: parseFloat((customEarnTotal + recurringEarningsTotal + loadSpecificEarnSum).toFixed(2)),
      recurringEarnTotal: parseFloat(recurringEarningsTotal.toFixed(2)),
      fuelAdvanceDeduction: parseFloat(fa.toFixed(2)),
      insuranceDeduction: parseFloat(ins.toFixed(2)),
      eldFeeDeduction: parseFloat(eld.toFixed(2)),
      customDeductTotal: parseFloat((customDeductTotal + recurringDeductionsTotal + loadSpecificDeductSum).toFixed(2)),
      recurringDeductTotal: parseFloat(recurringDeductionsTotal.toFixed(2)),
      grossEarnings: parseFloat(grossEarnings.toFixed(2)),
      deductions: parseFloat(totalDeductions.toFixed(2)),
      netPay: parseFloat(netPay.toFixed(2))
    };
  }, [
    calcDriverId,
    driversWithLoadsInfo,
    globalPayMethod,
    globalPayRate,
    customPayConfigs,
    fuelSurcharge,
    detentionPay,
    customEarnFields,
    loadCustomRevenues,
    fuelAdvanceDeduction,
    insuranceDeduction,
    eldFeeDeduction,
    customDeductFields,
    loadCustomDeductions,
    recurringRules,
    ruleSelections
  ]);

  // Helper to prefill and open calculator for editing an existing settlement
  const handleEditSettlement = (settle: Settlement) => {
    setEditingSettlementId(settle.id);
    setCalcDriverId(settle.driverId);
    setSettlementPeriodStart(settle.periodStart);
    setSettlementPeriodEnd(settle.periodEnd);
    setGlobalPayMethod(settle.payMethod);
    setGlobalPayRate(settle.payRate.toString());
    
    setFuelSurcharge(settle.fuelSurcharge.toString());
    setDetentionPay(settle.detentionPay.toString());
    setFuelAdvanceDeduction(settle.fuelAdvanceDeduction.toString());
    setInsuranceDeduction(settle.insuranceDeduction.toString());
    setEldFeeDeduction(settle.eldFeeDeduction.toString());
    setNotes(settle.notes || '');

    setCustomEarnFields((settle.customRevenues || []).map(r => ({
      id: r.id || 'earn-' + Math.random().toString(36).substr(2, 5),
      name: r.name,
      amount: r.amount.toString()
    })));

    setCustomDeductFields((settle.customDeductions || []).map(d => ({
      id: d.id || 'deduct-' + Math.random().toString(36).substr(2, 5),
      name: d.name,
      amount: d.amount.toString()
    })));

    const configMap: Record<string, any> = {};
    const initialLoadRevs: Record<string, any[]> = {};
    const initialLoadDeds: Record<string, any[]> = {};

    if (settle.loadItemizations) {
      settle.loadItemizations.forEach((item: any) => {
        configMap[item.loadId] = {
          customized: item.payMethod !== settle.payMethod || item.payRate !== settle.payRate,
          payMethod: item.payMethod,
          payRate: item.payRate.toString()
        };

        if (item.loadRevenues) {
          initialLoadRevs[item.loadId] = item.loadRevenues.map((r: any) => ({
            id: r.id || 'earn-' + Math.random().toString(36).substr(2, 5),
            name: r.name,
            amount: r.amount.toString()
          }));
        }

        if (item.loadDeductions) {
          initialLoadDeds[item.loadId] = item.loadDeductions.map((d: any) => ({
            id: d.id || 'deduct-' + Math.random().toString(36).substr(2, 5),
            name: d.name,
            amount: d.amount.toString()
          }));
        }
      });
    }

    setCustomPayConfigs(configMap);
    setLoadCustomRevenues(initialLoadRevs);
    setLoadCustomDeductions(initialLoadDeds);
    
    setRuleSelections({});
    setIsCalculatorOpen(true);
  };

  const handleOpenNewCalculator = () => {
    setEditingSettlementId(null);
    setCalcDriverId('');
    setSettlementPeriodStart('2026-05-24');
    setSettlementPeriodEnd('2026-05-30');
    setGlobalPayMethod('CPM');
    setGlobalPayRate('0.65');
    setFuelSurcharge('250');
    setDetentionPay('75');
    setFuelAdvanceDeduction('150');
    setInsuranceDeduction('80');
    setEldFeeDeduction('15');
    setNotes('');
    setCustomEarnFields([]);
    setCustomDeductFields([]);
    setCustomPayConfigs({});
    setLoadCustomRevenues({});
    setLoadCustomDeductions({});
    setRuleSelections({});
    setIsCalculatorOpen(true);
  };

  // Submit and create/update settlement record via REST API (preserving all notes and fields)
  const handleSaveSettlement = async () => {
    if (!calcDriverId) {
      alert("Please select a target driver to settle.");
      return;
    }

    const targetDriver = drivers.find(d => d.id === calcDriverId);
    if (!targetDriver) return;

    const matchedLoads = loads.filter(l => l.driverId === calcDriverId && l.deliveryDate >= settlementPeriodStart && l.deliveryDate <= settlementPeriodEnd);
    const firstLoadId = matchedLoads[0]?.id || null;

    // Load Itemizations details
    const loadItemizations = matchedLoads.map(l => {
      const config = customPayConfigs[l.id];
      const isCustom = config?.customized;
      const method = isCustom ? config.payMethod : globalPayMethod;
      const rateNum = parseFloat(isCustom ? config.payRate : globalPayRate) || 0;
      let amt = 0;
      if (method === 'CPM') {
        amt = l.miles * rateNum;
      } else if (method === 'PERCENTAGE') {
        amt = l.rate * rateNum;
      } else {
        amt = rateNum;
      }

      const loadRevenues = (loadCustomRevenues[l.id] || []).map(r => ({
        id: r.id,
        name: r.name,
        amount: parseFloat(r.amount) || 0
      }));

      const loadDeductions = (loadCustomDeductions[l.id] || []).map(d => ({
        id: d.id,
        name: d.name,
        amount: parseFloat(d.amount) || 0
      }));

      return {
        loadId: l.id,
        loadNumber: l.loadNumber,
        rate: l.rate,
        miles: l.miles,
        payMethod: method,
        payRate: rateNum,
        amount: amt,
        customerPo: l.customerPo,
        bolNumber: l.bolNumber,
        commodity: l.commodity || "General Freight",
        deliveryDate: l.deliveryDate,
        originId: l.originId,
        destinationId: l.destinationId,
        loadRevenues,
        loadDeductions
      };
    });

    // Merge active checked recurring rules into the custom fields for seamless rendering and full persistence
    const selectedRules = recurringRules.filter(r => r.driverId === calcDriverId && r.active && ruleSelections[r.id]);
    
    const finalCustomRevenues = [
      ...customEarnFields.map(f => ({ id: f.id, name: f.name, amount: parseFloat(f.amount) || 0 })),
      ...selectedRules.filter(r => r.type === 'REVENUE').map(r => {
        const amt = r.rateType === 'PERCENTAGE' ? ((calculatedOutput.basePay || 0) * (r.amount / 100)) : r.amount;
        return {
          id: r.id,
          name: `${r.name} [${r.rateType === 'PERCENTAGE' ? `${r.amount}%` : `$${r.amount}`} recurring]`,
          amount: parseFloat(amt.toFixed(2))
        };
      })
    ];

    const finalCustomDeductions = [
      ...customDeductFields.map(f => ({ id: f.id, name: f.name, amount: parseFloat(f.amount) || 0 })),
      ...selectedRules.filter(r => r.type === 'DEDUCTION').map(r => {
        const amt = r.rateType === 'PERCENTAGE' ? ((calculatedOutput.basePay || 0) * (r.amount / 100)) : r.amount;
        return {
          id: r.id,
          name: `${r.name} [${r.rateType === 'PERCENTAGE' ? `${r.amount}%` : `$${r.amount}`} recurring]`,
          amount: parseFloat(amt.toFixed(2))
        };
      })
    ];

    const originalStatus = editingSettlementId
      ? (apiSettlements.find(s => s.id === editingSettlementId)?.status || 'PENDING')
      : 'PENDING';

    const payload = {
      driverId: calcDriverId,
      loadId: firstLoadId,
      periodStart: settlementPeriodStart,
      periodEnd: settlementPeriodEnd,
      payMethod: globalPayMethod,
      payRate: parseFloat(globalPayRate),
      
      basePay: calculatedOutput.basePay,
      fuelSurcharge: calculatedOutput.fuelSurcharge,
      detentionPay: calculatedOutput.detentionPay,
      fuelAdvanceDeduction: calculatedOutput.fuelAdvanceDeduction,
      insuranceDeduction: calculatedOutput.insuranceDeduction,
      eldFeeDeduction: calculatedOutput.eldFeeDeduction,
      
      grossEarnings: calculatedOutput.grossEarnings,
      deductions: calculatedOutput.deductions,
      netPay: calculatedOutput.netPay,
      status: originalStatus,

      // Apple feature enhancements
      notes: notes.trim(),
      customRevenues: finalCustomRevenues,
      customDeductions: finalCustomDeductions,
      loadItemizations
    };

    try {
      const url = editingSettlementId ? `/api/settlements/${editingSettlementId}` : '/api/settlements';
      const method = editingSettlementId ? 'PUT' : 'POST';
      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (data.status === 'success') {
        alert(
          editingSettlementId 
            ? `Settlement statement ${data.settlement.settlementNumber} for ${targetDriver.name} is successfully updated!`
            : `Settlement statement ${data.settlement.settlementNumber} for ${targetDriver.name} is successfully processed!`
        );
        setIsCalculatorOpen(false);
        setEditingSettlementId(null);
        loadSettlementsFromApi();
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      // Local push fallback for sandbox preview environment
      if (editingSettlementId) {
        setApiSettlements(prev => prev.map(s => s.id === editingSettlementId ? { 
          ...s, 
          ...payload, 
          updated_at: new Date().toISOString() 
        } as any : s));
        alert(`Settlement updated successfully! (Local state fallback updated)`);
        setIsCalculatorOpen(false);
        setEditingSettlementId(null);
      } else {
        const mockResult: Settlement = {
          id: `set-${Math.random().toString(36).substr(2, 9)}`,
          settlementNumber: `SET-${2600 + apiSettlements.length + 1}`,
          driverId: calcDriverId,
          loadId: firstLoadId || undefined,
          periodStart: settlementPeriodStart,
          periodEnd: settlementPeriodEnd,
          payMethod: globalPayMethod,
          payRate: parseFloat(globalPayRate),
          basePay: calculatedOutput.basePay,
          fuelSurcharge: calculatedOutput.fuelSurcharge,
          detentionPay: calculatedOutput.detentionPay,
          fuelAdvanceDeduction: calculatedOutput.fuelAdvanceDeduction,
          insuranceDeduction: calculatedOutput.insuranceDeduction,
          eldFeeDeduction: calculatedOutput.eldFeeDeduction,
          grossEarnings: calculatedOutput.grossEarnings,
          deductions: calculatedOutput.deductions,
          netPay: calculatedOutput.netPay,
          status: 'PENDING',
          notes: notes.trim() || undefined,
          customRevenues: finalCustomRevenues,
          customDeductions: finalCustomDeductions,
          loadItemizations
        };
        setApiSettlements(prev => [mockResult, ...prev]);
        alert(`Settlement created successfully! (Local state fallback updated)`);
        setIsCalculatorOpen(false);
      }
    }
  };

  // Hard deletion handler
  const handleDeleteSettlement = async (id: string, code: string) => {
    try {
      const res = await fetch(`/api/settlements/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        loadSettlementsFromApi();
      }
    } catch {
      setApiSettlements(prev => prev.filter(s => s.id !== id));
    }
  };

  // State progression sequential advancing
  const handleProgressSettlement = async (settle: Settlement) => {
    const ALLOWED_STATUS_SEQUENCE = ['PENDING', 'RATE_MATCHED', 'ACCESSORIALS_ADDED', 'DISPATCHER_REVIEW', 'APPROVED', 'PAID'];
    const currentIdx = ALLOWED_STATUS_SEQUENCE.indexOf(settle.status as any);
    if (currentIdx === -1 || currentIdx >= ALLOWED_STATUS_SEQUENCE.length - 1) return;
    const nextStatus = ALLOWED_STATUS_SEQUENCE[currentIdx + 1];

    try {
      const resp = await fetch(`/api/settlements/${settle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await resp.json();
      if (resp.ok && data.status === 'success') {
        loadSettlementsFromApi();
      } else {
        alert(data.error || "Sequential state validation active: Cannot skip steps.");
      }
    } catch {
      setApiSettlements(prev => prev.map(s => {
        if (s.id === settle.id) {
          return { ...s, status: nextStatus as any };
        }
        return s;
      }));
    }
  };

  // Spreadsheets CSV export matching active selections
  const handleExportACHManifest = () => {
    const header = "ACH Transmit ID,Settlement Number,Beneficiary Driver,Period,Gross Payout,Deductions,Net Disbursement,Status,Driver Memo\n";
    const body = apiSettlements.map(settle => {
      const driver = drivers.find(d => d.id === settle.driverId);
      const driverName = driver ? driver.name : "Subcontractor Hauler";
      const cleanNote = settle.notes ? settle.notes.replace(/"/g, '""') : '';
      return `"${settle.id}","${settle.settlementNumber}","${driverName}","${settle.periodStart} to ${settle.periodEnd}",$${settle.grossEarnings},$${settle.deductions},$${settle.netPay},"${settle.status}","${cleanNote}"`;
    }).join("\n");

    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const element = document.createElement('a');
    element.href = url;
    element.setAttribute('download', `Direct_Deposit_Ledger_${settlementPeriodStart}_to_${settlementPeriodEnd}.csv`);
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleConfirmBatchDeposit = async () => {
    const approvedSettleCount = apiSettlements.filter(s => s.status === 'APPROVED').length;
    if (approvedSettleCount === 0) {
      alert("No statements are marked APPROVED. Only approved settlements can be deposited.");
      setIsBatchOpen(false);
      return;
    }

    try {
      const promises = apiSettlements.map(async s => {
        if (s.status === 'APPROVED') {
          await fetch(`/api/settlements/${s.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'PAID' })
          });
        }
      });
      await Promise.all(promises);
      loadSettlementsFromApi();
    } catch {
      setApiSettlements(prev => prev.map(s => s.status === 'APPROVED' ? { ...s, status: 'PAID' as any } : s));
    }

    alert(`ACH Payout executed over: ${batchMethod}. processed ${approvedSettleCount} cleared drivers successfully.`);
    setIsBatchOpen(false);
  };

  // Simulated Email dispatch to driver
  const handleEmailDoc = (settle: Settlement) => {
    setIsEmailingDoc(true);
    setEmailStatusMessage("Connecting to SMTP servers...");
    
    setTimeout(() => {
      setEmailStatusMessage("Attaching cryptographic paycheck PDF receipt...");
      setTimeout(() => {
        const drv = drivers.find(d => d.id === settle.driverId);
        const emailStr = drv ? drv.name.toLowerCase().replace(/[^a-z0-9]/g, '') + "@apexhaul.com" : "payroll-driver@apexhaul.com";
        setIsEmailingDoc(false);
        setEmailStatusMessage(null);
        alert(`Invoice statement successfully emailed to driver (${drv?.name || "Marcus"}) at ${emailStr}! Document PDF dispatched.`);
      }, 1000);
    }, 800);
  };

  // Simulated Mobile App broadcast to driver
  const handleAppDoc = (settle: Settlement) => {
    setIsCastingDoc(true);
    setMobileStatusMessage("Queuing mobile push alert...");
    
    setTimeout(() => {
      setMobileStatusMessage("Writing ledger records to cloud driver endpoint...");
      setTimeout(() => {
        const drv = drivers.find(d => d.id === settle.driverId);
        setIsCastingDoc(false);
        setMobileStatusMessage(null);
        alert(`Settlement cleared & published instantly to ${drv?.name || "Marcus"}'s Apex Mobile Driver portal!`);
      }, 1000);
    }, 800);
  };

  // Download printable, offline-enabled styled HTML document pay stub
  const handleDownloadHtmlDoc = (s: Settlement) => {
    const drv = drivers.find(d => d.id === s.driverId);
    const drvName = drv ? drv.name : "Active Contractor";
    
    // Check if settlement has itemized load arrays saved, otherwise construct from date range
    const matchedLoads = s.loadItemizations || loads.filter(l => l.driverId === s.driverId && l.deliveryDate >= s.periodStart && l.deliveryDate <= s.periodEnd).map(l => ({
      loadId: l.id,
      loadNumber: l.loadNumber,
      rate: l.rate,
      miles: l.miles,
      payMethod: s.payMethod,
      payRate: s.payRate,
      amount: s.payMethod === 'CPM' ? l.miles * s.payRate : (s.payMethod === 'PERCENTAGE' ? l.rate * s.payRate : s.payRate),
      customerPo: l.customerPo,
      bolNumber: l.bolNumber,
      originId: l.originId,
      destinationId: l.destinationId,
      commodity: l.commodity || "General Freight",
      deliveryDate: l.deliveryDate
    }));
    
    const customRevenuesHtml = s.customRevenues && s.customRevenues.length > 0 
      ? s.customRevenues.map(r => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">Custom Added Allowance: <strong>${r.name}</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: right; color: #059669; font-family: monospace; font-weight: 650; font-weight: 600;">+$${r.amount.toFixed(2)}</td>
        </tr>`).join('') 
      : '';

    const customDeductionsHtml = s.customDeductions && s.customDeductions.length > 0 
      ? s.customDeductions.map(d => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">Custom Withheld Deduction: <strong>${d.name}</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: right; color: #b91c1c; font-family: monospace; font-weight: 600;">-$${d.amount.toFixed(2)}</td>
        </tr>`).join('') 
      : '';

    const loadsHtml = matchedLoads.map(l => {
      const refInfo = showRefNumbers && (l.customerPo || l.bolNumber)
        ? `<div style="font-size: 10px; margin-top: 4px; color: #475569; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 2px 6px; border-radius: 4px; display: inline-block; font-weight: 500;">
            ${l.customerPo ? `PO: <strong>${l.customerPo}</strong> ` : ''}
            ${l.bolNumber ? `BOL: <strong>${l.bolNumber}</strong>` : ''}
           </div>`
        : '';

      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">
            <div style="font-weight: bold; color: #0f172a;">${l.loadNumber}</div>
            ${refInfo}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${l.deliveryDate || ''}</td>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${l.originId || ''} &rarr; ${l.destinationId || ''}</td>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">
            <span style="background: #e2e8f0; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; border: 1px solid #cbd5e1;">
              ${l.payMethod}
            </span>
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align:right; font-family: monospace; color: #475569;">
            ${l.payMethod === 'CPM' ? `${l.miles} mi @ $${l.payRate}/mi` : (l.payMethod === 'PERCENTAGE' ? `${(l.payRate * 100).toFixed(0)}% of $${(l.rate || 0).toLocaleString()}` : 'Flat Rate')}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align:right; font-weight: bold; font-family: monospace; color: #0f172a;">
            $${l.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
      `;
    }).join('');

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Settlement Statement ${s.settlementNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; color: #1e293b; padding: 40px; background: #f8fafc; }
    .container { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 40px; border-radius: 20px; background: #ffffff; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; }
    .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
    .meta-box { background: #f8fafc; padding: 20px; border-radius: 12px; margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; border: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; text-align: left; }
    th { background: #f1f5f9; padding: 12px 10px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; }
    .totals { border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; margin-top: 36px; background: #f8fafc; display: flex; justify-content: space-between; align-items: center; }
    .net-pay { font-size: 26px; font-weight: 850; color: #059669; font-family: monospace; }
    .memo { border-left: 4px solid #6366f1; background: #f5f3ff; padding: 20px; border-radius: 0 12px 12px 0; margin-top: 30px; font-style: italic; font-size: 13px; color: #4f46e5; }
    h3 { margin-top: 36px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1 style="margin:0;font-size:22px;color:#0f172a;letter-spacing:-0.5px;">APEX LOGISTICS LLC</h1>
        <p style="margin:5px 0 0 0;font-size:12px;color:#64748b;">Carrier Fleet Billing & Payroll Disbursements</p>
      </div>
      <div style="text-align: right;">
        <h2 class="title" style="color:#0f172a; letter-spacing:-0.5px;">SETTLEMENT STATEMENT</h2>
        <p style="margin:5px 0 0 0;font-size:13px;font-weight:bold;color:#6366f1;">ID: ${s.settlementNumber}</p>
      </div>
    </div>
    
    <div class="meta-box">
      <div>
        <strong style="font-size:11px;color:#64748b;display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">RECIPIENT / DRIVER CONTINGENT:</strong>
        <strong style="font-size:15px;color:#0f172a;">${drvName}</strong><br>
        <span style="font-size:13px;color:#475569;display:inline-block;margin-top:4px;">CDL Class: ${drv ? drv.cdlClass : 'Class A'}</span><br>
        <span style="font-size:12px;color:#64748b;font-family:monospace;">${drvName.toLowerCase().replace(/[^a-z0-9]/g, '')}@apexhaul.com</span>
      </div>
      <div>
        <strong style="font-size:11px;color:#64748b;display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">ISSUANCE & LOG METHOD:</strong>
        <span style="font-size:13px;color:#475569;">Pay Range: <strong>${s.periodStart}</strong> to <strong>${s.periodEnd}</strong></span><br>
        <span style="font-size:13px;color:#475569;display:inline-block;margin-top:4px;">Disbursement Step: <span style="background:#def7ec;color:#03543f;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;">${s.status}</span></span><br>
        <span style="font-size:13px;color:#475569;display:inline-block;margin-top:4px;">Formula: ${s.payMethod} Method (Rate: ${s.payRate})</span>
      </div>
    </div>

    ${matchedLoads.length > 0 ? `
    <h3>COMPLETED TRIP LOGS & CARGO RECORD</h3>
    <table>
      <thead>
        <tr>
          <th>Load Details</th>
          <th>Delivered</th>
          <th>Trip Segment</th>
          <th>Method</th>
          <th style="text-align:right;">Distance/Base</th>
          <th style="text-align:right;">Allocated Payout</th>
        </tr>
      </thead>
      <tbody>
        ${loadsHtml}
      </tbody>
    </table>
    ` : ''}

    <h3>FINANCIAL STATEMENT REVIEW</h3>
    <table>
      <thead>
        <tr>
          <th>Line Item Description</th>
          <th style="text-align: right;">Ledger Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">Contract Base Earnings (Hauled Trips Component)</td>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: right; font-family: monospace;">$${s.basePay.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">Fuel Surcharge Allowance</td>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: right; color:#059669; font-family: monospace; font-weight: 500;">+$${s.fuelSurcharge.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">Arrive Detention Accessory Payout</td>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: right; color:#059669; font-family: monospace; font-weight: 500;">+$${s.detentionPay.toFixed(2)}</td>
        </tr>
        ${customRevenuesHtml}
        <tr style="font-weight: 700; background:#f8fafc;">
          <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px;">Aggregate Gross Earnings</td>
          <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; font-family: monospace;">$${s.grossEarnings.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">Fuel Advance Cash Float Offset</td>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: right; color:#ef4444; font-family: monospace;">-$${s.fuelAdvanceDeduction.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">Contractor Fleet Escrow & Insurance</td>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: right; color:#ef4444; font-family: monospace;">-$${s.insuranceDeduction.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px;">Regulatory ELD Device SaaS Compliance Fee</td>
          <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: right; color:#ef4444; font-family: monospace;">-$${s.eldFeeDeduction.toFixed(2)}</td>
        </tr>
        ${customDeductionsHtml}
        <tr style="font-weight: 700; background:#f8fafc;">
          <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #ef4444;">Aggregate Deductions Withheld</td>
          <td style="padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: right; color:#ef4444; font-family: monospace;">-$${s.deductions.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div>
        <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:bold;letter-spacing:1px;">Net Cleared Disbursement</p>
        <span style="font-size:11px;color:#94a3b8;">Issued via Direct Deposit / ACH Reserve Funds</span>
      </div>
      <div class="net-pay">$${s.netPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
    </div>

    ${s.notes ? `
    <div class="memo">
      <strong>Dispatcher Memo for Driver:</strong> "${s.notes}"
    </div>
    ` : ''}

    <p style="font-size:11px;color:#94a3b8;margin-top:48px;text-align:center;">
      This statement is a legal release advisory. Standard audit check has been executed successfully.
    </p>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Settlement_Statement_${s.settlementNumber}_${drvName.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert(`Polished offline-enabled PDF-HTML statement downloaded for ${s.settlementNumber}!`);
  };

  // Filter ledger list based on user text entry
  const filteredApiSettlements = apiSettlements.filter(s => {
    const drvName = drivers.find(d => d.id === s.driverId)?.name || 'Contract Hauler';
    return drvName.toLowerCase().includes(searchQuery.toLowerCase()) || s.settlementNumber.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const computedGrossTotal = apiSettlements.reduce((col, s) => col + s.grossEarnings, 0);
  const computedDeductionsTotal = apiSettlements.reduce((col, s) => col + s.deductions, 0);
  const computedNetTotal = apiSettlements.reduce((col, s) => col + s.netPay, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header and Branding banner */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-sans font-semibold tracking-tight text-slate-900">Driver Payroll Settlements</h2>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${calculationConnected ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'}`}>
              <CloudLightning size={10} />
              {calculationConnected ? 'API Connected' : 'Local Sandbox Mode'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Generate paycheck dispatches, review weekly log sheets, apply global settings with custom modifications, and write feedback notes.</p>
        </div>
        
        <div className="flex flex-wrap gap-2.5">
          <button 
            onClick={() => setIsRecurringOpen(true)}
            id="btn-recurring-rules"
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 active:scale-97 shadow-sm cursor-pointer"
          >
            <RefreshCw size={13} className="text-indigo-600 animate-spin-slow" />
            Recurring Pay Rules
          </button>

          <button 
            onClick={handleOpenNewCalculator}
            id="btn-compute-paycheck"
            className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium tracking-tight px-4.5 py-2.5 rounded-xl transition-all flex items-center gap-2 active:scale-97 shadow cursor-pointer"
          >
            <Calculator size={14} />
            Compute Individual Paycheck
          </button>

          <button 
            onClick={() => setIsBatchOpen(true)}
            id="btn-batch-deposit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all flex items-center gap-2 active:scale-97 shadow"
          >
            <Coins size={14} />
            Execute Direct Deposit ACH
          </button>
        </div>
      </header>

      {/* Analytics Bento Cards styled strictly for Apple Light theme */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow transition-shadow">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Est. Pipeline Gross</span>
          <div className="text-2xl font-bold text-slate-800 mt-1.5 font-mono">
            ${computedGrossTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[9px] text-slate-400 block mt-1">Aggregated cargo payouts</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow transition-shadow">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Withholdings & Advances</span>
          <div className="text-2xl font-bold text-rose-600 mt-1.5 font-mono">
            -${computedDeductionsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[9px] text-rose-450 block mt-1">Escrow, leases and fuel offsets</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow transition-shadow animate-pulse">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Net Disbursement Reserve</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1.5 font-mono">
            ${computedNetTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[9px] text-emerald-500 block mt-1">Current cleared payroll reserves</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow transition-shadow">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">Disbursed Settlements</span>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-2xl font-bold text-slate-800">{apiSettlements.filter(s => s.status === 'APPROVED' || s.status === 'PAID').length}</span>
            <span className="text-xs text-slate-400">approved / {apiSettlements.length} statements</span>
          </div>
          <span className="text-[9px] text-slate-400 block mt-1">Compliance audited batches</span>
        </div>
      </div>

      {/* Primary Table Ledger */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        
        {/* Search & Bulk Export block */}
        <div className="p-4.5 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200/80 px-3 py-2 rounded-xl w-full md:w-80 shadow-sm focus-within:border-slate-400 transition-colors">
            <Search size={14} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search pay slips by driver or SET #..."
              className="bg-transparent border-none text-xs outline-none w-full text-slate-800 placeholder-slate-400 font-sans"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportACHManifest}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 px-3.5 py-2 bg-white rounded-xl transition-all flex items-center gap-2 hover:bg-slate-50 shadow-sm active:scale-97"
              title="Download ACH Ledger Spreadsheet"
            >
              <Download size={13} />
              Export Payout Worksheet (CSV)
            </button>
          </div>
        </div>

        {/* Database Table Rendering with expanded rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/30 text-slate-400 text-[10px] font-semibold uppercase tracking-wider border-b border-slate-100">
                <th className="py-3.5 px-5">Statement Code</th>
                <th className="py-3.5 px-5">Active Driver</th>
                <th className="py-3.5 px-5">Pay Range Details</th>
                <th className="py-3.5 px-5 text-right">Base Pay</th>
                <th className="py-3.5 px-5 text-right">Gross Pay</th>
                <th className="py-3.5 px-5 text-right">Withholdings</th>
                <th className="py-3.5 px-5 text-right">Net Payout</th>
                <th className="py-3.5 px-5 text-center">Current Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredApiSettlements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-xs text-slate-400 font-medium">
                    No matching processed driver settlements located. Click 'Compute Individual Paycheck' to generate pay.
                  </td>
                </tr>
              ) : (
                filteredApiSettlements.map((settle) => {
                  const driver = drivers.find(d => d.id === settle.driverId);
                  const driverName = driver ? driver.name : "Active Contractor";
                  const driverCDL = driver ? driver.cdlClass : "Class A";
                  const isExpanded = expandedSettleId === settle.id;
                  
                  const ALLOWED_STATUS_SEQUENCE = ['PENDING', 'RATE_MATCHED', 'ACCESSORIALS_ADDED', 'DISPATCHER_REVIEW', 'APPROVED', 'PAID'];
                  const currentIdx = ALLOWED_STATUS_SEQUENCE.indexOf(settle.status as any);
                  const nextStatus = currentIdx !== -1 && currentIdx < ALLOWED_STATUS_SEQUENCE.length - 1 
                    ? ALLOWED_STATUS_SEQUENCE[currentIdx + 1] 
                    : null;
                  
                  return (
                    <React.Fragment key={settle.id}>
                      <tr 
                        onClick={() => setExpandedSettleId(isExpanded ? null : settle.id)}
                        className={`hover:bg-slate-50/40 transition-colors cursor-pointer select-none ${isExpanded ? 'bg-slate-50/20' : ''}`}
                      >
                        {/* Interactive toggle and ID */}
                        <td className="py-4 px-5 font-mono text-xs font-bold text-slate-900 border-none">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-[10px] transform transition-transform duration-200 inline-block" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                              ▶
                            </span>
                            {settle.settlementNumber}
                          </div>
                        </td>

                        {/* Driver user profile badge */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold font-mono">
                              {driverName.split(' ').map(n=>n[0]).join('')}
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-slate-800 block leading-none">{driverName}</span>
                              <span className="text-[9px] text-slate-400 font-mono mt-1 block">CDL {driverCDL}</span>
                            </div>
                          </div>
                        </td>

                        {/* Pay Range Details */}
                        <td className="py-4 px-5">
                          <div>
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                              <Calendar size={10} className="text-slate-400" />
                              {settle.periodStart} – {settle.periodEnd}
                            </span>
                            <span className="text-[9px] text-slate-400 block mt-1 italic leading-none">
                              Globally styled: {settle.payMethod} Rate ({settle.payRate})
                            </span>
                          </div>
                        </td>

                        {/* Base Pay */}
                        <td className="py-4 px-5 text-right font-mono text-xs text-slate-600">
                          ${settle.basePay.toFixed(2)}
                        </td>

                        {/* Gross pay */}
                        <td className="py-4 px-5 text-right font-mono text-xs text-slate-800 font-semibold">
                          ${settle.grossEarnings.toFixed(2)}
                        </td>

                        {/* Deductions */}
                        <td className="py-4 px-5 text-right font-mono text-xs text-rose-500 font-medium">
                          -${settle.deductions.toFixed(2)}
                        </td>

                        {/* Net Pay */}
                        <td className="py-4 px-5 text-right font-mono text-xs text-emerald-600 font-bold">
                          ${settle.netPay.toFixed(2)}
                        </td>

                        {/* Status Label styled exactly for Apple Mode */}
                        <td className="py-4 px-5 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wide uppercase leading-none border ${
                            settle.status === 'PENDING' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            settle.status === 'RATE_MATCHED' ? 'bg-indigo-50/60 text-indigo-700 border-indigo-100' :
                            settle.status === 'ACCESSORIALS_ADDED' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            settle.status === 'DISPATCHER_REVIEW' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                            settle.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            settle.status === 'PAID' ? 'bg-green-100 text-green-800 border-green-200' :
                            'bg-slate-100 text-slate-600 border-transparent'
                          }`}>
                            {settle.status.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Actions trigger */}
                        <td className="py-4 px-5 text-right font-sans" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedSettlementForDoc(settle)}
                              className="text-slate-400 hover:text-blue-600 p-2 rounded-xl hover:bg-blue-50/50 transition-colors cursor-pointer"
                              title="View & Download PDF Settlement Paystub"
                              id={`btn-viewstub-${settle.id}`}
                            >
                              <FileSpreadsheet size={13} className="text-blue-500" />
                            </button>
                            <button 
                              onClick={() => handleDeleteSettlement(settle.id, settle.settlementNumber)}
                              className="text-slate-300 hover:text-rose-500 p-2 rounded-xl hover:bg-rose-50/50 transition-colors cursor-pointer"
                              title="Delete Statement Record"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Checklist Detail View with integrated notes and dynamic custom items */}
                      {isExpanded && (
                        <tr className="bg-slate-50/30">
                          <td colSpan={9} className="p-0 border-t border-b border-slate-100">
                            <div className="p-6 space-y-4 animate-in slide-in-from-top-1 duration-200">
                              
                              {/* Workflow stepper progress Component */}
                              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                                  <div>
                                    <h5 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                      <Settings size={12} className="text-blue-500 animate-pulse" />
                                      Compliance Audit Progression Checklist
                                    </h5>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Sequential auditing progress gates. Skipping status blocks is prevented by compliance checks.</p>
                                  </div>
                                  <span className="text-[9px] text-slate-400 font-mono bg-slate-50 px-2.5 py-1 rounded-lg">
                                    Current checklist position: <strong className="text-slate-700">{currentIdx + 1} / 6</strong>
                                  </span>
                                </div>

                                <div className="py-3 relative">
                                  {/* Line background */}
                                  <div className="absolute top-7 left-[8%] right-[8%] h-[2px] bg-slate-100 z-0" />
                                  
                                  {/* Line colored progress */}
                                  <div 
                                    className="absolute top-7 left-[8%] h-[2px] bg-gradient-to-r from-blue-500 to-emerald-500 z-0 transition-all duration-300"
                                    style={{ width: `${(currentIdx / (ALLOWED_STATUS_SEQUENCE.length - 1)) * 84}%` }}
                                  />

                                  <div className="grid grid-cols-6 relative z-10">
                                    {ALLOWED_STATUS_SEQUENCE.map((stateLabel, index) => {
                                      const isPassed = index < currentIdx;
                                      const isCurrent = index === currentIdx;
                                      
                                      let stepBadgeBg = "bg-white border-slate-250 text-slate-400";
                                      if (isCurrent) {
                                        stepBadgeBg = "bg-slate-900 border-slate-900 text-white font-bold scale-105 shadow ring-4 ring-slate-150";
                                      } else if (isPassed) {
                                        stepBadgeBg = "bg-emerald-500 border-emerald-500 text-white";
                                      }
                                      
                                      return (
                                        <div key={stateLabel} className="flex flex-col items-center text-center">
                                          <div className={`w-7 h-7 rounded-full flex items-center justify-center border text-[9px] font-mono transition-all duration-300 ${stepBadgeBg}`}>
                                            {isPassed ? <Check size={11} className="stroke-[3]" /> : index + 1}
                                          </div>
                                          <span className={`block text-[8px] font-bold tracking-wider uppercase mt-2 ${isCurrent ? 'text-slate-900' : isPassed ? 'text-slate-800' : 'text-slate-400'}`}>
                                            {stateLabel.replace('_', ' ')}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>

                              {/* Itemized financial details + Driver visible notes */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                
                                {/* Itemized statement review card */}
                                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2.5 shadow-sm">
                                  <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Paycheck Itemization Summary</h6>
                                  
                                  <div className="flex justify-between text-xs py-1 border-b border-slate-100 text-slate-600">
                                    <span>Core Weekly Base Pay:</span>
                                    <span className="font-mono text-slate-800 font-medium">${settle.basePay.toFixed(2)}</span>
                                  </div>
                                  
                                  {/* Fuel + Detention Surcharge */}
                                  <div className="flex justify-between text-xs py-1 border-b border-slate-100 text-slate-600">
                                    <span>Accessorial Extras (Fuel + Detention):</span>
                                    <span className="font-mono text-blue-600 font-medium">+${(settle.fuelSurcharge + settle.detentionPay).toFixed(2)}</span>
                                  </div>

                                  {/* Custom Revenues if any */}
                                  {settle.customRevenues && settle.customRevenues.length > 0 && (
                                    <div className="space-y-1.5 pt-1">
                                      <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-widest block">Custom Earnings Additions</span>
                                      {settle.customRevenues.map((rev, rIdx) => (
                                        <div key={rev.id || rIdx} className="flex justify-between text-[11px] text-slate-600 pl-2">
                                          <span>• {rev.name}:</span>
                                          <span className="font-mono text-indigo-600 font-semibold">+${rev.amount.toFixed(2)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Standard Deductions Summary */}
                                  <div className="flex justify-between text-xs py-1 border-b border-slate-100 text-slate-600">
                                    <span>Standard Offsets (ELD, Insurances, Fuel Adv):</span>
                                    <span className="font-mono text-red-500 font-medium">-${(settle.fuelAdvanceDeduction + settle.insuranceDeduction + settle.eldFeeDeduction).toFixed(2)}</span>
                                  </div>

                                  {/* Custom Deductions if any */}
                                  {settle.customDeductions && settle.customDeductions.length > 0 && (
                                    <div className="space-y-1.5 pt-1">
                                      <span className="text-[9px] font-bold text-rose-700 uppercase tracking-widest block">Custom Withholdings Deductions</span>
                                      {settle.customDeductions.map((ded, dIdx) => (
                                        <div key={ded.id || dIdx} className="flex justify-between text-[11px] text-slate-600 pl-2">
                                          <span>• {ded.name}:</span>
                                          <span className="font-mono text-rose-600 font-medium">-${ded.amount.toFixed(2)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div className="flex justify-between text-sm pt-2.5 font-bold border-t border-slate-200">
                                    <span className="text-slate-700">Net Disbursement:</span>
                                    <span className="font-mono text-slate-900">${settle.netPay.toFixed(2)}</span>
                                  </div>
                                </div>

                                {/* Active driver notes & Interactivity trigger */}
                                <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between shadow-sm" onClick={e => e.stopPropagation()}>
                                  
                                  {/* Driver Note section displaying input notes */}
                                  <div className="space-y-3">
                                    <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Driver visible Memo & Notes</h6>
                                    
                                    {settle.notes ? (
                                      <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex gap-3 text-xs text-slate-600 italic font-sans leading-relaxed relative">
                                        <div className="p-1 bg-white text-slate-400 border rounded-lg h-7 shrink-0">
                                          <MessageSquare size={12} />
                                        </div>
                                        <div>
                                          <span className="font-semibold text-slate-800 text-[10px] block not-italic leading-none mb-1">MEMO FOR DRIVER</span>
                                          "{settle.notes}"
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-slate-400 italic">
                                        No dispatcher memo was written for this payroll statement. Memos can be appended during check computation.
                                      </div>
                                    )}
                                  </div>

                                  {/* Sequential gating actions */}
                                  <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
                                    <button
                                      onClick={() => setSelectedSettlementForDoc(settle)}
                                      className="w-full border border-slate-200 hover:border-slate-300 bg-slate-100/50 hover:bg-slate-100 text-slate-800 text-xs font-semibold py-2 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-97 cursor-pointer"
                                    >
                                      <FileSpreadsheet size={13} className="text-emerald-600" />
                                      View Statement Document / Pay Stub PDF
                                    </button>

                                    <button
                                      onClick={() => handleEditSettlement(settle)}
                                      className="w-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold py-2 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-97 cursor-pointer"
                                    >
                                      <Edit size={13} className="text-indigo-600" />
                                      Edit Settlement Computation Details
                                    </button>

                                    {nextStatus ? (
                                      <button 
                                        onClick={() => handleProgressSettlement(settle)}
                                        className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 rounded-xl transition-all shadow flex items-center justify-center gap-1.5 active:scale-97 cursor-pointer"
                                      >
                                        <CheckCircle2 size={13} className="text-blue-400 transform scale-110" />
                                        Advance Compliance Step to: <strong className="underline decoration-blue-500 decoration-2 pl-0.5">{nextStatus.replace('_', ' ')}</strong>
                                      </button>
                                    ) : (
                                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl py-2 px-3 flex items-center gap-2 justify-center text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                                        <Check size={11} className="stroke-[3]" />
                                        Fully Disbursed & Completed (Released via bank)
                                      </div>
                                    )}
                                  </div>

                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INDIVIDUAL PAYCHECK CALCULATOR SLIDEOVER MODAL */}
      <AnimatePresence>
        {isCalculatorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.97, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100 text-slate-800 font-sans"
            >
              {/* Apple-style Drawer Header */}
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-900 border border-slate-950 text-white rounded-2xl">
                    <Calculator size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold tracking-tight text-slate-900">
                      {editingSettlementId ? "Edit Existing Settlement & Paycheck Details" : "Weekly Paycheck Calculator & Builder"}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Automated date-range snapping, week-load consolidation, dynamic pay rules, and dynamic line items.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCalculatorOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-800 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form container scrollable body */}
              <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
                
                {/* Left columns: Form configuration */}
                <div className="lg:col-span-7 space-y-4.5">
                  
                  {/* STEP 1: Date ranges (Sunday to Saturday Alignment) */}
                  <div className="bg-slate-50/70 rounded-2xl border border-slate-150 p-4.5 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                        <Calendar size={13} className="text-slate-400" />
                        1. Weekly Settlement Range (Sunday – Saturday)
                      </h4>
                      <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-2 py-0.5 rounded-md leading-none border border-blue-10/10">
                        Snapped Period
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 block pb-0.5">Period Start Date (Sunday)</label>
                        <input 
                          type="date"
                          value={settlementPeriodStart}
                          onChange={e => handleManualDateChange('START', e.target.value)}
                          className="w-full bg-white border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium outline-none focus:border-slate-400 transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-400 block pb-0.5">Period End Date (Saturday)</label>
                        <input 
                          type="date"
                          value={settlementPeriodEnd}
                          onChange={e => handleManualDateChange('END', e.target.value)}
                          className="w-full bg-white border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium outline-none focus:border-slate-400 transition-colors"
                        />
                      </div>
                    </div>

                    {/* Week Shifter Control rail */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/40">
                      <div className="flex items-center gap-1.5">
                        <button 
                          type="button"
                          onClick={() => handleShiftWeek('PREV')}
                          className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-all flex items-center gap-1 text-[10px] font-bold shadow-sm"
                        >
                          <ChevronLeft size={12} />
                          Prev Week
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            const range = getWeekRange('2026-05-25');
                            setSettlementPeriodStart(range.start);
                            setSettlementPeriodEnd(range.end);
                          }}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-all text-[10px] font-bold shadow-sm"
                        >
                          This Week (May 2026)
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleShiftWeek('NEXT')}
                          className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-all flex items-center gap-1 text-[10px] font-bold shadow-sm"
                        >
                          Next Week
                          <ChevronRight size={12} />
                        </button>
                      </div>

                      {/* Smart banner to help navigate where mock delivered data falls */}
                      <button 
                        type="button"
                        onClick={() => handleJumpToMockLoadsRange('2024-03-10', '2024-03-16')}
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 transition-colors"
                        title="Mock delivered loads are centered in March 10 - 16, 2024"
                      >
                        <Sparkles size={11} className="text-indigo-500 animate-spin" />
                        Jump to March 2024 (Active Mock loads!)
                      </button>
                    </div>
                  </div>

                  {/* STEP 2: Grouping lists loads / Select target driver */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pt-1">
                      <User size={13} className="text-slate-400" />
                      2. Settle Target Driver & Weekly Grouped Loads
                    </h4>

                    {/* Selection with detailed description and feedback of load group counts */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                      <div className="md:col-span-5 space-y-1">
                        <label className="text-[10px] font-semibold text-slate-450 text-slate-400 block pl-0.5">Choose Driver</label>
                        <select 
                          value={calcDriverId}
                          onChange={e => setCalcDriverId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:bg-white transition-colors"
                        >
                          <option value="">-- Click to assign Driver --</option>
                          {drivers.map(d => {
                            const count = (driversWithLoadsInfo[d.id] || []).length;
                            return (
                              <option key={d.id} value={d.id}>
                                {d.name} ({count} Loads this period)
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="md:col-span-7 flex items-center">
                        <div className="bg-slate-55 border border-slate-100 rounded-2xl bg-slate-50 p-2.5 w-full flex items-center gap-3.5">
                          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0 border border-indigo-100">
                            <Info size={14} />
                          </div>
                          <div className="text-[10px] text-slate-500 font-sans leading-relaxed">
                            {calcDriverId ? (
                              <span>
                                Driver <strong>{drivers.find(d=>d.id===calcDriverId)?.name}</strong> has <strong>{(driversWithLoadsInfo[calcDriverId] || []).length} loads</strong> delivered inside this weekly snapped date range.
                              </span>
                            ) : (
                              <span>Assign a driver to assemble and compute multiple delivered loads on a single grouped paycheck slip.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STEP 2.5: Recurring pay rules that apply to this period */}
                  {calcDriverId && (
                    <div className="bg-slate-50/70 rounded-2xl border border-slate-250 p-4.5 space-y-3.5 border-dashed">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="text-left">
                          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                            <RefreshCw size={13} className="text-indigo-600 animate-spin-slow" />
                            2.5 Applicable Recurring Rules (Based on Period Start Date)
                          </h4>
                          <p className="text-[10px] text-slate-500 mt-1 font-medium">
                            Set global rules for {drivers.find(d => d.id === calcDriverId)?.name}. Check to apply to this paycheck, or add/delete rules.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowInlineAddRule(!showInlineAddRule)}
                            className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Plus size={13} /> {showInlineAddRule ? 'Close Rule Form' : 'Add New global Rule'}
                          </button>
                        </div>
                      </div>

                      {/* Sliding Inline Create Rule Form */}
                      {showInlineAddRule && (
                        <div className="p-4 bg-white rounded-2xl border border-indigo-100 shadow-xs space-y-3.5 text-left">
                          <p className="text-[10px] font-black text-indigo-950 uppercase tracking-widest pl-0.5">Define New Global Rule Inline</p>
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                            <div className="col-span-2 md:col-span-1">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rule Name</label>
                              <input
                                type="text"
                                placeholder="e.g. Safety Bonus, Clean Inspection"
                                value={inlineRuleName}
                                onChange={e => setInlineRuleName(e.target.value)}
                                className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 bg-slate-50 font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Type</label>
                              <select
                                value={inlineRuleType}
                                onChange={e => setInlineRuleType(e.target.value as any)}
                                className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 bg-slate-50 font-semibold cursor-pointer"
                              >
                                <option value="DEDUCTION">Deduction (Withholding)</option>
                                <option value="REVENUE">Revenue (Allowance)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Method</label>
                              <select
                                value={inlineRuleRateType}
                                onChange={e => setInlineRuleRateType(e.target.value as any)}
                                className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 bg-slate-50 font-semibold cursor-pointer"
                              >
                                <option value="FLAT">Flat Fee ($)</option>
                                <option value="PERCENTAGE">Percentage (%)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                {inlineRuleRateType === 'PERCENTAGE' ? 'Rate (%)' : 'Amount ($)'}
                              </label>
                              <input
                                type="number"
                                placeholder={inlineRuleRateType === 'PERCENTAGE' ? '5.0' : '0.00'}
                                value={inlineRuleAmount}
                                onChange={e => setInlineRuleAmount(e.target.value)}
                                className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 bg-slate-50 font-mono font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Frequency</label>
                              <select
                                value={inlineRuleFrequency}
                                onChange={e => setInlineRuleFrequency(e.target.value as any)}
                                className="w-full text-xs p-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 bg-slate-50 font-medium cursor-pointer"
                              >
                                <option value="DAILY">Daily (Per Day)</option>
                                <option value="WEEKLY">Weekly (Sun - Sat)</option>
                                <option value="MONTHLY">Monthly</option>
                                <option value="QUARTERLY">Quarterly</option>
                                <option value="YEARLY">Yearly</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Start Date</label>
                              <input
                                type="date"
                                value={inlineRuleStartDate}
                                onChange={e => setInlineRuleStartDate(e.target.value)}
                                className="w-full text-xs p-1.5 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 bg-slate-50 font-mono font-medium"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => handleCreateRecurringRuleInline(calcDriverId)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                            >
                              <Plus size={13} /> Save & Apply Rule
                            </button>
                          </div>
                        </div>
                      )}

                      {recurringRules.filter(r => r.driverId === calcDriverId).length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-white/50">
                          <p className="text-[10px] text-slate-400 italic">No global pay rules have been setup for this driver yet. Click "Add New Global Rule" above to create one.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {recurringRules.filter(r => r.driverId === calcDriverId).map(rule => {
                            const matchesPeriod = shouldRuleApply(rule, settlementPeriodStart);
                            const isChecked = ruleSelections[rule.id] || false;
                            
                            return (
                              <div
                                key={rule.id}
                                className={`flex items-start justify-between gap-2 p-3 rounded-xl border transition-all ${
                                  isChecked 
                                    ? 'bg-indigo-50/55 border-indigo-200 shadow-xs' 
                                    : 'bg-white border-slate-200 opacity-60 hover:opacity-100'
                                }`}
                              >
                                <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                                  <input 
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={e => {
                                      setRuleSelections(prev => ({
                                        ...prev,
                                        [rule.id]: e.target.checked
                                      }));
                                    }}
                                    className="mt-0.5 h-3.5 w-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                                  />
                                  <div className="space-y-0.5 text-left leading-none">
                                    <div className="text-xs font-bold text-slate-800 break-words flex items-center gap-1.5">
                                      {rule.name}
                                      <span className={`text-[8px] font-black tracking-wider px-1.5 py-0.5 select-none uppercase rounded ${
                                        rule.type === 'REVENUE' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'
                                      }`}>
                                        {rule.type === 'REVENUE' ? 'Earn' : 'Deduct'}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium flex flex-wrap items-center gap-1.5 mt-0.5">
                                      {rule.rateType === 'PERCENTAGE' ? (
                                        <span className="font-mono font-bold text-slate-700">
                                          {rule.amount}% of Gross (<span className="text-indigo-650 font-sans">${getComputedRuleAmountGlobal(rule, calculatedOutput.basePay).toFixed(2)}</span>)
                                        </span>
                                      ) : (
                                        <span className="font-mono font-bold text-slate-700">${rule.amount.toFixed(2)}</span>
                                      )}
                                      <span className="text-slate-350 font-light">&bull;</span>
                                      <span className="uppercase text-indigo-600 font-bold text-[9px]">{rule.frequency}</span>
                                      {matchesPeriod && (
                                        <span className="text-emerald-600 font-bold italic text-[9px]">(Matched)</span>
                                      )}
                                      {rule.startDate && (
                                        <span className="text-[8.5px] font-mono text-slate-500">(Starts: {rule.startDate})</span>
                                      )}
                                    </div>
                                  </div>
                                </label>

                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    await deleteRecurringRule(rule.id);
                                  }}
                                  className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all p-1.5 rounded-lg cursor-pointer shrink-0 self-center"
                                  title="Delete Rule Permanently"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 3 & Overrides: Global Default pay settings vs Individual load customized rate */}
                  {calcDriverId && (
                    <div className="space-y-4 font-sans">
                      
                      {/* Global paycheck pay format */}
                      <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-4.5 space-y-3">
                        <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">
                          3. Set DEFAULT Payout Method for All Weekly Loads
                        </h5>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                          <div className="md:col-span-7 grid grid-cols-3 gap-1.5">
                            <button 
                              type="button"
                              onClick={() => { setGlobalPayMethod('CPM'); setGlobalPayRate('0.65'); }}
                              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${globalPayMethod === 'CPM' ? 'border-slate-800 bg-slate-900 text-white font-semibold' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                            >
                              <Coins size={12} />
                              <span className="text-[10px] block">CPM Rule</span>
                            </button>

                            <button 
                              type="button"
                              onClick={() => { setGlobalPayMethod('PERCENTAGE'); setGlobalPayRate('0.25'); }}
                              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${globalPayMethod === 'PERCENTAGE' ? 'border-slate-800 bg-slate-900 text-white font-semibold' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                            >
                              <Percent size={12} />
                              <span className="text-[10px] block">Percentage %</span>
                            </button>

                            <button 
                              type="button"
                              onClick={() => { setGlobalPayMethod('FLAT'); setGlobalPayRate('1200'); }}
                              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${globalPayMethod === 'FLAT' ? 'border-slate-800 bg-slate-900 text-white font-semibold' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                            >
                              <DollarSign size={12} />
                              <span className="text-[10px] block">Flat Target</span>
                            </button>
                          </div>

                          <div className="md:col-span-5 space-y-1">
                            <label className="text-[9px] font-semibold text-slate-400 block pb-0.5 uppercase tracking-tight">
                              Default Global Weekly Rate
                            </label>
                            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-sm">
                              <span className="text-xs text-slate-400 font-mono">
                                {globalPayMethod === 'PERCENTAGE' ? '%' : '$'}
                              </span>
                              <input 
                                type="number"
                                step="0.01"
                                className="w-full bg-transparent border-none text-xs text-slate-700 font-mono outline-none"
                                value={globalPayRate}
                                onChange={e => setGlobalPayRate(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Per Load customization - Display active loads inside period and override switches */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">
                          Consolidated Load List for Selected Period ({(driversWithLoadsInfo[calcDriverId] || []).length} Loads)
                        </label>
                        
                        {(driversWithLoadsInfo[calcDriverId] || []).length === 0 ? (
                          <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400 italic">
                            No delivered loads found for this driver in the selected Sunday - Saturday range. You can still set a Flat pay amount above as a direct manual override.
                          </div>
                        ) : (
                          <div className="space-y-3.5">
                            {(driversWithLoadsInfo[calcDriverId] || []).map((load) => {
                              const config = customPayConfigs[load.id] || { customized: false, payMethod: globalPayMethod, payRate: globalPayRate };
                              const isCustom = config.customized;
                              
                              // Calculate individual load payout based on inherited vs customized settings
                              const rateVal = parseFloat(isCustom ? config.payRate : globalPayRate) || 0;
                              const methodVal = isCustom ? config.payMethod : globalPayMethod;
                              let computedLoadBase = 0;
                              if (methodVal === 'CPM') {
                                computedLoadBase = load.miles * rateVal;
                              } else if (methodVal === 'PERCENTAGE') {
                                computedLoadBase = load.rate * rateVal;
                              } else {
                                computedLoadBase = rateVal;
                              }

                              return (
                                <div key={load.id} className="bg-white border text-xs border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-350 transition-colors space-y-3">
                                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-mono font-bold text-slate-900">{load.loadNumber}</span>
                                        <span className="text-[10px] text-slate-400 bg-slate-150 px-1.5 py-0.5 rounded font-mono font-medium">
                                          {load.commodity}
                                        </span>
                                      </div>
                                      <span className="text-[9px] text-slate-400 block mt-1 tracking-tight">
                                        Route: {load.originId} → {load.destinationId} ({load.miles} mi) • Share Gross: ${load.rate.toLocaleString()}
                                      </span>
                                    </div>

                                    {/* Premium Toggler for overriding pay specifically on this load */}
                                    <label className="inline-flex items-center gap-2 cursor-pointer select-none self-start md:self-auto">
                                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                                        Custom Pay
                                      </span>
                                      <input 
                                        type="checkbox"
                                        checked={isCustom}
                                        onChange={e => handleToggleCustomizeLoad(load.id, e.target.checked)}
                                        className="sr-only peer"
                                      />
                                      <div className="relative w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-slate-900"></div>
                                    </label>
                                  </div>

                                  {/* Custom load rule display */}
                                  {isCustom ? (
                                    <div className="bg-indigo-50/20 border border-indigo-100 rounded-xl p-3 grid grid-cols-1 md:grid-cols-12 gap-3 animate-in slide-in-from-top-1 duration-150 text-[11px]">
                                      <div className="md:col-span-6 space-y-1">
                                        <label className="text-[9px] font-bold text-indigo-700 block uppercase">Pay Method Override</label>
                                        <div className="grid grid-cols-3 gap-1">
                                          {['CPM', 'PERCENTAGE', 'FLAT'].map(m => (
                                            <button
                                              key={m}
                                              type="button"
                                              onClick={() => handleUpdateCustomLoadRate(load.id, 'payMethod', m as any)}
                                              className={`py-1 text-[9px] font-bold rounded-lg border text-center transition-all ${config.payMethod === m ? 'border-indigo-600 bg-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-500'}`}
                                            >
                                              {m === 'PERCENTAGE' ? '%' : m}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="md:col-span-3 space-y-0.5">
                                        <label className="text-[9px] font-bold text-indigo-700 block uppercase">Overridden Rate</label>
                                        <input 
                                          type="number"
                                          step="0.01"
                                          className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1 font-mono outline-none focus:border-indigo-400"
                                          value={config.payRate}
                                          onChange={e => handleUpdateCustomLoadRate(load.id, 'payRate', e.target.value)}
                                        />
                                      </div>

                                      <div className="md:col-span-3 text-right flex flex-col justify-end">
                                        <span className="text-[9px] text-indigo-600 font-bold block uppercase leading-none">Custom Yield</span>
                                        <span className="font-mono text-xs font-bold text-slate-800 leading-tight">
                                          ${computedLoadBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between text-[11px] text-slate-400 pl-1 font-sans">
                                      <span className="flex items-center gap-1">
                                        <Check size={12} className="text-slate-400" />
                                        Inheriting global setting: {globalPayMethod} Rate
                                      </span>
                                      <span className="font-mono text-slate-600">
                                        Yield: ${computedLoadBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  )}

                                  {/* CORE LOAD-LEVEL EXTRA ITEMS PANEL */}
                                  <div className="pt-2.5 border-t border-slate-100/80 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-tight">
                                        Per-Load Adjustments (Load {load.loadNumber})
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {/* Extra Revenues container */}
                                      <div className="bg-slate-50/50 rounded-xl p-2.5 border border-slate-150 space-y-2">
                                        <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 font-sans">
                                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Load Extra Earnings</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const current = loadCustomRevenues[load.id] || [];
                                              setLoadCustomRevenues({
                                                ...loadCustomRevenues,
                                                [load.id]: [...current, { id: 'earn-' + Math.random().toString(36).substr(2, 5), name: 'Layover Pay', amount: '150' }]
                                              });
                                            }}
                                            className="text-[9px] text-indigo-650 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer focus:outline-none"
                                          >
                                            <Plus size={10} className="stroke-[2.5]" /> Add
                                          </button>
                                        </div>

                                        {(loadCustomRevenues[load.id] || []).length === 0 ? (
                                          <span className="text-[9px] text-slate-400 italic block py-0.5 pl-0.5">No distinct load revenues added</span>
                                        ) : (
                                          <div className="space-y-1.5">
                                            {(loadCustomRevenues[load.id] || []).map((rev, idx) => (
                                              <div key={rev.id} className="flex gap-1 items-center">
                                                <input
                                                  type="text"
                                                  placeholder="E.g., Layover, Stop-off"
                                                  value={rev.name}
                                                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] text-slate-700 w-full outline-none focus:border-slate-350"
                                                  onChange={e => {
                                                    const updated = [...(loadCustomRevenues[load.id] || [])];
                                                    updated[idx] = { ...updated[idx], name: e.target.value };
                                                    setLoadCustomRevenues({ ...loadCustomRevenues, [load.id]: updated });
                                                  }}
                                                />
                                                <div className="flex items-center bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-[10px] w-20 shrink-0">
                                                  <span className="text-slate-400 mr-0.5">$</span>
                                                  <input
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={rev.amount}
                                                    className="w-full bg-transparent border-none outline-none font-mono text-slate-700 text-right"
                                                    onChange={e => {
                                                      const updated = [...(loadCustomRevenues[load.id] || [])];
                                                      updated[idx] = { ...updated[idx], amount: e.target.value };
                                                      setLoadCustomRevenues({ ...loadCustomRevenues, [load.id]: updated });
                                                    }}
                                                  />
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const updated = (loadCustomRevenues[load.id] || []).filter(item => item.id !== rev.id);
                                                    setLoadCustomRevenues({ ...loadCustomRevenues, [load.id]: updated });
                                                  }}
                                                  className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                                                  title="Remove"
                                                >
                                                  <Trash2 size={11} />
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                      {/* Extra Deductions container */}
                                      <div className="bg-slate-50/50 rounded-xl p-2.5 border border-slate-150 space-y-2">
                                        <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 font-sans">
                                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Load Extra Deductions</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const current = loadCustomDeductions[load.id] || [];
                                              setLoadCustomDeductions({
                                                ...loadCustomDeductions,
                                                [load.id]: [...current, { id: 'deduct-' + Math.random().toString(36).substr(2, 5), name: 'Lumper Fee', amount: '75' }]
                                              });
                                            }}
                                            className="text-[9px] text-rose-600 hover:text-rose-850 font-bold flex items-center gap-0.5 cursor-pointer focus:outline-none"
                                          >
                                            <Plus size={10} className="stroke-[2.5]" /> Add
                                          </button>
                                        </div>

                                        {(loadCustomDeductions[load.id] || []).length === 0 ? (
                                          <span className="text-[9px] text-slate-400 italic block py-0.5 pl-0.5">No distinct load deductions added</span>
                                        ) : (
                                          <div className="space-y-1.5 font-sans">
                                            {(loadCustomDeductions[load.id] || []).map((ded, idx) => (
                                              <div key={ded.id} className="flex gap-1 items-center">
                                                <input
                                                  type="text"
                                                  placeholder="E.g., Lumper fee, Toll"
                                                  value={ded.name}
                                                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] text-slate-700 w-full outline-none focus:border-slate-350"
                                                  onChange={e => {
                                                    const updated = [...(loadCustomDeductions[load.id] || [])];
                                                    updated[idx] = { ...updated[idx], name: e.target.value };
                                                    setLoadCustomDeductions({ ...loadCustomDeductions, [load.id]: updated });
                                                  }}
                                                />
                                                <div className="flex items-center bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-[10px] w-20 shrink-0">
                                                  <span className="text-slate-400 mr-0.5">$</span>
                                                  <input
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={ded.amount}
                                                    className="w-full bg-transparent border-none outline-none font-mono text-slate-700 text-right"
                                                    onChange={e => {
                                                      const updated = [...(loadCustomDeductions[load.id] || [])];
                                                      updated[idx] = { ...updated[idx], amount: e.target.value };
                                                      setLoadCustomDeductions({ ...loadCustomDeductions, [load.id]: updated });
                                                    }}
                                                  />
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const updated = (loadCustomDeductions[load.id] || []).filter(item => item.id !== ded.id);
                                                    setLoadCustomDeductions({ ...loadCustomDeductions, [load.id]: updated });
                                                  }}
                                                  className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                                                  title="Remove"
                                                >
                                                  <Trash2 size={11} />
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* STEP 4: ACCESSORIAL EXTRAS */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        <div className="space-y-2.5 bg-blue-50/30 p-4 rounded-2xl border border-blue-100">
                          <h5 className="text-[10px] font-bold text-blue-800 uppercase tracking-wider pl-0.5">Accessorial Earnings Extras</h5>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="space-y-1">
                              <label className="text-[9px] font-semibold text-blue-700 block">Fuel Surcharge ($)</label>
                              <input 
                                type="number" 
                                className="w-full bg-white border border-blue-200 rounded-xl px-2.5 py-1.5 font-mono outline-none"
                                value={fuelSurcharge}
                                onChange={e => setFuelSurcharge(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-semibold text-blue-700 block">Detention Pay ($)</label>
                              <input 
                                type="number" 
                                className="w-full bg-white border border-blue-200 rounded-xl px-2.5 py-1.5 font-mono outline-none"
                                value={detentionPay}
                                onChange={e => setDetentionPay(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2.5 bg-rose-50/20 p-4 rounded-2xl border border-rose-100/50">
                          <h5 className="text-[10px] font-bold text-rose-800 uppercase tracking-wider pl-0.5">Standard Payroll Offsets</h5>
                          <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                            <div className="space-y-1">
                              <label className="text-[8px] font-semibold text-rose-700 block">Fuel Advance</label>
                              <input 
                                type="number" 
                                className="w-full bg-white border border-rose-200 rounded-xl px-2 py-1 font-mono outline-none"
                                value={fuelAdvanceDeduction}
                                onChange={e => setFuelAdvanceDeduction(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-semibold text-rose-700 block">Escrow/Ins.</label>
                              <input 
                                type="number" 
                                className="w-full bg-white border border-rose-200 rounded-xl px-2 py-1 font-mono outline-none"
                                value={insuranceDeduction}
                                onChange={e => setInsuranceDeduction(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-semibold text-rose-700 block">ELD SaaS</label>
                              <input 
                                type="number" 
                                className="w-full bg-white border border-rose-200 rounded-xl px-2 py-1 font-mono outline-none"
                                value={eldFeeDeduction}
                                onChange={e => setEldFeeDeduction(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* STEP 5: Create and edit new revenue and deduction fields (Dynamic Row Builders) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Dynamic Custom Revenue fields */}
                        <div className="space-y-3 border border-slate-200 p-4.5 rounded-2xl">
                          <div className="flex items-center justify-between">
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">Custom Earnings specific to this check</h5>
                            <button
                              type="button"
                              onClick={handleAddCustomEarn}
                              className="text-[9px] bg-slate-900 text-white font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 active:scale-95 shadow-sm hover:bg-slate-800 transition-colors"
                            >
                              <Plus size={10} />
                              Add Earning Line
                            </button>
                          </div>

                          <div className="space-y-2 text-xs">
                            {customEarnFields.length === 0 ? (
                              <div className="text-[10px] text-slate-400 italic py-2 text-center">
                                No additional custom earnings added. Layovers or bonuses can be appended as custom rows.
                              </div>
                            ) : (
                              customEarnFields.map(f => (
                                <div key={f.id} className="flex items-center gap-1.5 animate-in slide-in-from-top-1 duration-100">
                                  <input 
                                    type="text"
                                    placeholder="e.g. Layover fee"
                                    value={f.name}
                                    onChange={e => handleEditCustomEarn(f.id, 'name', e.target.value)}
                                    className="w-full bg-slate-50 border rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none focus:bg-white"
                                  />
                                  <div className="flex items-center bg-slate-50 border rounded-xl px-2.5 py-1.5 w-24">
                                    <span className="text-slate-400 font-mono text-[10px]">$</span>
                                    <input 
                                      type="number"
                                      placeholder="0"
                                      value={f.amount}
                                      onChange={e => handleEditCustomEarn(f.id, 'amount', e.target.value)}
                                      className="w-full bg-transparent border-none text-xs font-mono text-slate-700 outline-none text-right pl-0.5"
                                    />
                                  </div>
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveCustomEarn(f.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Dynamic Custom Deductions fields */}
                        <div className="space-y-3 border border-slate-200 p-4.5 rounded-2xl">
                          <div className="flex items-center justify-between">
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-0.5">Custom Deductions specific to this check</h5>
                            <button
                              type="button"
                              onClick={handleAddCustomDeduct}
                              className="text-[9px] bg-slate-900 text-white font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 active:scale-95 shadow-sm hover:bg-slate-800 transition-colors"
                            >
                              <Plus size={10} />
                              Add Deduction Line
                            </button>
                          </div>

                          <div className="space-y-2 text-xs">
                            {customDeductFields.length === 0 ? (
                              <div className="text-[10px] text-slate-400 italic py-2 text-center">
                                No additional custom deductions added. Toll adjustments or gear purchases can be billed.
                              </div>
                            ) : (
                              customDeductFields.map(f => (
                                <div key={f.id} className="flex items-center gap-1.5 animate-in slide-in-from-top-1 duration-100">
                                  <input 
                                    type="text"
                                    placeholder="e.g. Broken lock fee"
                                    value={f.name}
                                    onChange={e => handleEditCustomDeduct(f.id, 'name', e.target.value)}
                                    className="w-full bg-slate-50 border rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none focus:bg-white"
                                  />
                                  <div className="flex items-center bg-slate-50 border rounded-xl px-2.5 py-1.5 w-24">
                                    <span className="text-slate-400 font-mono text-[10px]">$</span>
                                    <input 
                                      type="number"
                                      placeholder="0"
                                      value={f.amount}
                                      onChange={e => handleEditCustomDeduct(f.id, 'amount', e.target.value)}
                                      className="w-full bg-transparent border-none text-xs font-mono text-slate-700 outline-none text-right pl-0.5"
                                    />
                                  </div>
                                  <button 
                                    type="button" 
                                    onClick={() => handleRemoveCustomDeduct(f.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                      </div>

                      {/* STEP 6: Driver note memo feedback */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">
                          6. Settlement Memo / Notes (Printed on driver paycheck statement)
                        </label>
                        <textarea 
                          rows={2.5}
                          style={{ resize: 'none' }}
                          placeholder="Add comments, safe-driving congratulations, or notes regarding customized CPM rate overrides. The operator gets beautiful visibility of this note layout."
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white transition-colors rounded-2xl p-4 text-xs text-slate-700 outline-none"
                        />
                      </div>

                    </div>
                  )}

                </div>

                {/* Right columns: Premium visual paycheck print view wrapper */}
                <div className="lg:col-span-5 bg-slate-900 border border-slate-950 text-slate-100 p-5 rounded-3xl flex flex-col justify-between shadow-2xl relative overflow-hidden min-h-[440px]">
                  {/* Subtle modern pattern */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Disbursement Preview Statement</span>
                        <span className="text-[9px] text-slate-450 text-slate-400 block mt-0.5 font-mono">
                          Period: {settlementPeriodStart} to {settlementPeriodEnd}
                        </span>
                      </div>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase">
                        Audited Math
                      </span>
                    </div>

                    {/* Paycheck Itemizations list */}
                    <div className="space-y-3.5 text-xs font-sans">
                      
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-400 font-medium">Weekly Net Base Pay:</span>
                        <span className="font-mono text-slate-200 font-semibold">${calculatedOutput.basePay.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-400 font-medium">Fuel Surcharge (Extra):</span>
                        <span className="font-mono text-indigo-300 font-semibold">+${calculatedOutput.fuelSurcharge.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between items-center py-0.5 border-b border-slate-850 pb-2">
                        <span className="text-slate-400 font-medium font-sans">Detention Pay (Accessorial):</span>
                        <span className="font-mono text-indigo-300 font-semibold">+${calculatedOutput.detentionPay.toFixed(2)}</span>
                      </div>

                      {/* Custom dynamic earnings aggregate if above 0 */}
                      {calculatedOutput.customEarnTotal > 0 && (
                        <div className="flex justify-between items-center py-0.5 text-indigo-200 font-medium border-b border-slate-850 pb-2">
                          <span className="flex items-center gap-1 font-semibold text-indigo-350">
                            Custom Added Earnings:
                          </span>
                          <span className="font-mono font-bold">+${calculatedOutput.customEarnTotal.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center py-1.5 bg-slate-850/50 px-2 rounded-xl">
                        <span className="text-slate-100 font-bold">Estimated Gross Pay:</span>
                        <span className="font-mono font-bold text-white">${calculatedOutput.grossEarnings.toFixed(2)}</span>
                      </div>

                      <div className="text-[9px] text-slate-500 uppercase font-semibold tracking-wider pt-2 block">Deductions & Escrows</div>

                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-400 font-medium">Fuel Advance offset:</span>
                        <span className="font-mono text-rose-300">-${calculatedOutput.fuelAdvanceDeduction.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-400 font-medium">Contractor Escrow & Insurance:</span>
                        <span className="font-mono text-rose-300">-${calculatedOutput.insuranceDeduction.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between items-center py-0.5 border-b border-slate-850 pb-2">
                        <span className="text-slate-400 font-medium">Weekly ELD SaaS compliance fee:</span>
                        <span className="font-mono text-rose-300">-${calculatedOutput.eldFeeDeduction.toFixed(2)}</span>
                      </div>

                      {/* Custom dynamic deductions aggregate if above 0 */}
                      {calculatedOutput.customDeductTotal > 0 && (
                        <div className="flex justify-between items-center py-0.5 text-rose-200 font-medium border-b border-slate-850 pb-2">
                          <span className="flex items-center gap-1 font-semibold text-rose-350">
                            Custom Added Deductions:
                          </span>
                          <span className="font-mono font-bold">-${calculatedOutput.customDeductTotal.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center py-1.5 bg-rose-950/20 px-2 rounded-xl">
                        <span className="text-rose-400 font-bold">Aggregate Withholdings:</span>
                        <span className="font-mono font-bold text-rose-350">-${calculatedOutput.deductions.toFixed(2)}</span>
                      </div>

                    </div>
                  </div>

                  {/* Submit and action trigger */}
                  <div className="pt-4 border-t border-slate-850 mt-4 space-y-3">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">NET DISPOSABLE DISBURSEMENT</span>
                      <strong className="text-2xl text-emerald-400 font-mono font-bold">${calculatedOutput.netPay.toFixed(2)}</strong>
                    </div>

                    {notes.trim() && (
                      <div className="bg-slate-850 p-2.5 rounded-xl text-[10px] text-slate-350 max-h-16 overflow-y-auto italic">
                        <strong>Memo:</strong> "{notes.trim()}"
                      </div>
                    )}

                    <button 
                      type="button"
                      onClick={handleSaveSettlement}
                      className={`w-full text-white text-xs font-semibold py-3 rounded-2xl transition-all shadow-lg active:scale-97 flex items-center justify-center gap-1.5 focus:outline-none ${
                        editingSettlementId 
                          ? 'bg-indigo-600 hover:bg-indigo-500' 
                          : 'bg-emerald-500 hover:bg-emerald-400'
                      }`}
                    >
                      <ShieldCheck size={14} className="stroke-[2.5]" />
                      {editingSettlementId ? 'Save & Update Settlement Details' : 'Approve & Save Statement Record'}
                    </button>
                  </div>

                </div>

              </div>

              {/* Apple cancel/close tray footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 text-xs font-semibold">
                <button 
                  onClick={() => setIsCalculatorOpen(false)}
                  className="px-4.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 shadow-sm"
                >
                  Close Calculator
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PROCESS PAYOUT BATCH DRAWER CONTAINER */}
      <AnimatePresence>
        {isBatchOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-slate-850 font-sans"
            >
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center text-slate-800">
                <h3 className="text-sm font-semibold tracking-tight">Execute ACH/Wire Payroll Transmit</h3>
                <button onClick={() => setIsBatchOpen(false)} className="text-slate-400 hover:text-slate-750 p-1 rounded-full">
                  <X size={15} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3.5 flex gap-2.5">
                  <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                    Executing this payout batch will transition all settlements currently and sequentially marked in 'APPROVED' status to final 'PAID' status. It initiates bank wire dispatches.
                  </p>
                </div>

                <div className="bg-white border rounded-2xl p-4.5 space-y-2.5 text-slate-700">
                  <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Estimated Outlay</h4>
                  <div className="flex justify-between text-xs py-1 border-b">
                    <span>Approved Pay Statements</span>
                    <span className="font-mono text-slate-800 font-semibold">
                      {apiSettlements.filter(s => s.status === 'APPROVED').length} Statements
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-1">
                    <span>Estimated Net Cash Discharge</span>
                    <span className="font-mono text-emerald-600 font-bold">
                      ${apiSettlements.filter(s => s.status === 'APPROVED').reduce((sum, s) => sum + s.netPay, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Disbursement Route</label>
                  <select 
                    value={batchMethod}
                    onChange={(e: any) => setBatchMethod(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 outline-none"
                  >
                    <option value="ACH">ACH Direct Deposit Batch (24 Hour)</option>
                    <option value="Wire">FedWire Real-time Settlement (Instant Dispatch)</option>
                    <option value="Comdata">Comdata Fuel Card Direct Cash Transmit</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t flex justify-end gap-2 text-xs font-semibold">
                <button 
                  onClick={() => setIsBatchOpen(false)}
                  className="px-4 py-1.5 bg-white border hover:bg-slate-50 rounded-xl text-slate-600"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmBatchDeposit}
                  className="px-6 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow active:scale-97 text-xs font-bold"
                >
                  Confirm & Transmit Funds
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PDF DOCUMENT / STATEMENT VIEWER MODAL */}
      <AnimatePresence>
        {selectedSettlementForDoc && (() => {
          const s = selectedSettlementForDoc;
          const drv = drivers.find(d => d.id === s.driverId);
          const drvName = drv ? drv.name : "Active Contractor";
          const emailAddr = drvName.toLowerCase().replace(/[^a-z0-9]/g, '') + "@apexhaul.com";
          const matchedLoads = s.loadItemizations || loads.filter(l => l.driverId === s.driverId && l.deliveryDate >= s.periodStart && l.deliveryDate <= s.periodEnd).map(l => ({
            loadId: l.id,
            loadNumber: l.loadNumber,
            rate: l.rate,
            miles: l.miles,
            payMethod: s.payMethod,
            payRate: s.payRate,
            amount: s.payMethod === 'CPM' ? l.miles * s.payRate : (s.payMethod === 'PERCENTAGE' ? l.rate * s.payRate : s.payRate),
            customerPo: l.customerPo,
            bolNumber: l.bolNumber,
            originId: l.originId,
            destinationId: l.destinationId,
            commodity: l.commodity || "General Freight",
            deliveryDate: l.deliveryDate
          }));
          
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto font-sans">
              {/* Overlay with close block */}
              <div className="absolute inset-0" onClick={() => setSelectedSettlementForDoc(null)} />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl relative z-10 flex flex-col max-h-[90vh]"
              >
                {/* Header of Modal (Non-printable) */}
                <div id="modal-header-actions" className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 rounded-t-3xl border-slate-200">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 tracking-tight flex items-center gap-2">
                      <FileSpreadsheet size={16} className="text-emerald-600" />
                      Client-Ready PDF Statement Viewer: {s.settlementNumber}
                    </h3>
                    <p className="text-[10px] text-slate-400">Review official settlement ledger values, print, save or transmit directly to driver accounts.</p>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl cursor-pointer select-none hover:bg-slate-50">
                      <input 
                        type="checkbox"
                        checked={showRefNumbers}
                        onChange={e => setShowRefNumbers(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 h-3 w-3"
                      />
                      <span>Show Ref Numbers</span>
                    </label>

                    <button 
                      onClick={() => handleDownloadHtmlDoc(s)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1 active:scale-97 cursor-pointer"
                      title="Download styled HTML document"
                    >
                      <Download size={13} />
                      Download Stub
                    </button>

                    <button 
                      onClick={() => {
                        window.print();
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-97 cursor-pointer"
                      title="Print via browser native print dialog"
                    >
                      <Printer size={13} />
                      Print / Save PDF
                    </button>

                    <button 
                      onClick={() => handleEmailDoc(s)}
                      disabled={isEmailingDoc}
                      className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-97 cursor-pointer disabled:opacity-50"
                    >
                      <Mail size={13} className={isEmailingDoc ? "animate-bounce" : ""} />
                      {isEmailingDoc ? "Emailing..." : "Email to Driver"}
                    </button>

                    <button 
                      onClick={() => handleAppDoc(s)}
                      disabled={isCastingDoc}
                      className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-97 cursor-pointer disabled:opacity-50"
                    >
                      <Send size={13} className={isCastingDoc ? "animate-pulse" : ""} />
                      {isCastingDoc ? "Transmitting..." : "Send via App"}
                    </button>

                    <button 
                      onClick={() => setSelectedSettlementForDoc(null)} 
                      className="text-slate-400 hover:text-slate-800 p-2 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Status loading overlays */}
                {isEmailingDoc && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-6 text-center rounded-3xl animate-in fade-in duration-200">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-3" />
                    <p className="text-xs font-semibold text-slate-800">{emailStatusMessage}</p>
                  </div>
                )}
                {isCastingDoc && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-6 text-center rounded-3xl animate-in fade-in duration-200">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-3 animate-pulse" />
                    <p className="text-xs font-semibold text-slate-800">{mobileStatusMessage}</p>
                  </div>
                )}

                {/* Scrollable Printable Invoice Content */}
                <div className="p-6 overflow-y-auto bg-slate-100/50 flex-1 flex justify-center">
                  
                  {/* Style block specifically for perfect Portrait printing */}
                  <style>{`
                    @media print {
                      body * {
                        visibility: hidden !important;
                      }
                      #printable-paystub-statement, #printable-paystub-statement * {
                        visibility: visible !important;
                      }
                      #printable-paystub-statement {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 30px !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        color: black !important;
                      }
                      #modal-header-actions, button, footer {
                        display: none !important;
                      }
                    }
                  `}</style>

                  {/* High Fidelity US Letter Styled Form Sheet */}
                  <div 
                    id="printable-paystub-statement"
                    className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm w-full max-w-[800px] text-slate-800 space-y-6 select-text text-left font-sans"
                  >
                    {/* Invoice Letterhead */}
                    <div className="flex justify-between items-start border-b border-slate-105 pb-5">
                      <div>
                        <h1 className="text-lg font-bold text-slate-900 tracking-tight">APEX LOGISTICS LLC</h1>
                        <p className="text-[10px] text-slate-400 font-medium">Carrier Fleet Operations & Dispatches</p>
                        <p className="text-[9px] text-slate-400 mt-1">640 Fleetway Boulevard, Suite 400<br />support@apexlogistics.com</p>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                          {s.status}
                        </span>
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2 font-mono">DEPOSIT ADVICE</h2>
                        <p className="text-xs font-mono text-slate-900 font-bold mt-1">Statement: {s.settlementNumber}</p>
                      </div>
                    </div>

                    {/* Metadata boxes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 text-xs">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">BENEFICIARY DRIVER</span>
                        <p className="font-bold text-slate-800 text-sm leading-tight">{drvName}</p>
                        <p className="text-slate-500 font-mono">CDL Class: {drv ? drv.cdlClass : 'Class A'}</p>
                        <p className="text-slate-400 font-mono text-[10px]">{emailAddr}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">STATEMENT RECORD</span>
                        <p className="text-slate-600">Pay Period: <strong className="text-slate-800 font-mono">{s.periodStart}</strong> to <strong className="text-slate-800 font-mono">{s.periodEnd}</strong></p>
                        <p className="text-slate-500 font-mono leading-none">Method: {s.payMethod}</p>
                        <p className="text-slate-500 font-mono leading-none mt-1">Formula Rate: ${s.payRate.toFixed(2)}{s.payMethod === 'PERCENTAGE' ? '%' : ''}</p>
                      </div>
                    </div>

                    {/* Loads Table if applicable */}
                    {matchedLoads.length > 0 ? (
                      <div className="space-y-2">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b pb-1">TRIP RECORD & REVENUES (VERIFIED COMPLIANT)</h3>
                        <div className="overflow-hidden border border-slate-100 rounded-lg">
                          <table className="w-full text-left text-[11px] border-collapse">
                            <thead className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase">
                              <tr className="border-b border-slate-100">
                                <th className="py-2 px-3">Load Details</th>
                                <th className="py-2 px-3">Delivered</th>
                                <th className="py-2 px-3">Trip Segment</th>
                                <th className="py-2 px-3">Method</th>
                                <th className="py-2 px-3 text-right">Distance/Base</th>
                                <th className="py-2 px-3 text-right">Allocated Payout</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {matchedLoads.map(l => (
                                <tr key={l.loadId} className="hover:bg-slate-50/30">
                                  <td className="py-2 px-3 font-medium text-slate-900">
                                    <div className="font-bold text-slate-900">{l.loadNumber}</div>
                                    {showRefNumbers && (l.customerPo || l.bolNumber) && (
                                      <div className="text-[10px] text-slate-500 font-medium mt-0.5 whitespace-nowrap bg-slate-100/60 px-1 py-0.5 rounded inline-block">
                                        {l.customerPo && <span className="mr-1.5">PO: <strong className="text-slate-700">{l.customerPo}</strong></span>}
                                        {l.bolNumber && <span>BOL: <strong className="text-slate-700">{l.bolNumber}</strong></span>}
                                      </div>
                                    )}
                                    {l.loadRevenues && l.loadRevenues.length > 0 && (
                                      <div className="text-[9px] text-emerald-600 font-semibold mt-1 bg-emerald-50/50 px-1.5 py-0.5 rounded border border-emerald-100/40">
                                        Extra Earnings: {l.loadRevenues.map(r => `${r.name} (+$${r.amount.toFixed(2)})`).join(', ')}
                                      </div>
                                    )}
                                    {l.loadDeductions && l.loadDeductions.length > 0 && (
                                      <div className="text-[9px] text-rose-500 font-semibold mt-0.5 bg-rose-50/30 px-1.5 py-0.5 rounded border border-rose-100/30">
                                        Extra Deductions: {l.loadDeductions.map(d => `${d.name} (-$${d.amount.toFixed(2)})`).join(', ')}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-[10px]">{l.deliveryDate}</td>
                                  <td className="py-2 px-3">{l.originId} &rarr; {l.destinationId}</td>
                                  <td className="py-2 px-3 font-medium">
                                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border border-slate-150">
                                      {l.payMethod}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-slate-500 text-[10px]">
                                    {l.payMethod === 'CPM' ? `${l.miles} mi @ $${l.payRate}/mi` : (l.payMethod === 'PERCENTAGE' ? `${(l.payRate * 100).toFixed(0)}% of $${(l.rate || 0).toLocaleString()}` : 'Flat Rate')}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                    ${l.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50/30 border border-dashed rounded-xl p-3.5 text-center text-[10px] text-slate-400">
                        No individual trip logs assigned. Processing as global lease / standard contractor reservation.
                      </div>
                    )}

                    {/* Core Ledger Breakdowns */}
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b pb-1">FINANCIAL LINE ITEMS REVIEW</h3>
                      <div className="overflow-hidden border border-slate-200 rounded-xl text-xs">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase">
                              <th className="py-2 px-3 text-left">Line item details</th>
                              <th className="py-2 px-3 text-right">Ledger Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60 font-sans">
                            <tr>
                              <td className="py-2.5 px-3 text-slate-600">Contract Core Weekly Base Pay Component</td>
                              <td className="py-2.5 px-3 text-right font-mono font-medium">${s.basePay.toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 px-3 text-slate-600">Assigned Truck Fuel Surcharge Allowance</td>
                              <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-600 font-semibold">+${s.fuelSurcharge.toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 px-3 text-slate-600">Arrive Detention Accessory Payout</td>
                              <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-600 font-semibold">+${s.detentionPay.toFixed(2)}</td>
                            </tr>
                            
                            {/* Render ALL user added custom revenues */}
                            {s.customRevenues && s.customRevenues.length > 0 && s.customRevenues.map((rev, idx) => (
                              <tr key={rev.id || idx}>
                                <td className="py-2.5 px-3 text-slate-700">Custom Added Addition: <strong className="text-slate-900 font-semibold">{rev.name}</strong></td>
                                <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-bold">+${rev.amount.toFixed(2)}</td>
                              </tr>
                            ))}

                            {/* Render individual load-specific extra revenues list */}
                            {s.loadItemizations && s.loadItemizations.some(item => item.loadRevenues && item.loadRevenues.length > 0) && s.loadItemizations.flatMap(item => (item.loadRevenues || []).map(r => ({ ...r, loadNumber: item.loadNumber }))).map((rev, idx) => (
                              <tr key={`load-rev-${rev.id || idx}`}>
                                <td className="py-2.5 px-3 text-slate-700">Load <strong className="font-mono">{rev.loadNumber}</strong> Extra: <strong className="text-slate-900 font-semibold">{rev.name}</strong></td>
                                <td className="py-2.5 px-3 text-right font-mono text-emerald-600 font-bold">+${rev.amount.toFixed(2)}</td>
                              </tr>
                            ))}

                            <tr className="bg-slate-50 font-semibold text-slate-900 border-t border-slate-200">
                              <td className="py-2.5 px-3 font-bold text-slate-900 text-xs">AGGREGATE CALCULATED GROSS EARNINGS</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">${s.grossEarnings.toFixed(2)}</td>
                            </tr>

                            <tr>
                              <td className="py-2.5 px-3 text-rose-500">Fuel Advance Offset Cash Advance Deduct</td>
                              <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-medium">-${s.fuelAdvanceDeduction.toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 px-3 text-rose-500">Contractor Escrow Reserve & Liability Insurance</td>
                              <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-medium">-${s.insuranceDeduction.toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td className="py-2.5 px-3 text-rose-500">Regulatory ELD Driver Device Log SaaS Compliance Fee</td>
                              <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-medium">-${s.eldFeeDeduction.toFixed(2)}</td>
                            </tr>

                            {/* Render ALL user added custom deductions */}
                            {s.customDeductions && s.customDeductions.length > 0 && s.customDeductions.map((ded, idx) => (
                              <tr key={ded.id || idx}>
                                <td className="py-2.5 px-3 text-rose-600 font-sans">Custom Withheld Deduction: <strong className="text-rose-900 font-semibold">{ded.name}</strong></td>
                                <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-bold">-${ded.amount.toFixed(2)}</td>
                              </tr>
                            ))}

                            {/* Render individual load-specific extra deductions list */}
                            {s.loadItemizations && s.loadItemizations.some(item => item.loadDeductions && item.loadDeductions.length > 0) && s.loadItemizations.flatMap(item => (item.loadDeductions || []).map(d => ({ ...d, loadNumber: item.loadNumber }))).map((ded, idx) => (
                              <tr key={`load-ded-${ded.id || idx}`}>
                                <td className="py-2.5 px-3 text-rose-600 font-sans">Load <strong className="font-mono">{ded.loadNumber}</strong> Deduct: <strong className="text-rose-950 font-semibold">{ded.name}</strong></td>
                                <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-bold">-${ded.amount.toFixed(2)}</td>
                              </tr>
                            ))}

                            <tr className="bg-slate-50 font-semibold text-rose-600 border-t border-slate-200">
                              <td className="py-2.5 px-3 font-bold text-rose-700 text-xs">AGGREGATE DEDUCTIONS REMISSIONS WITHHELD</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">-${s.deductions.toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Final Net Section */}
                    <div className="flex justify-between items-center bg-slate-900 text-white p-5 rounded-2xl whitespace-nowrap">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-3">NET CLEARED PAY DISBURSEMENT</span>
                        <span className="text-[9px] text-slate-500 font-semibold font-mono leading-none block mt-1">Cleared for bank transfer / ACH Advised</span>
                      </div>
                      <div className="text-2xl font-mono text-emerald-400 font-extrabold">${s.netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>

                    {/* Dispatch Note */}
                    {s.notes && (
                      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-xs text-indigo-900 italic font-medium leading-relaxed">
                        <strong>Dispatcher Note for Driver:</strong> "{s.notes}"
                      </div>
                    )}

                    {/* Legal Compliance Disclaimer */}
                    <div className="text-center text-[9px] text-slate-400 max-w-md mx-auto pt-4 leading-normal font-medium">
                      This is an electronically simulated direct deposit advice. The pay is compiled based on verified miles, accessorial triggers, and compliance parameters. APEX Logistics Inc. All rights reserved.
                    </div>
                  </div>

                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end gap-2 text-xs font-semibold">
                  <button 
                    onClick={() => setSelectedSettlementForDoc(null)}
                    className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 cursor-pointer shadow-xs"
                  >
                    Close Doc Viewer
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
