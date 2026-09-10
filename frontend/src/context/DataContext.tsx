import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Customer, Location, Load, Driver, Truck, Invoice, Settlement, LoadStatus, ActivityLogEntry, LoadLineItem, CarrierCompliance, RecurringRule } from '../types';
import { backendFetch } from '../lib/backendApi';

interface DataContextType {
  customers: Customer[];
  locations: Location[];
  loads: Load[];
  drivers: Driver[];
  trucks: Truck[];
  invoices: Invoice[];
  carrierCompliance: CarrierCompliance;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  navigationIntent: { view: string; action?: string; driverId?: string; truckId?: string; tab?: string; returnTo?: string; returnData?: any; } | null;
  setNavigationIntent: React.Dispatch<React.SetStateAction<{ view: string; action?: string; driverId?: string; truckId?: string; tab?: string; returnTo?: string; returnData?: any; } | null>>;
  recurringRules: RecurringRule[];
  loadRecurringRules: () => Promise<void>;
  addRecurringRule: (rule: Omit<RecurringRule, 'id'>) => Promise<string>;
  updateRecurringRule: (id: string, updates: Partial<RecurringRule>) => Promise<void>;
  deleteRecurringRule: (id: string) => Promise<void>;
  companySettings: {
    carrierName: string;
    dotNumber: string;
    mcNumber: string;
    scacCode: string;
    address: string;
    currency: string;
    timezone: string;
    primaryColor: string;
    autoInvoice: boolean;
    eledIntegration: string;
    factoringPartner: string;
    quickBooksConnected: boolean;
  };
  setCompanySettings: React.Dispatch<React.SetStateAction<{
    carrierName: string;
    dotNumber: string;
    mcNumber: string;
    scacCode: string;
    address: string;
    currency: string;
    timezone: string;
    primaryColor: string;
    autoInvoice: boolean;
    eledIntegration: string;
    factoringPartner: string;
    quickBooksConnected: boolean;
  }>>;
  addLoad: (load: Omit<Load, 'id' | 'loadNumber'>) => string;
  updateLoad: (id: string, updates: Partial<Load>) => void;
  duplicateLoad: (id: string) => void;
  deleteLoad: (id: string) => void;
  addLoadItem: (loadId: string, item: Omit<LoadLineItem, 'id'>) => void;
  removeLoadItem: (loadId: string, itemId: string) => void;
  addDocument: (loadId: string, doc: { name: string; type: string }) => void;
  removeDocument: (loadId: string, docId: string) => void;
  advanceLoadStatus: (id: string) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'code'>) => string;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addLocation: (location: Omit<Location, 'id'>) => string;
  updateLocation: (id: string, updates: Partial<Location>) => void;
  deleteLocation: (id: string) => void;
  addDriver: (driver: Omit<Driver, 'id' | 'truckId'>) => void;
  updateDriver: (id: string, updates: Partial<Driver>) => void;
  addTruck: (truck: Omit<Truck, 'id' | 'driverId'>) => void;
  updateTruck: (id: string, updates: Partial<Truck>) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  assignTruckToDriver: (driverId: string, truckId: string | null) => void;
  generateInvoice: (loadId: string, overrides?: Partial<Invoice>) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const emptyAddress = { street: '', city: '', state: '', zip: '', country: 'USA' };

const emptyCarrierCompliance: CarrierCompliance = {
  dotNumber: '',
  mcNumber: '',
  insuranceExpiry: '',
  cargoInsuranceExpiry: '',
  boc3Status: '',
  ucrRegistered: false,
  iftaStatus: '',
  safetyRating: '',
  mcs150Date: '',
  clearinghouseEnrollment: false,
};

