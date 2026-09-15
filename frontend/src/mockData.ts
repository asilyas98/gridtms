import { Customer, Location, Load, Driver, Truck, Invoice, Settlement, CarrierCompliance } from './types';

export const mockCarrierCompliance: CarrierCompliance = {
  dotNumber: '3829104',
  mcNumber: 'MC-220194',
  insuranceExpiry: '2025-06-15',
  cargoInsuranceExpiry: '2025-08-20',
  boc3Status: 'Filed',
  ucrRegistered: true,
  iftaStatus: 'Active',
  safetyRating: 'Satisfactory',
  mcs150Date: '2024-01-10',
  hazmatRegistrationExpiry: '2025-06-30',
  clearinghouseEnrollment: true
};

export const mockCustomers: Customer[] = [
  {
    id: 'c1',
    name: 'Target Corp',
    code: 'TARGET-001',
    status: 'Active',
    creditLimit: 100000,
    outstandingBalance: 87440,
    address: { street: '1000 Nicollet Mall', city: 'Minneapolis', state: 'MN', zip: '55403', country: 'USA' },
    phone: '(612) 304-6073',
    email: 'ap@target.com'
  },
  {
    id: 'c2',
    name: 'Amazon Logistics',
    code: 'AMZN-022',
    status: 'Active',
    creditLimit: 250000,
    outstandingBalance: 124000,
    address: { street: '410 Terry Ave N', city: 'Seattle', state: 'WA', zip: '98109', country: 'USA' },
    phone: '(206) 266-1000',
    email: 'billing@amazon.com'
  },
  {
    id: 'c3',
    name: 'Midwest Goods Inc',
    code: 'MWGD-014',
    status: 'On Hold',
    creditLimit: 30000,
    outstandingBalance: 39740,
    address: { street: '500 W Madison St', city: 'Chicago', state: 'IL', zip: '60661', country: 'USA' },
    phone: '(312) 555-0199',
    email: 'accounting@mwgoods.com'
  },
  {
    id: 'c4',
    name: 'Costco Wholesale',
    code: 'COSTCO-099',
    status: 'Active',
    creditLimit: 350000,
    outstandingBalance: 0,
    address: { street: '999 Lake Dr', city: 'Issaquah', state: 'WA', zip: '98027', country: 'USA' },
    phone: '(425) 313-8100',
    email: 'ap@costco.com'
  },
  {
    id: 'c5',
    name: 'Walmart Stores',
    code: 'WMT-881',
    status: 'Active',
    creditLimit: 400000,
    outstandingBalance: 0,
    address: { street: '702 SW 8th St', city: 'Bentonville', state: 'AR', zip: '72716', country: 'USA' },
    phone: '(479) 273-4000',
    email: 'billing@walmart.com'
  },
  {
    id: 'c6',
    name: 'Home Depot',
    code: 'HD-552',
    status: 'Active',
    creditLimit: 150000,
    outstandingBalance: 0,
    address: { street: '2455 Paces Ferry Rd NW', city: 'Atlanta', state: 'GA', zip: '30339', country: 'USA' },
    phone: '(770) 433-8211',
    email: 'accounts@homedepot.com'
  },
  {
    id: 'c7',
    name: 'Kroger Co',
    code: 'KROGER-012',
    status: 'Active',
    creditLimit: 120000,
    outstandingBalance: 0,
    address: { street: '1014 Vine St', city: 'Cincinnati', state: 'OH', zip: '45202', country: 'USA' },
    phone: '(513) 762-4000',
    email: 'vendorpay@kroger.com'
  }
];

