import { Customer, Location, Load, Driver, Truck, Invoice, Settlement, CarrierCompliance } from './types';

export const mockCarrierCompliance: CarrierCompliance = {
  dotNumber: '',
  mcNumber: '',
  insuranceExpiry: '',
  cargoInsuranceExpiry: '',
  boc3Status: 'Pending',
  ucrRegistered: false,
  iftaStatus: 'Pending',
  safetyRating: 'Satisfactory',
  mcs150Date: '',
  hazmatRegistrationExpiry: '',
  clearinghouseEnrollment: false
};

export const mockCustomers: Customer[] = [];
export const mockLocations: Location[] = [];
export const mockLoads: Load[] = [];
export const mockDrivers: Driver[] = [];
export const mockTrucks: Truck[] = [];
export const mockInvoices: Invoice[] = [];
export const mockSettlements: Settlement[] = [];