const nowIso = () => new Date().toISOString();
const tempId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
const normalizeStatus = (status: any, fallback: any) => {
  if (!status) return fallback;
  const cleaned = String(status).replace(/_/g, ' ').toLowerCase();
  return cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

function toCustomer(row: any): Customer {
  return {
    id: row.id,
    name: row.company_name || row.name || row.full_name || 'Unnamed Customer',
    code: row.code || row.customer_code || String(row.company_name || row.full_name || 'CUST').slice(0, 6).toUpperCase(),
    status: normalizeStatus(row.status, 'Active') as Customer['status'],
    creditLimit: Number(row.credit_limit ?? row.creditLimit ?? 0),
    outstandingBalance: Number(row.credit_used ?? row.outstanding_balance ?? row.outstandingBalance ?? 0),
    address: {
      street: row.address || row.street || '',
      city: row.city || '',
      state: row.state || '',
      zip: row.zip || '',
      country: row.country || 'USA',
    },
    phone: row.phone || '',
    email: row.email || '',
    paymentTerms: row.payment_terms || row.paymentTerms || 'Net 30 Days',
    billingDeliveryMethod: row.billing_delivery_method || row.billingDeliveryMethod || 'Email PDF',
    notes: row.notes || '',
  };
}

function customerToDb(customer: Partial<Customer>) {
  return {
    company_name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address?.street,
    city: customer.address?.city,
    state: customer.address?.state,
    zip: customer.address?.zip,
    status: customer.status || 'Active',
    credit_limit: customer.creditLimit ?? 0,
    credit_used: customer.outstandingBalance ?? 0,
    payment_terms: customer.paymentTerms || 'Net 30 Days',
  };
}

function toLocation(row: any): Location {
  return {
    id: row.id,
    name: row.name || 'Unnamed Location',
    type: normalizeStatus(row.location_type || row.type, 'Shipper') as Location['type'],
    address: {
      street: row.address || row.street || '',
      city: row.city || '',
      state: row.state || '',
      zip: row.zip || '',
      country: row.country || 'USA',
      lat: row.lat ? Number(row.lat) : undefined,
      lng: row.lng ? Number(row.lng) : undefined,
    },
    customerIds: row.customer_ids || row.customerIds || [],
    avgDetention: row.detention_average || row.avgDetention || row.avg_detention || '',
    contactName: row.contact_name || '',
    contactPhone: row.contact_phone || '',
    contactEmail: row.contact_email || '',
    operatingHours: row.operating_hours || '',
    notes: row.notes || '',
  };
}

function locationToDb(location: Partial<Location>) {
  return {
    name: location.name,
    location_type: location.type || 'Shipper',
    address: location.address?.street,
    city: location.address?.city,
    state: location.address?.state,
    zip: location.address?.zip,
    connected_account: location.customerIds?.join(', ') || '',
    detention_average: location.avgDetention,
    contact_name: location.contactName,
    contact_phone: location.contactPhone,
    contact_email: location.contactEmail,
    operating_hours: location.operatingHours,
    notes: location.notes,
  };
}

function toDriver(row: any): Driver {
  return {
    id: row.id,
    name: row.full_name || row.name || 'Unnamed Driver',
    currentLocation: row.current_location || row.currentLocation || '',
    status: normalizeStatus(row.status, 'Available') as Driver['status'],
    cdlClass: row.cdl_class || row.cdlClass || 'CDL A',
    endorsements: row.endorsements || [],
    hosAvailable: row.hos_available || row.hosAvailable || '',
    score: Number(row.score ?? 0),
    truckId: row.truck_id || row.truckId || undefined,
    hosDutyStatus: normalizeStatus(row.hos_duty_status || row.hosDutyStatus, 'Off Duty') as Driver['hosDutyStatus'],
    phone: row.phone || '',
    email: row.email || '',
    cdlNumber: row.license_number || row.cdl_number || row.cdlNumber || '',
    type: row.driver_type || row.type || 'Company Driver',
  };
}

function driverToDb(driver: Partial<Driver>) {
  return {
    full_name: driver.name,
    phone: driver.phone,
    email: driver.email,
    status: driver.status || 'Available',
    license_number: driver.cdlNumber,
    hos_available: driver.hosAvailable,
    current_location: driver.currentLocation,
    cdl_class: driver.cdlClass,
    score: driver.score ?? 0,
    truck_id: driver.truckId || null,
    hos_duty_status: driver.hosDutyStatus || 'Off Duty',
    driver_type: driver.type,
  };
}

function toTruck(row: any): Truck {
  return {
    id: row.id,
    unitNumber: row.unit_number || row.unitNumber || '',
    makeModel: row.make_model || row.makeModel || '',
    type: row.truck_type || row.type || 'Tractor',
    currentLocation: row.current_location || row.currentLocation || '',
    status: normalizeStatus(row.status, 'Available') as Truck['status'],
    pmStatus: normalizeStatus(row.pm_status || row.pmStatus, 'Current') as Truck['pmStatus'],
    driverId: row.driver_id || row.driverId || undefined,
    vin: row.vin || '',
    plateNumber: row.plate_number || row.plateNumber || '',
  };
}

function truckToDb(truck: Partial<Truck>) {
  return {
    unit_number: truck.unitNumber,
    make_model: truck.makeModel,
    truck_type: truck.type,
    vin: truck.vin,
    plate_number: truck.plateNumber,
    status: truck.status || 'Available',
    current_location: truck.currentLocation,
    pm_status: truck.pmStatus || 'Current',
    driver_id: truck.driverId || null,
  };
}

function toLoad(row: any): Load {
  return {
    id: row.id,
    loadNumber: row.load_number || row.loadNumber || '',
    status: normalizeStatus(row.status, 'Created') as LoadStatus,
    customerId: row.customer_id || row.customerId || '',
    originId: row.origin_id || row.originId || '',
    destinationId: row.destination_id || row.destinationId || '',
    pickupDate: row.pickup_date || row.pickupDate || '',
    deliveryDate: row.delivery_date || row.deliveryDate || '',
    driverId: row.driver_id || row.driverId || undefined,
    truckId: row.truck_id || row.truckId || undefined,
    rate: Number(row.revenue ?? row.rate ?? 0),
    miles: Number(row.miles ?? 0),
    commodity: row.commodity || '',
    weight: Number(row.weight ?? 0),
    equipmentType: row.equipment || row.equipment_type || row.equipmentType || "Dry Van 53'",
    customerPo: row.customer_po || row.customerPo || '',
    bolNumber: row.bol_number || row.bolNumber || '',
    serviceLevel: row.service_level || row.serviceLevel || 'Standard',
    lineItems: row.line_items || row.lineItems || [],
    documents: row.documents || [],
    activityLog: row.activity_log || row.activityLog || [],
    sentToApp: Boolean(row.sent_to_app || row.sentToApp || false),
  };
}

function loadToDb(load: Partial<Load>, helpers?: { customers: Customer[]; locations: Location[]; drivers: Driver[]; trucks: Truck[] }) {
  const customer = helpers?.customers.find(c => c.id === load.customerId);
  const origin = helpers?.locations.find(l => l.id === load.originId);
  const destination = helpers?.locations.find(l => l.id === load.destinationId);
  const driver = helpers?.drivers.find(d => d.id === load.driverId);
  const truck = helpers?.trucks.find(t => t.id === load.truckId);
  return {
    load_number: load.loadNumber,
    customer_id: load.customerId || null,
    customer_name: customer?.name || null,
    origin_id: load.originId || null,
    destination_id: load.destinationId || null,
    origin: origin?.name || null,
    destination: destination?.name || null,
    status: load.status || 'Created',
    pickup_date: load.pickupDate || null,
    delivery_date: load.deliveryDate || null,
    driver_id: load.driverId || null,
    truck_id: load.truckId || null,
    driver_name: driver?.name || null,
    truck_number: truck?.unitNumber || null,
    equipment: load.equipmentType,
    miles: load.miles ?? 0,
    revenue: load.rate ?? 0,
    commodity: load.commodity,
    weight: load.weight ?? 0,
    customer_po: load.customerPo,
    bol_number: load.bolNumber,
    service_level: load.serviceLevel,
    line_items: load.lineItems || [],
    documents: load.documents || [],
    activity_log: load.activityLog || [],
    sent_to_app: load.sentToApp || false,
  };
}

function toInvoice(row: any): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number || row.invoiceNumber || '',
    loadId: row.load_id || row.loadId || '',
    customerId: row.customer_id || row.customerId || '',
    date: row.invoice_date || row.date || row.created_at?.slice(0, 10) || '',
    dueDate: row.due_date || row.dueDate || '',
    amount: Number(row.amount ?? 0),
    status: normalizeStatus(row.status, 'Draft') as Invoice['status'],
    notes: row.notes || '',
    method: row.method || 'Email',
  };
}

