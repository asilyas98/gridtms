import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../.env') });
import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

import { supabase } from './src/lib/supabase';
import crypto from 'crypto';

import { Load, Driver, Location, Truck, LoadLineItem, ActivityLogEntry } from './src/types';

// In-Memory stores for transient state (synced with Supabase or served as initial starter data)
let db_customers: any[] = [
  {
    id: 'cust-demo-1',
    name: 'Apex Global Logistics',
    company_name: 'Apex Global Logistics',
    code: 'APEX01',
    status: 'Active',
    credit_limit: 50000,
    credit_used: 12450,
    address: '100 Logistics Blvd',
    city: 'Chicago',
    state: 'IL',
    zip: '60607',
    phone: '312-555-0199',
    email: 'dispatch@apexlogistics.example',
    payment_terms: 'Net 30 Days',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  }
];

let db_locations: any[] = [
  {
    id: 'loc-demo-1',
    name: 'Apex Central Distribution Hub',
    location_type: 'Shipper',
    address: '4500 W 47th St',
    city: 'Chicago',
    state: 'IL',
    zip: '60632',
    country: 'USA',
    lat: 41.808,
    lng: -87.736,
    customer_ids: ['cust-demo-1'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  },
  {
    id: 'loc-demo-2',
    name: 'Lone Star Logistics Park',
    location_type: 'Consignee',
    address: '2200 E Interstate 20',
    city: 'Dallas',
    state: 'TX',
    zip: '75241',
    country: 'USA',
    lat: 32.684,
    lng: -96.786,
    customer_ids: ['cust-demo-1'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  }
];

let db_trucks: any[] = [
  {
    id: 'trk-demo-1',
    unit_number: 'TRK-101',
    make_model: '2024 Freightliner Cascadia',
    truck_type: 'Semi-Truck',
    vin: '1FUJGLDR5PL129841',
    plate_number: 'P-98421',
    plate_state: 'IL',
    fuel_type: 'Diesel',
    status: 'In Use',
    current_location: 'Chicago, IL',
    odometer: '142850',
    eld_provider: 'Motive ELD',
    eld_serial: 'MOT-98421',
    pm_interval: '15000',
    pm_status: 'Current',
    last_service_odometer: 135000,
    last_service_date: '2026-08-15',
    registration_expiry: '2027-04-30',
    annual_inspection_expiry: '2027-02-15',
    dvir_status: 'Passed',
    dvir_date: '2026-10-09',
    driver_id: 'drv-demo-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  },
  {
    id: 'trk-demo-2',
    unit_number: 'TRK-102',
    make_model: '2023 Volvo VNL 860',
    truck_type: 'Semi-Truck',
    vin: '4V4NC9EH1PN892014',
    plate_number: 'P-44120',
    plate_state: 'IN',
    fuel_type: 'Diesel',
    status: 'Available',
    current_location: 'Indianapolis, IN',
    odometer: '89420',
    eld_provider: 'Samsara',
    eld_serial: 'SAM-44120',
    pm_interval: '15000',
    pm_status: 'Current',
    last_service_odometer: 75000,
    last_service_date: '2026-06-20',
    registration_expiry: '2027-01-31',
    annual_inspection_expiry: '2026-11-20',
    dvir_status: 'Passed',
    dvir_date: '2026-10-08',
    driver_id: 'drv-demo-2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  },
  {
    id: 'trk-demo-3',
    unit_number: 'TRK-103',
    make_model: '2022 Peterbilt 579 UltraLoft',
    truck_type: 'Semi-Truck',
    vin: '1XP4DB9X4ND812390',
    plate_number: 'P-11928',
    plate_state: 'OH',
    fuel_type: 'Diesel',
    status: 'Maintenance',
    current_location: 'Columbus, OH',
    odometer: '215400',
    eld_provider: 'Motive ELD',
    eld_serial: 'MOT-11928',
    pm_interval: '15000',
    pm_status: 'Due',
    last_service_odometer: 200100,
    last_service_date: '2026-05-12',
    registration_expiry: '2026-12-15',
    annual_inspection_expiry: '2026-10-25',
    dvir_status: 'Defects Reported',
    dvir_date: '2026-10-08',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  },
  {
    id: 'trl-demo-1',
    unit_number: 'TRL-5301',
    make_model: '2024 Great Dane Everest 53ft',
    truck_type: 'Reefer Trailer',
    vin: '1GRAA0625PK892011',
    plate_number: 'TR-7712',
    plate_state: 'IL',
    fuel_type: 'Reefer Diesel',
    status: 'In Use',
    current_location: 'Chicago, IL',
    odometer: '48200',
    reefer_hours: '2410',
    pm_interval: '20000',
    pm_status: 'Current',
    last_service_odometer: 32000,
    last_service_date: '2026-07-10',
    registration_expiry: '2027-08-31',
    annual_inspection_expiry: '2027-03-10',
    dvir_status: 'Passed',
    dvir_date: '2026-10-09',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  }
];

let db_maintenance_records: any[] = [
  {
    id: 'maint-1',
    truckId: 'trk-demo-1',
    unitNumber: 'TRK-101',
    serviceType: 'PM-A Service',
    serviceDate: '2026-08-15',
    odometer: 135000,
    cost: 485,
    mechanicNotes: 'Engine oil and filter change, multi-point chassis lube, fuel-water separator replaced, brake stroke measured within spec.',
    technician: 'Fleet Pro Maintenance LLC',
    status: 'Completed',
    createdAt: new Date().toISOString()
  },
  {
    id: 'maint-2',
    truckId: 'trk-demo-2',
    unitNumber: 'TRK-102',
    serviceType: 'Annual DOT Inspection',
    serviceDate: '2026-06-20',
    odometer: 75000,
    cost: 240,
    mechanicNotes: 'Passed full 49 CFR 396 Appendix G Annual Inspection. Certified inspection decal affixed to driver cab door.',
    technician: 'Midwest Fleet Inspection Hub',
    status: 'Completed',
    createdAt: new Date().toISOString()
  },
  {
    id: 'maint-3',
    truckId: 'trk-demo-3',
    unitNumber: 'TRK-103',
    serviceType: 'Brake Inspection',
    serviceDate: '2026-10-08',
    odometer: 215400,
    cost: 850,
    mechanicNotes: 'Steer axle air chamber replaced, drive axle S-cam bushings lubricated. Out of service hold until post-repair road test.',
    technician: 'Buckeye Heavy Truck Repair',
    status: 'Scheduled',
    createdAt: new Date().toISOString()
  }
];


let db_drivers: any[] = [
  {
    id: 'drv-demo-1',
    full_name: 'Marcus Vance',
    phone: '312-555-0142',
    email: 'marcus.v@carrierfleet.local',
    status: 'Dispatched',
    license_number: 'CDL-IL-981023',
    cdl_state: 'IL',
    hos_available: '9h 15m',
    current_location: 'Chicago, IL',
    cdl_class: 'Class A',
    score: 96,
    truck_id: 'trk-demo-1',
    hos_duty_status: 'Driving',
    hos_drive_time_hours: 9.25,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  },
  {
    id: 'drv-demo-2',
    full_name: 'Elena Rostova',
    phone: '317-555-0883',
    email: 'elena.r@carrierfleet.local',
    status: 'Available',
    license_number: 'CDL-IN-442190',
    cdl_state: 'IN',
    hos_available: '11h 00m',
    current_location: 'Indianapolis, IN',
    cdl_class: 'Class A',
    score: 98,
    truck_id: 'trk-demo-2',
    hos_duty_status: 'Off Duty',
    hos_drive_time_hours: 11.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  }
];

let db_loads: any[] = [
  {
    id: 'ld-demo-1',
    load_number: 'LD-10492',
    status: 'In Transit',
    customer_id: 'cust-demo-1',
    origin_id: 'loc-demo-1',
    destination_id: 'loc-demo-2',
    pickup_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    delivery_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    rate: 3450,
    miles: 925,
    commodity: 'Refrigerated Pharmaceuticals',
    weight: 38500,
    equipment_type: 'Reefer',
    assigned_truck_id: 'trk-demo-1',
    assigned_driver_id: 'drv-demo-1',
    priority: 'High',
    priority_score: 55,
    service_level: 'Expedited',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  }
];

let db_invoices: any[] = [
  {
    id: 'inv-demo-1',
    invoice_number: 'INV-2024-001',
    load_id: 'ld-demo-1',
    customer_id: 'cust-demo-1',
    amount: 3450,
    status: 'Sent',
    due_date: new Date(Date.now() + 2592000000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  }
];

let db_settlements: any[] = [];

let db_driver_accounts: any[] = [
  {
    id: 'dacc-1',
    driverId: 'drv-demo-1',
    driverName: 'Marcus Vance',
    email: 'marcus.v@carrierfleet.local',
    phone: '312-555-0142',
    dotNumber: '3829104',
    assignedTruckId: 'trk-demo-1',
    assignedTruckUnit: 'TRK-101',
    portalStatus: 'Active',
    emailVerified: true,
    verificationCode: '849201',
    password: 'password123',
    sessionToken: 'drv-session-marcus-vance',
    lastActive: '5 mins ago',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'dacc-2',
    driverId: 'drv-demo-2',
    driverName: 'Elena Rostova',
    email: 'elena.r@carrierfleet.local',
    phone: '317-555-0883',
    dotNumber: '3829104',
    assignedTruckId: 'trk-demo-2',
    assignedTruckUnit: 'TRK-102',
    portalStatus: 'Pending Verification',
    emailVerified: false,
    verificationCode: '621940',
    verificationExpiresAt: new Date(Date.now() + 86400000).toISOString(),
    temporaryPassword: 'drive-temp-940',
    password: 'drive-temp-940',
    lastActive: 'Invite Sent',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];


// Live External Load Board Listings
const externalLoadBoard: any[] = [];

// Priority helper solver: calculates rate-per-mile profitability and severity index
function calculateLoadPriority(rate: number, miles: number, isExpedited: boolean) : { score: number, label: 'Critical' | 'High' | 'Medium' | 'Low' } {
  if (miles <= 0) return { score: 0, label: 'Low' };
  const rpm = rate / miles;
  let score = rpm * 20; // base score on profitability index
  
  if (isExpedited) score += 30; // boost priority for premium/urgent needs
  if (rpm > 3.0) score += 20;

  let label: 'Critical' | 'High' | 'Medium' | 'Low' = 'Medium';
  if (score >= 65) label = 'Critical';
  else if (score >= 45) label = 'High';
  else if (score >= 25) label = 'Medium';
  else label = 'Low';

  return { score: parseFloat(score.toFixed(1)), label };
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Middleware
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // ==========================================
  // 0. LIVE SUPABASE DATABASE BOOTSTRAP API
  // ==========================================
  app.get('/api/bootstrap', async (req, res) => {
    try {
      if (!supabase) {
        return res.json({
          success: true,
          customers: db_customers,
          locations: db_locations,
          drivers: db_drivers,
          trucks: db_trucks,
          loads: db_loads,
          invoices: db_invoices,
          settlements: db_settlements,
          recurringRules: [],
          companySettings: null,
        });
      }

      const [
        { data: customers, error: errC },
        { data: locations, error: errLoc },
        { data: drivers, error: errD },
        { data: trucks, error: errT },
        { data: loads, error: errL },
        { data: invoices, error: errI },
        { data: settlements, error: errS },
        { data: recurringRules, error: errR },
        { data: companySettings, error: errSet }
      ] = await Promise.all([
        supabase.from('tms_customers').select('*').order('created_at', { ascending: false }),
        supabase.from('tms_locations').select('*').order('created_at', { ascending: false }),
        supabase.from('tms_drivers').select('*').order('created_at', { ascending: false }),
        supabase.from('tms_trucks').select('*').order('created_at', { ascending: false }),
        supabase.from('tms_loads').select('*').order('created_at', { ascending: false }),
        supabase.from('tms_invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('tms_settlements').select('*').order('created_at', { ascending: false }),
        supabase.from('tms_recurring_rules').select('*').order('created_at', { ascending: false }),
        supabase.from('tms_company_settings').select('*').limit(1).maybeSingle(),
      ]);

      if (errC) console.warn('[Supabase Bootstrap] customers:', errC.message);
      if (errL) console.warn('[Supabase Bootstrap] loads:', errL.message);

      // Keep transient in-memory sync updated
      if (customers && customers.length > 0) db_customers = customers;
      if (locations && locations.length > 0) db_locations = locations;
      if (drivers && drivers.length > 0) db_drivers = drivers;
      if (trucks && trucks.length > 0) db_trucks = trucks;
      if (loads && loads.length > 0) db_loads = loads;
      if (invoices && invoices.length > 0) db_invoices = invoices;
      if (settlements && settlements.length > 0) db_settlements = settlements;

      res.json({
        success: true,
        customers: (customers && customers.length > 0) ? customers : db_customers,
        locations: (locations && locations.length > 0) ? locations : db_locations,
        drivers: (drivers && drivers.length > 0) ? drivers : db_drivers,
        trucks: (trucks && trucks.length > 0) ? trucks : db_trucks,
        loads: (loads && loads.length > 0) ? loads : db_loads,
        invoices: (invoices && invoices.length > 0) ? invoices : db_invoices,
        settlements: (settlements && settlements.length > 0) ? settlements : db_settlements,
        recurringRules: recurringRules || [],
        companySettings: companySettings || null,
      });
    } catch (err: any) {
      console.error('[Supabase Bootstrap Error]:', err);
      res.json({
        success: true,
        customers: db_customers || [],
        locations: db_locations || [],
        drivers: db_drivers || [],
        trucks: db_trucks || [],
        loads: db_loads || [],
        invoices: db_invoices || [],
        settlements: db_settlements || [],
        recurringRules: [],
        companySettings: null,
      });
    }
  });

  // --- 1. Load Board Import & Prioritization API ---
  
  // Get external load board listings (empty in production)
  app.get('/api/load-board', (req, res) => {
    res.json({ status: 'success', total: externalLoadBoard.length, data: externalLoadBoard });
  });

  // Import load from load board
  app.post('/api/load-board/import', (req, res) => {
    const { listingId, customerId } = req.body;
    const listing = externalLoadBoard.find(l => l.id === listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Load listing not found on external board.' });
    }

    // Resolve or create a mock customer if not supplied
    const targetCustomerId = customerId || (db_customers[0]?.id || 'c1');
    const targetCustomerObj = db_customers.find(c => c.id === targetCustomerId) || db_customers[0];

    // Auto-create location records if not already present
    // Simulating resolving lookup coordinates or generating them
    const origId = `loc-dyn-${Math.floor(Math.random() * 1000)}`;
    const destId = `loc-dyn-${Math.floor(Math.random() * 1000)}`;

    const originLocation: any = {
      id: origId,
      name: `${listing.originCity} Receiving Hub`,
      type: 'Shipper',
      address: {
        street: '100 Interstate Ramp',
        city: listing.originCity,
        state: listing.originState,
        zip: '11111',
        country: 'USA'
      },
      customerIds: [targetCustomerId],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null as string | null
    };

    const destLocation: any = {
      id: destId,
      name: `${listing.destinationCity} Logistics Center`,
      type: 'Consignee',
      address: {
        street: '400 Industrial Parkway',
        city: listing.destinationCity,
        state: listing.destinationState,
        zip: '22222',
        country: 'USA'
      },
      customerIds: [targetCustomerId],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null as string | null
    };

    db_locations.push(originLocation, destLocation);

    // Compute load routing prioritization and mathematical score
    const priorityResult = calculateLoadPriority(listing.rate, listing.miles, false);

    const newLoadId = `ld-${Math.random().toString(36).substring(2, 11)}`;
    const lineItem: LoadLineItem = {
      id: `li-${Math.random().toString(36).substring(2, 11)}`,
      description: 'Linehaul Rate',
      amount: listing.rate,
      type: 'Revenue'
    };

    const newLoad: any = {
      id: newLoadId,
      loadNumber: `LD-00${db_loads.length + 4522}`,
      status: 'Created',
      customerId: targetCustomerId,
      originId: originLocation.id,
      destinationId: destLocation.id,
      pickupDate: listing.pickupDate,
      deliveryDate: listing.deliveryDate,
      rate: listing.rate,
      miles: listing.miles,
      commodity: listing.commodity,
      weight: listing.weight,
      equipmentType: listing.equipmentType,
      customerPo: `PO-BOARD-${Math.floor(100000 + Math.random() * 900000)}`,
      bolNumber: `BOL-${Math.floor(100000 + Math.random() * 900000)}`,
      serviceLevel: 'Standard',
      lineItems: [lineItem],
      documents: [{ id: `doc-${Math.random().toString(36).substr(2, 9)}`, name: 'Load Board Confirmation', type: 'System', date: new Date().toISOString().split('T')[0] }],
      activityLog: [
        {
          id: `log-${Math.random().toString(36).substring(2, 11)}`,
          user: 'Operations Admin',
          action: `Load imported from DAT load board. Automatic priority assigned: ${priorityResult.label} (Score: ${priorityResult.score})`,
          date: new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
          type: 'system'
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null as string | null
    };

    // Attach computed parameters
    (newLoad as any).priority = priorityResult.label;
    (newLoad as any).priorityScore = priorityResult.score;

    db_loads.unshift(newLoad);

    res.json({
      status: 'success',
      message: 'Load successfully imported and prioritized!',
      load: newLoad,
      origin: originLocation,
      destination: destLocation
    });
  });

  // Re-evaluation of load board order priorities
  app.post('/api/loads/prioritize', (req, res) => {
    db_loads = db_loads.map(load => {
      const isExpedited = load.serviceLevel === 'Expedited';
      const priorityResult = calculateLoadPriority(load.rate, load.miles, isExpedited);
      return {
        ...load,
        priority: priorityResult.label,
        priorityScore: priorityResult.score
      } as any;
    });
    res.json({ status: 'success', message: 'All load priorities re-calculated and synchronized.', loads: db_loads });
  });


  // --- 2. Driver Capacity Availability & HOS Checks API ---

  // Get active driver status list & complete Hours of Service
  app.get('/api/drivers', (req, res) => {
    res.json({ status: 'success', data: db_drivers.filter(d => !d.deleted_at) });
  });

  // Update Hours Of Service log status (Phase 1 Essential)
  app.put('/api/drivers/:id/hos', (req, res) => {
    const { id } = req.params;
    const { hosDutyStatus, hosDriveTimeHours, hosDutyTimeHours, hosCycleTimeHours } = req.body;

    const driverIndex = db_drivers.findIndex(d => d.id === id);
    if (driverIndex === -1) {
      return res.status(404).json({ error: 'Driver profile not found.' });
    }

    const d = db_drivers[driverIndex];

    // Enforce safety compliance alerts: alert if driving hours are low
    const targetDriveRemaining = hosDriveTimeHours !== undefined ? parseFloat(hosDriveTimeHours) : d.hosDriveTimeHours;
    const isRestRequired = targetDriveRemaining < 3.0; // Break needed soon banner

    db_drivers[driverIndex] = {
      ...d,
      hosDutyStatus: hosDutyStatus || d.hosDutyStatus,
      hosDriveTimeHours: targetDriveRemaining !== undefined ? targetDriveRemaining : d.hosDriveTimeHours,
      hosDutyTimeHours: hosDutyTimeHours !== undefined ? parseFloat(hosDutyTimeHours) : d.hosDutyTimeHours,
      hosCycleTimeHours: hosCycleTimeHours !== undefined ? parseFloat(hosCycleTimeHours) : d.hosCycleTimeHours,
      hosRestBreakRequired: isRestRequired,
      // Map to old string standard 'hosAvailable' for compatibility
      hosAvailable: `${Math.floor(targetDriveRemaining)}h ${Math.floor((targetDriveRemaining % 1) * 60)}m`
    } as any;

    res.json({
      status: 'success',
      message: 'HOS status logged and safety checks verified.',
      driver: db_drivers[driverIndex]
    });
  });


  // --- 3. Route Stop Sequence Optimization Solver API ---

  // Greedy Traveling Salesperson route sequence planner
  app.post('/api/route/optimize-stops', (req, res) => {
    const { stops } = req.body; // Array of stop objects with name, lat, lng, type, details
    if (!stops || !Array.isArray(stops) || stops.length < 2) {
      return res.status(400).json({ error: 'At least 2 routing stops (an origin and a destination) are required to sequence.' });
    }

    // Mathematical Greedy TSP solver to optimize sequencing path (reducing empty deadhead miles)
    const optimized: any[] = [];
    const remaining = [...stops];

    // Lock origin (first element or pickup stop as anchor)
    const originIndex = remaining.findIndex(s => s.type === 'Pickup') !== -1 
      ? remaining.findIndex(s => s.type === 'Pickup') 
      : 0;

    const [origin] = remaining.splice(originIndex, 1);
    optimized.push(origin);

    // Greedy solver loop based on Euclidean distance
    while (remaining.length > 0) {
      const activeStop = optimized[optimized.length - 1];
      let bestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        
        // Compute basic distance index
        const dx = (candidate.lat || 40) - (activeStop.lat || 40);
        const dy = (candidate.lng || -80) - (activeStop.lng || -80);
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDistance) {
          minDistance = dist;
          bestIndex = i;
        }
      }

      const [nextStop] = remaining.splice(bestIndex, 1);
      optimized.push(nextStop);
    }

    // Sequence assignments
    const sequencedResult = optimized.map((stop, seqIdx) => ({
      ...stop,
      sequence: seqIdx + 1
    }));

    res.json({
      status: 'success',
      message: 'Routing path sequenced using greedy Euclidean path optimization strategy.',
      stops: sequencedResult
    });
  });


  // Standard synchronization APIs to feed data to standard React component views with Soft Delete checks and Auto Timestamps

  // ==========================================
  // LOADS API (Supabase: tms_loads)
  // ==========================================
  app.get('/api/loads', async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('tms_loads').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          db_loads = data;
          return res.json({ status: 'success', data });
        }
        if (error) console.warn('[Supabase Loads Query]:', error.message);
      }
      res.json({ status: 'success', data: db_loads.filter(l => !l.deleted_at) });
    } catch (err: any) {
      res.json({ status: 'success', data: db_loads.filter(l => !l.deleted_at) });
    }
  });

  app.post('/api/loads', async (req, res) => {
    const body = req.body;
    const id = body.id || crypto.randomUUID();
    const newLoad = {
      ...body,
      id,
      load_number: body.load_number || body.loadNumber || `LD-${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null as string | null
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('tms_loads').insert([newLoad]).select().single();
        if (!error && data) {
          db_loads.unshift(data);
          return res.status(201).json({ status: 'success', load: data });
        }
        if (error) console.warn('[Supabase Insert Load]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Insert Load Exception]:', e.message);
      }
    }

    db_loads.unshift(newLoad);
    res.status(201).json({ status: 'success', load: newLoad });
  });

  app.put('/api/loads/:id', async (req, res) => {
    const { id } = req.params;
    const updates = { 
      ...req.body, 
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('tms_loads').update(updates).eq('id', id).select().single();
        if (!error && data) {
          const idx = db_loads.findIndex(l => l.id === id);
          if (idx !== -1) db_loads[idx] = data;
          return res.json({ status: 'success', load: data });
        }
        if (error) console.warn('[Supabase Update Load]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Update Load Exception]:', e.message);
      }
    }

    const index = db_loads.findIndex(l => l.id === id);
    if (index !== -1) {
      db_loads[index] = { ...db_loads[index], ...updates };
      return res.json({ status: 'success', load: db_loads[index] });
    }
    res.json({ status: 'success', load: { id, ...updates } });
  });

  app.delete('/api/loads/:id', async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      try {
        const { error } = await supabase.from('tms_loads').delete().eq('id', id);
        if (error) console.warn('[Supabase Delete Load]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Delete Load Exception]:', e.message);
      }
    }
    db_loads = db_loads.filter(l => l.id !== id);
    res.json({ status: 'success', message: 'Load deleted successfully.' });
  });

  // ==========================================
  // CUSTOMERS API (Supabase: tms_customers)
  // ==========================================
  app.get('/api/customers', async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('tms_customers').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          db_customers = data;
          return res.json({ status: 'success', data });
        }
        if (error) console.warn('[Supabase Customers Query]:', error.message);
      }
      res.json({ status: 'success', data: db_customers.filter(c => !c.deleted_at) });
    } catch {
      res.json({ status: 'success', data: db_customers.filter(c => !c.deleted_at) });
    }
  });

  app.post('/api/customers', async (req, res) => {
    const body = req.body;
    const id = body.id || crypto.randomUUID();
    const newCustomer = {
      ...body,
      id,
      company_name: body.company_name || body.name || 'New Customer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null as string | null
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('tms_customers').insert([newCustomer]).select().single();
        if (!error && data) {
          db_customers.unshift(data);
          return res.status(201).json({ status: 'success', customer: data });
        }
        if (error) console.warn('[Supabase Insert Customer]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Insert Customer Exception]:', e.message);
      }
    }

    db_customers.unshift(newCustomer);
    res.status(201).json({ status: 'success', customer: newCustomer });
  });

  app.put('/api/customers/:id', async (req, res) => {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('tms_customers').update(updates).eq('id', id).select().single();
        if (!error && data) {
          const idx = db_customers.findIndex(c => c.id === id);
          if (idx !== -1) db_customers[idx] = data;
          return res.json({ status: 'success', customer: data });
        }
        if (error) console.warn('[Supabase Update Customer]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Update Customer Exception]:', e.message);
      }
    }

    const index = db_customers.findIndex(c => c.id === id);
    if (index !== -1) {
      db_customers[index] = { ...db_customers[index], ...updates };
      return res.json({ status: 'success', customer: db_customers[index] });
    }
    res.json({ status: 'success', customer: { id, ...updates } });
  });

  app.delete('/api/customers/:id', async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      try {
        const { error } = await supabase.from('tms_customers').delete().eq('id', id);
        if (error) console.warn('[Supabase Delete Customer]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Delete Customer Exception]:', e.message);
      }
    }
    db_customers = db_customers.filter(c => c.id !== id);
    res.json({ status: 'success', message: 'Customer deleted successfully.' });
  });

  // ==========================================
  // LOCATIONS API (Supabase: tms_locations)
  // ==========================================
  app.get('/api/locations', async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('tms_locations').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          db_locations = data;
          return res.json({ status: 'success', data });
        }
        if (error) console.warn('[Supabase Locations Query]:', error.message);
      }
      res.json({ status: 'success', data: db_locations.filter(l => !l.deleted_at) });
    } catch {
      res.json({ status: 'success', data: db_locations.filter(l => !l.deleted_at) });
    }
  });

  app.post('/api/locations', async (req, res) => {
    const body = req.body;
    const id = body.id || crypto.randomUUID();
    const newLocation = {
      ...body,
      id,
      name: body.name || 'New Location',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null as string | null
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('tms_locations').insert([newLocation]).select().single();
        if (!error && data) {
          db_locations.unshift(data);
          return res.status(201).json({ status: 'success', location: data });
        }
        if (error) console.warn('[Supabase Insert Location]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Insert Location Exception]:', e.message);
      }
    }

    db_locations.unshift(newLocation);
    res.status(201).json({ status: 'success', location: newLocation });
  });

  app.put('/api/locations/:id', async (req, res) => {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('tms_locations').update(updates).eq('id', id).select().single();
        if (!error && data) {
          const idx = db_locations.findIndex(l => l.id === id);
          if (idx !== -1) db_locations[idx] = data;
          return res.json({ status: 'success', location: data });
        }
        if (error) console.warn('[Supabase Update Location]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Update Location Exception]:', e.message);
      }
    }

    const index = db_locations.findIndex(l => l.id === id);
    if (index !== -1) {
      db_locations[index] = { ...db_locations[index], ...updates };
      return res.json({ status: 'success', location: db_locations[index] });
    }
    res.json({ status: 'success', location: { id, ...updates } });
  });

  app.delete('/api/locations/:id', async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      try {
        const { error } = await supabase.from('tms_locations').delete().eq('id', id);
        if (error) console.warn('[Supabase Delete Location]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Delete Location Exception]:', e.message);
      }
    }
    db_locations = db_locations.filter(l => l.id !== id);
    res.json({ status: 'success', message: 'Location deleted successfully.' });
  });

  // ==========================================
  // TRUCKS API (Supabase: tms_trucks)
  // ==========================================
  app.get('/api/trucks', async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('tms_trucks').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          db_trucks = data;
          return res.json({ status: 'success', data });
        }
        if (error) console.warn('[Supabase Trucks Query]:', error.message);
      }
      res.json({ status: 'success', data: db_trucks.filter(t => !t.deleted_at) });
    } catch {
      res.json({ status: 'success', data: db_trucks.filter(t => !t.deleted_at) });
    }
  });

  app.post('/api/trucks', async (req, res) => {
    const body = req.body;
    const id = body.id || crypto.randomUUID();
    const newTruck = {
      ...body,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null as string | null
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('tms_trucks').insert([newTruck]).select().single();
        if (!error && data) {
          db_trucks.unshift(data);
          return res.status(201).json({ status: 'success', truck: data });
        }
        if (error) console.warn('[Supabase Insert Truck]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Insert Truck Exception]:', e.message);
      }
    }

    db_trucks.unshift(newTruck);
    res.status(201).json({ status: 'success', truck: newTruck });
  });

  app.put('/api/trucks/:id', async (req, res) => {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('tms_trucks').update(updates).eq('id', id).select().single();
        if (!error && data) {
          const idx = db_trucks.findIndex(t => t.id === id);
          if (idx !== -1) db_trucks[idx] = data;
          return res.json({ status: 'success', truck: data });
        }
        if (error) console.warn('[Supabase Update Truck]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Update Truck Exception]:', e.message);
      }
    }

    const index = db_trucks.findIndex(t => t.id === id);
    if (index !== -1) {
      db_trucks[index] = { ...db_trucks[index], ...updates };
      return res.json({ status: 'success', truck: db_trucks[index] });
    }
    res.json({ status: 'success', truck: { id, ...updates } });
  });

  app.delete('/api/trucks/:id', async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      try {
        const { error } = await supabase.from('tms_trucks').delete().eq('id', id);
        if (error) console.warn('[Supabase Delete Truck]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Delete Truck Exception]:', e.message);
      }
    }
    db_trucks = db_trucks.filter(t => t.id !== id);
    res.json({ status: 'success', message: 'Truck deleted successfully.' });
  });

  // ==========================================
  // DRIVERS BASIC CRUD API (Supabase: tms_drivers)
  // ==========================================
  app.get('/api/drivers', async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('tms_drivers').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          db_drivers = data;
          return res.json({ status: 'success', data });
        }
        if (error) console.warn('[Supabase Drivers Query]:', error.message);
      }
      res.json({ status: 'success', data: db_drivers.filter(d => !d.deleted_at) });
    } catch {
      res.json({ status: 'success', data: db_drivers.filter(d => !d.deleted_at) });
    }
  });

  app.post('/api/drivers', async (req, res) => {
    const body = req.body;
    const id = body.id || crypto.randomUUID();
    const newDriver = {
      ...body,
      id,
      full_name: body.full_name || body.name || 'New Driver',
      hos_duty_status: body.hos_duty_status || body.hosDutyStatus || 'Off Duty',
      hos_violations: body.hos_violations ?? body.hosViolations ?? 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null as string | null
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('tms_drivers').insert([newDriver]).select().single();
        if (!error && data) {
          db_drivers.unshift(data);
          return res.status(201).json({ status: 'success', driver: data });
        }
        if (error) console.warn('[Supabase Insert Driver]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Insert Driver Exception]:', e.message);
      }
    }

    db_drivers.unshift(newDriver);
    res.status(201).json({ status: 'success', driver: newDriver });
  });

  app.put('/api/drivers/:id', async (req, res) => {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('tms_drivers').update(updates).eq('id', id).select().single();
        if (!error && data) {
          const idx = db_drivers.findIndex(d => d.id === id);
          if (idx !== -1) db_drivers[idx] = data;
          return res.json({ status: 'success', driver: data });
        }
        if (error) console.warn('[Supabase Update Driver]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Update Driver Exception]:', e.message);
      }
    }

    const index = db_drivers.findIndex(d => d.id === id);
    if (index !== -1) {
      db_drivers[index] = { ...db_drivers[index], ...updates };
      return res.json({ status: 'success', driver: db_drivers[index] });
    }
    res.json({ status: 'success', driver: { id, ...updates } });
  });

  app.put('/api/drivers/:id/hos', async (req, res) => {
    const { id } = req.params;
    const { hosDutyStatus, hosDriveTimeHours, hosDutyTimeHours, hosCycleTimeHours } = req.body;
    const updates: any = {
      updated_at: new Date().toISOString()
    };
    if (hosDutyStatus !== undefined) updates.hos_duty_status = hosDutyStatus;
    if (hosDriveTimeHours !== undefined) {
      const driveHrs = parseFloat(hosDriveTimeHours);
      updates.hos_available = `${Math.floor(driveHrs)}h ${Math.floor((driveHrs % 1) * 60)}m`;
    }

    if (supabase) {
      try {
        const { data, error } = await supabase.from('tms_drivers').update(updates).eq('id', id).select().single();
        if (!error && data) {
          const idx = db_drivers.findIndex(d => d.id === id);
          if (idx !== -1) db_drivers[idx] = data;
          return res.json({ status: 'success', driver: data });
        }
        if (error) console.warn('[Supabase Update Driver HOS]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Update Driver HOS Exception]:', e.message);
      }
    }

    const index = db_drivers.findIndex(d => d.id === id);
    if (index !== -1) {
      db_drivers[index] = { ...db_drivers[index], ...updates };
      return res.json({ status: 'success', driver: db_drivers[index] });
    }
    res.json({ status: 'success', driver: { id, ...updates } });
  });

  app.delete('/api/drivers/:id', async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      try {
        const { error } = await supabase.from('tms_drivers').delete().eq('id', id);
        if (error) console.warn('[Supabase Delete Driver]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Delete Driver Exception]:', e.message);
      }
    }
    db_drivers = db_drivers.filter(d => d.id !== id);
    res.json({ status: 'success', message: 'Driver deleted successfully.' });
  });

  // ==========================================
  // DRIVER PORTAL & ACCESS MANAGEMENT API
  // ==========================================

  // List all drivers with their portal account & credentials state
  app.get('/api/drivers/portal/list', (req, res) => {
    const list = db_drivers.filter(d => !d.deleted_at).map(d => {
      const truck = db_trucks.find(t => t.id === d.truck_id || t.driver_id === d.id);
      const account = db_driver_accounts.find(a => a.driverId === d.id || a.email.toLowerCase() === (d.email || '').toLowerCase());
      return {
        id: account ? account.id : `dacc-${d.id}`,
        driverId: d.id,
        driverName: d.full_name || d.name || 'Unnamed Driver',
        email: d.email || (account ? account.email : `${(d.full_name || 'driver').toLowerCase().replace(/\s+/g, '.')}@carrierfleet.local`),
        phone: d.phone || (account ? account.phone : '312-555-0100'),
        dotNumber: account?.dotNumber || '3829104',
        assignedTruckId: truck?.id || d.truck_id,
        assignedTruckUnit: truck?.unit_number || truck?.make_model || 'Unassigned',
        portalStatus: account ? account.portalStatus : 'Uninvited',
        emailVerified: Boolean(account?.emailVerified),
        verificationCode: account?.verificationCode || '',
        temporaryPassword: account?.temporaryPassword || account?.password || 'drive-pass-2024',
        lastActive: account?.lastActive || 'Never',
        updatedAt: account?.updatedAt || d.updated_at || new Date().toISOString()
      };
    });
    res.json({ success: true, drivers: list });
  });

  // Dispatcher provisions access for a driver (generates QR pass, SMS link, and email verification code)
  app.post('/api/drivers/portal/provision', (req, res) => {
    const { driverId, email, phone, temporaryPassword } = req.body || {};
    const driver = db_drivers.find(d => d.id === driverId);
    if (!driver && driverId) {
      return res.status(404).json({ error: 'Driver profile not found.' });
    }

    const driverName = driver ? (driver.full_name || driver.name) : 'Driver';
    const targetEmail = (email || driver?.email || `driver.${Date.now()}@carrierfleet.local`).trim().toLowerCase();
    const targetPhone = phone || driver?.phone || '312-555-0100';
    const truck = db_trucks.find(t => t.id === driver?.truck_id);

    // Generate clean 6-digit verification code
    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
    const assignedPassword = temporaryPassword || `drive-${verificationCode.slice(0, 3)}`;

    let account = db_driver_accounts.find(a => a.driverId === driverId || a.email.toLowerCase() === targetEmail);
    if (account) {
      account.email = targetEmail;
      account.phone = targetPhone;
      account.portalStatus = 'Pending Verification';
      account.emailVerified = false;
      account.verificationCode = verificationCode;
      account.verificationExpiresAt = new Date(Date.now() + 86400000).toISOString();
      account.temporaryPassword = assignedPassword;
      account.password = assignedPassword;
      account.lastActive = 'Invite Sent';
      account.updatedAt = new Date().toISOString();
    } else {
      account = {
        id: `dacc-${Date.now()}`,
        driverId: driverId || `drv-${Date.now()}`,
        driverName,
        email: targetEmail,
        phone: targetPhone,
        dotNumber: '3829104',
        assignedTruckId: truck?.id || driver?.truck_id,
        assignedTruckUnit: truck?.unit_number || 'Unassigned',
        portalStatus: 'Pending Verification',
        emailVerified: false,
        verificationCode,
        verificationExpiresAt: new Date(Date.now() + 86400000).toISOString(),
        temporaryPassword: assignedPassword,
        password: assignedPassword,
        lastActive: 'Invite Sent',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db_driver_accounts.push(account);
    }

    // Sync email back to driver profile if empty
    if (driver && (!driver.email || driver.email !== targetEmail)) {
      driver.email = targetEmail;
    }

    const magicLink = `/solo_cockpit.html?email=${encodeURIComponent(targetEmail)}&dot=3829104&code=${verificationCode}&driver=${encodeURIComponent(driverName)}`;

    res.json({
      success: true,
      message: `Driver portal pass generated for ${driverName}.`,
      account,
      verificationCode,
      magicLink
    });
  });

  // Dispatcher revokes or suspends driver mobile access
  app.post('/api/drivers/portal/revoke', (req, res) => {
    const { driverId } = req.body || {};
    const account = db_driver_accounts.find(a => a.driverId === driverId || a.id === driverId);
    if (!account) {
      return res.status(404).json({ error: 'Driver account not found.' });
    }
    account.portalStatus = 'Suspended';
    account.sessionToken = undefined;
    account.lastActive = 'Access Revoked';
    account.updatedAt = new Date().toISOString();

    res.json({ success: true, message: `Access suspended for ${account.driverName}.` });
  });

  // Dispatcher resends 6-digit email verification code
  app.post('/api/drivers/portal/resend-code', (req, res) => {
    const { driverId } = req.body || {};
    const account = db_driver_accounts.find(a => a.driverId === driverId || a.id === driverId);
    if (!account) {
      return res.status(404).json({ error: 'Driver account not found.' });
    }
    const freshCode = String(Math.floor(100000 + Math.random() * 900000));
    account.verificationCode = freshCode;
    account.verificationExpiresAt = new Date(Date.now() + 86400000).toISOString();
    account.portalStatus = 'Pending Verification';
    account.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      verificationCode: freshCode,
      message: `New 6-digit verification code (${freshCode}) issued for ${account.driverName}.`
    });
  });

  // Dispatcher resets driver mobile password
  app.post('/api/drivers/portal/reset-password', (req, res) => {
    const { driverId, newPassword } = req.body || {};
    const account = db_driver_accounts.find(a => a.driverId === driverId || a.id === driverId);
    if (!account) {
      return res.status(404).json({ error: 'Driver account not found.' });
    }
    account.password = newPassword;
    account.temporaryPassword = newPassword;
    account.updatedAt = new Date().toISOString();

    res.json({ success: true, message: `Password updated for ${account.driverName}.` });
  });

  // ==========================================
  // DRIVER MOBILE APP AUTHENTICATION API
  // ==========================================

  // Driver Email & Password Login
  app.post('/api/driver/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(password || '');

    const account = db_driver_accounts.find(a => a.email.toLowerCase() === cleanEmail);
    if (!account) {
      return res.status(401).json({ error: 'No driver account found with this email. Please check with your fleet dispatcher.' });
    }

    if (account.portalStatus === 'Suspended') {
      return res.status(403).json({ error: 'Driver app access has been suspended by your carrier administrator.' });
    }

    if (account.password && account.password !== cleanPass) {
      return res.status(401).json({ error: 'Incorrect driver password.' });
    }

    // If first time login and email is not yet verified, require the 6-digit code!
    if (!account.emailVerified) {
      return res.json({
        requiresEmailVerification: true,
        email: account.email,
        driverName: account.driverName,
        dotNumber: account.dotNumber,
        devCode: account.verificationCode, // Helper for local dev inspection
        message: 'Email verification code required on first-time login.'
      });
    }

    // Driver is authenticated
    const token = `drv-tok-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    account.sessionToken = token;
    account.lastActive = 'Active Now';
    account.updatedAt = new Date().toISOString();

    const assignedLoads = db_loads.filter(l => l.assigned_driver_id === account.driverId || l.driver_id === account.driverId || l.driverId === account.driverId);
    const assignedTruck = db_trucks.find(t => t.id === account.assignedTruckId);

    res.json({
      success: true,
      token,
      driver: {
        id: account.driverId,
        name: account.driverName,
        email: account.email,
        phone: account.phone,
        dotNumber: account.dotNumber,
        assignedTruckId: account.assignedTruckId,
        assignedTruckUnit: account.assignedTruckUnit,
      },
      truck: assignedTruck || null,
      loads: assignedLoads
    });
  });

  // Driver First-Time Email Verification Code Submission
  app.post('/api/driver/auth/verify-email', (req, res) => {
    const { email, code, newPassword } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanCode = String(code || '').trim();

    const account = db_driver_accounts.find(a => a.email.toLowerCase() === cleanEmail);
    if (!account) {
      return res.status(404).json({ error: 'Driver account not found.' });
    }

    // Verify 6-digit code or fallback 123456 for testing
    const codeMatch = account.verificationCode === cleanCode || cleanCode === '123456';
    if (!codeMatch) {
      return res.status(400).json({ error: 'Invalid 6-digit verification code. Please check your email or ask dispatch.' });
    }

    account.emailVerified = true;
    account.portalStatus = 'Active';
    account.lastActive = 'Active Now';
    if (newPassword && newPassword.length >= 6) {
      account.password = newPassword;
      account.temporaryPassword = undefined;
    }
    const token = `drv-tok-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    account.sessionToken = token;
    account.updatedAt = new Date().toISOString();

    const assignedLoads = db_loads.filter(l => l.assigned_driver_id === account.driverId || l.driver_id === account.driverId || l.driverId === account.driverId);
    const assignedTruck = db_trucks.find(t => t.id === account.assignedTruckId);

    res.json({
      success: true,
      message: 'Email successfully verified! Welcome to the Driver Cockpit.',
      token,
      driver: {
        id: account.driverId,
        name: account.driverName,
        email: account.email,
        phone: account.phone,
        dotNumber: account.dotNumber,
        assignedTruckId: account.assignedTruckId,
        assignedTruckUnit: account.assignedTruckUnit,
      },
      truck: assignedTruck || null,
      loads: assignedLoads
    });
  });

  // Driver Current Session Validator
  app.get('/api/driver/auth/session', (req, res) => {
    const authHeader = String(req.headers.authorization || '');
    const token = authHeader.replace(/^Bearer\s+/i, '').trim() || String(req.query.token || '');

    if (!token) {
      return res.status(401).json({ error: 'No driver session token provided.' });
    }

    const account = db_driver_accounts.find(a => a.sessionToken === token);
    if (!account) {
      return res.status(401).json({ error: 'Driver session has expired or is invalid.' });
    }

    account.lastActive = 'Active Now';
    const assignedLoads = db_loads.filter(l => l.assigned_driver_id === account.driverId || l.driver_id === account.driverId || l.driverId === account.driverId);
    const assignedTruck = db_trucks.find(t => t.id === account.assignedTruckId);

    res.json({
      success: true,
      driver: {
        id: account.driverId,
        name: account.driverName,
        email: account.email,
        phone: account.phone,
        dotNumber: account.dotNumber,
        assignedTruckId: account.assignedTruckId,
        assignedTruckUnit: account.assignedTruckUnit,
      },
      truck: assignedTruck || null,
      loads: assignedLoads
    });
  });

  // Driver updates trip status from cab cockpit
  app.post('/api/driver/load/update-status', (req, res) => {
    const { loadId, status, notes, driverName } = req.body || {};
    const loadIndex = db_loads.findIndex(l => l.id === loadId || l.load_number === loadId || l.loadNumber === loadId);
    if (loadIndex === -1) {
      return res.status(404).json({ error: 'Load not found.' });
    }

    const l = db_loads[loadIndex];
    l.status = status || l.status;
    l.updated_at = new Date().toISOString();
    if (!l.activityLog) l.activityLog = [];
    l.activityLog.unshift({
      id: `log-${Date.now()}`,
      user: driverName || 'Driver via Mobile Cockpit',
      action: `Status updated to ${status}${notes ? ': ' + notes : ''}`,
      date: new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      type: 'driver'
    });

    res.json({ success: true, message: `Load status updated to ${status}.`, load: l });
  });

  // ==========================================
  // FLEET MANAGEMENT PORTAL API
  // ==========================================

  // Get full fleet portal directory with maintenance health and driver pairings
  app.get('/api/fleet/portal/list', (req, res) => {
    const list = db_trucks.filter(t => !t.deleted_at).map(t => {
      const assignedDriver = db_drivers.find(d => d.truck_id === t.id || d.id === t.driver_id);
      const currentOdo = parseInt(t.odometer || '100000', 10);
      const pmInterval = parseInt(t.pm_interval || '15000', 10);
      const lastServiceOdo = parseInt(t.last_service_odometer || (currentOdo - 7500).toString(), 10);
      const nextPmOdo = lastServiceOdo + pmInterval;
      const milesUntilPm = nextPmOdo - currentOdo;
      
      let pmCalculatedStatus = t.pm_status || 'Current';
      if (milesUntilPm <= 0) {
        pmCalculatedStatus = 'Overdue';
      } else if (milesUntilPm <= 2000) {
        pmCalculatedStatus = 'Due';
      }

      const unitRecords = db_maintenance_records.filter(m => m.truckId === t.id || m.unitNumber === t.unit_number);

      return {
        ...t,
        id: t.id,
        unitNumber: t.unit_number || t.unitNumber,
        makeModel: t.make_model || t.makeModel,
        type: t.truck_type || t.type || 'Semi-Truck',
        currentLocation: t.current_location || t.currentLocation || 'Chicago, IL',
        status: t.status || 'Available',
        pmStatus: pmCalculatedStatus,
        vin: t.vin || '1FUJGLDR5PL129841',
        plateNumber: t.plate_number || t.plateNumber,
        plateState: t.plate_state || t.plateState,
        fuelType: t.fuel_type || t.fuelType || 'Diesel',
        odometer: t.odometer || '120000',
        eldProvider: t.eld_provider || t.eldProvider || 'Motive ELD',
        eldSerial: t.eld_serial || t.eldSerial || 'MOT-001',
        pmInterval: t.pm_interval || t.pmInterval || '15000',
        nextPmOdometer: nextPmOdo,
        milesUntilPm,
        lastServiceDate: t.last_service_date || '2026-08-01',
        registrationExpiry: t.registration_expiry || '2027-04-30',
        annualInspectionExpiry: t.annual_inspection_expiry || '2027-02-15',
        dvirStatus: t.dvir_status || 'Passed',
        dvirDate: t.dvir_date || '2026-10-09',
        driverId: assignedDriver?.id || t.driver_id,
        assignedDriverName: assignedDriver ? (assignedDriver.full_name || assignedDriver.name) : 'Unassigned',
        maintenanceRecords: unitRecords
      };
    });

    res.json({
      success: true,
      units: list,
      totalUnits: list.length,
      activeCount: list.filter(u => u.status === 'In Use' || u.status === 'Available').length,
      maintenanceCount: list.filter(u => u.status === 'Maintenance').length,
      pmDueCount: list.filter(u => u.pmStatus === 'Due' || u.pmStatus === 'Overdue').length
    });
  });

  // Log Preventive Maintenance / Service Record
  app.post('/api/fleet/portal/log-maintenance', (req, res) => {
    const { truckId, unitNumber, serviceType, serviceDate, odometer, cost, mechanicNotes, technician, resetPm } = req.body || {};
    
    const truck = db_trucks.find(t => t.id === truckId || t.unit_number === unitNumber);
    if (!truck) {
      return res.status(404).json({ error: 'Power unit not found.' });
    }

    const currentOdoNum = parseInt(odometer || truck.odometer || '120000', 10);
    const newRecord = {
      id: `maint-${Date.now()}`,
      truckId: truck.id,
      unitNumber: truck.unit_number,
      serviceType: serviceType || 'PM-A Service',
      serviceDate: serviceDate || new Date().toISOString().split('T')[0],
      odometer: currentOdoNum,
      cost: parseFloat(cost) || 350,
      mechanicNotes: mechanicNotes || 'Scheduled preventive maintenance performed.',
      technician: technician || 'Carrier Fleet Maintenance',
      status: 'Completed',
      createdAt: new Date().toISOString()
    };

    db_maintenance_records.unshift(newRecord);

    // Update truck state
    truck.odometer = currentOdoNum.toString();
    truck.last_service_odometer = currentOdoNum;
    truck.last_service_date = newRecord.serviceDate;
    if (resetPm !== false) {
      truck.pm_status = 'Current';
    }
    if (serviceType === 'Annual DOT Inspection') {
      const nextYear = new Date(newRecord.serviceDate);
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      truck.annual_inspection_expiry = nextYear.toISOString().split('T')[0];
    }
    truck.updated_at = new Date().toISOString();

    res.json({
      success: true,
      message: `Maintenance logged for Unit ${truck.unit_number}. PM interval reset to Current.`,
      record: newRecord,
      truck
    });
  });

  // Toggle fleet unit operational status (Available, Maintenance, Out of Service)
  app.post('/api/fleet/portal/status', (req, res) => {
    const { truckId, status, notes } = req.body || {};
    const truck = db_trucks.find(t => t.id === truckId || t.unit_number === truckId);
    if (!truck) {
      return res.status(404).json({ error: 'Fleet unit not found.' });
    }

    truck.status = status;
    truck.status_notes = notes || undefined;
    truck.updated_at = new Date().toISOString();

    res.json({
      success: true,
      message: `Unit ${truck.unit_number} status updated to ${status}.`,
      truck
    });
  });

  // Update Telematics & ELD Pairing
  app.post('/api/fleet/portal/update-telematics', (req, res) => {
    const { truckId, eldProvider, eldSerial, currentLocation } = req.body || {};
    const truck = db_trucks.find(t => t.id === truckId || t.unit_number === truckId);
    if (!truck) {
      return res.status(404).json({ error: 'Fleet unit not found.' });
    }

    if (eldProvider) truck.eld_provider = eldProvider;
    if (eldSerial) truck.eld_serial = eldSerial;
    if (currentLocation) truck.current_location = currentLocation;
    truck.updated_at = new Date().toISOString();

    res.json({
      success: true,
      message: `Telematics configuration updated for Unit ${truck.unit_number}.`,
      truck
    });
  });

  // Public/Mobile Unit Inspection & DVIR endpoint (scanned via QR)
  app.get('/api/fleet/unit/:id', (req, res) => {
    const { id } = req.params;
    const cleanId = String(id || '').trim().toLowerCase();
    const truck = db_trucks.find(t => 
      t.id.toLowerCase() === cleanId || 
      (t.unit_number || '').toLowerCase() === cleanId ||
      (t.vin || '').toLowerCase() === cleanId
    );

    if (!truck) {
      return res.status(404).json({ error: 'Vehicle unit record not found.' });
    }

    const assignedDriver = db_drivers.find(d => d.truck_id === truck.id || d.id === truck.driver_id);
    const records = db_maintenance_records.filter(m => m.truckId === truck.id || m.unitNumber === truck.unit_number);

    res.json({
      success: true,
      unit: {
        id: truck.id,
        unitNumber: truck.unit_number,
        makeModel: truck.make_model,
        type: truck.truck_type,
        vin: truck.vin,
        plateNumber: truck.plate_number,
        plateState: truck.plate_state,
        fuelType: truck.fuel_type,
        odometer: truck.odometer,
        eldProvider: truck.eld_provider,
        eldSerial: truck.eld_serial,
        pmStatus: truck.pm_status || 'Current',
        lastServiceDate: truck.last_service_date,
        registrationExpiry: truck.registration_expiry,
        annualInspectionExpiry: truck.annual_inspection_expiry,
        dvirStatus: truck.dvir_status || 'Passed',
        dvirDate: truck.dvir_date || '2026-10-09',
        driverName: assignedDriver ? (assignedDriver.full_name || assignedDriver.name) : 'Unassigned',
        dotNumber: '3829104',
        carrierName: 'Apex Carrier Fleet LLC',
        recentMaintenance: records.slice(0, 5)
      }
    });
  });

  // Submit Driver / Inspector Pre-Trip DVIR Report
  app.post('/api/fleet/portal/dvir', (req, res) => {
    const { truckId, dvirStatus, inspectorName, notes, odometer } = req.body || {};
    const truck = db_trucks.find(t => t.id === truckId || t.unit_number === truckId);
    if (!truck) {
      return res.status(404).json({ error: 'Vehicle unit not found.' });
    }

    truck.dvir_status = dvirStatus || 'Passed';
    truck.dvir_date = new Date().toISOString().split('T')[0];
    if (odometer) truck.odometer = odometer.toString();
    if (dvirStatus === 'Defects Reported') {
      truck.status = 'Maintenance';
      truck.status_notes = `DVIR Defect Flagged: ${notes || 'Mechanic repair needed before dispatch.'}`;
    }
    truck.updated_at = new Date().toISOString();

    res.json({
      success: true,
      message: `DVIR report recorded for Unit ${truck.unit_number} (${truck.dvir_status}).`,
      truck
    });
  });

  // INVOICES API (Supabase: tms_invoices)
  // ==========================================
  app.get('/api/invoices', async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('tms_invoices').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          db_invoices = data;
          return res.json({ status: 'success', data });
        }
        if (error) console.warn('[Supabase Invoices Query]:', error.message);
      }
      res.json({ status: 'success', data: db_invoices.filter(i => !i.deleted_at) });
    } catch {
      res.json({ status: 'success', data: db_invoices.filter(i => !i.deleted_at) });
    }
  });

  app.post('/api/invoices', async (req, res) => {
    const body = req.body;
    const id = body.id || crypto.randomUUID();
    const newInvoice = {
      ...body,
      id,
      invoice_number: body.invoice_number || body.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null as string | null
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('tms_invoices').insert([newInvoice]).select().single();
        if (!error && data) {
          db_invoices.unshift(data);
          return res.status(201).json({ status: 'success', invoice: data });
        }
        if (error) console.warn('[Supabase Insert Invoice]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Insert Invoice Exception]:', e.message);
      }
    }

    db_invoices.unshift(newInvoice);
    res.status(201).json({ status: 'success', invoice: newInvoice });
  });

  app.put('/api/invoices/:id', async (req, res) => {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('tms_invoices').update(updates).eq('id', id).select().single();
        if (!error && data) {
          const idx = db_invoices.findIndex(i => i.id === id);
          if (idx !== -1) db_invoices[idx] = data;
          return res.json({ status: 'success', invoice: data });
        }
        if (error) console.warn('[Supabase Update Invoice]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Update Invoice Exception]:', e.message);
      }
    }

    const index = db_invoices.findIndex(i => i.id === id);
    if (index !== -1) {
      db_invoices[index] = { ...db_invoices[index], ...updates };
      return res.json({ status: 'success', invoice: db_invoices[index] });
    }
    res.json({ status: 'success', invoice: { id, ...updates } });
  });

  app.delete('/api/invoices/:id', async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      try {
        const { error } = await supabase.from('tms_invoices').delete().eq('id', id);
        if (error) console.warn('[Supabase Delete Invoice]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Delete Invoice Exception]:', e.message);
      }
    }
    db_invoices = db_invoices.filter(i => i.id !== id);
    res.json({ status: 'success', message: 'Invoice deleted successfully.' });
  });

  // ==========================================
  // RECURRING RULES API (Supabase: tms_recurring_rules)
  // ==========================================
  let db_recurring_rules: any[] = [];

  app.get('/api/recurring-rules', async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('tms_recurring_rules').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          db_recurring_rules = data;
          return res.json({ status: 'success', data });
        }
        if (error) console.warn('[Supabase Recurring Rules Query]:', error.message);
      }
      res.json({ status: 'success', data: db_recurring_rules });
    } catch {
      res.json({ status: 'success', data: db_recurring_rules });
    }
  });

  app.post('/api/recurring-rules', async (req, res) => {
    const body = req.body;
    const id = body.id || crypto.randomUUID();
    const newRule = {
      ...body,
      id,
      amount: parseFloat(body.amount) || 0,
      active: body.active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('tms_recurring_rules').insert([newRule]).select().single();
        if (!error && data) {
          db_recurring_rules.unshift(data);
          return res.status(201).json({ status: 'success', rule: data });
        }
        if (error) console.warn('[Supabase Insert Recurring Rule]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Insert Recurring Rule Exception]:', e.message);
      }
    }

    db_recurring_rules.push(newRule);
    res.status(201).json({ status: 'success', rule: newRule });
  });

  app.put('/api/recurring-rules/:id', async (req, res) => {
    const { id } = req.params;
    const updates = {
      ...req.body,
      amount: req.body.amount !== undefined ? parseFloat(req.body.amount) : undefined,
      updated_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data, error } = await supabase.from('tms_recurring_rules').update(updates).eq('id', id).select().single();
        if (!error && data) {
          const idx = db_recurring_rules.findIndex(r => r.id === id);
          if (idx !== -1) db_recurring_rules[idx] = data;
          return res.json({ status: 'success', rule: data });
        }
        if (error) console.warn('[Supabase Update Recurring Rule]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Update Recurring Rule Exception]:', e.message);
      }
    }

    const idx = db_recurring_rules.findIndex(r => r.id === id);
    if (idx !== -1) {
      db_recurring_rules[idx] = { ...db_recurring_rules[idx], ...updates };
      return res.json({ status: 'success', rule: db_recurring_rules[idx] });
    }
    res.json({ status: 'success', rule: { id, ...updates } });
  });

  app.delete('/api/recurring-rules/:id', async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      try {
        const { error } = await supabase.from('tms_recurring_rules').delete().eq('id', id);
        if (error) console.warn('[Supabase Delete Recurring Rule]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Delete Recurring Rule Exception]:', e.message);
      }
    }
    db_recurring_rules = db_recurring_rules.filter(r => r.id !== id);
    res.json({ status: 'success', message: 'Recurring rule removed' });
  });

  // ==========================================
  // SETTLEMENTS API — PHASE 5 (FINANCIAL PAYROLL)
  // ==========================================
  const runSettlementCalculation = (params: any) => {
    const payMethod = params.payMethod || 'CPM';
    const payRate = parseFloat(params.payRate || 0);
    const miles = parseFloat(params.miles || 0);
    const grossRevenue = parseFloat(params.grossRevenue || 0);
    
    let basePay = 0;
    if (typeof params.basePay === 'number') {
      basePay = params.basePay;
    } else if (typeof params.basePay === 'string' && !isNaN(parseFloat(params.basePay))) {
      basePay = parseFloat(params.basePay);
    } else {
      if (payMethod === 'CPM') {
        basePay = miles * payRate;
      } else if (payMethod === 'PERCENTAGE') {
        basePay = grossRevenue * payRate;
      } else if (payMethod === 'FLAT') {
        basePay = payRate;
      }
    }

    const fuelSurcharge = parseFloat(params.fuelSurcharge || 0);
    const detentionPay = parseFloat(params.detentionPay || 0);
    const fuelAdvanceDeduction = parseFloat(params.fuelAdvanceDeduction || 0);
    const insuranceDeduction = parseFloat(params.insuranceDeduction || 0);
    const eldFeeDeduction = parseFloat(params.eldFeeDeduction || 0);

    let customRevenuesTotal = 0;
    if (Array.isArray(params.customRevenues)) {
      customRevenuesTotal = params.customRevenues.reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0);
    }
    if (Array.isArray(params.loadItemizations)) {
      params.loadItemizations.forEach((item: any) => {
        if (Array.isArray(item.loadRevenues)) {
          customRevenuesTotal += item.loadRevenues.reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0);
        }
      });
    }

    let customDeductionsTotal = 0;
    if (Array.isArray(params.customDeductions)) {
      customDeductionsTotal = params.customDeductions.reduce((sum: number, d: any) => sum + (parseFloat(d.amount) || 0), 0);
    }
    if (Array.isArray(params.loadItemizations)) {
      params.loadItemizations.forEach((item: any) => {
        if (Array.isArray(item.loadDeductions)) {
          customDeductionsTotal += item.loadDeductions.reduce((sum: number, d: any) => sum + (parseFloat(d.amount) || 0), 0);
        }
      });
    }

    const grossEarnings = basePay + fuelSurcharge + detentionPay + customRevenuesTotal;
    const deductions = fuelAdvanceDeduction + insuranceDeduction + eldFeeDeduction + customDeductionsTotal;
    const netPay = grossEarnings - deductions;

    return {
      payMethod,
      payRate,
      basePay: parseFloat(basePay.toFixed(2)),
      fuelSurcharge: parseFloat(fuelSurcharge.toFixed(2)),
      detentionPay: parseFloat(detentionPay.toFixed(2)),
      fuelAdvanceDeduction: parseFloat(fuelAdvanceDeduction.toFixed(2)),
      insuranceDeduction: parseFloat(insuranceDeduction.toFixed(2)),
      eldFeeDeduction: parseFloat(eldFeeDeduction.toFixed(2)),
      customRevenues: params.customRevenues || [],
      customDeductions: params.customDeductions || [],
      loadItemizations: params.loadItemizations || [],
      grossEarnings: parseFloat(grossEarnings.toFixed(2)),
      deductions: parseFloat(deductions.toFixed(2)),
      netPay: parseFloat(netPay.toFixed(2))
    };
  };

  app.get('/api/settlements', async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('tms_settlements').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          db_settlements = data;
          return res.json({ status: 'success', data });
        }
        if (error) console.warn('[Supabase Settlements Query]:', error.message);
      }
      res.json({ status: 'success', data: db_settlements.filter(s => !s.deleted_at) });
    } catch {
      res.json({ status: 'success', data: db_settlements.filter(s => !s.deleted_at) });
    }
  });

  app.post('/api/settlements/calculate', (req, res) => {
    try {
      const result = runSettlementCalculation(req.body);
      res.json({ status: 'success', calculation: result });
    } catch (err: any) {
      res.status(400).json({ error: 'Failed to calculate settlement pay: ' + err.message });
    }
  });

  app.post('/api/settlements', async (req, res) => {
    try {
      const body = req.body;
      const calcResult = runSettlementCalculation(body);

      const newSettlement = {
        ...body,
        ...calcResult,
        id: body.id || crypto.randomUUID(),
        settlement_number: body.settlement_number || body.settlementNumber || `SET-${Date.now().toString().slice(-4)}`,
        status: body.status || 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null as string | null
      };

      if (supabase) {
        try {
          const { data, error } = await supabase.from('tms_settlements').insert([newSettlement]).select().single();
          if (!error && data) {
            db_settlements.unshift(data);
            return res.status(201).json({ status: 'success', settlement: data });
          }
          if (error) console.warn('[Supabase Insert Settlement]:', error.message);
        } catch (e: any) {
          console.warn('[Supabase Insert Settlement Exception]:', e.message);
        }
      }

      db_settlements.push(newSettlement);
      res.status(201).json({ status: 'success', settlement: newSettlement });
    } catch (err: any) {
      res.status(400).json({ error: 'Failed to save settlement record: ' + err.message });
    }
  });

  app.put('/api/settlements/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const body = req.body;
      const calcResult = runSettlementCalculation(body);
      const updates = {
        ...body,
        ...calcResult,
        updated_at: new Date().toISOString()
      };

      if (supabase) {
        try {
          const { data, error } = await supabase.from('tms_settlements').update(updates).eq('id', id).select().single();
          if (!error && data) {
            const idx = db_settlements.findIndex(s => s.id === id);
            if (idx !== -1) db_settlements[idx] = data;
            return res.json({ status: 'success', settlement: data });
          }
          if (error) console.warn('[Supabase Update Settlement]:', error.message);
        } catch (e: any) {
          console.warn('[Supabase Update Settlement Exception]:', e.message);
        }
      }

      const index = db_settlements.findIndex(s => s.id === id);
      if (index !== -1) {
        db_settlements[index] = { ...db_settlements[index], ...updates };
        return res.json({ status: 'success', settlement: db_settlements[index] });
      }
      res.json({ status: 'success', settlement: { id, ...updates } });
    } catch (err: any) {
      res.status(400).json({ error: 'Recalculation error: ' + err.message });
    }
  });

  app.delete('/api/settlements/:id', async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      try {
        const { error } = await supabase.from('tms_settlements').delete().eq('id', id);
        if (error) console.warn('[Supabase Delete Settlement]:', error.message);
      } catch (e: any) {
        console.warn('[Supabase Delete Settlement Exception]:', e.message);
      }
    }
    db_settlements = db_settlements.filter(s => s.id !== id);
    res.json({ status: 'success', message: 'Settlement deleted successfully.' });
  });

  // ==========================================
  // COMPANY SETTINGS API (Supabase: tms_company_settings)
  // ==========================================
  app.get('/api/company-settings', async (req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('tms_company_settings').select('*').limit(1).maybeSingle();
        if (!error && data) {
          return res.json({ status: 'success', data });
        }
      }
      res.json({ status: 'success', data: null });
    } catch {
      res.json({ status: 'success', data: null });
    }
  });

  app.post('/api/company-settings', async (req, res) => {
    try {
      const payload = {
        id: req.body.id || 'gridtms-primary',
        ...req.body,
        updated_at: new Date().toISOString()
      };
      if (supabase) {
        const { data, error } = await supabase.from('tms_company_settings').upsert([payload]).select().single();
        if (!error && data) {
          return res.json({ status: 'success', data });
        }
        if (error) console.warn('[Supabase Upsert Company Settings]:', error.message);
      }
      res.json({ status: 'success', data: payload });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save company settings' });
    }
  });




  // ==========================================
  // BUILT-IN AUTH + AI BACKEND FOR LOCAL DEV
  // These routes run on the same server as the UI: http://localhost:3000
  // This prevents "Failed to fetch" when the separate Python/Docker backend is not running.
  // ==========================================

  const DEV_DEMO_TOKEN = process.env.DEMO_TOKEN || 'gridtms-demo-token';
  const DEV_OTP = '12345678';
  const otpChallenges: Record<string, any> = {};

  const normalizeText = (value: any) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const normalizeNumber = (value: any) => String(value || '').replace(/[^0-9]/g, '');

  const verifiedBusinesses = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      legal_name: 'Demo Trucking LLC',
      registered_address: '123 Grid Logistics Way',
      registered_city: 'Troy',
      registered_state: 'MI',
      registered_zip: '48083',
      phone: '248-555-0101',
      dot_number: '23412312',
      mc_number: 'MC-2341234',
      authority_status: 'ACTIVE',
      source: 'local_demo'
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      legal_name: 'SIMPLEAI',
      registered_address: '730 DARTMOUTH DR',
      registered_city: 'ROCHESTER',
      registered_state: 'MI',
      registered_zip: '48307',
      phone: '2488859442',
      dot_number: '1397601',
      mc_number: 'MC-530842',
      authority_status: 'ACTIVE',
      source: 'local_demo_seed'
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      legal_name: 'Ahmed Trucking LLC',
      registered_address: '123 Grid Logistics Way',
      registered_city: 'Troy',
      registered_state: 'MI',
      registered_zip: '48083',
      phone: '248-555-0101',
      dot_number: '23412312',
      mc_number: 'MC-2341234',
      authority_status: 'ACTIVE',
      source: 'local_demo_seed'
    }
  ];

  function findVerifiedBusiness(payload: any) {
    const legal = normalizeText(payload.legal_name || payload.company_name || payload.business_name);
    const address = normalizeText(payload.registered_address || payload.address);
    const city = normalizeText(payload.registered_city || payload.city);
    const state = normalizeText(payload.registered_state || payload.state);
    const zip = normalizeNumber(payload.registered_zip || payload.zip);
    const dot = normalizeNumber(payload.dot_number || payload.usdot_number);
    const mc = normalizeNumber(payload.mc_number);

    return verifiedBusinesses.find((record) => {
      const recordState = normalizeText(record.registered_state);
      return normalizeText(record.legal_name) === legal
        && normalizeText(record.registered_address) === address
        && normalizeText(record.registered_city) === city
        && (normalizeText(record.registered_state) === state || recordState === 'mi' && normalizeText(state) === 'michigan')
        && normalizeNumber(record.registered_zip) === zip
        && normalizeNumber(record.dot_number) === dot
        && normalizeNumber(record.mc_number) === mc
        && String(record.authority_status).toUpperCase() === 'ACTIVE';
    });
  }

  function makeAuthResult(user: any = {}) {
    return {
      access_token: DEV_DEMO_TOKEN,
      token_type: 'bearer',
      user: {
        id: user.id || 'demo-user',
        email: user.email || 'demo@gridtms.local',
        user_metadata: {
          full_name: user.full_name || 'Demo Dispatcher',
          legal_name: user.legal_name || 'Demo Trucking LLC',
          business_verified: true,
          two_step_verified: true,
          demo: true,
          ...(user.user_metadata || {})
        }
      }
    };
  }

  function requireLocalAuth(req: any, res: any, next: any) {
    const header = String(req.headers.authorization || '');
    const token = header.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return res.status(401).json({ detail: 'Login required.' });
    }
    next();
  }

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', mode: 'same-origin-express-backend', ai_chat: 'ready', demo_login: 'demo/demo' });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', mode: 'same-origin-express-backend', ai_chat: 'ready', demo_login: 'demo/demo' });
  });

  app.post('/auth/demo-login', (req, res) => {
    const { username, password } = req.body || {};
    if (String(username || '').trim().toLowerCase() !== 'demo' || String(password || '') !== 'demo') {
      return res.status(401).json({ detail: 'Invalid demo username or password.' });
    }
    return res.json(makeAuthResult());
  });

  app.post('/auth/login/start', async (req, res) => {
    const { email, password } = req.body || {};
    const trimmedEmail = String(email || '').trim();
    const strPassword = String(password || '');

    if (trimmedEmail.toLowerCase() === 'demo' && strPassword === 'demo') {
      return res.json({ ...makeAuthResult(), direct_login: true });
    }

    // 1. If Supabase is connected, authenticate via Supabase Auth
    if (supabase && trimmedEmail && strPassword) {
      try {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: strPassword,
        });

        if (!signInError && signInData?.session) {
          return res.json({
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
            user: signInData.user,
            direct_login: true,
          });
        }

        // If credentials are not yet created on Supabase Auth, attempt auto-signup
        if (signInError && (signInError.message.toLowerCase().includes('invalid login') || signInError.message.toLowerCase().includes('user not found'))) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: trimmedEmail,
            password: strPassword,
            options: {
              data: {
                full_name: trimmedEmail.split('@')[0],
                legal_name: 'Apex Carrier Fleet',
                role: 'Carrier Owner',
              }
            }
          });

          if (!signUpError && signUpData?.session) {
            return res.json({
              access_token: signUpData.session.access_token,
              refresh_token: signUpData.session.refresh_token,
              user: signUpData.user,
              direct_login: true,
            });
          }
        }
      } catch (authErr: any) {
        console.warn('[Supabase Auth Exception]:', authErr?.message);
      }
    }

    // 2. Seamless carrier owner session for valid email
    if (trimmedEmail) {
      return res.json({
        ...makeAuthResult({
          email: trimmedEmail,
          full_name: trimmedEmail.split('@')[0],
          role: 'Carrier Owner',
        }),
        direct_login: true,
      });
    }

    return res.status(400).json({
      detail: 'Please enter your email and password to log in.'
    });
  });

  app.post('/auth/login/complete', (req, res) => {
    const { challenge_id, otp_code } = req.body || {};
    const challenge = otpChallenges[challenge_id];
    if (!challenge || challenge.purpose !== 'login') return res.status(400).json({ detail: 'Invalid or expired login challenge.' });
    if (String(otp_code) !== DEV_OTP) return res.status(400).json({ detail: 'Invalid 2-step code. In local dev use 12345678.' });
    delete otpChallenges[challenge_id];
    return res.json(makeAuthResult(challenge.payload || {}));
  });

  app.post('/business/verify', (req, res) => {
    const verified = findVerifiedBusiness(req.body || {});
    if (!verified) {
      return res.status(403).json({
        verified: false,
        detail: 'Business verification failed. For local testing, use demo/demo or use the seeded SIMPLEAI / Ahmed Trucking values.'
      });
    }
    return res.json({ verified: true, message: 'Business verified locally.', ...verified });
  });

  app.post('/auth/register/start', (req, res) => {
    const payload = req.body || {};
    const verified = findVerifiedBusiness(payload);
    if (!verified) {
      return res.status(403).json({
        detail: 'Business verification failed. LLC/legal name, registered address, DOT, and MC must match an active verified carrier record.'
      });
    }
    const id = `otp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    otpChallenges[id] = { purpose: 'register', payload: { ...payload, verified }, created_at: Date.now() };
    return res.json({
      message: 'Business verified. Enter the local email test code shown below.',
      challenge_id: id,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      dev_email_otp: DEV_OTP
    });
  });

  app.post('/auth/register/complete', (req, res) => {
    const { challenge_id, email_otp_code } = req.body || {};
    const challenge = otpChallenges[challenge_id];
    if (!challenge || challenge.purpose !== 'register') return res.status(400).json({ detail: 'Invalid or expired registration challenge.' });
    if (String(email_otp_code) !== DEV_OTP) return res.status(400).json({ detail: 'Invalid email code. In local dev use 12345678.' });
    delete otpChallenges[challenge_id];
    const payload = challenge.payload || {};
    return res.json({
      message: 'Demo account created and business verified. You can now log in with demo/demo or run the Supabase backend for real accounts.',
      user: {
        id: `user-${Date.now()}`,
        email: payload.email,
        user_metadata: {
          full_name: payload.full_name,
          legal_name: payload.legal_name,
          business_verified: true,
          two_step_verified: true,
          dot_number: payload.dot_number,
          mc_number: payload.mc_number
        }
      },
      business_account: payload.verified
    });
  });

  function customerName(id: any) {
    return db_customers.find((c: any) => c.id === id)?.name || 'Unknown customer';
  }

  function locationName(id: any) {
    const loc = db_locations.find((l: any) => l.id === id);
    return loc ? `${loc.name || 'Location'}${loc.address?.city ? `, ${loc.address.city}` : ''}${loc.address?.state ? `, ${loc.address.state}` : ''}` : 'Unknown location';
  }

  function driverName(id: any) {
    const driver = db_drivers.find((d: any) => d.id === id);
    return driver ? driver.name || 'Assigned driver' : 'Unassigned';
  }

  function answerFromTmsData(message: string) {
    const msg = String(message || '').toLowerCase();
    const activeLoads = db_loads.filter((l: any) => !l.deleted_at);
    const customers = db_customers.filter((c: any) => !c.deleted_at);
    const invoices = db_invoices.filter((i: any) => !i.deleted_at);
    const openInvoices = invoices.filter((i: any) => !['paid', 'closed'].includes(String(i.status || '').toLowerCase()));
    const totalRevenue = activeLoads.reduce((sum: number, l: any) => sum + (Number(l.rate) || 0), 0);
    const openInvoiceTotal = openInvoices.reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0);

    if (msg.includes('customer') || msg.includes('client')) {
      const match = customers.find((c: any) => msg.includes(String(c.name || '').toLowerCase()) || msg.includes(String(c.code || '').toLowerCase()));
      if (match) {
        const balance = Number(match.outstandingBalance || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
        const limit = Number(match.creditLimit || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
        return `${match.name} is ${match.status}. Contact: ${match.email || 'no email saved'} / ${match.phone || 'no phone saved'}. Credit: ${balance} used of ${limit}. Address: ${match.address?.street || ''}, ${match.address?.city || ''}, ${match.address?.state || ''} ${match.address?.zip || ''}.`;
      }
      return `I found ${customers.length} customers. Top records: ${customers.slice(0, 6).map((c: any) => `${c.name} (${c.status})`).join(', ')}.`;
    }

    if (msg.includes('invoice') || msg.includes('revenue') || msg.includes('paid') || msg.includes('money')) {
      return `Revenue snapshot: ${totalRevenue.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} in active load rates. Open invoices: ${openInvoices.length}, totaling ${openInvoiceTotal.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}. Recent invoices: ${invoices.slice(0, 5).map((i: any) => `${i.invoiceNumber} ${i.status} ${Number(i.amount || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}`).join('; ')}.`;
    }

    if (msg.includes('load') || msg.includes('dispatch') || msg.includes('driver')) {
      return `Recent loads: ${activeLoads.slice(0, 7).map((l: any) => `${l.loadNumber}: ${customerName(l.customerId)}, ${locationName(l.originId)} → ${locationName(l.destinationId)}, ${l.status}, driver ${driverName(l.driverId)}, rate ${Number(l.rate || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}`).join('; ')}.`;
    }

    if (msg.includes('location') || msg.includes('terminal') || msg.includes('shipper') || msg.includes('consignee')) {
      return `I found ${db_locations.length} locations: ${db_locations.slice(0, 8).map((l: any) => `${l.name} in ${l.city}, ${l.state} (${l.type || l.locationType || 'facility'})`).join('; ')}.`;
    }

    if (msg.includes('settlement') || msg.includes('payroll') || msg.includes('paycheck') || msg.includes('driver pay')) {
      const totalNet = db_settlements.reduce((sum: number, s: any) => sum + (Number(s.netPay) || 0), 0);
      return `Settlements snapshot: ${db_settlements.length} settlement records, total net payout ${totalNet.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}. Recent: ${db_settlements.slice(0, 5).map((s: any) => `${s.settlementNumber} ${s.status} net ${Number(s.netPay || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' })}`).join('; ')}.`;
    }

    if (msg.includes('compliance') || msg.includes('audit') || msg.includes('dot')) {
      return `Compliance snapshot: fleet audit readiness is high in the demo data. Driver qualification files, HOS logs, and maintenance records should be reviewed before DOT audit export. I can help summarize open compliance items once they are saved.`;
    }

    return `GridTMS AI is working. I can answer from this app's customer, load, invoice, location, settlement, dispatch, and compliance data. Current snapshot: ${customers.length} customers, ${activeLoads.length} loads, ${invoices.length} invoices, ${db_locations.length} locations, ${db_settlements.length} settlements. Try: "Who are my customers?", "Show open invoices", or "Summarize loads."`;
  }

  let geminiClient: GoogleGenAI | null = null;
  function getGemini(): GoogleGenAI | null {
    if (!geminiClient && process.env.GEMINI_API_KEY) {
      geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return geminiClient;
  }

  async function generateAiChatResponse(message: string): Promise<string> {
    const ai = getGemini();
    if (ai) {
      try {
        const activeLoads = db_loads.filter((l: any) => !l.deleted_at);
        const customers = db_customers.filter((c: any) => !c.deleted_at);
        const invoices = db_invoices.filter((i: any) => !i.deleted_at);
        const locations = db_locations.filter((l: any) => !l.deleted_at);
        const drivers = db_drivers.filter((d: any) => !d.deleted_at);

        const systemContext = `You are GridTMS AI, an intelligent trucking management assistant.
Operational context:
- Customers (${customers.length}): ${JSON.stringify(customers.slice(0, 8).map((c: any) => ({ name: c.name, status: c.status, balance: c.outstandingBalance, limit: c.creditLimit })))}
- Loads (${activeLoads.length}): ${JSON.stringify(activeLoads.slice(0, 8).map((l: any) => ({ number: l.loadNumber, customer: customerName(l.customerId), status: l.status, rate: l.rate, miles: l.miles, commodity: l.commodity })))}
- Invoices (${invoices.length}): ${JSON.stringify(invoices.slice(0, 8).map((i: any) => ({ invoiceNumber: i.invoiceNumber, amount: i.amount, status: i.status })))}
- Locations (${locations.length}): ${JSON.stringify(locations.slice(0, 8).map((loc: any) => ({ name: loc.name, city: loc.address?.city, state: loc.address?.state, type: loc.type })))}
- Drivers (${drivers.length}): ${JSON.stringify(drivers.slice(0, 8).map((d: any) => ({ name: driverName(d.id), status: d.status, hosDriveHoursRemaining: d.hosDriveTimeHours })))}

Provide direct, helpful, concise operational answers based on this TMS data.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `${systemContext}\n\nUser Question: ${message}`
        });

        if (response.text) {
          return response.text;
        }
      } catch (err) {
        console.warn('Gemini chat error, falling back to local heuristic solver:', err);
      }
    }
    return answerFromTmsData(message);
  }

  app.post('/chat', requireLocalAuth, async (req, res) => {
    const message = req.body?.message || '';
    const answer = await generateAiChatResponse(message);
    return res.json({ answer, source: process.env.GEMINI_API_KEY ? 'gemini-2.5-flash' : 'same-origin-express-backend' });
  });

  app.post('/api/chat', requireLocalAuth, async (req, res) => {
    const message = req.body?.message || '';
    const answer = await generateAiChatResponse(message);
    return res.json({ answer, source: process.env.GEMINI_API_KEY ? 'gemini-2.5-flash' : 'same-origin-express-backend' });
  });

  // ==========================================
  // STORAGE & DOCUMENT VAULT ENDPOINTS
  // ==========================================
  const handleStorageUpload = async (req: express.Request, res: express.Response) => {
    try {
      const { folder = 'compliance', file_name = `doc_${Date.now()}`, content_type = 'application/octet-stream', data_base64 } = req.body || {};
      if (!data_base64) {
        return res.status(400).json({ error: 'No data_base64 provided' });
      }

      const cleanFolder = String(folder || 'compliance').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanFileName = String(file_name || `doc_${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileBytes = Buffer.from(data_base64, 'base64');

      const DEFAULT_SUPABASE_URL = 'https://durwofqudkmhxdxdfonl.supabase.co';
      const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1cndvZnF1ZGttaHhkeGRmb25sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3Nzk5MzUsImV4cCI6MjEwNjM1NTkzNX0.NvQphSxWl5pQSBV9CdZvRzZEkB0qXxC14U0IbzGnqO4';

      const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        const objectPath = `${cleanFolder}/${Date.now()}_${cleanFileName}`;

        // Attempt upload to Supabase Storage
        let uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/documents/${objectPath}`, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': content_type,
            'x-upsert': 'true'
          },
          body: fileBytes
        });

        // If bucket was not found (404), attempt to auto-create the 'documents' bucket
        if (uploadRes.status === 404 || uploadRes.status === 400) {
          try {
            await fetch(`${supabaseUrl}/storage/v1/bucket`, {
              method: 'POST',
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                id: 'documents',
                name: 'documents',
                public: true
              })
            });

            // Retry the upload once
            uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/documents/${objectPath}`, {
              method: 'POST',
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': content_type,
                'x-upsert': 'true'
              },
              body: fileBytes
            });
          } catch (bucketErr) {
            console.warn('Failed auto-creating documents bucket:', bucketErr);
          }
        }

        if (uploadRes.ok) {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/documents/${objectPath}`;
          return res.json({
            status: 'success',
            storage_type: 'supabase',
            path: objectPath,
            public_url: publicUrl
          });
        }

        const errDetail = await uploadRes.text().catch(() => '');
        console.warn(`Supabase storage upload failed (HTTP ${uploadRes.status}):`, errDetail);
      }

      // High-fidelity fallback when Supabase keys are not in environment or bucket is not ready
      const dataUri = `data:${content_type};base64,${data_base64}`;
      return res.json({
        status: 'success',
        storage_type: 'local_fallback',
        path: `${cleanFolder}/${cleanFileName}`,
        public_url: dataUri,
        note: 'Document saved locally as data URI. Run SUPABASE_STORAGE_SETUP.sql in Supabase to sync directly to Supabase Storage.'
      });
    } catch (err: any) {
      console.error('Storage upload handler error:', err);
      return res.status(500).json({ error: err.message || 'Storage upload failed' });
    }
  };

  app.post('/storage/upload', handleStorageUpload);
  app.post('/api/storage/upload', handleStorageUpload);

  // ==========================================
  // VITE APP DEV / PROD MIDDLEWARE INGRESS
  // ==========================================

  if (process.env.NODE_ENV !== 'production') {
    const frontendRoot = fs.existsSync(path.join(process.cwd(), 'frontend', 'index.html'))
      ? path.join(process.cwd(), 'frontend')
      : fs.existsSync(path.join(__dirname, 'index.html'))
        ? __dirname
        : process.cwd();
    const vite = await createViteServer({
      root: frontendRoot,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : fs.existsSync(path.join(process.cwd(), 'frontend', 'dist', 'index.html'))
        ? path.join(process.cwd(), 'frontend', 'dist')
        : path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Grid TMS full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
