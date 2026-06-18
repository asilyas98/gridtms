import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Customer, Location, Load, Driver, Truck, Trailer, Invoice, Settlement, LoadStatus, ActivityLogEntry, LoadLineItem, CarrierCompliance, RecurringRule, TmsNotification, TmsDocument, Carrier, AuditLogEntry } from '../types';
import { supabase } from '../lib/supabase';

interface DataContextType {
  customers: Customer[];
  locations: Location[];
  loads: Load[];
  drivers: Driver[];
  trucks: Truck[];
  trailers: Trailer[];
  invoices: Invoice[];
  carrierCompliance: CarrierCompliance;
  carrierProfile: Carrier;
  notifications: TmsNotification[];
  documents: TmsDocument[];
  auditLog: AuditLogEntry[];
  logAction: (action: 'Create' | 'Update' | 'Delete' | 'StatusChange', entityType: AuditLogEntry['entityType'], entityId: string, entityName: string, description: string) => Promise<void>;
  unreadNotificationCount: number;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  unsavedChanges: boolean;
  setUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
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
    emailIntegrationProvider: string | null;
    emailIntegrationAccount: string | null;
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
    emailIntegrationProvider: string | null;
    emailIntegrationAccount: string | null;
  }>>;
  addLoad: (load: Omit<Load, 'id' | 'loadNumber'>) => string;
  updateLoad: (id: string, updates: Partial<Load>) => void;
  duplicateLoad: (id: string) => string | undefined;
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
  addTrailer: (trailer: Omit<Trailer, 'id'>) => void;
  updateTrailer: (id: string, updates: Partial<Trailer>) => void;
  deleteTrailer: (id: string) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  assignTruckToDriver: (driverId: string, truckId: string | null) => void;
  generateInvoice: (loadId: string, overrides?: Partial<Invoice>) => string | undefined;
  // Notifications (§22)
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
  // Documents (§10)
  addTmsDocument: (doc: Omit<TmsDocument, 'id'>) => void;
  removeTmsDocument: (id: string) => void;
  // Carrier (§4)
  updateCarrierProfile: (updates: Partial<Carrier>) => void;
  // Compliance dispatch check (§8.3)
  checkDispatchCompliance: (driverId?: string, truckId?: string, trailerId?: string) => { canDispatch: boolean; hardBlocks: { entity: string; reason: string }[]; warnings: { entity: string; reason: string }[] };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [carrierCompliance, setCarrierCompliance] = useState<CarrierCompliance>({
    dotNumber: '',
    mcNumber: '',
    insuranceExpiry: '',
    cargoInsuranceExpiry: '',
    boc3Status: '',
    ucrRegistered: false,
    iftaStatus: '',
    safetyRating: 'Not Rated',
    mcs150Date: '',
    clearinghouseEnrollment: false,
  });
  const [carrierProfile, setCarrierProfile] = useState<Carrier>({
    id: '',
    legalName: '',
  });
  const [notifications, setNotifications] = useState<TmsNotification[]>([]);
  const [documents, setDocuments] = useState<TmsDocument[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);

  const logAction = async (action: 'Create' | 'Update' | 'Delete' | 'StatusChange', entityType: AuditLogEntry['entityType'], entityId: string, entityName: string, description: string) => {
    const entry = {
      userId: 'user-1',
      userName: 'Current User',
      action,
      entityType,
      entityId,
      entityName,
      description
    };
    try {
      const res = await fetch('/api/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      const data = await res.json();
      if (data.status === 'success' && data.data) {
        setAuditLog(prev => [data.data, ...prev]);
      }
    } catch (err) {
      console.warn('Failed to log action to server, using local fallback', err);
      setAuditLog(prev => [{ ...entry, id: crypto.randomUUID(), timestamp: new Date().toISOString() } as AuditLogEntry, ...prev]);
    }
  };

  const unreadNotificationCount = notifications.filter(n => n.status === 'Unread').length;

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [unsavedChanges, setUnsavedChanges] = useState(false);

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
    if (supabase) {
      console.log('Fetching data from Supabase...');
      const fetchData = async () => {
        const [
          { data: custData },
          { data: locData },
          { data: loadData },
          { data: driverData },
          { data: truckData }
        ] = await Promise.all([
          supabase.from('customers').select('*').is('deleted_at', null),
          supabase.from('locations').select('*').is('deleted_at', null),
          supabase.from('loads').select('*').is('deleted_at', null),
          supabase.from('drivers').select('*').is('deleted_at', null),
          supabase.from('trucks').select('*').is('deleted_at', null)
        ]);

        if (custData) setCustomers(custData as Customer[]);
        if (locData) setLocations(locData as Location[]);
        if (loadData) setLoads(loadData as Load[]);
        if (driverData) setDrivers(driverData as Driver[]);
        if (truckData) setTrucks(truckData as Truck[]);
      };
      fetchData();
    }
  }, []);

  const loadRecurringRules = async () => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase.from('recurring_rules').select('*').is('deleted_at', null);
      if (error) throw error;
      setRecurringRules(data as RecurringRule[]);
    } catch (err) {
      console.error("Error loading recurring rules from Supabase", err);
      setRecurringRules([]);
    }
  };

  React.useEffect(() => {
    loadRecurringRules();
  }, []);

  const addRecurringRule = async (ruleData: Omit<RecurringRule, 'id'>): Promise<string> => {
    const tempId = crypto.randomUUID();
    const newRule: RecurringRule = {
      ...ruleData,
      id: tempId,
    };

    // Optimistic UI update
    setRecurringRules(prev => [...prev, newRule]);

    try {
      const res = await fetch('/api/recurring-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule)
      });
      const data = await res.json();
      if (data.status === 'success' && data.rule) {
        setRecurringRules(prev => prev.map(r => r.id === tempId ? data.rule : r));
        return data.rule.id;
      }
    } catch (err) {
      console.warn("Failed to save rule on backend; kept in local state", err);
    }
    return tempId;
  };

  const updateRecurringRule = async (id: string, updates: Partial<RecurringRule>) => {
    setRecurringRules(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));

    try {
      await fetch(`/api/recurring-rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (err) {
      console.warn("Failed to update rule on backend; kept in local state", err);
    }
  };

  const deleteRecurringRule = async (id: string) => {
    setRecurringRules(prev => prev.filter(r => r.id !== id));

    try {
      await fetch(`/api/recurring-rules/${id}`, {
        method: 'DELETE'
      });
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
    emailIntegrationProvider: null as string | null,
    emailIntegrationAccount: null as string | null,
  });

  const addActivityLog = (load: Load, action: string, type: ActivityLogEntry['type']): Load => {
    const newEntry: ActivityLogEntry = {
      id: crypto.randomUUID(),
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
    const id = crypto.randomUUID();
    let newLoad: Load = {
      ...loadData,
      id,
      loadNumber: `LD-00${loads.length + 4522}`,
    };
    newLoad = addActivityLog(newLoad, 'Load created in system', 'system');
    setLoads(prev => [newLoad, ...prev]);

    // Save to Supabase
    if (supabase) {
      const dbLoad = {
        id: newLoad.id,
        loadNumber: newLoad.loadNumber,
        status: newLoad.status,
        customerId: newLoad.customerId || null,
        originId: newLoad.originId || null,
        destinationId: newLoad.destinationId || null,
        pickupDate: newLoad.pickupDate || null,
        deliveryDate: newLoad.deliveryDate || null,
        driverId: newLoad.driverId || null,
        truckId: newLoad.truckId || null,
        trailerId: newLoad.trailerId || null,
        rate: newLoad.rate || 0,
        miles: newLoad.miles || 0,
        commodity: newLoad.commodity || null,
        weight: newLoad.weight || 0,
        equipmentType: newLoad.equipmentType || null,
        activityLog: newLoad.activityLog || []
      };
      supabase.from('loads').insert([dbLoad]).then(({ error }) => {
        if (error) console.error('Error saving load to Supabase:', error);
      });
    }

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

    if (supabase) {
      supabase.from('loads').update(updates).eq('id', id).then(({ error }) => {
        if (error) console.error('Error updating load:', error);
      });
    }
  };

  const duplicateLoad = (id: string) => {
    const original = loads.find(l => l.id === id);
    if (!original) return undefined;

    const { driverId, truckId, sentToApp, activityLog, documents, ...rest } = original;

    const newId = crypto.randomUUID();
    const newLoad: Load = {
      ...rest,
      id: newId,
      loadNumber: `LD-${Math.floor(100000 + Math.random() * 900000)}`,
      status: 'Created',
    };
    setLoads(prev => [{ ...newLoad, activityLog: [] }, ...prev]);
    return newId;
  };

  const deleteLoad = (id: string) => {
    setLoads(prev => prev.filter(l => l.id !== id));
    if (supabase) {
      supabase.from('loads').update({ deleted_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting load:', error);
      });
    }
  };

  const addDocument = (loadId: string, docData: { name: string; type: string }) => {
    setLoads(prev => prev.map(l => {
      if (l.id !== loadId) return l;
      const newDoc = {
        ...docData,
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0]
      };
      const updated = { ...l, documents: [...(l.documents || []), newDoc] };
      return addActivityLog(updated, `Document uploaded: ${docData.name}`, 'document');
    }));
  };

  const removeDocument = (loadId: string, docId: string) => {
    setLoads(prev => prev.map(l => {
      if (l.id !== loadId) return l;
      const doc = l.documents?.find(d => d.id === docId);
      if (doc) {
        logAction('Delete', 'Document', docId, doc.name, `Deleted document ${doc.name} from load ${l.loadNumber}`);
      }
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
      logAction('StatusChange', 'Load', l.id, l.loadNumber, `Advanced load status to ${nextStatus.toUpperCase()}`);
      if (supabase) {
        supabase.from('loads').update({ status: nextStatus }).eq('id', l.id).then(({ error }) => {
          if (error) console.error('Error advancing load status in Supabase:', error);
        });
      }
      return addActivityLog(updated, `Status advanced to ${nextStatus.toUpperCase()}`, 'status');
    }));
  };

  const addCustomer = (customerData: Omit<Customer, 'id' | 'code'>) => {
    const newId = crypto.randomUUID();
    const newCustomer: Customer = {
      ...customerData,
      id: newId,
      code: `${customerData.name.substring(0, 5).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
    };
    setCustomers(prev => [...prev, newCustomer]);

    // Save to Supabase
    if (supabase) {
      const dbCustomer = {
        id: newCustomer.id,
        name: newCustomer.name,
        code: newCustomer.code,
        type: newCustomer.type || null,
        status: newCustomer.status || 'Active',
        creditLimit: newCustomer.creditLimit || 0,
        outstandingBalance: newCustomer.outstandingBalance || 0,
        phone: newCustomer.phone || null,
        email: newCustomer.email || null,
        address: newCustomer.address || null,
        dba: newCustomer.dba || null,
        "mcNumber": newCustomer.mcNumber || null,
        "dotNumber": newCustomer.dotNumber || null,
        "taxId": newCustomer.taxId || null,
        "paymentTerms": newCustomer.paymentTerms || null,
        "billingDeliveryMethod": newCustomer.billingDeliveryMethod || null,
        "billingAddress": newCustomer.billingAddress || null,
        "requirePo": newCustomer.requirePo || false,
        "requirePod": newCustomer.requirePod || false,
        "ediId": newCustomer.ediId || null,
        "opsPhone": newCustomer.opsPhone || null,
        "opsEmail": newCustomer.opsEmail || null,
        notes: newCustomer.notes || null,
        "brokerCreditScore": newCustomer.brokerCreditScore || null,
        "daysToPayAvg": newCustomer.daysToPayAvg || null,
        "brokerNotes": newCustomer.brokerNotes || null,
        "slowPayFlag": newCustomer.slowPayFlag || false
      };
      supabase.from('customers').insert([dbCustomer]).then(({ error }) => {
        if (error) console.error('Error saving customer to Supabase:', error);
      });
    }

    return newId;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    if (supabase) {
      const validKeys = [
        'name', 'code', 'type', 'status', 'creditLimit', 'outstandingBalance',
        'phone', 'email', 'address', 'dba', 'mcNumber', 'dotNumber', 'taxId',
        'paymentTerms', 'billingDeliveryMethod', 'billingAddress', 'requirePo',
        'requirePod', 'ediId', 'opsPhone', 'opsEmail', 'notes', 'brokerCreditScore',
        'daysToPayAvg', 'brokerNotes', 'slowPayFlag'
      ];
      const dbUpdates: any = {};
      validKeys.forEach(k => {
        if (k in updates) dbUpdates[k] = (updates as any)[k];
      });
      if (Object.keys(dbUpdates).length > 0) {
        supabase.from('customers').update(dbUpdates).eq('id', id).then(({ error }) => {
          if (error) console.error('Error updating customer:', error);
        });
      }
    }
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    if (supabase) {
      supabase.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting customer:', error);
      });
    }
  };

  const addLocation = (locationData: Omit<Location, 'id'>) => {
    const newId = crypto.randomUUID();
    const newLocation: Location = { ...locationData, id: newId };
    setLocations(prev => [...prev, newLocation]);

    if (supabase) {
      const dbLocation = {
        id: newLocation.id,
        name: newLocation.name,
        type: newLocation.type || null,
        address: newLocation.address || null,
        "customerIds": newLocation.customerIds || [],
        "avgDetention": newLocation.avgDetention || null,
        "operatingHours": newLocation.operatingHours || null,
        "contactName": newLocation.contactName || null,
        "contactPhone": newLocation.contactPhone || null,
        "contactEmail": newLocation.contactEmail || null,
        "gateCode": newLocation.gateCode || null,
        "overnightParking": newLocation.overnightParking || false,
        "restroomsAvailable": newLocation.restroomsAvailable || false,
        "scaleOnSite": newLocation.scaleOnSite || false,
        "forkliftOnSite": newLocation.forkliftOnSite || false,
        notes: newLocation.notes || null
      };
      supabase.from('locations').insert([dbLocation]).then(({ error }) => {
        if (error) console.error('Error saving location:', error);
      });
    }
    return newId;
  };

  const updateLocation = (id: string, updates: Partial<Location>) => {
    setLocations(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    if (supabase) {
      const validKeys = ['name', 'type', 'address', 'customerIds', 'avgDetention', 'operatingHours', 'contactName', 'contactPhone', 'contactEmail', 'gateCode', 'overnightParking', 'restroomsAvailable', 'scaleOnSite', 'forkliftOnSite', 'notes'];
      const dbUpdates: any = {};
      validKeys.forEach(k => {
        if (k in updates) dbUpdates[k] = (updates as any)[k];
      });
      if (Object.keys(dbUpdates).length > 0) {
        supabase.from('locations').update(dbUpdates).eq('id', id).then(({ error }) => {
          if (error) console.error('Error updating location:', error);
        });
      }
    }
  };

  const deleteLocation = (id: string) => {
    setLocations(prev => prev.filter(l => l.id !== id));
    if (supabase) {
      supabase.from('locations').update({ deleted_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting location:', error);
      });
    }
  };

  const addDriver = (driverData: Omit<Driver, 'id' | 'truckId'>) => {
    const newDriver: Driver = {
      ...driverData,
      id: crypto.randomUUID(),
    };
    setDrivers(prev => [...prev, newDriver]);
    if (supabase) {
      const dbDriver: any = {};
      if ('id' in newDriver) dbDriver['id'] = newDriver['id'];
      if ('name' in newDriver) dbDriver['name'] = newDriver['name'];
      if ('type' in newDriver) dbDriver['type'] = newDriver['type'];
      if ('status' in newDriver) dbDriver['status'] = newDriver['status'];
      if ('truckId' in newDriver) dbDriver['truckId'] = newDriver['truckId'];
      if ('phone' in newDriver) dbDriver['phone'] = newDriver['phone'];
      if ('email' in newDriver) dbDriver['email'] = newDriver['email'];
      if ('address' in newDriver) dbDriver['address'] = newDriver['address'];
      if ('licenseNumber' in newDriver) dbDriver['licenseNumber'] = newDriver['licenseNumber'];
      if ('licenseState' in newDriver) dbDriver['licenseState'] = newDriver['licenseState'];
      if ('cdlExpiry' in newDriver) dbDriver['cdlExpiry'] = newDriver['cdlExpiry'];
      if ('medicalCardExpiry' in newDriver) dbDriver['medicalCardExpiry'] = newDriver['medicalCardExpiry'];
      if ('mvrExpiry' in newDriver) dbDriver['mvrExpiry'] = newDriver['mvrExpiry'];
      if ('clearinghouseStatus' in newDriver) dbDriver['clearinghouseStatus'] = newDriver['clearinghouseStatus'];
      if ('hireDate' in newDriver) dbDriver['hireDate'] = newDriver['hireDate'];
      if ('terminationDate' in newDriver) dbDriver['terminationDate'] = newDriver['terminationDate'];
      if ('payType' in newDriver) dbDriver['payType'] = newDriver['payType'];
      if ('payRate' in newDriver) dbDriver['payRate'] = newDriver['payRate'];
      if ('complianceDocs' in newDriver) dbDriver['complianceDocs'] = newDriver['complianceDocs'];
      if ('performanceMetrics' in newDriver) dbDriver['performanceMetrics'] = newDriver['performanceMetrics'];
      if ('drugTestDate' in newDriver) dbDriver['drugTestDate'] = newDriver['drugTestDate'];

      supabase.from('drivers').insert([dbDriver]).then(({ error }) => {
        if (error) console.error('Error saving driver:', error);
      });
    }
  };

  const updateDriver = (id: string, updates: Partial<Driver>) => {
    setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    if (supabase) {
      const dbUpdates: any = {};
      if ('id' in updates) dbUpdates['id'] = updates['id'];
      if ('name' in updates) dbUpdates['name'] = updates['name'];
      if ('type' in updates) dbUpdates['type'] = updates['type'];
      if ('status' in updates) dbUpdates['status'] = updates['status'];
      if ('truckId' in updates) dbUpdates['truckId'] = updates['truckId'];
      if ('phone' in updates) dbUpdates['phone'] = updates['phone'];
      if ('email' in updates) dbUpdates['email'] = updates['email'];
      if ('address' in updates) dbUpdates['address'] = updates['address'];
      if ('licenseNumber' in updates) dbUpdates['licenseNumber'] = updates['licenseNumber'];
      if ('licenseState' in updates) dbUpdates['licenseState'] = updates['licenseState'];
      if ('cdlExpiry' in updates) dbUpdates['cdlExpiry'] = updates['cdlExpiry'];
      if ('medicalCardExpiry' in updates) dbUpdates['medicalCardExpiry'] = updates['medicalCardExpiry'];
      if ('mvrExpiry' in updates) dbUpdates['mvrExpiry'] = updates['mvrExpiry'];
      if ('clearinghouseStatus' in updates) dbUpdates['clearinghouseStatus'] = updates['clearinghouseStatus'];
      if ('hireDate' in updates) dbUpdates['hireDate'] = updates['hireDate'];
      if ('terminationDate' in updates) dbUpdates['terminationDate'] = updates['terminationDate'];
      if ('payType' in updates) dbUpdates['payType'] = updates['payType'];
      if ('payRate' in updates) dbUpdates['payRate'] = updates['payRate'];
      if ('complianceDocs' in updates) dbUpdates['complianceDocs'] = updates['complianceDocs'];
      if ('performanceMetrics' in updates) dbUpdates['performanceMetrics'] = updates['performanceMetrics'];
      if ('drugTestDate' in updates) dbUpdates['drugTestDate'] = updates['drugTestDate'];

      if (Object.keys(dbUpdates).length > 0) {
        supabase.from('drivers').update(dbUpdates).eq('id', id).then(({ error }) => {
          if (error) console.error('Error updating driver:', error);
        });
      }
    }
  };

  const addTruck = (truckData: Omit<Truck, 'id' | 'driverId'>) => {
    const newTruck: Truck = { ...truckData, id: crypto.randomUUID() };
    setTrucks(prev => [...prev, newTruck]);
    if (supabase) {
      const dbTruck: any = {};
      if ('id' in newTruck) dbTruck['id'] = newTruck['id'];
      if ('unitNumber' in newTruck) dbTruck['unitNumber'] = newTruck['unitNumber'];
      if ('make' in newTruck) dbTruck['make'] = newTruck['make'];
      if ('model' in newTruck) dbTruck['model'] = newTruck['model'];
      if ('year' in newTruck) dbTruck['year'] = newTruck['year'];
      if ('vin' in newTruck) dbTruck['vin'] = newTruck['vin'];
      if ('licensePlate' in newTruck) dbTruck['licensePlate'] = newTruck['licensePlate'];
      if ('licenseState' in newTruck) dbTruck['licenseState'] = newTruck['licenseState'];
      if ('status' in newTruck) dbTruck['status'] = newTruck['status'];
      if ('driverId' in newTruck) dbTruck['driverId'] = newTruck['driverId'];
      if ('ownership' in newTruck) dbTruck['ownership'] = newTruck['ownership'];
      if ('grossWeight' in newTruck) dbTruck['grossWeight'] = newTruck['grossWeight'];
      if ('tareWeight' in newTruck) dbTruck['tareWeight'] = newTruck['tareWeight'];
      if ('annualInspectionExpiry' in newTruck) dbTruck['annualInspectionExpiry'] = newTruck['annualInspectionExpiry'];
      if ('pmDueDate' in newTruck) dbTruck['pmDueDate'] = newTruck['pmDueDate'];
      if ('pmDueMileage' in newTruck) dbTruck['pmDueMileage'] = newTruck['pmDueMileage'];
      if ('lastServiceDate' in newTruck) dbTruck['lastServiceDate'] = newTruck['lastServiceDate'];
      if ('lastServiceMileage' in newTruck) dbTruck['lastServiceMileage'] = newTruck['lastServiceMileage'];
      if ('currentMileage' in newTruck) dbTruck['currentMileage'] = newTruck['currentMileage'];
      if ('complianceDocs' in newTruck) dbTruck['complianceDocs'] = newTruck['complianceDocs'];
      if ('notes' in newTruck) dbTruck['notes'] = newTruck['notes'];

      supabase.from('trucks').insert([dbTruck]).then(({ error }) => {
        if (error) console.error('Error saving truck:', error);
      });
    }
  };

  const updateTruck = (id: string, updates: Partial<Truck>) => {
    setTrucks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    if (supabase) {
      const dbUpdates: any = {};
      if ('id' in updates) dbUpdates['id'] = updates['id'];
      if ('unitNumber' in updates) dbUpdates['unitNumber'] = updates['unitNumber'];
      if ('make' in updates) dbUpdates['make'] = updates['make'];
      if ('model' in updates) dbUpdates['model'] = updates['model'];
      if ('year' in updates) dbUpdates['year'] = updates['year'];
      if ('vin' in updates) dbUpdates['vin'] = updates['vin'];
      if ('licensePlate' in updates) dbUpdates['licensePlate'] = updates['licensePlate'];
      if ('licenseState' in updates) dbUpdates['licenseState'] = updates['licenseState'];
      if ('status' in updates) dbUpdates['status'] = updates['status'];
      if ('driverId' in updates) dbUpdates['driverId'] = updates['driverId'];
      if ('ownership' in updates) dbUpdates['ownership'] = updates['ownership'];
      if ('grossWeight' in updates) dbUpdates['grossWeight'] = updates['grossWeight'];
      if ('tareWeight' in updates) dbUpdates['tareWeight'] = updates['tareWeight'];
      if ('annualInspectionExpiry' in updates) dbUpdates['annualInspectionExpiry'] = updates['annualInspectionExpiry'];
      if ('pmDueDate' in updates) dbUpdates['pmDueDate'] = updates['pmDueDate'];
      if ('pmDueMileage' in updates) dbUpdates['pmDueMileage'] = updates['pmDueMileage'];
      if ('lastServiceDate' in updates) dbUpdates['lastServiceDate'] = updates['lastServiceDate'];
      if ('lastServiceMileage' in updates) dbUpdates['lastServiceMileage'] = updates['lastServiceMileage'];
      if ('currentMileage' in updates) dbUpdates['currentMileage'] = updates['currentMileage'];
      if ('complianceDocs' in updates) dbUpdates['complianceDocs'] = updates['complianceDocs'];
      if ('notes' in updates) dbUpdates['notes'] = updates['notes'];

      if (Object.keys(dbUpdates).length > 0) {
        supabase.from('trucks').update(dbUpdates).eq('id', id).then(({ error }) => {
          if (error) console.error('Error updating truck:', error);
        });
      }
    }
  };

  const addTrailer = (trailerData: Omit<Trailer, 'id'>) => {
    const newTrailer: Trailer = { ...trailerData, id: crypto.randomUUID() };
    setTrailers(prev => [...prev, newTrailer]);
    if (supabase) {
      const dbTrailer: any = {};
      if ('id' in newTrailer) dbTrailer['id'] = newTrailer['id'];
      if ('unitNumber' in newTrailer) dbTrailer['unitNumber'] = newTrailer['unitNumber'];
      if ('type' in newTrailer) dbTrailer['type'] = newTrailer['type'];
      if ('make' in newTrailer) dbTrailer['make'] = newTrailer['make'];
      if ('year' in newTrailer) dbTrailer['year'] = newTrailer['year'];
      if ('vin' in newTrailer) dbTrailer['vin'] = newTrailer['vin'];
      if ('plateNumber' in newTrailer) dbTrailer['licensePlate'] = newTrailer.plateNumber;
      else if ('licensePlate' in newTrailer) dbTrailer['licensePlate'] = newTrailer.licensePlate;
      if ('plateState' in newTrailer) dbTrailer['licenseState'] = newTrailer.plateState;
      else if ('licenseState' in newTrailer) dbTrailer['licenseState'] = newTrailer.licenseState;
      if ('status' in newTrailer) dbTrailer['status'] = newTrailer['status'];
      if ('ownership' in newTrailer) dbTrailer['ownership'] = newTrailer['ownership'];
      if ('length' in newTrailer) dbTrailer['length'] = parseFloat(newTrailer.length) || null;
      if ('annualInspectionExpiry' in newTrailer) dbTrailer['annualInspectionExpiry'] = newTrailer['annualInspectionExpiry'];
      if ('pmDueDate' in newTrailer) dbTrailer['pmDueDate'] = newTrailer['pmDueDate'];
      if ('lastServiceDate' in newTrailer) dbTrailer['lastServiceDate'] = newTrailer['lastServiceDate'];
      if ('complianceDocs' in newTrailer) dbTrailer['complianceDocs'] = newTrailer['complianceDocs'];
      if ('notes' in newTrailer) dbTrailer['notes'] = newTrailer['notes'];

      supabase.from('trailers').insert([dbTrailer]).then(({ error }) => {
        if (error) console.error('Error saving trailer:', error);
      });
    }
  };

  const updateTrailer = (id: string, updates: Partial<Trailer>) => {
    setTrailers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    if (supabase) {
      const dbUpdates: any = {};
      if ('id' in updates) dbUpdates['id'] = updates['id'];
      if ('unitNumber' in updates) dbUpdates['unitNumber'] = updates['unitNumber'];
      if ('type' in updates) dbUpdates['type'] = updates['type'];
      if ('make' in updates) dbUpdates['make'] = updates['make'];
      if ('year' in updates) dbUpdates['year'] = updates['year'];
      if ('vin' in updates) dbUpdates['vin'] = updates['vin'];
      if ('licensePlate' in updates) dbUpdates['licensePlate'] = updates['licensePlate'];
      if ('licenseState' in updates) dbUpdates['licenseState'] = updates['licenseState'];
      if ('status' in updates) dbUpdates['status'] = updates['status'];
      if ('ownership' in updates) dbUpdates['ownership'] = updates['ownership'];
      if ('length' in updates) dbUpdates['length'] = updates['length'];
      if ('annualInspectionExpiry' in updates) dbUpdates['annualInspectionExpiry'] = updates['annualInspectionExpiry'];
      if ('pmDueDate' in updates) dbUpdates['pmDueDate'] = updates['pmDueDate'];
      if ('lastServiceDate' in updates) dbUpdates['lastServiceDate'] = updates['lastServiceDate'];
      if ('complianceDocs' in updates) dbUpdates['complianceDocs'] = updates['complianceDocs'];
      if ('notes' in updates) dbUpdates['notes'] = updates['notes'];

      if (Object.keys(dbUpdates).length > 0) {
        supabase.from('trailers').update(dbUpdates).eq('id', id).then(({ error }) => {
          if (error) console.error('Error updating trailer:', error);
        });
      }
    }
  };

  const deleteTrailer = (id: string) => {
    setTrailers(prev => prev.filter(t => t.id !== id));
    if (supabase) {
      supabase.from('trailers').update({ deleted_at: new Date().toISOString() }).eq('id', id).then(({ error }) => {
        if (error) console.error('Error deleting trailer:', error);
      });
    }
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  // Notifications (§22)
  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'Read' as const, readAt: new Date().toISOString() } : n));
  };

  const markAllNotificationsRead = () => {
    const now = new Date().toISOString();
    setNotifications(prev => prev.map(n => n.status === 'Unread' ? { ...n, status: 'Read' as const, readAt: now } : n));
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'Dismissed' as const } : n));
  };

  // Documents (§10)
  const addTmsDocument = (docData: Omit<TmsDocument, 'id'>) => {
    const newDoc: TmsDocument = {
      ...docData,
      id: crypto.randomUUID(),
    };
    setDocuments(prev => [...prev, newDoc]);
  };

  const removeTmsDocument = (id: string) => {
    const doc = documents.find(d => d.id === id);
    if (doc) {
      logAction('Delete', 'Document', id, doc.name, `Deleted global document ${doc.name}`);
    }
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  // Carrier Profile (§4)
  const updateCarrierProfile = (updates: Partial<Carrier>) => {
    setCarrierProfile(prev => ({ ...prev, ...updates }));
  };

  // Compliance Dispatch Check (§8.3)
  const checkDispatchCompliance = useCallback((driverId?: string, truckId?: string, trailerId?: string) => {
    const hardBlocks: { entity: string; reason: string }[] = [];
    const warnings: { entity: string; reason: string }[] = [];
    const now = new Date();

    if (driverId) {
      const driver = drivers.find(d => d.id === driverId);
      if (driver) {
        if (driver.cdlExpiry && new Date(driver.cdlExpiry) < now) {
          hardBlocks.push({ entity: 'Driver', reason: `CDL expired on ${driver.cdlExpiry}. Per 49 CFR 391, driver cannot operate a CMV.` });
        }
        if (driver.medicalCardExpiry && new Date(driver.medicalCardExpiry) < now) {
          hardBlocks.push({ entity: 'Driver', reason: `Medical card expired on ${driver.medicalCardExpiry}. Driver is medically unqualified per 49 CFR 391.43.` });
        }
        if (driver.clearinghouseStatus === 'Prohibited') {
          hardBlocks.push({ entity: 'Driver', reason: `Driver has PROHIBITED Clearinghouse status. RTD not completed.` });
        }
        if (driver.cdlExpiry && new Date(driver.cdlExpiry) < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) && new Date(driver.cdlExpiry) > now) {
          warnings.push({ entity: 'Driver', reason: `CDL expires in less than 30 days (${driver.cdlExpiry}).` });
        }
        if (driver.medicalCardExpiry && new Date(driver.medicalCardExpiry) < new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) && new Date(driver.medicalCardExpiry) > now) {
          warnings.push({ entity: 'Driver', reason: `Medical card expires in less than 30 days (${driver.medicalCardExpiry}).` });
        }
      }
    }

    if (truckId) {
      const truck = trucks.find(t => t.id === truckId);
      if (truck) {
        if (truck.status === 'Maintenance' || truck.status === 'Out of Service') {
          hardBlocks.push({ entity: 'Truck', reason: `Truck ${truck.unitNumber} is ${truck.status}.` });
        }
        if (truck.annualInspectionExpiry && new Date(truck.annualInspectionExpiry) < now) {
          hardBlocks.push({ entity: 'Truck', reason: `Annual DOT inspection expired on ${truck.annualInspectionExpiry}.` });
        }
      }
    }

    if (trailerId) {
      const trailer = trailers.find(t => t.id === trailerId);
      if (trailer) {
        if (trailer.status === 'Maintenance' || trailer.status === 'Out of Service') {
          hardBlocks.push({ entity: 'Trailer', reason: `Trailer ${trailer.unitNumber} is ${trailer.status}.` });
        }
      }
    }

    return { canDispatch: hardBlocks.length === 0, hardBlocks, warnings };
  }, [drivers, trucks, trailers]);

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
        id: crypto.randomUUID(),
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
    if (!load) return undefined;

    // Calculate total amount from line items if they exist
    const itemsTotal = (load.lineItems || [])
      .filter(i => i.type === 'Revenue')
      .reduce((sum, item) => sum + item.amount, 0);

    // Fallback to base rate if no revenue line items
    const finalAmount = itemsTotal > 0 ? itemsTotal : load.rate;

    const newInvoice: Invoice = {
      id: crypto.randomUUID(),
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
    logAction('Create', 'Invoice', newInvoice.id, newInvoice.invoiceNumber, `Generated invoice for load ${load.loadNumber} for amount $${finalAmount}`);
    updateLoad(loadId, { status: 'Invoiced' });
    return newInvoice.id;
  };

  return (
    <DataContext.Provider value={{
      customers,
      locations,
      loads,
      drivers,
      trucks,
      trailers,
      invoices,
      carrierCompliance,
      carrierProfile,
      notifications,
      documents,
      auditLog,
      logAction,
      unreadNotificationCount,
      theme,
      setTheme,
      unsavedChanges,
      setUnsavedChanges,
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
      addTrailer,
      updateTrailer,
      deleteTrailer,
      updateInvoice,
      assignTruckToDriver,
      generateInvoice,
      markNotificationRead,
      markAllNotificationsRead,
      dismissNotification,
      addTmsDocument,
      removeTmsDocument,
      updateCarrierProfile,
      checkDispatchCompliance,
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