function invoiceToDb(invoice: Partial<Invoice>, helpers?: { customers: Customer[]; loads: Load[] }) {
  const customer = helpers?.customers.find(c => c.id === invoice.customerId);
  return {
    invoice_number: invoice.invoiceNumber,
    load_id: invoice.loadId || null,
    customer_id: invoice.customerId || null,
    customer_name: customer?.name || null,
    amount: invoice.amount ?? 0,
    status: invoice.status || 'Draft',
    invoice_date: invoice.date || new Date().toISOString().slice(0, 10),
    due_date: invoice.dueDate || null,
    notes: invoice.notes,
    method: invoice.method,
  };
}

function toRecurringRule(row: any): RecurringRule {
  return {
    id: row.id,
    driverId: row.driver_id || row.driverId || '',
    type: (row.rule_type || row.type || 'DEDUCTION') as RecurringRule['type'],
    name: row.rule_name || row.name || '',
    amount: Number(row.amount ?? 0),
    frequency: (row.frequency || 'WEEKLY') as RecurringRule['frequency'],
    active: row.active !== false,
    startDate: row.start_date || row.startDate || undefined,
    rateType: row.rate_type || row.rateType || undefined,
  };
}

function recurringRuleToDb(rule: Partial<RecurringRule>) {
  return {
    driver_id: rule.driverId,
    rule_type: rule.type || 'DEDUCTION',
    rule_name: rule.name,
    amount: rule.amount ?? 0,
    frequency: rule.frequency || 'WEEKLY',
    active: rule.active !== false,
    start_date: rule.startDate || null,
    rate_type: rule.rateType || 'FLAT',
  };
}

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [carrierCompliance] = useState<CarrierCompliance>(emptyCarrierCompliance);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [navigationIntent, setNavigationIntent] = useState<{
    view: string;
    action?: string;
    driverId?: string;
    truckId?: string;
    tab?: string;
    returnTo?: string;
    returnData?: any;
  } | null>(null);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);

  const [companySettings, setCompanySettings] = useState({
    carrierName: '',
    dotNumber: '',
    mcNumber: '',
    scacCode: '',
    address: '',
    currency: 'USD ($)',
    timezone: 'America/Chicago',
    primaryColor: '#E8820C',
    autoInvoice: false,
    eledIntegration: '',
    factoringPartner: '',
    quickBooksConnected: false,
  });

  const refreshData = async () => {
    try {
      const data = await backendFetch('/api/bootstrap');
      setCustomers((data.customers || []).map(toCustomer));
      setLocations((data.locations || []).map(toLocation));
      setDrivers((data.drivers || []).map(toDriver));
      setTrucks((data.trucks || []).map(toTruck));
      setLoads((data.loads || []).map(toLoad));
      setInvoices((data.invoices || []).map(toInvoice));
      setRecurringRules((data.recurringRules || []).map(toRecurringRule));
    } catch (error) {
      console.warn('GridTMS live data load failed. Check Netlify Functions and Supabase env vars.', error);
      setCustomers([]);
      setLocations([]);
      setDrivers([]);
      setTrucks([]);
      setLoads([]);
      setInvoices([]);
      setRecurringRules([]);
    }
  };

  useEffect(() => { refreshData(); }, []);

  const persistCreate = async <T,>(resource: string, payload: any, mapper: (row: any) => T, replace: (item: T) => void) => {
    try {
      const row = await backendFetch(`/api/${resource}`, { method: 'POST', body: JSON.stringify(payload) });
      replace(mapper(row));
    } catch (error) {
      console.error(`Failed to create ${resource}`, error);
    }
  };

  const persistUpdate = async (resource: string, id: string, payload: any) => {
    try { await backendFetch(`/api/${resource}/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }); }
    catch (error) { console.error(`Failed to update ${resource}`, error); }
  };

  const persistDelete = async (resource: string, id: string) => {
    try { await backendFetch(`/api/${resource}/${id}`, { method: 'DELETE' }); }
    catch (error) { console.error(`Failed to delete ${resource}`, error); }
  };

  const addActivityLog = (load: Load, action: string, type: ActivityLogEntry['type']): Load => {
    const newEntry: ActivityLogEntry = {
      id: tempId('log'),
      user: 'Operations Admin',
      action,
      date: new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      type
    };
    return { ...load, activityLog: [newEntry, ...(load.activityLog || [])] };
  };

  const loadRecurringRules = async () => {
    try {
      const data = await backendFetch('/api/recurring-rules');
      setRecurringRules((Array.isArray(data) ? data : []).map(toRecurringRule));
    } catch (error) {
      console.warn('Failed to load recurring rules', error);
      setRecurringRules([]);
    }
  };

  const addRecurringRule = async (ruleData: Omit<RecurringRule, 'id'>): Promise<string> => {
    const id = tempId('rec');
    const optimistic: RecurringRule = { ...ruleData, id };
    setRecurringRules(prev => [optimistic, ...prev]);
    try {
      const row = await backendFetch('/api/recurring-rules', { method: 'POST', body: JSON.stringify(recurringRuleToDb(optimistic)) });
      const saved = toRecurringRule(row);
      setRecurringRules(prev => prev.map(r => r.id === id ? saved : r));
      return saved.id;
    } catch (error) {
      console.error('Failed to save recurring rule', error);
      return id;
    }
  };

  const updateRecurringRule = async (id: string, updates: Partial<RecurringRule>) => {
    setRecurringRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    await persistUpdate('recurring-rules', id, recurringRuleToDb(updates));
  };

  const deleteRecurringRule = async (id: string) => {
    setRecurringRules(prev => prev.filter(r => r.id !== id));
    await persistDelete('recurring-rules', id);
  };

  const addLoad = (loadData: Omit<Load, 'id' | 'loadNumber'>) => {
    const id = tempId('ld');
    let newLoad: Load = { ...loadData, id, loadNumber: `LD-${Date.now().toString().slice(-6)}` };
    newLoad = addActivityLog(newLoad, 'Load created in system', 'system');
    setLoads(prev => [newLoad, ...prev]);
    persistCreate('loads', loadToDb(newLoad, { customers, locations, drivers, trucks }), toLoad, saved => setLoads(prev => prev.map(l => l.id === id ? saved : l)));
    return id;
  };

  const updateLoad = (id: string, updates: Partial<Load>) => {
    let savedLoad: Load | undefined;
    setLoads(prev => prev.map(l => {
      if (l.id !== id) return l;
      let updated = { ...l, ...updates };
      if (updates.status && updates.status !== l.status) updated = addActivityLog(updated, `Status manually changed to ${String(updates.status).toUpperCase()}`, 'status');
      else if (Object.keys(updates).length > 0) updated = addActivityLog(updated, 'Load details updated', 'edit');
      savedLoad = updated;
      return updated;
    }));
    setTimeout(() => {
      if (savedLoad) persistUpdate('loads', id, loadToDb(savedLoad, { customers, locations, drivers, trucks }));
    }, 0);
  };

  const duplicateLoad = (id: string) => {
    const original = loads.find(l => l.id === id);
    if (!original) return;
    const { driverId, truckId, sentToApp, activityLog, documents, ...rest } = original;
    addLoad({ ...rest, status: 'Created', driverId: undefined, truckId: undefined, lineItems: original.lineItems || [] } as Omit<Load, 'id' | 'loadNumber'>);
  };

  const deleteLoad = (id: string) => { setLoads(prev => prev.filter(l => l.id !== id)); persistDelete('loads', id); };

  const addDocument = (loadId: string, docData: { name: string; type: string }) => {
    setLoads(prev => prev.map(l => {
      if (l.id !== loadId) return l;
      const newDoc = { ...docData, id: tempId('doc'), date: new Date().toISOString().split('T')[0] };
      const updated = addActivityLog({ ...l, documents: [...(l.documents || []), newDoc] }, `Document uploaded: ${docData.name}`, 'document');
      persistUpdate('loads', loadId, loadToDb(updated, { customers, locations, drivers, trucks }));
      return updated;
    }));
  };

  const removeDocument = (loadId: string, docId: string) => {
    setLoads(prev => prev.map(l => {
      if (l.id !== loadId) return l;
      const updated = { ...l, documents: (l.documents || []).filter(doc => doc.id !== docId) };
      persistUpdate('loads', loadId, loadToDb(updated, { customers, locations, drivers, trucks }));
      return updated;
    }));
  };

  const advanceLoadStatus = (id: string) => {
    const statusOrder: LoadStatus[] = ['Created', 'Dispatched', 'At Pickup', 'Loaded', 'In Transit', 'Delivered', 'Invoiced', 'Paid'];
    const load = loads.find(l => l.id === id);
    if (!load) return;
    const currentIndex = statusOrder.indexOf(load.status);
    const nextStatus = statusOrder[currentIndex + 1] || load.status;
    if (nextStatus !== load.status) updateLoad(id, { status: nextStatus });
  };

  const addLoadItem = (loadId: string, itemData: Omit<LoadLineItem, 'id'>) => {
    setLoads(prev => prev.map(l => {
      if (l.id !== loadId) return l;
      const newItem: LoadLineItem = { ...itemData, id: tempId('li') };
      const updated = addActivityLog({ ...l, lineItems: [...(l.lineItems || []), newItem] }, `${itemData.type} line item added: ${itemData.description}`, 'financial');
      persistUpdate('loads', loadId, loadToDb(updated, { customers, locations, drivers, trucks }));
      return updated;
    }));
  };

  const removeLoadItem = (loadId: string, itemId: string) => {
    setLoads(prev => prev.map(l => {
      if (l.id !== loadId) return l;
      const updated = { ...l, lineItems: (l.lineItems || []).filter(item => item.id !== itemId) };
      persistUpdate('loads', loadId, loadToDb(updated, { customers, locations, drivers, trucks }));
      return updated;
    }));
  };

  const addCustomer = (customerData: Omit<Customer, 'id' | 'code'>) => {
    const id = tempId('c');
    const newCustomer: Customer = { ...customerData, id, code: `${customerData.name.substring(0, 5).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}` };
    setCustomers(prev => [newCustomer, ...prev]);
    persistCreate('customers', customerToDb(newCustomer), toCustomer, saved => setCustomers(prev => prev.map(c => c.id === id ? saved : c)));
    return id;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    persistUpdate('customers', id, customerToDb(updates));
  };

  const deleteCustomer = (id: string) => { setCustomers(prev => prev.filter(c => c.id !== id)); persistDelete('customers', id); };

  const addLocation = (locationData: Omit<Location, 'id'>) => {
    const id = tempId('loc');
    const newLocation: Location = { ...locationData, id };
    setLocations(prev => [newLocation, ...prev]);
    persistCreate('locations', locationToDb(newLocation), toLocation, saved => setLocations(prev => prev.map(l => l.id === id ? saved : l)));
    return id;
  };

  const updateLocation = (id: string, updates: Partial<Location>) => {
    setLocations(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    persistUpdate('locations', id, locationToDb(updates));
  };

  const deleteLocation = (id: string) => { setLocations(prev => prev.filter(l => l.id !== id)); persistDelete('locations', id); };

  const addDriver = (driverData: Omit<Driver, 'id' | 'truckId'>) => {
    const id = tempId('d');
    const newDriver: Driver = { ...driverData, id };
    setDrivers(prev => [newDriver, ...prev]);
    persistCreate('drivers', driverToDb(newDriver), toDriver, saved => setDrivers(prev => prev.map(d => d.id === id ? saved : d)));
  };

  const updateDriver = (id: string, updates: Partial<Driver>) => {
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    persistUpdate('drivers', id, driverToDb(updates));
  };

  const addTruck = (truckData: Omit<Truck, 'id' | 'driverId'>) => {
    const id = tempId('tr');
    const newTruck: Truck = { ...truckData, id };
    setTrucks(prev => [newTruck, ...prev]);
    persistCreate('trucks', truckToDb(newTruck), toTruck, saved => setTrucks(prev => prev.map(t => t.id === id ? saved : t)));
  };

  const updateTruck = (id: string, updates: Partial<Truck>) => {
    setTrucks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    persistUpdate('trucks', id, truckToDb(updates));
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    persistUpdate('invoices', id, invoiceToDb(updates, { customers, loads }));
  };

  const assignTruckToDriver = (driverId: string, truckId: string | null) => {
    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, truckId: truckId || undefined } : (truckId && d.truckId === truckId ? { ...d, truckId: undefined } : d)));
    setTrucks(prev => prev.map(t => t.id === truckId ? { ...t, driverId } : (t.driverId === driverId ? { ...t, driverId: undefined } : t)));
    persistUpdate('drivers', driverId, { truck_id: truckId || null });
    if (truckId) persistUpdate('trucks', truckId, { driver_id: driverId });
  };

  const generateInvoice = (loadId: string, overrides?: Partial<Invoice>) => {
    const load = loads.find(l => l.id === loadId);
    if (!load) return;
    const itemsTotal = (load.lineItems || []).filter(i => i.type === 'Revenue').reduce((sum, item) => sum + item.amount, 0);
    const finalAmount = itemsTotal > 0 ? itemsTotal : load.rate;
    const newInvoice: Invoice = {
      id: tempId('inv'),
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      loadId: load.id,
      customerId: load.customerId,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      amount: finalAmount,
      status: 'Sent',
      ...overrides
    };
    setInvoices(prev => [newInvoice, ...prev]);
    persistCreate('invoices', invoiceToDb(newInvoice, { customers, loads }), toInvoice, saved => setInvoices(prev => prev.map(i => i.id === newInvoice.id ? saved : i)));
    updateLoad(loadId, { status: 'Invoiced' });
  };

  return (
    <DataContext.Provider value={{
      customers,
      locations,
      loads,
      drivers,
      trucks,
      invoices,
      carrierCompliance,
      theme,
      setTheme,
      navigationIntent,
      setNavigationIntent,
      recurringRules,
      loadRecurringRules,
      addRecurringRule,
      updateRecurringRule,
      deleteRecurringRule,
      companySettings,
      setCompanySettings,
      addLoad,
      updateLoad,
      addLoadItem,
      removeLoadItem,
      duplicateLoad,
      deleteLoad,
      addDocument,
      removeDocument,
      advanceLoadStatus,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addLocation,
      updateLocation,
      deleteLocation,
      addDriver,
      updateDriver,
      addTruck,
      updateTruck,
      updateInvoice,
      assignTruckToDriver,
      generateInvoice,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