export const mockLocations: Location[] = [
  {
    id: 'l1',
    name: 'Walmart DC #6029',
    type: 'Both',
    address: { street: '1200 Distribution Blvd', city: 'Bentonville', state: 'AR', zip: '72712', country: 'USA' },
    customerIds: ['c1'],
    avgDetention: '0h 42m'
  },
  {
    id: 'l2',
    name: 'Target Columbus DC',
    type: 'Consignee',
    address: { street: '4500 Distribution Pkwy', city: 'Columbus', state: 'OH', zip: '43219', country: 'USA' },
    customerIds: ['c1'],
    avgDetention: '2h 17m'
  },
  {
    id: 'l3',
    name: 'Chicago Terminal',
    type: 'Terminal',
    address: { street: '4200 W 27th St', city: 'Cicero', state: 'IL', zip: '60804', country: 'USA' },
    customerIds: []
  },
  {
    id: 'l4',
    name: 'Dallas Distribution Hub',
    type: 'Both',
    address: { street: '1500 Interstate 20', city: 'Dallas', state: 'TX', zip: '75201', country: 'USA' },
    customerIds: ['c2', 'c5']
  },
  {
    id: 'l5',
    name: 'Atlanta Regional Center',
    type: 'Both',
    address: { street: '3000 Logistics Dr', city: 'Atlanta', state: 'GA', zip: '30301', country: 'USA' },
    customerIds: ['c1', 'c6']
  },
  {
    id: 'l6',
    name: 'Los Angeles Logistics Port',
    type: 'Shipper',
    address: { street: '500 Harbor Blvd', city: 'Los Angeles', state: 'CA', zip: '90001', country: 'USA' },
    customerIds: ['c4', 'c5']
  },
  {
    id: 'l7',
    name: 'Nashville Transit Depot',
    type: 'Terminal',
    address: { street: '800 Brick Church Pike', city: 'Nashville', state: 'TN', zip: '37207', country: 'USA' },
    customerIds: []
  },
  {
    id: 'l8',
    name: 'Denver Cold Storage',
    type: 'Both',
    address: { street: '4400 Pecos St', city: 'Denver', state: 'CO', zip: '80211', country: 'USA' },
    customerIds: ['c4', 'c7']
  },
  {
    id: 'l9',
    name: 'Houston Freight Yard',
    type: 'Both',
    address: { street: '7100 Industrial Parkway', city: 'Houston', state: 'TX', zip: '77001', country: 'USA' },
    customerIds: ['c6', 'c7']
  },
  {
    id: 'l10',
    name: 'Detroit Auto Plant',
    type: 'Both',
    address: { street: '100 Chrysler Dr', city: 'Detroit', state: 'MI', zip: '48201', country: 'USA' },
    customerIds: ['c3', 'c1']
  }
];

