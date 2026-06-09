import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Customer, Location, Load, Driver, Truck, Invoice, Settlement, LoadStatus, ActivityLogEntry, LoadLineItem, CarrierCompliance, RecurringRule } from '../types';
import { mockCustomers, mockLocations, mockLoads, mockDrivers, mockTrucks, mockInvoices, mockCarrierCompliance } from '../mockData';

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


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

async function apiRequest(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.detail || result.message || 'Backend request failed');
  }
  return result;
}

function persistCreate(collection: string, data: any) {
  apiRequest(`/tms/${collection}`, {
    method: 'POST',
    body: JSON.stringify({ data }),
  }).catch((err) => console.warn(`Failed to save ${collection} to Supabase`, err));
}

function persistUpdate(collection: string, id: string, data: any) {
  apiRequest(`/tms/${collection}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ data }),
  }).catch((err) => console.warn(`Failed to update ${collection} in Supabase`, err));
}

function persistDelete(collection: string, id: string) {
  apiRequest(`/tms/${collection}/${id}`, { method: 'DELETE' })
    .catch((err) => console.warn(`Failed to delete ${collection} from Supabase`, err));
}

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [locations, setLocations] = useState<Location[]>(mockLocations);
  const [loads, setLoads] = useState<Load[]>(mockLoads);
  const [drivers, setDrivers] = useState<Driver[]>(mockDrivers);
  const [trucks, setTrucks] = useState<Truck[]>(mockTrucks);
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [carrierCompliance] = useState<CarrierCompliance>(mockCarrierCompliance);

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

  useEffect(() => {
    let cancelled = false;
    apiRequest('/tms/snapshot')
      .then((snapshot) => {
        if (cancelled) return;
        if (Array.isArray(snapshot.customers) && snapshot.customers.length) setCustomers(snapshot.customers as Customer[]);
        if (Array.isArray(snapshot.locations) && snapshot.locations.length) setLocations(snapshot.locations as Location[]);
        if (Array.isArray(snapshot.loads) && snapshot.loads.length) setLoads(snapshot.loads as Load[]);
        if (Array.isArray(snapshot.drivers) && snapshot.drivers.length) setDrivers(snapshot.drivers as Driver[]);
        if (Array.isArray(snapshot.trucks) && snapshot.trucks.length) setTrucks(snapshot.trucks as Truck[]);
        if (Array.isArray(snapshot.invoices) && snapshot.invoices.length) setInvoices(snapshot.invoices as Invoice[]);
        if (Array.isArray(snapshot.recurring_rules) && snapshot.recurring_rules.length) setRecurringRules(snapshot.recurring_rules as RecurringRule[]);
        console.log('Grid TMS loaded persisted records from Supabase via backend.');
      })
      .catch((err) => console.warn('Backend unavailable; using built-in demo data until it starts.', err));

    return () => { cancelled = true; };
  }, []);

  const loadRecurringRules = async () => {
    try {
      const json = await apiRequest('/tms/recurring_rules');
      if (Array.isArray(json.recurring_rules)) {
        setRecurringRules(json.recurring_rules as RecurringRule[]);
      }
    } catch (err) {
      console.warn("Using fallback/local recurring rules in context", err);
    }
  };

  React.useEffect(() => {
    // Initial fetch of recurring rules
    loadRecurringRules();
    // Default fallback rules if empty or fetch fails
    const defaultRules: RecurringRule[] = [
      {
        id: 'rec-1',
        driverId: 'd1', // Marcus
        type: 'DEDUCTION',
        name: 'Truck Lease Escrow Contribution',
        amount: 150.00,
        frequency: 'WEEKLY',
        active: true,
        startDate: '2026-01-01'
      },
      {
        id: 'rec-2',
        driverId: 'd1', // Marcus
        type: 'DEDUCTION',
        name: 'Occupational Insurance Premium',
        amount: 85.00,
        frequency: 'MONTHLY',
        active: true,
        startDate: '2026-01-01'
      },
      {
        id: 'rec-3',
        driverId: 'd2', // Sarah Jackson
        type: 'REVENUE',
        name: 'Clean Inspection Safety Bonus',
        amount: 100.00,
        frequency: 'WEEKLY',
        active: true,
        startDate: '2026-01-01'
      }
    ];
    setRecurringRules(prev => prev.length === 0 ? defaultRules : prev);
  }, []);

  const addRecurringRule = async (ruleData: Omit<RecurringRule, 'id'>): Promise<string> => {
    const tempId = `rec-${Math.random().toString(36).substr(2, 9)}`;
    const newRule: RecurringRule = {
      ...ruleData,
      id: tempId,
    };
    
    // Optimistic UI update
    setRecurringRules(prev => [...prev, newRule]);

    try {
      const data = await apiRequest('/tms/recurring_rules', {
        method: 'POST',
        body: JSON.stringify({ data: newRule })
      });
      if (data.record) {
        setRecurringRules(prev => prev.map(r => r.id === tempId ? data.record : r));
        return data.record.id;
      }
    } catch (err) {
      console.warn("Failed to save rule on backend; kept in local state", err);
    }
    return tempId;
  };

  const updateRecurringRule = async (id: string, updates: Partial<RecurringRule>) => {
    setRecurringRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));

    try {
      await apiRequest(`/tms/recurring_rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ data: updates })
      });
    } catch (err) {
      console.warn("Failed to update rule on backend; kept in local state", err);
    }
  };

  const deleteRecurringRule = async (id: string) => {
    setRecurringRules(prev => prev.filter(r => r.id !== id));

    try {
      await apiRequest(`/tms/recurring_rules/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn("Failed to delete rule on backend; kept in local state", err);
    }
  };

  const [companySettings, setCompanySettings] = useState({
    carrierName: 'Grid Transport Corp',
    dotNumber: '3482109',
    mcNumber: '1109482',
    scacCode: 'GTCO',
    address: '100 Logistics Blvd, Suite A, Chicago, IL 60601',
    currency: 'USD ($)',
    timezone: 'America/Chicago',
    primaryColor: '#E8820C',
    autoInvoice: true,
    eledIntegration: 'Samsara',
    factoringPartner: 'Apex Capital',
    quickBooksConnected: true,
  });

  const addActivityLog = (load: Load, action: string, type: ActivityLogEntry['type']): Load => {
    const newEntry: ActivityLogEntry = {
      id: `log-${Math.random().toString(36).substr(2, 9)}`,
      user: 'Operations Admin', // In a real app, this would be the logged-in user
      action,
      date: new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      type
    };
    return {
      ...load,
      activityLog: [newEntry, ...(load.activityLog || [])]
    };
  };

  const addLoad = (loadData: Omit<Load, 'id' | 'loadNumber'>) => {
    const id = `ld-${Math.random().toString(36).substr(2, 9)}`;
    let newLoad: Load = {
      ...loadData,
      id,
      loadNumber: `LD-00${loads.length + 4522}`,
    };
    newLoad = addActivityLog(newLoad, 'Load created in system', 'system');
    setLoads(prev => [newLoad, ...prev]);
    persistCreate('loads', newLoad);
    return id;
  };

  const updateLoad = (id: string, updates: Partial<Load>) => {
    setLoads(prev => prev.map(l => {
      if (l.id === id) {
        let updated = { ...l, ...updates };
        
        let logsAdded = false;
        if (updates.status && updates.status !== l.status) {
          updated = addActivityLog(updated, `Status manually changed to ${updates.status.toUpperCase()}`, 'status');
          logsAdded = true;
        } 
        if (updates.sentToApp === true && l.sentToApp !== true) {
          updated = addActivityLog(updated, `Load successfully sent to driver app`, 'system');
          logsAdded = true;
        }
        if (updates.pickupDate && updates.pickupDate !== l.pickupDate) {
          updated = addActivityLog(updated, `Pickup schedule updated to ${new Date(updates.pickupDate).toLocaleString()}`, 'edit');
          logsAdded = true;
        }
        if (updates.deliveryDate && updates.deliveryDate !== l.deliveryDate) {
          updated = addActivityLog(updated, `Delivery schedule updated to ${new Date(updates.deliveryDate).toLocaleString()}`, 'edit');
          logsAdded = true;
        }
        
        // Generic catch-all if no specific updates matched, but something was updated.
        if (!logsAdded && Object.keys(updates).length > 0) {
          updated = addActivityLog(updated, `Load details updated`, 'edit');
        }

        return updated;
      }
      return l;
    }));
    persistUpdate('loads', id, updates);
  };

  const duplicateLoad = (id: string) => {
    const original = loads.find(l => l.id === id);
    if (!original) return;
    
    const { driverId, truckId, sentToApp, activityLog, documents, ...rest } = original;

    const newLoad: Load = {
      ...rest,
      id: `ld-${Math.random().toString(36).substr(2, 9)}`,
      loadNumber: `LD-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'Created',
    };
    setLoads(prev => [{...newLoad, activityLog: []}, ...prev]);
    persistCreate('loads', {...newLoad, activityLog: []});
  };

  const deleteLoad = (id: string) => {
    setLoads(prev => prev.filter(l => l.id !== id));
    persistDelete('loads', id);
  };

  const addDocument = (loadId: string, docData: { name: string; type: string }) => {
    setLoads(prev => prev.map(l => {
      if (l.id !== loadId) return l;
      const newDoc = {
        ...docData,
        id: `doc-${Math.random().toString(36).substr(2, 9)}`,
        date: new Date().toISOString().split('T')[0]
      };
      const updated = { ...l, documents: [...(l.documents || []), newDoc] };
      return addActivityLog(updated, `Document uploaded: ${docData.name}`, 'document');
    }));
  };

  const removeDocument = (loadId: string, docId: string) => {
    setLoads(prev => prev.map(l => {
      if (l.id !== loadId) return l;
      return { ...l, documents: (l.documents || []).filter(doc => doc.id !== docId) };
    }));
  };

  const advanceLoadStatus = (id: string) => {
    const statusOrder: LoadStatus[] = ['Created', 'Dispatched', 'At Pickup', 'Loaded', 'In Transit', 'Delivered', 'Invoiced', 'Paid'];
    setLoads(prev => prev.map(l => {
      if (l.id !== id) return l;
      const currentIndex = statusOrder.indexOf(l.status);
      const nextStatus = statusOrder[currentIndex + 1] || l.status;
      if (nextStatus === l.status) return l;
      
      const updated = { ...l, status: nextStatus };
      return addActivityLog(updated, `Status advanced to ${nextStatus.toUpperCase()}`, 'status');
    }));
  };

  const addCustomer = (customerData: Omit<Customer, 'id' | 'code'>) => {
    const newId = `c-${Math.random().toString(36).substr(2, 9)}`;
    const newCustomer: Customer = {
      ...customerData,
      id: newId,
      code: `${customerData.name.substring(0, 5).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
    };
    setCustomers(prev => [...prev, newCustomer]);
    persistCreate('customers', newCustomer);
    return newId;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    persistUpdate('customers', id, updates);
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    persistDelete('customers', id);
  };

  const addLocation = (locationData: Omit<Location, 'id'>) => {
    const newId = `l-${Math.random().toString(36).substr(2, 9)}`;
    const newLocation: Location = {
      ...locationData,
      id: newId,
    };
    setLocations(prev => [...prev, newLocation]);
    persistCreate('locations', newLocation);
    return newId;
  };

  const updateLocation = (id: string, updates: Partial<Location>) => {
    setLocations(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    persistUpdate('locations', id, updates);
  };

  const deleteLocation = (id: string) => {
    setLocations(prev => prev.filter(l => l.id !== id));
    persistDelete('locations', id);
  };

  const addDriver = (driverData: Omit<Driver, 'id' | 'truckId'>) => {
    const newDriver: Driver = {
      ...driverData,
      id: `d-${Math.random().toString(36).substr(2, 9)}`,
    };
    setDrivers(prev => [...prev, newDriver]);
    persistCreate('drivers', newDriver);
  };

  const updateDriver = (id: string, updates: Partial<Driver>) => {
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    persistUpdate('drivers', id, updates);
  };

  const addTruck = (truckData: Omit<Truck, 'id' | 'driverId'>) => {
    const newTruck: Truck = {
      ...truckData,
      id: `t-${Math.random().toString(36).substr(2, 9)}`,
    };
    setTrucks(prev => [...prev, newTruck]);
    persistCreate('trucks', newTruck);
  };

  const updateTruck = (id: string, updates: Partial<Truck>) => {
    setTrucks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    persistUpdate('trucks', id, updates);
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    persistUpdate('invoices', id, updates);
  };

  const assignTruckToDriver = (driverId: string, truckId: string | null) => {
    // 1. Unset the truck from any previous driver
    if (truckId) {
      setDrivers(prev => prev.map(d => d.truckId === truckId ? { ...d, truckId: undefined } : d));
    }
    
    // 2. Assign truck to the specified driver
    setDrivers(prev => prev.map(d => {
      if (d.id === driverId) {
        return { ...d, truckId: truckId || undefined };
      }
      return d;
    }));

    // 3. Bidirectional link on truck table
    if (truckId) {
      setTrucks(prev => prev.map(t => {
        if (t.id === truckId) return { ...t, driverId };
        if (t.driverId === driverId) return { ...t, driverId: undefined };
        return t;
      }));
    } else {
      setTrucks(prev => prev.map(t => t.driverId === driverId ? { ...t, driverId: undefined } : t));
    }
  };

  const addLoadItem = (loadId: string, itemData: Omit<LoadLineItem, 'id'>) => {
    setLoads(prev => prev.map(l => {
      if (l.id !== loadId) return l;
      const newItem: LoadLineItem = {
        ...itemData,
        id: `li-${Math.random().toString(36).substr(2, 9)}`,
      };
      const updated = { ...l, lineItems: [...(l.lineItems || []), newItem] };
      return addActivityLog(updated, `${itemData.type} line item added: ${itemData.description}`, 'financial');
    }));
  };

  const removeLoadItem = (loadId: string, itemId: string) => {
    setLoads(prev => prev.map(l => {
      if (l.id !== loadId) return l;
      return { ...l, lineItems: (l.lineItems || []).filter(item => item.id !== itemId) };
    }));
  };

  const generateInvoice = (loadId: string, overrides?: Partial<Invoice>) => {
    const load = loads.find(l => l.id === loadId);
    if (!load) return;

    // Calculate total amount from line items if they exist
    const itemsTotal = (load.lineItems || [])
      .filter(i => i.type === 'Revenue')
      .reduce((sum, item) => sum + item.amount, 0);
    
    // Fallback to base rate if no revenue line items
    const finalAmount = itemsTotal > 0 ? itemsTotal : load.rate;

    const newInvoice: Invoice = {
      id: `inv-${Math.random().toString(36).substr(2, 9)}`,
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
    persistCreate('invoices', newInvoice);
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
      generateInvoice
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
