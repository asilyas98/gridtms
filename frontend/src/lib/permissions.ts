import { UserRole, UserPermissions } from '../types';

export const ROLE_PRESETS: Record<UserRole, UserPermissions> = {
  'Owner / Super Admin': {
    modules: {
      dashboard: true,
      dispatch: true,
      loads: true,
      assets: true,
      customers: true,
      locations: true,
      invoices: true,
      settlements: true,
      compliance: true,
      ai: true,
      settings: true,
      team: true,
    },
    actions: {
      viewRates: true,
      createEditLoads: true,
      deleteRecords: true,
      exportData: true,
      manageDriverPay: true,
      manageUsers: true,
      editCompanySettings: true,
    },
  },
  'Dispatcher': {
    modules: {
      dashboard: true,
      dispatch: true,
      loads: true,
      assets: true,
      customers: true,
      locations: true,
      invoices: false,
      settlements: false,
      compliance: false,
      ai: true,
      settings: false,
      team: false,
    },
    actions: {
      viewRates: false, // Protected operational rates hidden by default
      createEditLoads: true,
      deleteRecords: false,
      exportData: false,
      manageDriverPay: false,
      manageUsers: false,
      editCompanySettings: false,
    },
  },
  'Safety & Compliance': {
    modules: {
      dashboard: true,
      dispatch: false,
      loads: false,
      assets: true,
      customers: false,
      locations: true,
      invoices: false,
      settlements: false,
      compliance: true,
      ai: true,
      settings: false,
      team: false,
    },
    actions: {
      viewRates: false,
      createEditLoads: false,
      deleteRecords: false,
      exportData: true,
      manageDriverPay: false,
      manageUsers: false,
      editCompanySettings: false,
    },
  },
  'Billing / Accounting': {
    modules: {
      dashboard: true,
      dispatch: false,
      loads: true,
      assets: false,
      customers: true,
      locations: false,
      invoices: true,
      settlements: true,
      compliance: false,
      ai: true,
      settings: false,
      team: false,
    },
    actions: {
      viewRates: true,
      createEditLoads: false,
      deleteRecords: false,
      exportData: true,
      manageDriverPay: true,
      manageUsers: false,
      editCompanySettings: false,
    },
  },
  'Fleet Viewer': {
    modules: {
      dashboard: true,
      dispatch: true,
      loads: true,
      assets: true,
      customers: false,
      locations: true,
      invoices: false,
      settlements: false,
      compliance: false,
      ai: false,
      settings: false,
      team: false,
    },
    actions: {
      viewRates: false,
      createEditLoads: false,
      deleteRecords: false,
      exportData: false,
      manageDriverPay: false,
      manageUsers: false,
      editCompanySettings: false,
    },
  },
};

export const INITIAL_COMPANY_USERS: import('../types').CompanyUser[] = [
  {
    id: 'user-owner-1',
    name: 'Carrier Owner',
    email: 'owner@fleetcarrier.com',
    phone: '+1 (312) 555-0100',
    role: 'Owner / Super Admin',
    status: 'Active',
    companyId: 'carrier-corp-1',
    companyName: 'Apex Logistics Freight LLC',
    avatarInitials: 'CO',
    lastActive: 'Just now',
    isCustomPermissions: false,
    permissions: JSON.parse(JSON.stringify(ROLE_PRESETS['Owner / Super Admin'])),
  },
  {
    id: 'user-disp-1',
    name: 'Marcus Vance',
    email: 'marcus.v@fleetcarrier.com',
    phone: '+1 (312) 555-0144',
    role: 'Dispatcher',
    status: 'Active',
    companyId: 'carrier-corp-1',
    companyName: 'Apex Logistics Freight LLC',
    avatarInitials: 'MV',
    lastActive: '12m ago',
    isCustomPermissions: false,
    permissions: JSON.parse(JSON.stringify(ROLE_PRESETS['Dispatcher'])),
  },
  {
    id: 'user-safety-1',
    name: 'Elena Rostova',
    email: 'elena.safety@fleetcarrier.com',
    phone: '+1 (312) 555-0182',
    role: 'Safety & Compliance',
    status: 'Active',
    companyId: 'carrier-corp-1',
    companyName: 'Apex Logistics Freight LLC',
    avatarInitials: 'ER',
    lastActive: '2h ago',
    isCustomPermissions: false,
    permissions: JSON.parse(JSON.stringify(ROLE_PRESETS['Safety & Compliance'])),
  },
  {
    id: 'user-acct-1',
    name: 'David Chen',
    email: 'david.finance@fleetcarrier.com',
    phone: '+1 (312) 555-0199',
    role: 'Billing / Accounting',
    status: 'Active',
    companyId: 'carrier-corp-1',
    companyName: 'Apex Logistics Freight LLC',
    avatarInitials: 'DC',
    lastActive: 'Yesterday',
    isCustomPermissions: false,
    permissions: JSON.parse(JSON.stringify(ROLE_PRESETS['Billing / Accounting'])),
  },
  {
    id: 'user-pending-1',
    name: 'Sarah Jenkins',
    email: 'sarah.j@fleetcarrier.com',
    phone: '+1 (312) 555-0128',
    role: 'Dispatcher',
    status: 'Pending Approval',
    companyId: 'carrier-corp-1',
    companyName: 'Apex Logistics Freight LLC',
    avatarInitials: 'SJ',
    lastActive: 'Submitted 15m ago',
    registeredAt: '2026-09-27T10:45:00Z',
    inviteToken: 'tok_demo_sarah',
    isCustomPermissions: false,
    permissions: JSON.parse(JSON.stringify(ROLE_PRESETS['Dispatcher'])),
  },
];

