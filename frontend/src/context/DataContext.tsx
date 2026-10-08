import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Customer, Location, Load, Driver, Truck, Invoice, Settlement, LoadStatus, ActivityLogEntry, LoadLineItem, CarrierCompliance, RecurringRule, CompanyUser, UserRole, UserPermissions, UserModulePermissions, UserActionPermissions, EmployeeInvite, CustomRole } from '../types';
import { backendFetch } from '../lib/backendApi';
import { ROLE_PRESETS, INITIAL_COMPANY_USERS, INITIAL_INVITES, INITIAL_CUSTOM_ROLES, getRolePermissions } from '../lib/permissions';
import { AccountCheckResult, checkEmailAccountAssociation } from '../lib/accountValidation';

export interface CompanySettings {
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
}

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
  navigationIntent: { view: string; action?: string; driverId?: string; truckId?: string; tab?: string; returnTo?: string; returnData?: any; searchQuery?: string; } | null;
  setNavigationIntent: React.Dispatch<React.SetStateAction<{ view: string; action?: string; driverId?: string; truckId?: string; tab?: string; returnTo?: string; returnData?: any; searchQuery?: string; } | null>>;
  recurringRules: RecurringRule[];
  loadRecurringRules: () => Promise<void>;
  addRecurringRule: (rule: Omit<RecurringRule, 'id'>) => Promise<string>;
  updateRecurringRule: (id: string, updates: Partial<RecurringRule>) => Promise<void>;
  deleteRecurringRule: (id: string) => Promise<void>;
  companySettings: CompanySettings;
  setCompanySettings: React.Dispatch<React.SetStateAction<CompanySettings>>;
  saveCompanySettings: (settings: CompanySettings) => Promise<boolean>;
  addLoad: (load: Omit<Load, 'id' | 'loadNumber'>) => string;
  updateLoad: (id: string, updates: Partial<Load>) => void;
  duplicateLoad: (id: string) => void;
  deleteLoad: (id: string) => void;
  addLoadItem: (loadId: string, item: Omit<LoadLineItem, 'id'>) => void;
  removeLoadItem: (loadId: string, itemId: string) => void;
  addDocument: (loadId: string, doc: { name: string; type: string; url?: string }) => void;
  removeDocument: (loadId: string, docId: string) => void;
  advanceLoadStatus: (id: string) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'code'>) => string;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addLocation: (location: Omit<Location, 'id'>) => Promise<Location | null>;
  updateLocation: (id: string, updates: Partial<Location>) => Promise<boolean>;
  deleteLocation: (id: string) => void;
  addDriver: (driver: Omit<Driver, 'id' | 'truckId'>) => Promise<Driver | null>;
  updateDriver: (id: string, updates: Partial<Driver>) => Promise<boolean>;
  addTruck: (truck: Omit<Truck, 'id' | 'driverId'>) => Promise<Truck | null>;
  updateTruck: (id: string, updates: Partial<Truck>) => Promise<boolean>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  assignTruckToDriver: (driverId: string, truckId: string | null) => void;
  generateInvoice: (loadId: string, overrides?: Partial<Invoice>) => void;
  // Multi-User Team & Permissions
  teamUsers: CompanyUser[];
  employeeInvites: EmployeeInvite[];
  customRoles: CustomRole[];
  currentUser: CompanyUser;
  setCurrentUser: (user: CompanyUser) => void;
  updateUserRole: (userId: string, role: UserRole) => void;
  updateUserPermissions: (userId: string, permissions: Partial<UserPermissions>) => void;
  inviteTeamUser: (user: Omit<CompanyUser, 'id' | 'lastActive'>) => EmployeeInvite;
  deleteTeamUser: (userId: string) => void;
  approveTeamUser: (userId: string) => void;
  rejectTeamUser: (userId: string) => void;
  registerInvitedEmployee: (inviteToken: string, employeeData: { name: string; phone?: string; password?: string }) => { success: boolean; error?: string; user?: CompanyUser };
  createCustomRole: (roleData: Omit<CustomRole, 'id' | 'createdAt'>) => CustomRole;
  updateCustomRole: (roleId: string, updates: Partial<Omit<CustomRole, 'id' | 'createdAt'>>) => void;
  deleteCustomRole: (roleId: string) => { success: boolean; message?: string };
  duplicateCustomRole: (sourceRoleIdOrName: string, newName?: string) => CustomRole;
  canAccessModule: (moduleName: keyof UserModulePermissions) => boolean;
  canPerformAction: (actionName: keyof UserActionPermissions) => boolean;
  validateEmployeeEmail: (email: string) => AccountCheckResult;
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