export const mockLoads: Load[] = [
  {
    id: 'ld1',
    loadNumber: 'LD-004521',
    status: 'Invoiced',
    customerId: 'c1',
    originId: 'l3',
    destinationId: 'l2',
    pickupDate: '2024-03-15',
    deliveryDate: '2024-03-15',
    driverId: 'd1',
    truckId: 't1',
    rate: 1039.78,
    miles: 368.2,
    commodity: 'General Merchandise',
    weight: 34200,
    equipmentType: "Dry Van 53'",
    customerPo: '4521-887',
    bolNumber: '892334',
    serviceLevel: 'Standard',
    lineItems: [
      { id: 'li1', description: 'Linehaul Rate', amount: 950.00, type: 'Revenue' },
      { id: 'li2', description: 'Fuel Surcharge', amount: 89.78, type: 'Revenue' }
    ],
    documents: [
      { id: 'doc1', name: 'Rate Confirmation', type: 'System', date: '2024-03-12' },
      { id: 'doc2', name: 'Bill of Lading', type: 'System', date: '2024-03-15' },
      { id: 'doc3', name: 'Scale Ticket', type: 'Upload', date: '2024-03-15' }
    ],
    activityLog: [
      { id: 'log1', user: 'Sarah Jenkins', action: 'Load dispatched to Marcus Williams', date: 'Mar 15, 06:12 AM', type: 'status' },
      { id: 'log2', user: 'System Relay', action: 'GPS Tracking Link generated', date: 'Mar 15, 06:15 AM', type: 'system' },
      { id: 'log3', user: 'Driver App', action: 'Arrived at Shipper pickup location', date: 'Mar 15, 08:22 AM', type: 'status' },
      { id: 'log4', user: 'Driver App', action: 'Sign-off complete. Documents uploaded.', date: 'Mar 15, 09:51 AM', type: 'document' },
      { id: 'log5', user: 'Driver App', action: 'Status advanced to IN TRANSIT', date: 'Mar 15, 10:08 AM', type: 'status' },
    ]
  },
  {
    id: 'ld2',
    loadNumber: 'LD-004520',
    status: 'Paid',
    customerId: 'c2',
    originId: 'l1',
    destinationId: 'l2',
    pickupDate: '2024-03-15',
    deliveryDate: '2024-03-16',
    driverId: 'd2',
    truckId: 't2',
    rate: 1247.50,
    miles: 512,
    commodity: 'Electronics',
    weight: 28000,
    equipmentType: "Dry Van 53'",
    customerPo: '8833-221',
    bolNumber: '772102',
    serviceLevel: 'Expedited',
    lineItems: [
      { id: 'li3', description: 'Linehaul Rate', amount: 1100.00, type: 'Revenue' },
      { id: 'li4', description: 'Fuel Surcharge', amount: 147.50, type: 'Revenue' },
      { id: 'li5', description: 'Lumper Fee', amount: 150.00, type: 'Expense' }
    ]
  },
  {
    id: 'ld3',
    loadNumber: 'LD-004523',
    status: 'Created',
    customerId: 'c3',
    originId: 'l3',
    destinationId: 'l1',
    pickupDate: '2024-03-20',
    deliveryDate: '2024-03-21',
    rate: 1450.00,
    miles: 650,
    commodity: 'Consumer Goods',
    weight: 42000,
    equipmentType: "Dry Van 53'",
    customerPo: '9921-115',
    bolNumber: '665103',
    serviceLevel: 'Standard',
    lineItems: [
      { id: 'li6', description: 'Linehaul Rate', amount: 1300.00, type: 'Revenue' },
      { id: 'li7', description: 'Fuel Surcharge', amount: 150.00, type: 'Revenue' }
    ],
    documents: [
      { id: 'doc4', name: 'Rate Confirmation', type: 'System', date: '2024-03-18' }
    ],
    activityLog: [
      { id: 'log6', user: 'Sarah Jenkins', action: 'Load entered into system', date: 'Mar 18, 02:45 PM', type: 'status' }
    ]
  },
  
  // Marcus Williams (d1) Loads for week May 17, 2026 - May 23, 2026
  {
    id: 'ld-m1',
    loadNumber: 'LD-005001',
    status: 'Delivered',
    customerId: 'c1',
    originId: 'l3',
    destinationId: 'l2',
    pickupDate: '2026-05-17',
    deliveryDate: '2026-05-18',
    driverId: 'd1',
    truckId: 't1',
    rate: 1250.00,
    miles: 350,
    commodity: 'Paper Products',
    weight: 24000,
    equipmentType: "Dry Van 53'",
    customerPo: 'PO-882291',
    bolNumber: 'BOL-100221',
    serviceLevel: 'Standard',
    lineItems: [
      { id: 'li-m1-1', description: 'Linehaul Rate', amount: 1100.00, type: 'Revenue' },
      { id: 'li-m1-2', description: 'Fuel Surcharge', amount: 150.00, type: 'Revenue' }
    ]
  },
  {
    id: 'ld-m2',
    loadNumber: 'LD-005002',
    status: 'Delivered',
    customerId: 'c4',
    originId: 'l2',
    destinationId: 'l5',
    pickupDate: '2026-05-19',
    deliveryDate: '2026-05-19',
    driverId: 'd1',
    truckId: 't1',
    rate: 1850.00,
    miles: 560,
    commodity: 'Bulk Groceries',
    weight: 38000,
    equipmentType: "Dry Van 53'",
    customerPo: 'PO-338290',
    bolNumber: 'BOL-449102',
    serviceLevel: 'Express',
    lineItems: [
      { id: 'li-m2-1', description: 'Linehaul Rate', amount: 1650.00, type: 'Revenue' },
      { id: 'li-m2-2', description: 'Fuel Surcharge', amount: 200.00, type: 'Revenue' }
    ]
  },
  {
    id: 'ld-m3',
    loadNumber: 'LD-005003',
    status: 'Delivered',
    customerId: 'c2',
    originId: 'l5',
    destinationId: 'l7',
    pickupDate: '2026-05-20',
    deliveryDate: '2026-05-21',
    driverId: 'd1',
    truckId: 't1',
    rate: 950.00,
    miles: 250,
    commodity: 'Electronics',
    weight: 15000,
    equipmentType: "Dry Van 53'",
    customerPo: 'PO-110293',
    bolNumber: 'BOL-332910',
    serviceLevel: 'Standard',
    lineItems: [
      { id: 'li-m3-1', description: 'Linehaul Rate', amount: 850.00, type: 'Revenue' },
      { id: 'li-m3-2', description: 'Fuel Surcharge', amount: 100.00, type: 'Revenue' }
    ]
  },
  {
    id: 'ld-m4',
    loadNumber: 'LD-005004',
    status: 'Delivered',
    customerId: 'c5',
    originId: 'l7',
    destinationId: 'l1',
    pickupDate: '2026-05-22',
    deliveryDate: '2026-05-22',
    driverId: 'd1',
    truckId: 't1',
    rate: 1450.00,
    miles: 480,
    commodity: 'Household Goods',
    weight: 31000,
    equipmentType: "Dry Van 53'",
    customerPo: 'PO-551102',
    bolNumber: 'BOL-667102',
    serviceLevel: 'Standard',
    lineItems: [
      { id: 'li-m4-1', description: 'Linehaul Rate', amount: 1300.00, type: 'Revenue' },
      { id: 'li-m4-2', description: 'Fuel Surcharge', amount: 150.00, type: 'Revenue' }
    ]
  },

  // Sarah Peterson (d2) Loads for week May 17, 2026 - May 23, 2026
  {
    id: 'ld-s1',
    loadNumber: 'LD-005005',
    status: 'Delivered',
    customerId: 'c2',
    originId: 'l1',
    destinationId: 'l4',
    pickupDate: '2026-05-17',
    deliveryDate: '2026-05-17',
    driverId: 'd2',
    truckId: 't2',
    rate: 1100.00,
    miles: 340,
    commodity: 'Parcel Post',
    weight: 18000,
    equipmentType: "Dry Van 53'",
    customerPo: 'PO-002194',
    bolNumber: 'BOL-551029',
    serviceLevel: 'Expedited',
    lineItems: [
      { id: 'li-s1-1', description: 'Linehaul Rate', amount: 1000.00, type: 'Revenue' },
      { id: 'li-s1-2', description: 'Fuel Surcharge', amount: 100.00, type: 'Revenue' }
    ]
  },
  {
    id: 'ld-s2',
    loadNumber: 'LD-005006',
    status: 'Delivered',
    customerId: 'c6',
    originId: 'l4',
    destinationId: 'l9',
    pickupDate: '2026-05-18',
    deliveryDate: '2026-05-19',
    driverId: 'd2',
    truckId: 't2',
    rate: 800.00,
    miles: 240,
    commodity: 'Lumber & Hardware',
    weight: 44000,
    equipmentType: "Dry Van 53'",
    customerPo: 'PO-992104',
    bolNumber: 'BOL-882194',
    serviceLevel: 'Standard',
    lineItems: [
      { id: 'li-s2-1', description: 'Linehaul Rate', amount: 700.00, type: 'Revenue' },
      { id: 'li-s2-2', description: 'Fuel Surcharge', amount: 100.00, type: 'Revenue' }
    ]
  },
  {
    id: 'ld-s3',
    loadNumber: 'LD-005020',
    status: 'Delivered',
    customerId: 'c7',
    originId: 'l9',
    destinationId: 'l8',
    pickupDate: '2026-05-20',
    deliveryDate: '2026-05-20',
    driverId: 'd2',
    truckId: 't2',
    rate: 2400.00,
    miles: 880,
    commodity: 'Fresh Produce',
    weight: 35000,
    equipmentType: "Dry Van 53'",
    customerPo: 'PO-772110',
    bolNumber: 'BOL-990142',
    serviceLevel: 'Standard',
    lineItems: [
      { id: 'li-s3-1', description: 'Linehaul Rate', amount: 2150.00, type: 'Revenue' },
      { id: 'li-s3-2', description: 'Fuel Surcharge', amount: 250.00, type: 'Revenue' }
    ]
  },
  {
    id: 'ld-s4',
    loadNumber: 'LD-005008',
    status: 'Delivered',
    customerId: 'c4',
    originId: 'l8',
    destinationId: 'l6',
    pickupDate: '2026-05-22',
    deliveryDate: '2026-05-22',
    driverId: 'd2',
    truckId: 't2',
    rate: 2900.00,
    miles: 1050,
    commodity: 'Apparel',
    weight: 22000,
    equipmentType: "Dry Van 53'",
    customerPo: 'PO-662104',
    bolNumber: 'BOL-110299',
    serviceLevel: 'Standard',
    lineItems: [
      { id: 'li-s4-1', description: 'Linehaul Rate', amount: 2600.00, type: 'Revenue' },
      { id: 'li-s4-2', description: 'Fuel Surcharge', amount: 300.00, type: 'Revenue' }
    ]
  },

  // David Rodriguez (d3) Loads for week May 17, 2026 - May 23, 2026
  {
    id: 'ld-d1',
    loadNumber: 'LD-005009',
    status: 'Delivered',
    customerId: 'c5',
    originId: 'l6',
    destinationId: 'l4',
    pickupDate: '2026-05-18',
    deliveryDate: '2026-05-18',
    driverId: 'd3',
    truckId: 't3',
    rate: 3200.00,
    miles: 1400,
    commodity: 'Toys & Games',
    weight: 29000,
    equipmentType: "Reefer 53'",
    customerPo: 'PO-119402',
    bolNumber: 'BOL-221049',
    serviceLevel: 'Standard',
    lineItems: [
      { id: 'li-d1-1', description: 'Linehaul Rate', amount: 2900.00, type: 'Revenue' },
      { id: 'li-d1-2', description: 'Fuel Surcharge', amount: 300.00, type: 'Revenue' }
    ]
  },
  {
    id: 'ld-d2',
    loadNumber: 'LD-005010',
    status: 'Delivered',
    customerId: 'c6',
    originId: 'l4',
    destinationId: 'l10',
    pickupDate: '2026-05-20',
    deliveryDate: '2026-05-20',
    driverId: 'd3',
    truckId: 't3',
    rate: 2600.00,
    miles: 1200,
    commodity: 'Power Tools',
    weight: 40000,
    equipmentType: "Reefer 53'",
    customerPo: 'PO-882019',
    bolNumber: 'BOL-773012',
    serviceLevel: 'Standard',
    lineItems: [
      { id: 'li-d2-1', description: 'Linehaul Rate', amount: 2350.00, type: 'Revenue' },
      { id: 'li-d2-2', description: 'Fuel Surcharge', amount: 250.00, type: 'Revenue' }
    ]
  },
  {
    id: 'ld-d3',
    loadNumber: 'LD-005011',
    status: 'Delivered',
    customerId: 'c3',
    originId: 'l10',
    destinationId: 'l3',
    pickupDate: '2026-05-21',
    deliveryDate: '2026-05-22',
    driverId: 'd3',
    truckId: 't3',
    rate: 900.00,
    miles: 280,
    commodity: 'Auto Parts',
    weight: 41000,
    equipmentType: "Reefer 53'",
    customerPo: 'PO-551023',
    bolNumber: 'BOL-994412',
    serviceLevel: 'Standard',
    lineItems: [
      { id: 'li-d3-1', description: 'Linehaul Rate', amount: 800.00, type: 'Revenue' },
      { id: 'li-d3-2', description: 'Fuel Surcharge', amount: 100.00, type: 'Revenue' }
    ]
  },
  {
    id: 'ld-d4',
    loadNumber: 'LD-005012',
    status: 'Delivered',
    customerId: 'c1',
    originId: 'l3',
    destinationId: 'l2',
    pickupDate: '2026-05-23',
    deliveryDate: '2026-05-23',
    driverId: 'd3',
    truckId: 't3',
    rate: 1150.00,
    miles: 350,
    commodity: 'Home Decor',
    weight: 20000,
    equipmentType: "Reefer 53'",
    customerPo: 'PO-448291',
    bolNumber: 'BOL-774402',
    serviceLevel: 'Standard',
    lineItems: [
      { id: 'li-d4-1', description: 'Linehaul Rate', amount: 1000.00, type: 'Revenue' },
      { id: 'li-d4-2', description: 'Fuel Surcharge', amount: 150.00, type: 'Revenue' }
    ]
  },

  // Michael Chen (d4) Loads for week May 17, 2026 - May 23, 2026
  {
    id: 'ld-c1',
    loadNumber: 'LD-005013',
    status: 'Delivered',
    customerId: 'c7',
    originId: 'l2',
    destinationId: 'l7',
    pickupDate: '2026-05-17',
    deliveryDate: '2026-05-17',
    driverId: 'd4',
    rate: 1300.00,
    miles: 380,
    commodity: 'Dry Groceries',
    weight: 32000,
    equipmentType: "Dry Van 53'",
    customerPo: 'PO-229104',
    bolNumber: 'BOL-338290',
    serviceLevel: 'Standard',
    lineItems: [
      { id: 'li-c1-1', description: 'Linehaul Rate', amount: 1150.00, type: 'Revenue' },
      { id: 'li-c1-2', description: 'Fuel Surcharge', amount: 150.00, type: 'Revenue' }
    ]
  },
  {
    id: 'ld-c2',
    loadNumber: 'LD-005014',
    status: 'Delivered',
    customerId: 'c3',
    originId: 'l7',
    destinationId: 'l5',
    pickupDate: '2026-05-19',
    deliveryDate: '2026-05-19',
    driverId: 'd4',
    rate: 1000.00,
    miles: 250,
    commodity: 'Beverages',
    weight: 43000,
    equipmentType: "Dry Van 53'",
    customerPo: 'PO-118833',
    bolNumber: 'BOL-229910',
    serviceLevel: 'Standard',
    lineItems: [
      { id: 'li-c2-1', description: 'Linehaul Rate', amount: 900.00, type: 'Revenue' },
      { id: 'li-c2-2', description: 'Fuel Surcharge', amount: 100.00, type: 'Revenue' }
    ]
  },
  {
    id: 'ld-c3',
    loadNumber: 'LD-005015',
    status: 'Delivered',
    customerId: 'c1',
    originId: 'l5',
    destinationId: 'l4',
    pickupDate: '2026-05-21',
    deliveryDate: '2026-05-21',
    driverId: 'd4',
    rate: 2100.00,
    miles: 780,
    commodity: 'Seasonal Items',
    weight: 19000,
    equipmentType: "Dry Van 53'",
    customerPo: 'PO-330491',
    bolNumber: 'BOL-449901',
    serviceLevel: 'Standard',
    lineItems: [
      { id: 'li-c3-1', description: 'Linehaul Rate', amount: 1900.00, type: 'Revenue' },
      { id: 'li-c3-2', description: 'Fuel Surcharge', amount: 200.00, type: 'Revenue' }
    ]
  },
  {
    id: 'ld-c4',
    loadNumber: 'LD-005016',
    status: 'Delivered',
    customerId: 'c2',
    originId: 'l4',
    destinationId: 'l10',
    pickupDate: '2026-05-22',
    deliveryDate: '2026-05-23',
    driverId: 'd4',
    rate: 2800.00,
    miles: 1200,
    commodity: 'Office Supplies',
    weight: 26000,
    equipmentType: "Dry Van 53'",
    customerPo: 'PO-550192',
    bolNumber: 'BOL-660144',
    serviceLevel: 'Standard',
    lineItems: [
      { id: 'li-c4-1', description: 'Linehaul Rate', amount: 2500.00, type: 'Revenue' },
      { id: 'li-c4-2', description: 'Fuel Surcharge', amount: 300.00, type: 'Revenue' }
    ]
  }
];

