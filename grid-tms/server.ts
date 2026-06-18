import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Load static initial mock structures
// mockData removed

import { Load, Driver, Location, Truck, Trailer, LoadLineItem, ActivityLogEntry, TmsNotification, TmsDocument, AuditLogEntry } from './src/types';

// In-Memory Data Store (Simulating Database Tables)
let db_customers: any[] = [];
let db_locations: any[] = [];
let db_loads: any[] = [];
let db_drivers: any[] = [];
let db_trucks: any[] = [];
let db_invoices: any[] = [];
let db_trailers: any[] = [];
let db_notifications: any[] = [];
let db_documents: any[] = [];
let db_carrier_profile: any = {
  id: "carrier-1",
  legalName: "Default Carrier"
};
let db_audit_log: any[] = [];

// Audit log helper — records every significant action
function addAuditEntry(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
  const auditEntry: AuditLogEntry = {
    ...entry,
    id: `audit-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };
  db_audit_log.unshift(auditEntry);
  return auditEntry;
}

// Notification helper
function addNotification(notif: Partial<TmsNotification>) {
  const notification: TmsNotification = {
    id: `notif-${Math.random().toString(36).substr(2, 9)}`,
    type: notif.type || 'System',
    title: notif.title || 'Notification',
    message: notif.message || '',
    priority: notif.priority || 'Medium',
    status: 'Unread',
    entityType: notif.entityType,
    entityId: notif.entityId,
    triggerDate: new Date().toISOString().split('T')[0],
    dueDate: notif.dueDate,
    assignedRole: notif.assignedRole,
    taskStatus: notif.taskStatus || undefined,
    createdAt: new Date().toISOString(),
    ...notif,
  } as TmsNotification;
  db_notifications.unshift(notification);
  return notification;
}

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
function calculateLoadPriority(rate: number, miles: number, isExpedited: boolean): { score: number, label: 'Critical' | 'High' | 'Medium' | 'Low' } {
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
  // TRAILERS API (§6 - Equipment Management)
  // ==========================================
  app.get('/api/trailers', (req, res) => {
    const active = db_trailers.filter(t => !t.deleted_at);
    res.json({ status: 'success', data: active });
  });

  app.post('/api/trailers', (req, res) => {
    const body = req.body;
    const newTrailer = {
      ...body,
      id: body.id || `tr-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null as string | null
    };
    db_trailers.push(newTrailer);
    addAuditEntry({ userId: 'admin-1', userName: 'Admin User', action: 'Create', entityType: 'Trailer', entityId: newTrailer.id, entityName: newTrailer.unitNumber, description: `Trailer ${newTrailer.unitNumber} added to fleet` });
    res.status(201).json({ status: 'success', trailer: newTrailer });
  });

  app.put('/api/trailers/:id', (req, res) => {
    const { id } = req.params;
    const index = db_trailers.findIndex(t => t.id === id && !t.deleted_at);
    if (index !== -1) {
      db_trailers[index] = { ...db_trailers[index], ...req.body, updated_at: new Date().toISOString() };
      res.json({ status: 'success', trailer: db_trailers[index] });
    } else {
      res.status(404).json({ error: 'Trailer not found or has been soft-deleted.' });
    }
  });

  app.delete('/api/trailers/:id', (req, res) => {
    const { id } = req.params;
    const index = db_trailers.findIndex(t => t.id === id && !t.deleted_at);
    if (index !== -1) {
      db_trailers[index] = { ...db_trailers[index], deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      res.json({ status: 'success', message: 'Trailer soft-deleted successfully.' });
    } else {
      res.status(404).json({ error: 'Trailer not found or already deleted.' });
    }
  });

  // ==========================================
  // DOCUMENTS API (§10 - Document Management)
  // ==========================================
  app.get('/api/documents', (req, res) => {
    const { entityType, entityId, type, search } = req.query;
    let docs = [...db_documents];
    if (entityType) docs = docs.filter(d => d.entityType === entityType);
    if (entityId) docs = docs.filter(d => d.entityId === entityId);
    if (type) docs = docs.filter(d => d.type === type);
    if (search) docs = docs.filter(d => d.name.toLowerCase().includes((search as string).toLowerCase()));
    res.json({ status: 'success', data: docs });
  });

  app.post('/api/documents', (req, res) => {
    const body = req.body;
    const newDoc = {
      ...body,
      id: body.id || `tdoc-${Math.random().toString(36).substr(2, 9)}`,
      uploadDate: body.uploadDate || new Date().toISOString().split('T')[0],
    };
    db_documents.push(newDoc);
    addAuditEntry({ userId: 'admin-1', userName: 'Admin User', action: 'Create', entityType: 'Document', entityId: newDoc.id, entityName: newDoc.name, description: `Document uploaded: ${newDoc.name} (${newDoc.type})` });
    res.status(201).json({ status: 'success', document: newDoc });
  });

  app.put('/api/documents/:id', (req, res) => {
    const { id } = req.params;
    const index = db_documents.findIndex(d => d.id === id);
    if (index !== -1) {
      db_documents[index] = { ...db_documents[index], ...req.body };
      res.json({ status: 'success', document: db_documents[index] });
    } else {
      res.status(404).json({ error: 'Document not found.' });
    }
  });

  app.delete('/api/documents/:id', (req, res) => {
    const { id } = req.params;
    const index = db_documents.findIndex(d => d.id === id);
    if (index !== -1) {
      db_documents.splice(index, 1);
      res.json({ status: 'success', message: 'Document deleted.' });
    } else {
      res.status(404).json({ error: 'Document not found.' });
    }
  });

  // ==========================================
  // NOTIFICATIONS API (§22 - Notifications & Alerts)
  // ==========================================
  app.get('/api/notifications', (req, res) => {
    const { status, priority, assignedRole } = req.query;
    let notifs = [...db_notifications];
    if (status) notifs = notifs.filter(n => n.status === status);
    if (priority) notifs = notifs.filter(n => n.priority === priority);
    if (assignedRole) notifs = notifs.filter(n => n.assignedRole === assignedRole);
    const unreadCount = db_notifications.filter(n => n.status === 'Unread').length;
    res.json({ status: 'success', data: notifs, unreadCount });
  });

  app.post('/api/notifications', (req, res) => {
    const notification = addNotification(req.body);
    res.status(201).json({ status: 'success', notification });
  });

  app.put('/api/notifications/:id', (req, res) => {
    const { id } = req.params;
    const index = db_notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      db_notifications[index] = { ...db_notifications[index], ...req.body };
      res.json({ status: 'success', notification: db_notifications[index] });
    } else {
      res.status(404).json({ error: 'Notification not found.' });
    }
  });

  // Mark all as read
  app.post('/api/notifications/mark-all-read', (req, res) => {
    const now = new Date().toISOString();
    db_notifications = db_notifications.map(n => n.status === 'Unread' ? { ...n, status: 'Read', readAt: now } : n);
    res.json({ status: 'success', message: 'All notifications marked as read.' });
  });

  // ==========================================
  // CARRIER PROFILE API (§4 - Carrier Setup)
  // ==========================================
  app.get('/api/carrier', (req, res) => {
    res.json({ status: 'success', data: db_carrier_profile });
  });

  app.put('/api/carrier', (req, res) => {
    db_carrier_profile = { ...db_carrier_profile, ...req.body };
    addAuditEntry({ userId: 'admin-1', userName: 'Admin User', action: 'Update', entityType: 'Carrier', entityId: 'carrier-1', entityName: 'Company Profile', description: 'Company profile updated' });
    res.json({ status: 'success', data: db_carrier_profile });
  });

  // Insurance records CRUD
  app.post('/api/carrier/insurance', (req, res) => {
    const body = req.body;
    const newRecord = { ...body, id: body.id || `ins-${Math.random().toString(36).substr(2, 9)}` };
    db_carrier_profile.insuranceRecords = [...(db_carrier_profile.insuranceRecords || []), newRecord];
    res.status(201).json({ status: 'success', record: newRecord });
  });

  app.put('/api/carrier/insurance/:id', (req, res) => {
    const { id } = req.params;
    const records = db_carrier_profile.insuranceRecords || [];
    const index = records.findIndex((r: any) => r.id === id);
    if (index !== -1) {
      records[index] = { ...records[index], ...req.body };
      db_carrier_profile.insuranceRecords = records;
      res.json({ status: 'success', record: records[index] });
    } else {
      res.status(404).json({ error: 'Insurance record not found.' });
    }
  });

  // Credentials CRUD
  app.get('/api/credentials', (req, res) => {
    res.json({ status: 'success', data: db_carrier_profile.credentials || [] });
  });

  app.post('/api/credentials', (req, res) => {
    const body = req.body;
    const newCred = { ...body, id: body.id || `cred-${Math.random().toString(36).substr(2, 9)}` };
    db_carrier_profile.credentials = [...(db_carrier_profile.credentials || []), newCred];
    res.status(201).json({ status: 'success', credential: newCred });
  });

  app.put('/api/credentials/:id', (req, res) => {
    const { id } = req.params;
    const creds = db_carrier_profile.credentials || [];
    const index = creds.findIndex((c: any) => c.id === id);
    if (index !== -1) {
      creds[index] = { ...creds[index], ...req.body };
      db_carrier_profile.credentials = creds;
      res.json({ status: 'success', credential: creds[index] });
    } else {
      res.status(404).json({ error: 'Credential not found.' });
    }
  });

  // ==========================================
  // AUDIT LOG API (§24 - Audit Trail)
  // ==========================================
  app.get('/api/audit-log', (req, res) => {
    const { entityType, entityId, action, limit } = req.query;
    let logs = [...db_audit_log];
    if (entityType) logs = logs.filter(l => l.entityType === entityType);
    if (entityId) logs = logs.filter(l => l.entityId === entityId);
    if (action) logs = logs.filter(l => l.action === action);
    const maxResults = parseInt(limit as string) || 100;
    res.json({ status: 'success', data: logs.slice(0, maxResults), total: logs.length });
  });

  app.post('/api/audit-log', (req, res) => {
    const entry = addAuditEntry(req.body);
    res.status(201).json({ status: 'success', entry });
  });

  // ==========================================
  // COMPLIANCE DISPATCH CHECK API (§8.3 / §5.4)
  // ==========================================
  app.post('/api/compliance/dispatch-check', (req, res) => {
    const { driverId, truckId, trailerId } = req.body;
    const blocks: { entity: string; reason: string; severity: 'hard' | 'warning' }[] = [];

    // Check driver compliance
    if (driverId) {
      const driver = db_drivers.find(d => d.id === driverId && !d.deleted_at);
      if (driver) {
        // CDL expiry check
        if (driver.cdlExpiry) {
          const cdlDate = new Date(driver.cdlExpiry);
          if (cdlDate < new Date()) {
            blocks.push({ entity: 'Driver', reason: `CDL expired on ${driver.cdlExpiry}. Per 49 CFR 391, driver cannot operate a CMV with an expired CDL.`, severity: 'hard' });
          } else if (cdlDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
            blocks.push({ entity: 'Driver', reason: `CDL expires in less than 30 days (${driver.cdlExpiry}).`, severity: 'warning' });
          }
        }
        // Medical card expiry check
        if (driver.medicalCardExpiry) {
          const medDate = new Date(driver.medicalCardExpiry);
          if (medDate < new Date()) {
            blocks.push({ entity: 'Driver', reason: `Medical card expired on ${driver.medicalCardExpiry}. Driver is medically unqualified per 49 CFR 391.43.`, severity: 'hard' });
          } else if (medDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
            blocks.push({ entity: 'Driver', reason: `Medical card expires in less than 30 days (${driver.medicalCardExpiry}).`, severity: 'warning' });
          }
        }
        // Clearinghouse status check
        if ((driver as any).clearinghouseStatus === 'Prohibited') {
          blocks.push({ entity: 'Driver', reason: `Driver has PROHIBITED status in FMCSA Clearinghouse. Return-to-duty process not completed. Per 49 CFR 382, driver cannot perform safety-sensitive functions.`, severity: 'hard' });
        }
        // Drug test check
        if ((driver as any).dispatchEligible === false) {
          blocks.push({ entity: 'Driver', reason: `Driver is not dispatch-eligible. Missing required DQ file items or failed compliance check.`, severity: 'hard' });
        }
      }
    }

    // Check truck compliance
    if (truckId) {
      const truck = db_trucks.find(t => t.id === truckId && !t.deleted_at);
      if (truck) {
        if (truck.status === 'Maintenance' || truck.status === 'Out of Service') {
          blocks.push({ entity: 'Truck', reason: `Truck ${truck.unitNumber} is currently ${truck.status}. Cannot be assigned to a load.`, severity: 'hard' });
        }
        if (truck.annualInspectionExpiry) {
          const inspDate = new Date(truck.annualInspectionExpiry);
          if (inspDate < new Date()) {
            blocks.push({ entity: 'Truck', reason: `Annual DOT inspection expired on ${truck.annualInspectionExpiry}. Per 49 CFR 396.17, operating without valid inspection is an automatic audit failure.`, severity: 'hard' });
          }
        }
        if (truck.registrationExpiry) {
          const regDate = new Date(truck.registrationExpiry);
          if (regDate < new Date()) {
            blocks.push({ entity: 'Truck', reason: `Registration expired on ${truck.registrationExpiry}.`, severity: 'hard' });
          }
        }
      }
    }

    // Check trailer compliance
    if (trailerId) {
      const trailer = db_trailers.find(t => t.id === trailerId && !t.deleted_at);
      if (trailer) {
        if (trailer.status === 'Maintenance' || trailer.status === 'Out of Service') {
          blocks.push({ entity: 'Trailer', reason: `Trailer ${trailer.unitNumber} is currently ${trailer.status}. Cannot be assigned to a load.`, severity: 'hard' });
        }
        if (trailer.annualInspectionExpiry) {
          const inspDate = new Date(trailer.annualInspectionExpiry);
          if (inspDate < new Date()) {
            blocks.push({ entity: 'Trailer', reason: `Annual DOT inspection for trailer expired on ${trailer.annualInspectionExpiry}.`, severity: 'hard' });
          }
        }
      }
    }

    const hardBlocks = blocks.filter(b => b.severity === 'hard');
    const warnings = blocks.filter(b => b.severity === 'warning');
    const canDispatch = hardBlocks.length === 0;

    res.json({
      status: 'success',
      canDispatch,
      hardBlocks,
      warnings,
      totalIssues: blocks.length
    });
  });

  // ==========================================
  // DRIVER DQ FILE API (§5 - Driver Qualification)
  // ==========================================
  app.get('/api/compliance/driver/:id/dq-file', (req, res) => {
    const { id } = req.params;
    const driver = db_drivers.find(d => d.id === id && !d.deleted_at);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found.' });
    }

    // Build DQ file status from driver data
    const now = new Date();
    const items: any[] = [
      { id: 'dq-1', type: 'Employment Application', name: 'Employment Application (391.21)', required: true, dueWithin30Days: true, recurring: false, status: 'Verified', cfr: '391.21' },
      { id: 'dq-2', type: 'MVR', name: 'Motor Vehicle Record at Hire (391.23)', required: true, dueWithin30Days: true, recurring: false, status: 'Verified', cfr: '391.23(a)(1)' },
      {
        id: 'dq-3', type: 'Annual MVR', name: 'Annual MVR Review (391.25)', required: true, recurring: true, recurrenceMonths: 12, status: 'Verified', cfr: '391.25',
        nextDueDate: new Date(now.getFullYear(), now.getMonth() + 2, 1).toISOString().split('T')[0]
      },
      { id: 'dq-4', type: 'Road Test Certificate', name: 'Road Test Certificate (391.31)', required: true, recurring: false, status: 'Verified', cfr: '391.31' },
      { id: 'dq-5', type: 'Safety Performance History', name: 'Previous Employer Investigation (391.23)', required: true, dueWithin30Days: true, recurring: false, status: 'Verified', cfr: '391.23(d)' },
      {
        id: 'dq-6', type: 'Medical Card', name: 'Medical Examiner\'s Certificate (391.43)', required: true, recurring: true,
        expirationDate: driver.medicalCardExpiry,
        status: driver.medicalCardExpiry && new Date(driver.medicalCardExpiry) < now ? 'Expired'
          : driver.medicalCardExpiry && new Date(driver.medicalCardExpiry) < new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) ? 'Expiring' : 'Verified',
        cfr: '391.43'
      },
      {
        id: 'dq-7', type: 'CDL Copy', name: 'Commercial Driver\'s License', required: true,
        expirationDate: driver.cdlExpiry,
        status: driver.cdlExpiry && new Date(driver.cdlExpiry) < now ? 'Expired'
          : driver.cdlExpiry && new Date(driver.cdlExpiry) < new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) ? 'Expiring' : 'Verified',
        cfr: '391.51'
      },
      {
        id: 'dq-8', type: 'Pre-Employment Drug Test', name: 'Pre-Employment Drug Test', required: true, recurring: false,
        status: driver.drugTestDate ? 'Verified' : 'Missing', cfr: '382.301'
      },
      {
        id: 'dq-9', type: 'Clearinghouse Full Query', name: 'Pre-Employment Clearinghouse Full Query', required: true, recurring: false,
        status: 'Verified', cfr: '382 Subpart G'
      },
      {
        id: 'dq-10', type: 'Clearinghouse Annual Query', name: 'Annual Limited Clearinghouse Query', required: true, recurring: true, recurrenceMonths: 12,
        status: 'Verified', cfr: '382 Subpart G',
        nextDueDate: '2027-01-05'
      },
      {
        id: 'dq-11', type: 'Drug Alcohol Policy Acknowledgment', name: 'Drug & Alcohol Policy Signed Acknowledgment', required: true, recurring: false,
        status: 'Verified', cfr: '382.601'
      },
    ];

    const totalRequired = items.filter(i => i.required).length;
    const verified = items.filter(i => i.status === 'Verified' || i.status === 'Received').length;
    const completenessScore = Math.round((verified / totalRequired) * 100);

    const eligibilityBlockReasons: string[] = [];
    items.forEach(item => {
      if (item.status === 'Expired') eligibilityBlockReasons.push(`${item.name} is expired`);
      if (item.status === 'Missing') eligibilityBlockReasons.push(`${item.name} is missing`);
    });

    const dqFile = {
      driverId: id,
      items,
      overallStatus: eligibilityBlockReasons.length > 0 ? 'Action Needed' : 'Qualified',
      dispatchEligible: eligibilityBlockReasons.length === 0,
      eligibilityBlockReasons,
      completenessScore,
    };

    res.json({ status: 'success', data: dqFile });
  });



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
