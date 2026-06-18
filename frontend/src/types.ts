// ============================================================
// Grid TMS — Core Data Model (per Feature Spec §2)
// ============================================================

// --- Status Enums ---

export type LoadStatus = 
  | 'Quoted' | 'Booked' | 'Assigned' | 'Created' 
  | 'Dispatched' | 'In Transit' | 'At Pickup' | 'Loaded' 
  | 'At Delivery' | 'Delivered' | 'Ready to Invoice' 
  | 'Invoiced' | 'Paid' | 'Cancelled' | 'Archived';

export type DriverStatus = 'Applicant' | 'Active' | 'Inactive' | 'Terminated' | 'Available' | 'On Load' | 'On Restart' | 'Off Duty';
export type EquipmentStatus = 'Available' | 'In Use' | 'Maintenance' | 'Out of Service' | 'Inactive' | 'Sold';
export type EquipmentOwnership = 'Owned' | 'Leased' | 'Owner-Operator';
export type DriverEmploymentType = 'Company Driver' | 'Owner Operator' | 'Lease Purchase';
export type DQDocStatus = 'Missing' | 'Received' | 'Verified' | 'Expired' | 'Expiring';
export type NotificationPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type NotificationStatus = 'Unread' | 'Read' | 'Dismissed' | 'Actioned';
export type TaskStatus = 'Open' | 'In Progress' | 'Done' | 'Overdue';

// --- Address ---

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  lat?: number;
  lng?: number;
}

// --- Carrier (§4) ---

export interface Carrier {
  id: string;
  legalName: string;
  dba?: string;
  ein: string;
  physicalAddress: Address;
  mailingAddress?: Address;
  phone: string;
  principalContact: string;
  principalEmail?: string;
  // Authority & Identifiers
  usdotNumber: string;
  mcNumber: string;
  mxNumber?: string;
  ffNumber?: string;
  authorityType: 'Common' | 'Contract' | 'Broker';
  authorityStatus: 'Active' | 'Pending' | 'Revoked' | 'Inactive';
  statesOfOperation: string[];
  scacCode?: string;
  dunsNumber?: string;
  // Operation Classification
  operationType: 'Interstate' | 'Intrastate' | 'Both';
  cargoTypes: string[];
  hazmatFlag: boolean;
  powerUnitCount: number;
  driverCount: number;
  // Insurance (§4.5)
  insuranceRecords: InsuranceRecord[];
  // Credentials (§4.4)
  credentials: Credential[];
}

export interface InsuranceRecord {
  id: string;
  policyType: 'Auto Liability' | 'Cargo' | 'General Liability' | 'Workers Comp' | 'Umbrella' | 'Physical Damage' | string;
  carrier: string;
  policyNumber: string;
  coverageLimits: string;
  effectiveDate: string;
  expirationDate: string;
  certificateDocId?: string;
  status: 'Active' | 'Expiring' | 'Lapsed' | 'Expired';
}

// --- Credential (§19 / §4.4) ---

export interface Credential {
  id: string;
  type: 'MCS-150' | 'UCR' | 'IFTA' | 'IRP' | 'BOC-3' | 'Insurance Filing' | 'HVUT/2290' | 'State Permit' | 'Operating Authority' | string;
  name: string;
  referenceNumber?: string;
  responsibleParty?: string;
  issueDate?: string;
  expirationDate?: string;
  nextDueDate?: string;
  lastFiledDate?: string;
  status: 'Current' | 'Expiring' | 'Overdue' | 'Expired' | 'Pending' | 'Not Filed';
  documentId?: string;
  notes?: string;
  daysToExpiration?: number;
}

// --- Customer (§7) ---

export interface Customer {
  id: string;
  name: string;
  code: string;
  type?: 'Broker' | 'Shipper' | 'Consignee';
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
  paymentTerms?: string;
  billingDeliveryMethod?: string;
  billingAddress?: Address;
  requirePo?: boolean;
  requirePod?: boolean;
  ediId?: string;
  opsPhone?: string;
  opsEmail?: string;
  notes?: string;
  complianceDocs?: ComplianceDocument[];
  // Broker credit (§7.2)
  brokerCreditScore?: number;
  daysToPayAvg?: number;
  brokerNotes?: string;
  slowPayFlag?: boolean;
}

// --- Location ---

export interface Location {
  id: string;
  name: string;
  type: 'Shipper' | 'Consignee' | 'Both' | 'Drop Yard' | 'Terminal';
  address: Address;
  customerIds: string[];
  avgDetention?: string;
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
  ppeRequired?: string[];
  maxVehicleHeight?: string;
  notes?: string;
  complianceDocs?: ComplianceDocument[];
}