export const EMPTY_ROLE_PERMISSIONS: UserPermissions = {
  modules: {
    dashboard: false,
    dispatch: false,
    loads: false,
    assets: false,
    customers: false,
    locations: false,
    invoices: false,
    settlements: false,
    compliance: false,
    ai: false,
    settings: false,
    team: false,
  },
  actions: {
    viewRates: false,
    createEditLoads: false,
    deleteRecords: false,
    exportData: false,
    manageDriverPay: false,
    manageUsers: false,
    editCompanySettings: false,
  },
};

export const INITIAL_CUSTOM_ROLES: import('../types').CustomRole[] = [
  {
    id: 'role-super-admin',
    name: 'Owner / Super Admin',
    description: 'Full uninhibited access across financial settlements, company DOT credentials, user provisioning, and dispatch controls.',
    isSystem: true,
    color: 'purple',
    permissions: ROLE_PRESETS['Owner / Super Admin'],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-dispatcher',
    name: 'Dispatcher',
    description: 'Operational lane booking, dispatch board, assets, and live loads. Financial margins and driver pay are shielded.',
    isSystem: true,
    color: 'blue',
    permissions: ROLE_PRESETS['Dispatcher'],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-safety',
    name: 'Safety & Compliance',
    description: 'Driver qualification files, HOS compliance, IFTA/UCR audits, medical cards, and asset maintenance inspections.',
    isSystem: true,
    color: 'emerald',
    permissions: ROLE_PRESETS['Safety & Compliance'],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-billing',
    name: 'Billing / Accounting',
    description: 'Freight invoicing, customer statements, driver settlement pay sheets, factoring schedules, and gross revenue data.',
    isSystem: true,
    color: 'amber',
    permissions: ROLE_PRESETS['Billing / Accounting'],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-viewer',
    name: 'Fleet Viewer',
    description: 'Read-only visibility for field monitors, brokers, or customer reps needing live tracking and load statuses.',
    isSystem: true,
    color: 'slate',
    permissions: ROLE_PRESETS['Fleet Viewer'],
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'role-night-ops',
    name: 'Night / Weekend Dispatcher',
    description: 'After-hours load tracking, driver support, and emergency dispatch with rate viewing disabled.',
    isSystem: false,
    baseRole: 'Dispatcher',
    color: 'indigo',
    permissions: {
      modules: {
        dashboard: true,
        dispatch: true,
        loads: true,
        assets: true,
        customers: true,
        locations: true,
        invoices: false,
        settlements: false,
        compliance: true,
        ai: true,
        settings: false,
        team: false,
      },
      actions: {
        viewRates: false,
        createEditLoads: true,
        deleteRecords: false,
        exportData: false,
        manageDriverPay: false,
        manageUsers: false,
        editCompanySettings: false,
      },
    },
    createdAt: '2026-09-15T12:00:00Z',
  },
];

export const INITIAL_INVITES: import('../types').EmployeeInvite[] = [
  {
    id: 'inv-101',
    token: 'tok_demo_jordan',
    companyId: 'carrier-corp-1',
    companyName: 'Apex Logistics Freight LLC',
    dotNumber: '3829104',
    mcNumber: '1192842',
    email: 'jordan.m@fleetcarrier.com',
    name: 'Jordan Miller',
    role: 'Dispatcher',
    createdAt: '2026-09-27T08:00:00Z',
    expiresAt: '2026-10-04T08:00:00Z',
    status: 'Pending',
  },
];

export function getRolePermissions(
  roleName: string,
  customRoles?: import('../types').CustomRole[]
): UserPermissions {
  if (customRoles) {
    const found = customRoles.find(r => r.name.toLowerCase() === roleName.toLowerCase());
    if (found) return found.permissions;
  }
  if (roleName in ROLE_PRESETS) {
    return ROLE_PRESETS[roleName as keyof typeof ROLE_PRESETS];
  }
  return ROLE_PRESETS['Fleet Viewer'];
}

export function getRoleColor(
  roleName: string,
  customRoles?: import('../types').CustomRole[]
): string {
  if (customRoles) {
    const found = customRoles.find(r => r.name.toLowerCase() === roleName.toLowerCase());
    if (found?.color) return found.color;
  }
  switch (roleName) {
    case 'Owner / Super Admin':
      return 'purple';
    case 'Dispatcher':
      return 'blue';
    case 'Safety & Compliance':
      return 'emerald';
    case 'Billing / Accounting':
      return 'amber';
    case 'Fleet Viewer':
      return 'slate';
    default:
      return 'indigo';
  }
}


