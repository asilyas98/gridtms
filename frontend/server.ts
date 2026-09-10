import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Load static initial mock structures
import {
  mockCarrierCompliance,
  mockCustomers,
  mockLocations,
  mockLoads,
  mockDrivers,
  mockTrucks,
  mockInvoices,
} from './src/mockData';

import { Load, Driver, Location, Truck, LoadLineItem, ActivityLogEntry } from './src/types';

// In-Memory Data Store (Simulating Database Tables)
let db_customers = [...mockCustomers].map(c => ({
  ...c,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null as string | null
}));
let db_locations = [...mockLocations].map(l => ({
  ...l,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null as string | null
}));
let db_loads = [...mockLoads].map(l => ({
  ...l,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null as string | null
}));
let db_drivers = [...mockDrivers].map(drv => ({
  ...drv,
  // Ensure HOS values are initialized perfectly for Phase 1
  hosDutyStatus: drv.hosDutyStatus || 'Off Duty',
  hosDriveTimeHours: 11.00,
  hosDutyTimeHours: 14.00,
  hosCycleTimeHours: 70.00,
  hosRestBreakRequired: false,
  hosViolations: drv.hosViolations || 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null as string | null
}));
let db_trucks = [...mockTrucks].map(t => ({
  ...t,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null as string | null
}));
let db_invoices = [...mockInvoices].map(i => ({
  ...i,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null as string | null
}));

let db_settlements: any[] = [
  {
    id: 'set-1',
    settlementNumber: 'SET-2601',
    driverId: 'd1',
    loadId: 'ld1',
    periodStart: '2026-05-15',
    periodEnd: '2026-05-22',
    payMethod: 'CPM',
    payRate: 0.65,
    basePay: 780.00, // 1200 miles * 0.65 CPM
    fuelSurcharge: 150.00,
    detentionPay: 50.00,
    fuelAdvanceDeduction: 100.00,
    insuranceDeduction: 80.00,
    eldFeeDeduction: 15.00,
    grossEarnings: 980.00, // 780 + 150 + 50
    deductions: 195.00, // 100 + 80 + 15
    netPay: 785.00, // 980 - 195
    status: 'APPROVED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null as string | null
  },
  {
    id: 'set-2',
    settlementNumber: 'SET-2602',
    driverId: 'd2',
    loadId: 'ld2',
    periodStart: '2026-05-15',
    periodEnd: '2026-05-22',
    payMethod: 'PERCENTAGE',
    payRate: 0.25, // 25% of load rate
    basePay: 625.00, // 25% of $2500 Gross revenue
    fuelSurcharge: 120.00,
    detentionPay: 0.00,
    fuelAdvanceDeduction: 0.00,
    insuranceDeduction: 80.00,
    eldFeeDeduction: 15.00,
    grossEarnings: 745.00, // 625 + 120
    deductions: 95.00, // 80 + 15
    netPay: 650.00, // 745 - 95
    status: 'RATE_MATCHED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null as string | null
  }
];