// --- Compliance Document (legacy, used by existing views) ---

export interface ComplianceDocument {
  id: string;
  name: string;
  type: string;
  expiryDate: string;
  status: 'Valid' | 'Expiring' | 'Expired';
}

// --- Carrier Compliance (legacy) ---

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

// --- Driver Qualification File (§5) ---

export interface DQFileItem {
  id: string;
  type: 'Employment Application' | 'MVR' | 'Annual MVR' | 'Annual Review Note' | 'Road Test Certificate' 
    | 'Safety Performance History' | 'Medical Card' | 'Violations List' | 'Pre-Employment Drug Test' 
    | 'Clearinghouse Full Query' | 'Clearinghouse Annual Query' | 'Drug Alcohol Policy Acknowledgment' 
    | 'CDL Copy' | string;
  name: string;
  status: DQDocStatus;
  required: boolean;
  dueWithin30Days?: boolean; // Due within 30 days of hire
  recurring?: boolean; // Recurring (e.g., annual MVR)
  recurrenceMonths?: number; // How often it recurs
  receivedDate?: string;
  verifiedDate?: string;
  expirationDate?: string;
  nextDueDate?: string;
  documentId?: string;
  notes?: string;
  cfr?: string; // Regulatory citation
}

export interface DriverQualificationFile {
  driverId: string;
  items: DQFileItem[];
  overallStatus: 'Qualified' | 'Action Needed' | 'Not Qualified' | 'Pending Review';
  dispatchEligible: boolean;
  eligibilityBlockReasons: string[];
  retentionEndDate?: string; // Employment + 3 years
  completenessScore: number; // 0-100
}

// --- Drug & Alcohol (§17) ---

export interface DrugAlcoholTest {
  id: string;
  driverId: string;
  testType: 'Pre-Employment' | 'Random' | 'Post-Accident' | 'Reasonable Suspicion' | 'Return-to-Duty' | 'Follow-Up';
  testDate: string;
  substance: 'Drug' | 'Alcohol' | 'Both';
  result: 'Negative' | 'Positive' | 'Refused' | 'Pending' | 'Cancelled';
  labName?: string;
  mroName?: string;
  documentId?: string;
  notes?: string;
  retentionEndDate?: string;
}

export interface ClearinghouseQuery {
  id: string;
  driverId: string;
  queryType: 'Full' | 'Limited';
  queryDate: string;
  consentDate?: string;
  consentDocId?: string;
  result: 'Clear' | 'Prohibited' | 'Pending';
  nextDueDate?: string;
  notes?: string;
}

export interface RandomTestingPool {
  year: number;
  totalDrivers: number;
  drugTargetRate: number; // Default 0.50
  alcoholTargetRate: number; // Default 0.10
  drugTestsCompleted: number;
  alcoholTestsCompleted: number;
  drugComplianceRate: number;
  alcoholComplianceRate: number;
  selections: { driverId: string; date: string; completed: boolean }[];
}

// --- Driver (§5, expanded) ---

export interface DriverChangeLog {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  previousValue?: string;
  newValue?: string;
}

export interface Driver {
  id: string;
  name: string;
  currentLocation: string;
  status: 'Available' | 'On Load' | 'On Restart' | 'Off Duty';
  driverStatus?: DriverStatus; // Full lifecycle status
  archived?: boolean;
  archiveNote?: string;
  cdlClass: string;
  endorsements: string[];
  hosAvailable: string;
  score: number;
  truckId?: string;
  complianceDocs?: ComplianceDocument[];
  medicalCardExpiry?: string;
  cdlExpiry?: string;
  drugTestDate?: string;
  hosViolations?: number;
  hosDutyStatus: 'On Duty' | 'Off Duty' | 'Driving' | 'Sleeper';
  // Extended profile fields (§5.1)
  phone?: string;
  email?: string;
  address?: string;
  fullAddress?: Address;
  dob?: string;
  type?: DriverEmploymentType | string;
  cdlNumber?: string;
  cdlIssuingState?: string;
  cdlIssueDate?: string;
  cdlRestrictions?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelationship?: string;
  hireDate?: string;
  terminationDate?: string;
  terminationReason?: string;
  // DQ File (§5.2)
  dqFile?: DriverQualificationFile;
  dispatchEligible?: boolean;
  eligibilityBlockReasons?: string[];
  // Drug & Alcohol (§17)
  drugAlcoholTests?: DrugAlcoholTest[];
  clearinghouseQueries?: ClearinghouseQuery[];
  clearinghouseStatus?: 'Clear' | 'Prohibited' | 'Unknown';
  drugAlcoholPolicyAcknowledged?: boolean;
  drugAlcoholPolicyDate?: string;
  // Changelog
  changeLog?: DriverChangeLog[];
}