export const mockDrivers: Driver[] = [
  {
    id: 'd1',
    name: 'Marcus Williams',
    currentLocation: 'Chicago, IL',
    status: 'On Load',
    cdlClass: 'A',
    endorsements: ['H', 'N'],
    hosAvailable: '5h 12m',
    score: 82,
    truckId: 't1',
    medicalCardExpiry: '2025-11-20',
    cdlExpiry: '2027-04-12',
    drugTestDate: '2024-02-15',
    hosViolations: 0,
    hosDutyStatus: 'Driving',
    complianceDocs: [
      { id: 'cdd1', name: 'MVR Report', type: 'MVR', expiryDate: '2025-03-01', status: 'Valid' },
      { id: 'cdd2', name: 'Drug Test Result', type: 'Medical', expiryDate: '2025-05-15', status: 'Valid' }
    ]
  },
  {
    id: 'd2',
    name: 'Sarah Peterson',
    currentLocation: 'Indianapolis, IN',
    status: 'Available',
    cdlClass: 'A',
    endorsements: ['T', 'X'],
    hosAvailable: '11h 00m',
    score: 95,
    truckId: 't2',
    medicalCardExpiry: '2025-08-15',
    cdlExpiry: '2026-10-10',
    drugTestDate: '2024-03-01',
    hosViolations: 0,
    hosDutyStatus: 'Off Duty'
  },
  {
    id: 'd3',
    name: 'David Rodriguez',
    currentLocation: 'Columbus, OH',
    status: 'Available',
    cdlClass: 'A',
    endorsements: [],
    hosAvailable: '8h 45m',
    score: 88,
    truckId: 't3',
    hosDutyStatus: 'Off Duty'
  },
  {
    id: 'd4',
    name: 'Michael Chen',
    currentLocation: 'St. Louis, MO',
    status: 'Off Duty',
    cdlClass: 'A',
    endorsements: ['P'],
    hosAvailable: '0h 00m',
    score: 91,
    hosDutyStatus: 'Off Duty'
  },
  {
    id: 'd5',
    name: 'James Harrison',
    phone: '555-0105',
    emergencyName: 'Jane Harrison',
    emergencyPhone: '555-1105',
    cdlNumber: 'CDL-55555',
    currentLocation: 'Atlanta, GA',
    status: 'Available',
    cdlClass: 'A',
    endorsements: ['T', 'N'],
    hosAvailable: '10h 30m',
    score: 98,
    truckId: 't5',
    medicalCardExpiry: '2027-05-10',
    cdlExpiry: '2028-12-11',
    drugTestDate: '2026-04-10',
    hosViolations: 0,
    hosDutyStatus: 'Off Duty',
    complianceDocs: [
      { id: 'cdd5-1', name: 'MVR Report', type: 'MVR', expiryDate: '2027-05-10', status: 'Valid' },
      { id: 'cdd5-2', name: 'Drug Test Result', type: 'Medical', expiryDate: '2027-04-10', status: 'Valid' }
    ]
  },
  {
    id: 'd6',
    name: 'Robert Jenkins',
    phone: '555-0106',
    emergencyName: 'Mary Jenkins',
    emergencyPhone: '555-1106',
    cdlNumber: 'CDL-66666',
    currentLocation: 'Dallas, TX',
    status: 'Available',
    cdlClass: 'A',
    endorsements: ['X'],
    hosAvailable: '9h 15m',
    score: 92,
    truckId: 't6',
    medicalCardExpiry: '2027-11-05',
    cdlExpiry: '2027-08-20',
    drugTestDate: '2026-01-20',
    hosViolations: 0,
    hosDutyStatus: 'Off Duty',
    complianceDocs: [
      { id: 'cdd6-1', name: 'MVR Report', type: 'MVR', expiryDate: '2027-11-05', status: 'Valid' },
      { id: 'cdd6-2', name: 'Drug Test Result', type: 'Medical', expiryDate: '2027-01-20', status: 'Valid' }
    ]
  }
];