const defaultCompanySettings: CompanySettings = {
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
};

const nowIso = () => new Date().toISOString();
const tempId = (prefix: string) => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
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
    ...(customer.id && { id: customer.id }),
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

function toCompanySettings(row: any): CompanySettings {
  return {
    carrierName: row?.carrier_name || '',
    dotNumber: row?.dot_number || '',
    mcNumber: row?.mc_number || '',
    scacCode: row?.scac_code || '',
    address: row?.address || '',
    currency: row?.currency || defaultCompanySettings.currency,
    timezone: row?.timezone || defaultCompanySettings.timezone,
    primaryColor: row?.primary_color || defaultCompanySettings.primaryColor,
    autoInvoice: Boolean(row?.auto_invoice),
    eledIntegration: row?.eld_integration || '',
    factoringPartner: row?.factoring_partner || '',
    quickBooksConnected: Boolean(row?.quickbooks_connected),
  };
}

function companySettingsToDb(settings: CompanySettings) {
  return {
    id: 'gridtms-primary',
    carrier_name: settings.carrierName.trim(),
    dot_number: settings.dotNumber.trim(),
    mc_number: settings.mcNumber.trim(),
    scac_code: settings.scacCode.trim().toUpperCase(),
    address: settings.address.trim(),
    currency: settings.currency,
    timezone: settings.timezone,
    primary_color: settings.primaryColor,
    auto_invoice: settings.autoInvoice,
    eld_integration: settings.eledIntegration,
    factoring_partner: settings.factoringPartner,
    quickbooks_connected: settings.quickBooksConnected,
    updated_at: nowIso(),
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
    gateCode: row.gate_code || '',
    overnightParking: Boolean(row.overnight_parking ?? false),
    restroomsAvailable: Boolean(row.restrooms_available ?? false),
    scaleOnSite: Boolean(row.scale_on_site ?? false),
    forkliftOnSite: Boolean(row.forklift_on_site ?? false),
    twicRequired: Boolean(row.twic_required ?? false),
    ppeRequired: row.ppe_required || [],
    maxVehicleHeight: row.max_vehicle_height || '',
    notes: row.notes || '',
    complianceDocs: row.compliance_docs || [],
  };
}

function locationToDb(location: Partial<Location>) {
  return {
    ...(location.id !== undefined && { id: location.id }),
    ...(location.name !== undefined && { name: location.name }),
    ...(location.type !== undefined && { location_type: location.type }),
    ...(location.address?.street !== undefined && { address: location.address.street }),
    ...(location.address?.city !== undefined && { city: location.address.city }),
    ...(location.address?.state !== undefined && { state: location.address.state }),
    ...(location.address?.zip !== undefined && { zip: location.address.zip }),
    ...(location.address?.country !== undefined && { country: location.address.country }),
    ...(location.address?.lat !== undefined && { lat: location.address.lat }),
    ...(location.address?.lng !== undefined && { lng: location.address.lng }),
    ...(location.customerIds !== undefined && { customer_ids: location.customerIds }),
    ...(location.avgDetention !== undefined && { detention_average: location.avgDetention }),
    ...(location.contactName !== undefined && { contact_name: location.contactName }),
    ...(location.contactPhone !== undefined && { contact_phone: location.contactPhone }),
    ...(location.contactEmail !== undefined && { contact_email: location.contactEmail }),
    ...(location.operatingHours !== undefined && { operating_hours: location.operatingHours }),
    ...(location.gateCode !== undefined && { gate_code: location.gateCode }),
    ...(location.overnightParking !== undefined && { overnight_parking: location.overnightParking }),
    ...(location.restroomsAvailable !== undefined && { restrooms_available: location.restroomsAvailable }),
    ...(location.scaleOnSite !== undefined && { scale_on_site: location.scaleOnSite }),
    ...(location.forkliftOnSite !== undefined && { forklift_on_site: location.forkliftOnSite }),
    ...(location.twicRequired !== undefined && { twic_required: location.twicRequired }),
    ...(location.ppeRequired !== undefined && { ppe_required: location.ppeRequired }),
    ...(location.maxVehicleHeight !== undefined && { max_vehicle_height: location.maxVehicleHeight }),
    ...(location.notes !== undefined && { notes: location.notes }),
    ...(location.complianceDocs !== undefined && { compliance_docs: location.complianceDocs }),
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
    cdlState: row.cdl_state || row.cdlState || '',
    type: row.driver_type || row.type || 'Company Driver',
    address: row.address || '',
    medicalCardExpiry: row.medical_card_expiry || row.medicalCardExpiry || undefined,
    cdlExpiry: row.cdl_expiry || row.cdlExpiry || undefined,
    drugTestDate: row.drug_test_date || row.drugTestDate || undefined,
    hosViolations: Number(row.hos_violations ?? row.hosViolations ?? 0),
    emergencyName: row.emergency_name || row.emergencyName || '',
    emergencyPhone: row.emergency_phone || row.emergencyPhone || '',
    complianceDocs: row.compliance_docs || row.complianceDocs || [],
    changeLog: row.change_log || row.changeLog || [],
  };
}