// --- Truck (§6, expanded) ---

export interface Truck {
  id: string;
  unitNumber: string;
  makeModel: string;
  type: string;
  currentLocation: string;
  status: 'Available' | 'In Use' | 'Maintenance' | 'Out of Service';
  archived?: boolean;
  archiveNote?: string;
  pmStatus: 'Current' | 'Due' | 'Overdue';
  driverId?: string;
  registrationExpiry?: string;
  annualInspectionExpiry?: string;
  complianceDocs?: ComplianceDocument[];
  // Extended fields (§6.1)
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  plateNumber?: string;
  plateState?: string;
  gvwr?: number;
  fuelType?: 'Diesel' | 'Gas' | 'CNG' | 'Electric' | string;
  ownership?: EquipmentOwnership;
  purchaseDate?: string;
  leaseCompany?: string;
  leaseEndDate?: string;
  irpPlateNumber?: string;
  irpRegistrationExpiry?: string;
  eldDeviceId?: string;
  eldProvider?: string;
  odometer?: number;
  engineHours?: number;
  // Maintenance
  lastServiceDate?: string;
  nextPMDue?: string;
  nextPMMiles?: number;
  // Documents
  documents?: TmsDocument[];
}

// --- Trailer (§6, NEW entity) ---

export interface Trailer {
  id: string;
  unitNumber: string;
  type: 'Dry Van' | 'Reefer' | 'Flatbed' | 'Step Deck' | 'Tanker' | 'Lowboy' | 'Conestoga' | 'Intermodal' | string;
  vin?: string;
  serialNumber?: string;
  make?: string;
  model?: string;
  year?: number;
  length?: string; // e.g., "53'"
  width?: string;
  height?: string;
  maxWeight?: number;
  doorType?: string;
  plateNumber?: string;
  plateState?: string;
  registrationExpiry?: string;
  annualInspectionExpiry?: string;
  ownership?: EquipmentOwnership;
  status: EquipmentStatus;
  currentLocation?: string;
  assignedDriverId?: string;
  notes?: string;
  archived?: boolean;
  archiveNote?: string;
  pmStatus?: 'Current' | 'Due' | 'Overdue';
  complianceDocs?: ComplianceDocument[];
  documents?: TmsDocument[];
}

// --- Stop (§8) ---

export interface Stop {
  id: string;
  loadId: string;
  sequence: number;
  type: 'Pickup' | 'Delivery' | 'Stop Off' | 'Layover';
  locationId?: string;
  locationName?: string;
  address?: Address;
  appointmentStart?: string;
  appointmentEnd?: string;
  contact?: string;
  contactPhone?: string;
  instructions?: string;
  referenceNumbers?: string[];
  arrivalTime?: string;
  departureTime?: string;
  status: 'Pending' | 'En Route' | 'Arrived' | 'Loading' | 'Unloading' | 'Departed' | 'Completed';
  // Detention tracking
  detentionStartTime?: string;
  detentionMinutes?: number;
  lumperFee?: number;
  notes?: string;
}

// --- Accessorial Charge (§8.2) ---

export interface AccessorialCharge {
  id: string;
  type: 'Detention' | 'Layover' | 'Lumper' | 'TONU' | 'Stop Off Pay' | 'Reconsignment' | 'Fuel Surcharge' | 'Scale Ticket' | 'Toll' | 'Other' | string;
  description: string;
  amount: number;
  notes?: string;
}

// --- Document (§10, polymorphic) ---

export interface TmsDocument {
  id: string;
  name: string;
  fileName?: string;
  type: 'BOL' | 'POD' | 'Rate Confirmation' | 'Lumper Receipt' | 'Scale Ticket' | 'Invoice' 
    | 'Settlement' | 'Insurance Certificate' | 'Medical Card' | 'CDL' | 'MVR' | 'Drug Test' 
    | 'Employment Application' | 'Road Test Certificate' | 'Annual Inspection' | 'DVIR' 
    | 'Registration' | 'Title' | 'Lease Agreement' | 'W-9' | 'Authority Letter' | 'BOC-3' 
    | 'Policy Document' | 'Photo' | 'Other' | string;
  tags?: string[];
  entityType: 'Load' | 'Driver' | 'Truck' | 'Trailer' | 'Customer' | 'Carrier' | 'Credential';
  entityId: string;
  uploadDate: string;
  effectiveDate?: string;
  expirationDate?: string;
  retentionRule?: string;
  retentionEndDate?: string;
  status?: 'Valid' | 'Expiring' | 'Expired' | 'Archived';
  fileSize?: number;
  mimeType?: string;
  uploadedBy?: string;
  notes?: string;
}