export const mockTrucks: Truck[] = [
  {
    id: 't1',
    unitNumber: 'TR-1042',
    makeModel: '2022 Peterbilt 579',
    type: "Dry Van 53'",
    currentLocation: 'Chicago, IL',
    status: 'In Use',
    pmStatus: 'Current',
    driverId: 'd1',
    registrationExpiry: '2025-12-31',
    annualInspectionExpiry: '2025-05-10',
    complianceDocs: [
      { id: 'ctd1', name: 'Cab Card', type: 'Registration', expiryDate: '2025-12-31', status: 'Valid' },
      { id: 'ctd2', name: 'Annual Inspection', type: 'DOT Inspection', expiryDate: '2025-05-10', status: 'Valid' }
    ]
  },
  {
    id: 't2',
    unitNumber: 'TR-2088',
    makeModel: '2023 Kenworth T680',
    type: "Dry Van 53'",
    currentLocation: 'Indianapolis, IN',
    status: 'Available',
    pmStatus: 'Current',
    driverId: 'd2'
  },
  {
    id: 't3',
    unitNumber: 'TR-3012',
    makeModel: '2021 Freightliner Cascadia',
    type: "Reefer 53'",
    currentLocation: 'Columbus, OH',
    status: 'Available',
    pmStatus: 'Due',
    driverId: 'd3'
  },
  {
    id: 't4',
    unitNumber: 'TR-4055',
    makeModel: '2022 Volvo VNL',
    type: "Dry Van 53'",
    currentLocation: 'St. Louis, MO',
    status: 'Available',
    pmStatus: 'Current'
  },
  {
    id: 't5',
    unitNumber: 'TR-5022',
    makeModel: '2024 Peterbilt 579',
    type: "Reefer 53'",
    currentLocation: 'Atlanta, GA',
    status: 'Available',
    pmStatus: 'Current',
    driverId: 'd5',
    registrationExpiry: '2027-12-31',
    annualInspectionExpiry: '2027-05-15',
    complianceDocs: [
      { id: 'ctd5-1', name: 'Cab Card', type: 'Registration', expiryDate: '2027-12-31', status: 'Valid' },
      { id: 'ctd5-2', name: 'Annual Inspection', type: 'DOT Inspection', expiryDate: '2027-05-15', status: 'Valid' }
    ]
  },
  {
    id: 't6',
    unitNumber: 'TR-6190',
    makeModel: '2023 Kenworth T680',
    type: "Dry Van 53'",
    currentLocation: 'Dallas, TX',
    status: 'Available',
    pmStatus: 'Current',
    driverId: 'd6',
    registrationExpiry: '2027-09-30',
    annualInspectionExpiry: '2027-04-20',
    complianceDocs: [
      { id: 'ctd6-1', name: 'Cab Card', type: 'Registration', expiryDate: '2027-09-30', status: 'Valid' },
      { id: 'ctd6-2', name: 'Annual Inspection', type: 'DOT Inspection', expiryDate: '2027-04-20', status: 'Valid' }
    ]
  }
];