// Mock DAT External Load Board Listings for Import
const externalLoadBoard = [
  {
    id: 'ext-load-1',
    brokerName: 'CH Robinson',
    brokerRating: 4.8,
    originCity: 'Dallas',
    originState: 'TX',
    destinationCity: 'Atlanta',
    destinationState: 'GA',
    pickupDate: '2026-05-26',
    deliveryDate: '2026-05-28',
    rate: 1850.00,
    miles: 780.0,
    commodity: 'Frozen Produce',
    weight: 41000,
    equipmentType: "Reefer 53'",
    sourcePlatform: 'DAT'
  },
  {
    id: 'ext-load-2',
    brokerName: 'TQL (Total Quality Logistics)',
    brokerRating: 3.9,
    originCity: 'Houston',
    originState: 'TX',
    destinationCity: 'Chicago',
    destinationState: 'IL',
    pickupDate: '2026-05-25',
    deliveryDate: '2026-05-27',
    rate: 2600.00,
    miles: 1080.0,
    commodity: 'Industrial Equipment',
    weight: 44000,
    equipmentType: "Flatbed 48'",
    sourcePlatform: 'Truckstop'
  },
  {
    id: 'ext-load-3',
    brokerName: 'Echo Global Logistics',
    brokerRating: 4.5,
    originCity: 'Los Angeles',
    originState: 'CA',
    destinationCity: 'Phoenix',
    destinationState: 'AZ',
    pickupDate: '2026-05-27',
    deliveryDate: '2026-05-28',
    rate: 950.00,
    miles: 370.0,
    commodity: 'General Merchandise',
    weight: 15000,
    equipmentType: "Dry Van 53'",
    sourcePlatform: 'DAT'
  },
  {
    id: 'ext-load-4',
    brokerName: 'Coyote Logistics',
    brokerRating: 4.6,
    originCity: 'Indianapolis',
    originState: 'IN',
    destinationCity: 'Nashville',
    destinationState: 'TN',
    pickupDate: '2026-05-25',
    deliveryDate: '2026-05-25',
    rate: 1100.00,
    miles: 290.0,
    commodity: 'Paper Products',
    weight: 22000,
    equipmentType: "Dry Van 53'",
    sourcePlatform: 'GridConnect'
  },
  {
    id: 'ext-load-5',
    brokerName: 'J.B. Hunt Brokerage',
    brokerRating: 4.7,
    originCity: 'St. Louis',
    originState: 'MO',
    destinationCity: 'Detroit',
    destinationState: 'MI',
    pickupDate: '2026-05-27',
    deliveryDate: '2026-05-29',
    rate: 1650.00,
    miles: 510.0,
    commodity: 'Auto Parts',
    weight: 38000,
    equipmentType: "Dry Van 53'",
    sourcePlatform: 'DAT'
  }
];

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
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // ==========================================
  // API ENDPOINTS – PHASE 1: PRE-SHIFT OPERATIONS
  // ==========================================

  // --- 1. Load Board Import & Prioritization API ---
  
  // Get external DAT load board listings
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
  // LOADS API
  // ==========================================
  app.get('/api/loads', (req, res) => {
    const active = db_loads.filter(l => !l.deleted_at);
    res.json({ status: 'success', data: active });
  });

  app.post('/api/loads', (req, res) => {
    const body = req.body;
    const newLoad = {
      ...body,
      id: body.id || `ld-${Math.random().toString(36).substr(2, 9)}`,
      loadNumber: body.loadNumber || `LD-00${db_loads.length + 4522}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null as string | null
    };
    db_loads.unshift(newLoad);
    res.status(201).json({ status: 'success', load: newLoad });
  });

  app.put('/api/loads/:id', (req, res) => {
    const { id } = req.params;
    const index = db_loads.findIndex(l => l.id === id && !l.deleted_at);
    if (index !== -1) {
      db_loads[index] = { 
        ...db_loads[index], 
        ...req.body,
        updated_at: new Date().toISOString()
      };
      res.json({ status: 'success', load: db_loads[index] });
    } else {
      res.status(404).json({ error: 'Load not found or has been soft-deleted.' });
    }
  });

  app.delete('/api/loads/:id', (req, res) => {
    const { id } = req.params;
    const index = db_loads.findIndex(l => l.id === id && !l.deleted_at);
    if (index !== -1) {
      db_loads[index] = {
        ...db_loads[index],
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      res.json({ status: 'success', message: 'Load soft-deleted successfully.' });
    } else {
      res.status(404).json({ error: 'Load not found or already deleted.' });
    }
  });

  // ==========================================
  // CUSTOMERS API
  // ==========================================
  app.get('/api/customers', (req, res) => {
    const active = db_customers.filter(c => !c.deleted_at);
    res.json({ status: 'success', data: active });
  });

  app.post('/api/customers', (req, res) => {
    const body = req.body;
    const newCustomer = {
      ...body,
      id: body.id || `c-${Math.random().toString(36).substr(2, 9)}`,
      code: body.code || `${(body.name || 'CUST').substring(0, 5).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null as string | null
    };
    db_customers.push(newCustomer);
    res.status(201).json({ status: 'success', customer: newCustomer });
  });

  app.put('/api/customers/:id', (req, res) => {
    const { id } = req.params;
    const index = db_customers.findIndex(c => c.id === id && !c.deleted_at);
    if (index !== -1) {
      db_customers[index] = {
        ...db_customers[index],
        ...req.body,
        updated_at: new Date().toISOString()
      };
      res.json({ status: 'success', customer: db_customers[index] });
    } else {
      res.status(404).json({ error: 'Customer not found or has been soft-deleted.' });
    }
  });

  app.delete('/api/customers/:id', (req, res) => {
    const { id } = req.params;
    const index = db_customers.findIndex(c => c.id === id && !c.deleted_at);
    if (index !== -1) {
      db_customers[index] = {
        ...db_customers[index],
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      res.json({ status: 'success', message: 'Customer soft-deleted successfully.' });
    } else {
      res.status(404).json({ error: 'Customer not found or already deleted.' });
    }
  });

  // ==========================================
  // LOCATIONS API
  // ==========================================
  app.get('/api/locations', (req, res) => {
    const active = db_locations.filter(l => !l.deleted_at);
    res.json({ status: 'success', data: active });
  });

  app.post('/api/locations', (req, res) => {
    const body = req.body;
    const newLocation = {
      ...body,
      id: body.id || `l-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null as string | null
    };
    db_locations.push(newLocation);
    res.status(201).json({ status: 'success', location: newLocation });
  });

  app.put('/api/locations/:id', (req, res) => {
    const { id } = req.params;
    const index = db_locations.findIndex(l => l.id === id && !l.deleted_at);
    if (index !== -1) {
      db_locations[index] = {
        ...db_locations[index],
        ...req.body,
        updated_at: new Date().toISOString()
      };
      res.json({ status: 'success', location: db_locations[index] });
    } else {
      res.status(404).json({ error: 'Location not found or has been soft-deleted.' });
    }
  });

  app.delete('/api/locations/:id', (req, res) => {
    const { id } = req.params;
    const index = db_locations.findIndex(l => l.id === id && !l.deleted_at);
    if (index !== -1) {
      db_locations[index] = {
        ...db_locations[index],
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      res.json({ status: 'success', message: 'Location soft-deleted successfully.' });
    } else {
      res.status(404).json({ error: 'Location not found or already deleted.' });
    }
  });

  // ==========================================
  // TRUCKS API
  // ==========================================
  app.get('/api/trucks', (req, res) => {
    const active = db_trucks.filter(t => !t.deleted_at);
    res.json({ status: 'success', data: active });
  });

  app.post('/api/trucks', (req, res) => {
    const body = req.body;
    const newTruck = {
      ...body,
      id: body.id || `t-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null as string | null
    };
    db_trucks.push(newTruck);
    res.status(201).json({ status: 'success', truck: newTruck });
  });

  app.put('/api/trucks/:id', (req, res) => {
    const { id } = req.params;
    const index = db_trucks.findIndex(t => t.id === id && !t.deleted_at);
    if (index !== -1) {
      db_trucks[index] = {
        ...db_trucks[index],
        ...req.body,
        updated_at: new Date().toISOString()
      };
      res.json({ status: 'success', truck: db_trucks[index] });
    } else {
      res.status(404).json({ error: 'Truck not found or has been soft-deleted.' });
    }
  });

  app.delete('/api/trucks/:id', (req, res) => {
    const { id } = req.params;
    const index = db_trucks.findIndex(t => t.id === id && !t.deleted_at);
    if (index !== -1) {
      db_trucks[index] = {
        ...db_trucks[index],
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      res.json({ status: 'success', message: 'Truck soft-deleted successfully.' });
    } else {
      res.status(404).json({ error: 'Truck not found or already deleted.' });
    }
  });

  // ==========================================
  // DRIVERS BASIC CRUD API
  // ==========================================
  app.post('/api/drivers', (req, res) => {
    const body = req.body;
    const newDriver = {
      ...body,
      id: body.id || `d-${Math.random().toString(36).substr(2, 9)}`,
      hosDutyStatus: body.hosDutyStatus || 'Off Duty',
      hosDriveTimeHours: body.hosDriveTimeHours !== undefined ? parseFloat(body.hosDriveTimeHours) : 11.00,
      hosDutyTimeHours: body.hosDutyTimeHours !== undefined ? parseFloat(body.hosDutyTimeHours) : 14.00,
      hosCycleTimeHours: body.hosCycleTimeHours !== undefined ? parseFloat(body.hosCycleTimeHours) : 70.00,
      hosRestBreakRequired: false,
      hosViolations: body.hosViolations || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null as string | null
    };
    db_drivers.push(newDriver);
    res.status(201).json({ status: 'success', driver: newDriver });
  });

  app.put('/api/drivers/:id', (req, res) => {
    const { id } = req.params;
    const index = db_drivers.findIndex(d => d.id === id && !d.deleted_at);
    if (index !== -1) {
      db_drivers[index] = {
        ...db_drivers[index],
        ...req.body,
        updated_at: new Date().toISOString()
      };
      res.json({ status: 'success', driver: db_drivers[index] });
    } else {
      res.status(404).json({ error: 'Driver not found or has been soft-deleted.' });
    }
  });

  app.delete('/api/drivers/:id', (req, res) => {
    const { id } = req.params;
    const index = db_drivers.findIndex(d => d.id === id && !d.deleted_at);
    if (index !== -1) {
      db_drivers[index] = {
        ...db_drivers[index],
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      res.json({ status: 'success', message: 'Driver soft-deleted successfully.' });
    } else {
      res.status(404).json({ error: 'Driver not found or already deleted.' });
    }
  });

  // ==========================================
  // INVOICES API
  // ==========================================
  app.get('/api/invoices', (req, res) => {
    const active = db_invoices.filter(i => !i.deleted_at);
    res.json({ status: 'success', data: active });
  });

  app.post('/api/invoices', (req, res) => {
    const body = req.body;
    const newInvoice = {
      ...body,
      id: body.id || `inv-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null as string | null
    };
    db_invoices.push(newInvoice);
    res.status(201).json({ status: 'success', invoice: newInvoice });
  });

  app.put('/api/invoices/:id', (req, res) => {
    const { id } = req.params;
    const index = db_invoices.findIndex(i => i.id === id && !i.deleted_at);
    if (index !== -1) {
      db_invoices[index] = {
        ...db_invoices[index],
        ...req.body,
        updated_at: new Date().toISOString()
      };
      res.json({ status: 'success', invoice: db_invoices[index] });
    } else {
      res.status(404).json({ error: 'Invoice not found or has been soft-deleted.' });
    }
  });

  app.delete('/api/invoices/:id', (req, res) => {
    const { id } = req.params;
    const index = db_invoices.findIndex(i => i.id === id && !i.deleted_at);
    if (index !== -1) {
      db_invoices[index] = {
        ...db_invoices[index],
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      res.json({ status: 'success', message: 'Invoice soft-deleted successfully.' });
    } else {
      res.status(404).json({ error: 'Invoice not found or already deleted.' });
    }
  });


  // ==========================================
  // SETTLEMENTS API — PHASE 5 (FINANCIAL PAYROLL)
  // ==========================================

  // In-memory table for recurring driver deductions and earnings
  let db_recurring_rules: any[] = [
    {
      id: 'rec-1',
      driverId: 'd1', // Marcus
      type: 'DEDUCTION',
      name: 'Truck Lease Escrow Contribution',
      amount: 150.00,
      frequency: 'WEEKLY',
      active: true
    },
    {
      id: 'rec-2',
      driverId: 'd1', // Marcus
      type: 'DEDUCTION',
      name: 'Occupational Insurance Premium',
      amount: 85.00,
      frequency: 'MONTHLY',
      active: true
    },
    {
      id: 'rec-3',
      driverId: 'd2', // Sarah Jackson
      type: 'REVENUE',
      name: 'Clean Inspection Safety Bonus',
      amount: 100.00,
      frequency: 'WEEKLY',
      active: true
    }
  ];

  // Utility to calculate settlement paycheck parameters
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

  // 0. Recurring Rules Endpoints
  app.get('/api/recurring-rules', (req, res) => {
    res.json({ status: 'success', data: db_recurring_rules });
  });

  app.post('/api/recurring-rules', (req, res) => {
    const body = req.body;
    const newRule = {
      ...body,
      id: body.id || `rec-${Math.random().toString(36).substr(2, 9)}`,
      amount: parseFloat(body.amount) || 0,
      active: body.active !== false
    };
    db_recurring_rules.push(newRule);
    res.status(201).json({ status: 'success', rule: newRule });
  });

  app.put('/api/recurring-rules/:id', (req, res) => {
    const { id } = req.params;
    const idx = db_recurring_rules.findIndex(r => r.id === id);
    if (idx !== -1) {
      db_recurring_rules[idx] = {
        ...db_recurring_rules[idx],
        ...req.body,
        amount: req.body.amount !== undefined ? parseFloat(req.body.amount) : db_recurring_rules[idx].amount
      };
      res.json({ status: 'success', rule: db_recurring_rules[idx] });
    } else {
      res.status(404).json({ error: 'Recurring rule not found' });
    }
  });

  app.delete('/api/recurring-rules/:id', (req, res) => {
    const { id } = req.params;
    const idx = db_recurring_rules.findIndex(r => r.id === id);
    if (idx !== -1) {
      db_recurring_rules.splice(idx, 1);
      res.json({ status: 'success', message: 'Recurring rule removed' });
    } else {
      res.status(404).json({ error: 'Recurring rule not found' });
    }
  });

  // 1. Get List of Settlements
  app.get('/api/settlements', (req, res) => {
    const active = db_settlements.filter(s => !s.deleted_at);
    res.json({ status: 'success', data: active });
  });

  // 2. Recalculate preview endpoint
  app.post('/api/settlements/calculate', (req, res) => {
    try {
      const result = runSettlementCalculation(req.body);
      res.json({ status: 'success', calculation: result });
    } catch (err: any) {
      res.status(400).json({ error: 'Failed to calculate settlement pay: ' + err.message });
    }
  });

  // 3. Create a settlement (autocomputing details)
  app.post('/api/settlements', (req, res) => {
    try {
      const body = req.body;
      const calcResult = runSettlementCalculation(body);

      const newSettlement = {
        ...body,
        ...calcResult,
        id: body.id || `set-${Math.random().toString(36).substr(2, 9)}`,
        settlementNumber: body.settlementNumber || `SET-${2600 + db_settlements.length + 1}`,
        status: body.status || 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null as string | null
      };

      db_settlements.push(newSettlement);
      res.status(201).json({ status: 'success', settlement: newSettlement });
    } catch (err: any) {
      res.status(400).json({ error: 'Failed to save settlement record: ' + err.message });
    }
  });

  // 4. Update a settlement record (will trigger recalculation check if pay info updated)
  app.put('/api/settlements/:id', (req, res) => {
    const { id } = req.params;
    const index = db_settlements.findIndex(s => s.id === id && !s.deleted_at);
    if (index !== -1) {
      try {
        const body = req.body;

        // Transition validation so states cannot be skipped
        if (body.status) {
          const ALLOWED_STATUS_SEQUENCE = ['PENDING', 'RATE_MATCHED', 'ACCESSORIALS_ADDED', 'DISPATCHER_REVIEW', 'APPROVED', 'PAID'];
          const currentStatus = db_settlements[index].status || 'PENDING';
          const targetStatus = body.status;

          if (!ALLOWED_STATUS_SEQUENCE.includes(targetStatus)) {
            return res.status(400).json({ error: `Invalid status: ${targetStatus}` });
          }

          const currentIndex = ALLOWED_STATUS_SEQUENCE.indexOf(currentStatus);
          const targetIndex = ALLOWED_STATUS_SEQUENCE.indexOf(targetStatus);

          if (targetIndex !== currentIndex && targetIndex !== currentIndex + 1) {
            return res.status(400).json({ 
              error: `Invalid transition from '${currentStatus}' to '${targetStatus}'! Transition must flow sequentially: PENDING → RATE_MATCHED → ACCESSORIALS_ADDED → DISPATCHER_REVIEW → APPROVED → PAID. Skipping states is forbidden.` 
            });
          }
        }

        // Merge values
        const mergedParams = {
          ...db_settlements[index],
          ...body
        };
        // Re-run computation
        const calcResult = runSettlementCalculation(mergedParams);

        db_settlements[index] = {
          ...mergedParams,
          ...calcResult,
          updated_at: new Date().toISOString()
        };

        res.json({ status: 'success', settlement: db_settlements[index] });
      } catch (err: any) {
        res.status(400).json({ error: 'Recalculation error: ' + err.message });
      }
    } else {
      res.status(404).json({ error: 'Settlement record not found or has been soft-deleted.' });
    }
  });

  // 5. Delete settlement record (Soft-delete)
  app.delete('/api/settlements/:id', (req, res) => {
    const { id } = req.params;
    const index = db_settlements.findIndex(s => s.id === id && !s.deleted_at);
    if (index !== -1) {
      db_settlements[index] = {
        ...db_settlements[index],
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      res.json({ status: 'success', message: 'Settlement soft-deleted successfully.' });
    } else {
      res.status(404).json({ error: 'Settlement not found or already deleted.' });
    }
  });




  // ==========================================
  // BUILT-IN AUTH + AI BACKEND FOR LOCAL DEV
  // These routes run on the same server as the UI: http://localhost:3000
  // This prevents "Failed to fetch" when the separate Python/Docker backend is not running.
  // ==========================================

  const DEV_DEMO_TOKEN = process.env.DEMO_TOKEN || 'gridtms-demo-token';
  const DEV_OTP = '123456';
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
    if (!token || token !== DEV_DEMO_TOKEN) {
      return res.status(401).json({ detail: 'Login required. Use demo/demo for local testing.' });
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

  app.post('/auth/login/start', (req, res) => {
    const { email, password } = req.body || {};
    if (String(email || '').trim().toLowerCase() === 'demo' && String(password || '') === 'demo') {
      return res.json({ ...makeAuthResult(), direct_login: true });
    }
    // Local no-Supabase mode: return a clear backend response instead of network failure.
    return res.status(400).json({
      detail: 'Local demo backend is running. Use username demo and password demo, or run the FastAPI backend with Supabase service keys for real accounts.'
    });
  });

  app.post('/auth/login/complete', (req, res) => {
    const { challenge_id, otp_code } = req.body || {};
    const challenge = otpChallenges[challenge_id];
    if (!challenge || challenge.purpose !== 'login') return res.status(400).json({ detail: 'Invalid or expired login challenge.' });
    if (String(otp_code) !== DEV_OTP) return res.status(400).json({ detail: 'Invalid 2-step code. In local dev use 123456.' });
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
      message: 'Business verified. Enter the local 2-step code shown below.',
      challenge_id: id,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      dev_otp: DEV_OTP
    });
  });

  app.post('/auth/register/complete', (req, res) => {
    const { challenge_id, otp_code } = req.body || {};
    const challenge = otpChallenges[challenge_id];
    if (!challenge || challenge.purpose !== 'register') return res.status(400).json({ detail: 'Invalid or expired registration challenge.' });
    if (String(otp_code) !== DEV_OTP) return res.status(400).json({ detail: 'Invalid 2-step code. In local dev use 123456.' });
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
    return loc ? `${loc.name || loc.facilityName || 'Location'}${loc.city ? `, ${loc.city}` : ''}${loc.state ? `, ${loc.state}` : ''}` : 'Unknown location';
  }

  function driverName(id: any) {
    const driver = db_drivers.find((d: any) => d.id === id);
    return driver ? `${driver.firstName || ''} ${driver.lastName || ''}`.trim() || driver.name || 'Assigned driver' : 'Unassigned';
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

  app.post('/chat', requireLocalAuth, (req, res) => {
    const message = req.body?.message || '';
    return res.json({ answer: answerFromTmsData(message), source: 'same-origin-express-backend' });
  });

  app.post('/api/chat', requireLocalAuth, (req, res) => {
    const message = req.body?.message || '';
    return res.json({ answer: answerFromTmsData(message), source: 'same-origin-express-backend' });
  });

  // ==========================================
  // VITE APP DEV / PROD MIDDLEWARE INGRESS
  // ==========================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
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