// --- Load (§8, expanded) ---

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
  previousValue?: string;
  newValue?: string;
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
  trailerId?: string;
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
  // Multi-stop (§8.1)
  stops?: Stop[];
  // Accessorials (§8.2)
  accessorialCharges?: AccessorialCharge[];
  fuelSurcharge?: number;
  totalRevenue?: number;
  ratePerMile?: number;
  // Dimensions
  dims?: string;
  pieceCount?: number;
  palletCount?: number;
  tempRequirement?: string; // Reefer temp
  hazmatInfo?: { unNumber?: string; class?: string; placard?: string };
  // Financial rollup (§8.9)
  driverPay?: number;
  fuelCost?: number;
  otherCosts?: number;
  margin?: number;
  marginPercent?: number;
  // Dispatch (§8.5)
  dispatchSentAt?: string;
  driverAcknowledgedAt?: string;
}

// --- Invoice (§11) ---

export interface Invoice {
  id: string;
  invoiceNumber: string;
  loadId: string;
  loadIds?: string[]; // Multi-load consolidation
  customerId: string;
  date: string;
  dueDate: string;
  amount: number;
  status: 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Void' | 'Overdue' | 'Rejected' | 'Disputed';
  notes?: string;
  rejectionReason?: string;
  disputeReason?: string;
  method?: 'Email' | 'Factoring' | 'Mail' | 'EDI' | 'Portal';
  recipientEmail?: string;
  sentFromEmail?: string;
  attachment?: string;
  documents?: any[];
  // AR tracking (§11.5)
  amountPaid?: number;
  paymentRecords?: PaymentRecord[];
  agingBucket?: '0-30' | '31-60' | '61-90' | '90+';
  // Factoring (§11.7)
  factoringSubmitted?: boolean;
  factoringCompany?: string;
  factoringAdvanceAmount?: number;
  factoringStatus?: 'Not Factored' | 'Submitted' | 'Funded' | 'Recourse';
  // Terms
  terms?: string;
  requiredAttachments?: string[];
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: 'Check' | 'ACH' | 'Wire' | 'Factoring' | 'Cash' | string;
  referenceNumber?: string;
  notes?: string;
  shortPayReason?: string;
}

// --- Settlement (§12) ---

export interface Settlement {
  id: string;
  settlementNumber: string;
  driverId: string;
  loadId?: string;
  loadIds?: string[];
  periodStart: string;
  periodEnd: string;
  payMethod: 'CPM' | 'PERCENTAGE' | 'FLAT' | 'HOURLY';
  payRate: number;
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
    payMethod: 'CPM' | 'PERCENTAGE' | 'FLAT' | 'HOURLY';
    payRate: number;
    amount: number;
    customerPo?: string;
    bolNumber?: string;
    loadRevenues?: { id: string; name: string; amount: number }[];
    loadDeductions?: { id: string; name: string; amount: number }[];
  }[];
  // Additions (§12.3)
  stopPay?: number;
  accessorialShare?: number;
  reimbursements?: { id: string; name: string; amount: number }[];
  bonuses?: { id: string; name: string; amount: number }[];
  // Advances (§12.5)
  advances?: { id: string; date: string; amount: number; type: 'Cash' | 'Fuel'; deducted: boolean }[];
  // Owner-Operator specific
  isOwnerOperator?: boolean;
  // Timestamps
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// --- Recurring Rule ---

export interface RecurringRule {
  id: string;
  driverId: string;
  type: 'REVENUE' | 'DEDUCTION';
  name: string;
  amount: number;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  active: boolean;
  startDate?: string;
  endDate?: string;
  rateType?: 'FLAT' | 'PERCENTAGE';
}

// --- Fuel Transaction (§14) ---

export interface FuelTransaction {
  id: string;
  date: string;
  truckId: string;
  driverId?: string;
  location: string;
  jurisdiction: string; // State code for IFTA
  gallons: number;
  pricePerGallon: number;
  totalAmount: number;
  fuelType: 'Diesel' | 'DEF' | 'Gas' | string;
  fuelCardNumber?: string;
  receiptDocId?: string;
  notes?: string;
}

// --- Maintenance Record (§15) ---

