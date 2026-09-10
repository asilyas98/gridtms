export type LoadStatus = 'Created' | 'Dispatched' | 'In Transit' | 'At Pickup' | 'Loaded' | 'Delivered' | 'Invoiced' | 'Paid' | 'Cancelled';

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface Customer {
  id: string;
  name: string;
  code: string;
  status: 'Active' | 'On Hold' | 'Inactive' | 'Prospect';
  creditLimit: number;
  outstandingBalance: number;
  address: Address;
  phone: string;
  email: string;
  // Extended TMS profile fields
  dba?: string;
  mcNumber?: string;
  dotNumber?: string;
  taxId?: string;
  paymentTerms?: string; // e.g., Net 30, Due on Receipt
  billingDeliveryMethod?: string; // e.g., Email, EDI, Portal
  billingAddress?: Address;
  requirePo?: boolean;
  requirePod?: boolean;
  ediId?: string;
  opsPhone?: string;
  opsEmail?: string;
  notes?: string;
  complianceDocs?: ComplianceDocument[];
}

export interface Location {
  id: string;
  name: string;
  type: 'Shipper' | 'Consignee' | 'Both' | 'Drop Yard' | 'Terminal';
  address: Address;
  customerIds: string[];
  avgDetention?: string;
  // Extended TMS fields
  operatingHours?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  gateCode?: string;
  overnightParking?: boolean;
  restroomsAvailable?: boolean;
  scaleOnSite?: boolean;
  forkliftOnSite?: boolean;
  twicRequired?: boolean;
  ppeRequired?: string[]; // e.g. ["Steel-toe Boots", "High-Vis Vest", "Safety Glasses"]
  maxVehicleHeight?: string;
  notes?: string;
  complianceDocs?: ComplianceDocument[];
}

export interface ComplianceDocument {
  id: string;
  name: string;
  type: string;
  expiryDate: string;
  status: 'Valid' | 'Expiring' | 'Expired';
}

export interface CarrierCompliance {
  dotNumber: string;
  mcNumber: string;
  insuranceExpiry: string;
  cargoInsuranceExpiry: string;
  boc3Status: string;
  ucrRegistered: boolean;
  iftaStatus: string;
  safetyRating: string;
  mcs150Date: string;
  hazmatRegistrationExpiry?: string;
  clearinghouseEnrollment: boolean;
}

export interface DriverChangeLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
}

export interface Driver {
  id: string;
  name: string;
  currentLocation: string;
  status: 'Available' | 'On Load' | 'On Restart' | 'Off Duty';
  cdlClass: string;
  endorsements: string[];
  hosAvailable: string;
  score: number;
  truckId?: string; // Link to assigned truck
  complianceDocs?: ComplianceDocument[];
  medicalCardExpiry?: string;
  cdlExpiry?: string;
  drugTestDate?: string;
  hosViolations?: number;
  hosDutyStatus: 'On Duty' | 'Off Duty' | 'Driving' | 'Sleeper';
  // Additional profile fields
  phone?: string;
  email?: string;
  address?: string;
  type?: 'Company Driver' | 'Owner Operator' | 'Lease Purchase' | string;
  cdlNumber?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  changeLog?: DriverChangeLog[];
}

export interface Truck {
  id: string;
  unitNumber: string;
  makeModel: string;
  type: string;
  currentLocation: string;
  status: 'Available' | 'In Use' | 'Maintenance';
  pmStatus: 'Current' | 'Due' | 'Overdue';
  driverId?: string; // Link to assigned driver
  registrationExpiry?: string;
  annualInspectionExpiry?: string;
  complianceDocs?: ComplianceDocument[];
}

export interface LoadLineItem {
  id: string;
  description: string;
  amount: number;
  type: 'Revenue' | 'Expense';
}

export interface ActivityLogEntry {
  id: string;
  user: string;
  action: string;
  date: string;
  type: 'status' | 'document' | 'financial' | 'system' | 'edit';
}

export interface Load {
  id: string;
  loadNumber: string;
  status: LoadStatus;
  customerId: string;
  originId: string;
  destinationId: string;
  pickupDate: string;
  deliveryDate: string;
  driverId?: string;
  truckId?: string;
  rate: number;
  miles: number;
  commodity: string;
  weight: number;
  equipmentType: string;
  customerPo?: string;
  bolNumber?: string;
  serviceLevel?: string;
  lineItems?: LoadLineItem[];
  documents?: { id: string; name: string; type: string; date: string }[];
  activityLog?: ActivityLogEntry[];
  sentToApp?: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  loadId: string;
  customerId: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Void' | 'Overdue' | 'Rejected' | 'Disputed';
  notes?: string;
  rejectionReason?: string;
  disputeReason?: string;
  method?: 'Email' | 'Factoring' | 'Mail';
  attachment?: string;
  documents?: any[];
}

export interface Settlement {
  id: string;
  settlementNumber: string;
  driverId: string;
  loadId?: string;
  periodStart: string;
  periodEnd: string;
  payMethod: 'CPM' | 'PERCENTAGE' | 'FLAT';
  payRate: number; // e.g. 0.65 for CPM, 0.75 for 75% gross, or 800 for flat rate
  basePay: number;
  fuelSurcharge: number;
  detentionPay: number;
  fuelAdvanceDeduction: number;
  insuranceDeduction: number;
  eldFeeDeduction: number;
  grossEarnings: number;
  deductions: number;
  netPay: number;
  status: 'PENDING' | 'RATE_MATCHED' | 'ACCESSORIALS_ADDED' | 'DISPATCHER_REVIEW' | 'APPROVED' | 'PAID';
  notes?: string;
  customRevenues?: { id: string; name: string; amount: number }[];
  customDeductions?: { id: string; name: string; amount: number }[];
  loadItemizations?: {
    loadId: string;
    loadNumber: string;
    rate: number;
    miles: number;
    payMethod: 'CPM' | 'PERCENTAGE' | 'FLAT';
    payRate: number;
    amount: number;
    customerPo?: string;
    bolNumber?: string;
    loadRevenues?: { id: string; name: string; amount: number }[];
    loadDeductions?: { id: string; name: string; amount: number }[];
  }[];
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface RecurringRule {
  id: string;
  driverId: string;
  type: 'REVENUE' | 'DEDUCTION';
  name: string;
  amount: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  active: boolean;
  startDate?: string;
  rateType?: 'FLAT' | 'PERCENTAGE';
}