export const mockInvoices: Invoice[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2024-55102',
    loadId: 'ld1',
    customerId: 'c1',
    date: '2024-03-16',
    dueDate: '2024-04-15',
    amount: 1039.78,
    status: 'Sent'
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2024-55105',
    loadId: 'ld2',
    customerId: 'c2',
    date: '2024-03-17',
    dueDate: '2024-04-16',
    amount: 1247.50,
    status: 'Paid'
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV-2024-55106',
    loadId: 'ld4',
    customerId: 'c4',
    date: '2024-02-15',
    dueDate: '2024-03-15',
    amount: 1550.00,
    status: 'Overdue'
  },
  {
    id: 'inv-4',
    invoiceNumber: 'INV-2024-55107',
    loadId: 'ld5',
    customerId: 'c5',
    date: '2024-03-20',
    dueDate: '2024-04-20',
    amount: 2100.00,
    status: 'Rejected',
    rejectionReason: 'Missing signed BOL and lumper receipts. Please revise and resubmit.'
  },
  {
    id: 'inv-5',
    invoiceNumber: 'INV-2024-55108',
    loadId: 'ld3',
    customerId: 'c3',
    date: '2024-03-25',
    dueDate: '2024-04-25',
    amount: 850.50,
    status: 'Disputed',
    disputeReason: 'Rate confirmation shows $800.00 linehaul, but invoiced for $850.50. Waiting for clarification.'
  }
];