export interface MaintenanceRecord {
  id: string;
  equipmentType: 'Truck' | 'Trailer';
  equipmentId: string;
  date: string;
  odometer?: number;
  engineHours?: number;
  serviceType: 'Preventive Maintenance' | 'Repair' | 'Inspection' | 'Tire' | 'Brake' | 'Oil Change' | string;
  description: string;
  vendor?: string;
  cost: number;
  partsCost?: number;
  laborCost?: number;
  notes?: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  retentionEndDate?: string;
}

// --- Inspection Report (§15.3, §15.4) ---

export interface InspectionReport {
  id: string;
  type: 'DVIR' | 'Annual DOT' | 'Periodic' | 'Roadside';
  equipmentType: 'Truck' | 'Trailer';
  equipmentId: string;
  driverId?: string;
  inspectionDate: string;
  expirationDate?: string;
  inspectorName?: string;
  location?: string;
  result: 'Pass' | 'Pass with Defects' | 'Fail' | 'Out of Service';
  defects?: { description: string; severity: 'Critical' | 'Major' | 'Minor'; repaired: boolean; repairDate?: string; repairedBy?: string }[];
  violations?: { code: string; description: string }[];
  documentId?: string;
  retentionEndDate?: string;
  notes?: string;
}

// --- Accident Register (§18.7) ---

export interface Accident {
  id: string;
  date: string;
  location: string;
  driverId: string;
  truckId?: string;
  trailerId?: string;
  description: string;
  injuries: number;
  fatalities: number;
  hazmatSpill: boolean;
  towRequired: boolean;
  policeReport?: string;
  documentIds?: string[];
  narrative?: string;
  retentionEndDate?: string; // 3 years per 390.15
}

// --- Notification / Task (§22) ---

export interface TmsNotification {
  id: string;
  type: 'Expiration' | 'Filing Deadline' | 'Missing Document' | 'Overdue' | 'Compliance' | 'System' | 'Dispatch' | string;
  title: string;
  message: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  entityType?: 'Driver' | 'Truck' | 'Trailer' | 'Load' | 'Invoice' | 'Credential' | 'Carrier';
  entityId?: string;
  triggerDate: string;
  dueDate?: string;
  assignedRole?: 'Admin' | 'Dispatcher' | 'Accounting' | 'Safety' | 'Driver';
  assignedUserId?: string;
  taskStatus?: TaskStatus;
  createdAt: string;
  readAt?: string;
  actionedAt?: string;
  actionUrl?: string; // e.g., which view/entity to navigate to
}

// --- Audit Log Entry (§24) ---

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: 'Create' | 'Update' | 'Delete' | 'Approve' | 'Login' | 'Export' | 'StatusChange' | string;
  entityType: string;
  entityId: string;
  entityName?: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string;
  description: string;
}

// --- Retention Configuration (Appendix A) ---

export interface RetentionRule {
  recordType: string;
  retentionPeriod: string;
  citation: string;
  configurable: boolean;
  defaultDays: number;
}

export const DEFAULT_RETENTION_RULES: RetentionRule[] = [
  { recordType: 'Driver Qualification File', retentionPeriod: 'Employment + 3 years', citation: '391.51(c)', configurable: true, defaultDays: 1095 },
  { recordType: 'Annual MVR / Annual Review', retentionPeriod: 'In DQ file (per above)', citation: '391.25', configurable: true, defaultDays: 1095 },
  { recordType: 'HOS / ELD Records', retentionPeriod: '6 months', citation: '395.8', configurable: true, defaultDays: 180 },
  { recordType: 'DVIR + Repair Cert', retentionPeriod: '3 months', citation: '396.11(c)', configurable: true, defaultDays: 90 },
  { recordType: 'Vehicle Maintenance File', retentionPeriod: '1 year in service + 6 months', citation: '396.3(c)', configurable: true, defaultDays: 548 },
  { recordType: 'Annual Inspection Report', retentionPeriod: '14 months', citation: '396.21', configurable: true, defaultDays: 425 },
  { recordType: 'Drug/Alcohol Positives', retentionPeriod: '5 years', citation: '382.401', configurable: true, defaultDays: 1825 },
  { recordType: 'Drug/Alcohol Negatives', retentionPeriod: '1 year', citation: '382.401', configurable: true, defaultDays: 365 },
  { recordType: 'Random Selection Records', retentionPeriod: '5 years', citation: '382.401', configurable: true, defaultDays: 1825 },
  { recordType: 'Accident Register', retentionPeriod: '3 years', citation: '390.15', configurable: true, defaultDays: 1095 },
  { recordType: 'IFTA Records', retentionPeriod: '4 years', citation: 'IFTA', configurable: true, defaultDays: 1460 },
];