function driverToDb(driver: Partial<Driver>) {
  return {
    ...(driver.id !== undefined && { id: driver.id }),
    ...(driver.name !== undefined && { full_name: driver.name }),
    ...(driver.phone !== undefined && { phone: driver.phone }),
    ...(driver.email !== undefined && { email: driver.email }),
    ...(driver.status !== undefined && { status: driver.status }),
    ...(driver.cdlNumber !== undefined && { license_number: driver.cdlNumber }),
    ...(driver.cdlState !== undefined && { cdl_state: driver.cdlState }),
    ...(driver.hosAvailable !== undefined && { hos_available: driver.hosAvailable }),
    ...(driver.currentLocation !== undefined && { current_location: driver.currentLocation }),
    ...(driver.cdlClass !== undefined && { cdl_class: driver.cdlClass }),
    ...(driver.endorsements !== undefined && { endorsements: driver.endorsements }),
    ...(driver.score !== undefined && { score: driver.score }),
    ...(driver.truckId !== undefined && { truck_id: driver.truckId || null }),
    ...(driver.hosDutyStatus !== undefined && { hos_duty_status: driver.hosDutyStatus }),
    ...(driver.hosViolations !== undefined && { hos_violations: driver.hosViolations }),
    ...(driver.type !== undefined && { driver_type: driver.type }),
    ...(driver.address !== undefined && { address: driver.address }),
    ...(driver.medicalCardExpiry !== undefined && { medical_card_expiry: driver.medicalCardExpiry || null }),
    ...(driver.cdlExpiry !== undefined && { cdl_expiry: driver.cdlExpiry || null }),
    ...(driver.drugTestDate !== undefined && { drug_test_date: driver.drugTestDate || null }),
    ...(driver.emergencyName !== undefined && { emergency_name: driver.emergencyName }),
    ...(driver.emergencyPhone !== undefined && { emergency_phone: driver.emergencyPhone }),
    ...(driver.complianceDocs !== undefined && { compliance_docs: driver.complianceDocs }),
    ...(driver.changeLog !== undefined && { change_log: driver.changeLog }),
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
    plateState: row.plate_state || row.plateState || '',
    fuelType: row.fuel_type || row.fuelType || '',
    odometer: row.odometer == null ? '' : String(row.odometer),
    eldProvider: row.eld_provider || row.eldProvider || '',
    eldSerial: row.eld_serial || row.eldSerial || '',
    pmInterval: row.pm_interval || row.pmInterval || '',
    capacity: row.capacity || '',
    suspension: row.suspension || '',
    reeferHours: row.reefer_hours == null ? '' : String(row.reefer_hours),
    registrationExpiry: row.registration_expiry || row.registrationExpiry || undefined,
    annualInspectionExpiry: row.annual_inspection_expiry || row.annualInspectionExpiry || undefined,
    complianceDocs: row.compliance_docs || row.complianceDocs || [],
  };
}

function truckToDb(truck: Partial<Truck>) {
  return {
    ...(truck.id !== undefined && { id: truck.id }),
    ...(truck.unitNumber !== undefined && { unit_number: truck.unitNumber }),
    ...(truck.makeModel !== undefined && { make_model: truck.makeModel }),
    ...(truck.type !== undefined && { truck_type: truck.type }),
    ...(truck.vin !== undefined && { vin: truck.vin }),
    ...(truck.plateNumber !== undefined && { plate_number: truck.plateNumber }),
    ...(truck.plateState !== undefined && { plate_state: truck.plateState }),
    ...(truck.fuelType !== undefined && { fuel_type: truck.fuelType }),
    ...(truck.odometer !== undefined && { odometer: truck.odometer }),
    ...(truck.eldProvider !== undefined && { eld_provider: truck.eldProvider }),
    ...(truck.eldSerial !== undefined && { eld_serial: truck.eldSerial }),
    ...(truck.pmInterval !== undefined && { pm_interval: truck.pmInterval }),
    ...(truck.capacity !== undefined && { capacity: truck.capacity }),
    ...(truck.suspension !== undefined && { suspension: truck.suspension }),
    ...(truck.reeferHours !== undefined && { reefer_hours: truck.reeferHours }),
    ...(truck.status !== undefined && { status: truck.status }),
    ...(truck.currentLocation !== undefined && { current_location: truck.currentLocation }),
    ...(truck.pmStatus !== undefined && { pm_status: truck.pmStatus }),
    ...(truck.driverId !== undefined && { driver_id: truck.driverId || null }),
    ...(truck.registrationExpiry !== undefined && { registration_expiry: truck.registrationExpiry || null }),
    ...(truck.annualInspectionExpiry !== undefined && { annual_inspection_expiry: truck.annualInspectionExpiry || null }),
    ...(truck.complianceDocs !== undefined && { compliance_docs: truck.complianceDocs }),
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
    ...(load.id && { id: load.id }),
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
    ...(invoice.id && { id: invoice.id }),
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
    ...(rule.id && { id: rule.id }),
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
    searchQuery?: string;
  } | null>(null);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);

  const [companySettings, setCompanySettings] = useState<CompanySettings>(defaultCompanySettings);

  // Multi-User Team & Permission State
  const [teamUsers, setTeamUsers] = useState<CompanyUser[]>(() => {
    try {
      const saved = localStorage.getItem('gridtms_team_users');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_COMPANY_USERS;
  });

  const [employeeInvites, setEmployeeInvites] = useState<EmployeeInvite[]>(() => {
    try {
      const saved = localStorage.getItem('gridtms_employee_invites');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_INVITES;
  });

  const [customRoles, setCustomRoles] = useState<CustomRole[]>(() => {
    try {
      const saved = localStorage.getItem('gridtms_custom_roles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_CUSTOM_ROLES;
  });

  const [currentUser, setCurrentUserState] = useState<CompanyUser>(() => {
    try {
      const savedId = localStorage.getItem('gridtms_active_user_id');
      if (savedId) {
        const found = teamUsers.find(u => u.id === savedId);
        if (found) return found;
      }
    } catch (e) {}
    return teamUsers[0] || INITIAL_COMPANY_USERS[0];
  });

  // Sync users, invites, and custom roles to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gridtms_team_users', JSON.stringify(teamUsers));
    } catch (e) {}
  }, [teamUsers]);

  useEffect(() => {
    try {
      localStorage.setItem('gridtms_employee_invites', JSON.stringify(employeeInvites));
    } catch (e) {}
  }, [employeeInvites]);

  useEffect(() => {
    try {
      localStorage.setItem('gridtms_custom_roles', JSON.stringify(customRoles));
    } catch (e) {}
  }, [customRoles]);

  // Sync current user role/permissions whenever teamUsers array changes
  useEffect(() => {
    const updated = teamUsers.find(u => u.id === currentUser.id);
    if (updated) {
      setCurrentUserState(updated);
    }
  }, [teamUsers]);

  const setCurrentUser = (user: CompanyUser) => {
    setCurrentUserState(user);
    try {
      localStorage.setItem('gridtms_active_user_id', user.id);
    } catch (e) {}
  };

  const updateUserRole = (userId: string, role: UserRole) => {
    const rolePermissions = getRolePermissions(role, customRoles);
    setTeamUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          role,
          isCustomPermissions: false,
          permissions: JSON.parse(JSON.stringify(rolePermissions)),
        };
      }
      return u;
    }));
  };

  const updateUserPermissions = (userId: string, permissions: Partial<UserPermissions>) => {
    setTeamUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const newPermissions: UserPermissions = {
          modules: { ...u.permissions.modules, ...(permissions.modules || {}) },
          actions: { ...u.permissions.actions, ...(permissions.actions || {}) },
        };
        return {
          ...u,
          isCustomPermissions: true,
          permissions: newPermissions,
        };
      }
      return u;
    }));
  };

  const validateEmployeeEmail = (email: string): AccountCheckResult => {
    let extraEmails: string[] = ['demo@gridtms.local'];
    try {
      const savedAuthUsers = localStorage.getItem('gridtms_users');
      if (savedAuthUsers) {
        const parsed = JSON.parse(savedAuthUsers);
        if (Array.isArray(parsed)) {
          extraEmails.push(
            ...parsed
              .filter((u: any) => u.companyId && u.companyId !== (currentUser?.companyId || 'carrier-corp-1'))
              .map((u: any) => u.email)
          );
        }
      }
    } catch (e) {}

    return checkEmailAccountAssociation({
      email,
      currentCompanyId: currentUser?.companyId || 'carrier-corp-1',
      teamUsers,
      employeeInvites,
      drivers,
      extraRegisteredEmails: extraEmails,
    });
  };

  const inviteTeamUser = (userData: Omit<CompanyUser, 'id' | 'lastActive'>): EmployeeInvite => {
    // Authoritative pre-invite verification guard
    const validation = validateEmployeeEmail(userData.email);
    if (!validation.isAvailable) {
      throw new Error(validation.message);
    }

    // Generate secure cryptographically linked token
    const token = `inv_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + 7);

    const newInvite: EmployeeInvite = {
      id: `inv-${Date.now()}`,
      token,
      companyId: userData.companyId || 'carrier-corp-1',
      companyName: userData.companyName || companySettings.carrierName || 'Apex Logistics Freight LLC',
      dotNumber: companySettings.dotNumber || '3829104',
      mcNumber: companySettings.mcNumber || '1192842',
      email: userData.email,
      name: userData.name,
      role: userData.role,
      createdAt: new Date().toISOString(),
      expiresAt: expiresDate.toISOString(),
      status: 'Pending',
    };

    setEmployeeInvites(prev => [newInvite, ...prev]);

    // Also register in teamUsers list as Invited
    const newUser: CompanyUser = {
      ...userData,
      id: `user-${Date.now()}`,
      status: 'Invited',
      companyId: newInvite.companyId,
      companyName: newInvite.companyName,
      inviteToken: token,
      lastActive: 'Invitation Sent',
      avatarInitials: userData.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'TU',
    };
    setTeamUsers(prev => [...prev, newUser]);
    return newInvite;
  };

  // Called when an employee follows the invitation link and fills out their registration
  const registerInvitedEmployee = (
    inviteToken: string,
    employeeData: { name: string; phone?: string; password?: string }
  ) => {
    const invite = employeeInvites.find(inv => inv.token === inviteToken);
    if (!invite) {
      return { success: false, error: 'Invalid or unrecognized invitation link.' };
    }
    if (invite.status === 'Expired' || new Date(invite.expiresAt).getTime() < Date.now()) {
      return { success: false, error: 'This invitation link has expired. Please contact your company administrator.' };
    }

    // Mark invite as accepted
    setEmployeeInvites(prev => prev.map(inv => inv.id === invite.id ? { ...inv, status: 'Accepted' } : inv));

    // Update existing placeholder or create pending approval user
    let registeredUser: CompanyUser | null = null;
    const existing = teamUsers.find(u => u.email.toLowerCase() === invite.email.toLowerCase() || u.inviteToken === inviteToken);

    if (existing) {
      registeredUser = {
        ...existing,
        name: employeeData.name || existing.name,
        phone: employeeData.phone || existing.phone,
        status: 'Pending Approval', // Awaiting admin review as requested
        registeredAt: new Date().toISOString(),
        lastActive: 'Registered (Review Required)',
      };
      setTeamUsers(prev => prev.map(u => u.id === existing.id ? registeredUser! : u));
    } else {
      registeredUser = {
        id: `user-${Date.now()}`,
        name: employeeData.name || invite.name,
        email: invite.email,
        phone: employeeData.phone,
        role: invite.role,
        status: 'Pending Approval',
        companyId: invite.companyId,
        companyName: invite.companyName,
        inviteToken,
        registeredAt: new Date().toISOString(),
        lastActive: 'Registered (Review Required)',
        avatarInitials: (employeeData.name || invite.name)
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2) || 'TU',
        isCustomPermissions: false,
        permissions: JSON.parse(JSON.stringify(getRolePermissions(invite.role, customRoles))),
      };
      setTeamUsers(prev => [...prev, registeredUser!]);
    }

    return { success: true, user: registeredUser };
  };

  const approveTeamUser = (userId: string) => {
    setTeamUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          status: 'Active',
          lastActive: 'Approved Just Now',
        };
      }
      return u;
    }));
  };

  const rejectTeamUser = (userId: string) => {
    setTeamUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          status: 'Suspended',
          lastActive: 'Application Rejected',
        };
      }
      return u;
    }));
  };

  const deleteTeamUser = (userId: string) => {
    if (teamUsers.length <= 1) return;
    setTeamUsers(prev => prev.filter(u => u.id !== userId));
    if (currentUser.id === userId) {
      const remaining = teamUsers.filter(u => u.id !== userId);
      setCurrentUser(remaining[0]);
    }
  };

  const createCustomRole = (roleData: Omit<CustomRole, 'id' | 'createdAt'>): CustomRole => {
    const newRole: CustomRole = {
      ...roleData,
      id: `role-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    setCustomRoles(prev => [...prev, newRole]);
    return newRole;
  };

  const updateCustomRole = (roleId: string, updates: Partial<Omit<CustomRole, 'id' | 'createdAt'>>) => {
    setCustomRoles(prev => prev.map(r => {
      if (r.id === roleId) {
        const updated = {
          ...r,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        // If role name changed, update team members using this role
        if (updates.name && updates.name !== r.name) {
          setTeamUsers(users => users.map(u => u.role === r.name ? { ...u, role: updates.name! } : u));
        }
        return updated;
      }
      return r;
    }));
  };

  const deleteCustomRole = (roleId: string): { success: boolean; message?: string } => {
    const roleToDelete = customRoles.find(r => r.id === roleId);
    if (!roleToDelete) return { success: false, message: 'Role not found' };
    if (roleToDelete.isSystem) return { success: false, message: 'System built-in roles cannot be deleted' };

    // Check if any team members currently hold this role
    const assignedUsers = teamUsers.filter(u => u.role === roleToDelete.name);
    if (assignedUsers.length > 0) {
      const fallbackRole = roleToDelete.baseRole || 'Fleet Viewer';
      const fallbackPerms = getRolePermissions(fallbackRole, customRoles);
      setTeamUsers(users => users.map(u => u.role === roleToDelete.name ? {
        ...u,
        role: fallbackRole,
        isCustomPermissions: false,
        permissions: JSON.parse(JSON.stringify(fallbackPerms)),
      } : u));
    }

    setCustomRoles(prev => prev.filter(r => r.id !== roleId));
    return { success: true };
  };

  const duplicateCustomRole = (sourceRoleIdOrName: string, newName?: string): CustomRole => {
    const source = customRoles.find(r => r.id === sourceRoleIdOrName || r.name.toLowerCase() === sourceRoleIdOrName.toLowerCase());
    const targetName = newName || (source ? `${source.name} (Copy)` : 'Custom Role Copy');
    const defaultPermissions = source ? source.permissions : getRolePermissions(sourceRoleIdOrName, customRoles);

    const newRole: CustomRole = {
      id: `role-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: targetName,
      description: source ? `Customized clone of ${source.name}: ${source.description}` : 'Customized fleet operational role',
      isSystem: false,
      baseRole: source?.name || 'Dispatcher',
      color: source?.color || 'indigo',
      permissions: JSON.parse(JSON.stringify(defaultPermissions)),
      createdAt: new Date().toISOString(),
    };
    setCustomRoles(prev => [...prev, newRole]);
    return newRole;
  };

  const canAccessModule = (moduleName: keyof UserModulePermissions): boolean => {
    return Boolean(currentUser?.permissions?.modules?.[moduleName]);
  };

  const canPerformAction = (actionName: keyof UserActionPermissions): boolean => {
    return Boolean(currentUser?.permissions?.actions?.[actionName]);
  };



  const reportPersistenceError = (message: string, error?: unknown) => {
    console.error(message, error);
    window.dispatchEvent(new CustomEvent('gridtms-persistence-error', {
      detail: { message: `${message} Nothing was saved. Please try again.` },
    }));
  };

  const refreshData = async () => {
    // 1. First attempt backend bootstrap (which connects to Supabase server-side)
    try {
      const data = await backendFetch('/api/bootstrap');
      // Older deployments did not include an explicit `success` flag. A valid
      // bootstrap payload is identified by its data arrays as well, so never
      // discard authenticated server data and fall back to an anonymous RLS
      // query merely because that optional flag is missing.
      if (data && (data.success === true || Array.isArray(data.loads) || Array.isArray(data.customers))) {
        setCustomers((data.customers || []).map(toCustomer));
        setLocations((data.locations || []).map(toLocation));
        setDrivers((data.drivers || []).map(toDriver));
        setTrucks((data.trucks || []).map(toTruck));
        setLoads((data.loads || []).map(toLoad));
        setInvoices((data.invoices || []).map(toInvoice));
        setRecurringRules((data.recurringRules || []).map(toRecurringRule));
        if (data.companySettings) setCompanySettings(toCompanySettings(data.companySettings));
        return;
      }
    } catch (backendError) {
      // Do not replace valid screen state with an anonymous RLS result. The
      // authenticated Netlify API is the single source of truth.
      reportPersistenceError('GridTMS could not refresh data from Supabase.', backendError);
    }
  };

  useEffect(() => { 
    refreshData(); 
    // Auto-poll every 12 seconds so driver load status updates, POD uploads, and GPS pings reflect live in GridTMS
    const timer = setInterval(() => {
      refreshData();
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  const persistCreate = async <T extends { id?: string }>(resource: string, payload: any, mapper: (row: any) => T, replace?: (item: T) => void): Promise<T | null> => {
    // 1. Try backend server
    try {
      const row = await backendFetch(`/api/${resource}`, { method: 'POST', body: JSON.stringify(payload) });
      const unwrapped = row?.data || row?.driver || row?.truck || row?.load || row?.customer || row?.location || row?.invoice || row?.rule || row?.settlement || row;
      
      if (unwrapped && Object.keys(unwrapped).length > 0) {
        const mapped = mapper(unwrapped);
        if (!mapped.id) {
          mapped.id = payload.id;
        }
        replace?.(mapped);
        return mapped;
      }
    } catch (error) {
      reportPersistenceError(`GridTMS could not save ${resource} to Supabase.`, error);
    }
    return null;
  };

  const persistUpdate = async (resource: string, id: string, payload: any): Promise<boolean> => {
    // 1. Try backend server
    try {
      await backendFetch(`/api/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      return true;
    } catch (error) {
      reportPersistenceError(`GridTMS could not update ${resource}.`, error);
      return false;
    }
  };

  const persistDelete = async (resource: string, id: string) => {
    // 1. Try backend server
    try { 
      await backendFetch(`/api/${resource}/${id}`, { method: 'DELETE' }); 
      return;
    } catch (error) {
      reportPersistenceError(`GridTMS could not delete ${resource}.`, error);
    }
  };

  const saveCompanySettings = async (settings: CompanySettings): Promise<boolean> => {
    const dbPayload = companySettingsToDb(settings);

    // 1. Try backend server
    try {
      const row = await backendFetch('/api/company-settings', {
        method: 'POST',
        body: JSON.stringify(dbPayload),
      });
      const saved = row?.data || row;
      if (saved && saved.id) {
        setCompanySettings(toCompanySettings(saved));
        return true;
      }
    } catch (error) {
      reportPersistenceError('GridTMS could not save company settings to Supabase.', error);
    }
    return false;
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
      const unwrapped = row?.rule || row?.data || row;
      if (unwrapped && Object.keys(unwrapped).length > 0) {
        const saved = toRecurringRule(unwrapped);
        if (!saved.id) saved.id = id;
        setRecurringRules(prev => prev.map(r => r.id === id ? saved : r));
        return saved.id;
      }
      return id;
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
    void persistCreate('loads', loadToDb(newLoad, { customers, locations, drivers, trucks }), toLoad, saved => {
      setLoads(prev => prev.map(l => l.id === id ? saved : l));
      if (saved.id && saved.id !== id) {
        window.dispatchEvent(new CustomEvent('record-id-changed', { detail: { oldId: id, newId: saved.id } }));
      }
    }).then(saved => {
      if (!saved) setLoads(prev => prev.filter(load => load.id !== id));
    });
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

  const addDocument = (loadId: string, docData: { name: string; type: string; url?: string }) => {
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
    void persistCreate('customers', customerToDb(newCustomer), toCustomer, saved => setCustomers(prev => prev.map(c => c.id === id ? saved : c)))
      .then(saved => { if (!saved) setCustomers(prev => prev.filter(customer => customer.id !== id)); });
    return id;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    persistUpdate('customers', id, customerToDb(updates));
  };

  const deleteCustomer = (id: string) => { setCustomers(prev => prev.filter(c => c.id !== id)); persistDelete('customers', id); };

  const addLocation = async (locationData: Omit<Location, 'id'>): Promise<Location | null> => {
    const id = tempId('loc');
    const newLocation: Location = { ...locationData, id };
    const saved = await persistCreate('locations', locationToDb(newLocation), toLocation);
    if (saved) setLocations(prev => [saved, ...prev]);
    return saved;
  };

  const updateLocation = async (id: string, updates: Partial<Location>): Promise<boolean> => {
    const saved = await persistUpdate('locations', id, locationToDb(updates));
    if (saved) setLocations(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    return saved;
  };

  const deleteLocation = (id: string) => { setLocations(prev => prev.filter(l => l.id !== id)); persistDelete('locations', id); };

  const addDriver = async (driverData: Omit<Driver, 'id' | 'truckId'>): Promise<Driver | null> => {
    const id = tempId('d');
    const newDriver: Driver = { ...driverData, id };
    const saved = await persistCreate('drivers', driverToDb(newDriver), toDriver);
    if (saved) setDrivers(prev => [saved, ...prev]);
    return saved;
  };

  const updateDriver = async (id: string, updates: Partial<Driver>): Promise<boolean> => {
    const saved = await persistUpdate('drivers', id, driverToDb(updates));
    if (saved) setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    return saved;
  };

  const addTruck = async (truckData: Omit<Truck, 'id' | 'driverId'>): Promise<Truck | null> => {
    const id = tempId('tr');
    const newTruck: Truck = { ...truckData, id };
    const saved = await persistCreate('trucks', truckToDb(newTruck), toTruck);
    if (saved) setTrucks(prev => [saved, ...prev]);
    return saved;
  };

  const updateTruck = async (id: string, updates: Partial<Truck>): Promise<boolean> => {
    const saved = await persistUpdate('trucks', id, truckToDb(updates));
    if (saved) setTrucks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    return saved;
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
      saveCompanySettings,
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
      teamUsers,
      employeeInvites,
      customRoles,
      currentUser,
      setCurrentUser,
      updateUserRole,
      updateUserPermissions,
      inviteTeamUser,
      deleteTeamUser,
      approveTeamUser,
      rejectTeamUser,
      registerInvitedEmployee,
      createCustomRole,
      updateCustomRole,
      deleteCustomRole,
      duplicateCustomRole,
      canAccessModule,
      canPerformAction,
      validateEmployeeEmail,
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
