import { checkEmailAccountAssociation } from '../frontend/src/lib/accountValidation';
import { CompanyUser, EmployeeInvite, Driver } from '../frontend/src/types';

console.log('=== RUNNING PRE-INVITE EMAIL VERIFICATION TESTS ===\n');

const currentCompanyId = 'carrier-corp-1';

const mockTeamUsers: CompanyUser[] = [
  {
    id: 'user-1',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@apexlogistics.io',
    role: 'Dispatcher',
    status: 'Active',
    companyId: 'carrier-corp-1',
    isCustomPermissions: false,
    permissions: {} as any,
  },
  {
    id: 'user-2',
    name: 'Dave Vance',
    email: 'dave.safety@apexlogistics.io',
    role: 'Safety / Compliance',
    status: 'Pending Approval',
    companyId: 'carrier-corp-1',
    isCustomPermissions: false,
    permissions: {} as any,
  },
  {
    id: 'user-ext',
    name: 'External Dispatcher',
    email: 'external@otherfreight.com',
    role: 'Fleet Manager',
    status: 'Active',
    companyId: 'carrier-corp-2', // Different company tenant!
    isCustomPermissions: false,
    permissions: {} as any,
  },
];

const mockInvites: EmployeeInvite[] = [
  {
    id: 'inv-1',
    token: 'tok-123',
    companyId: 'carrier-corp-1',
    companyName: 'Apex Logistics LLC',
    email: 'pending.clerk@apexlogistics.io',
    name: 'Pending Clerk',
    role: 'Accountant / Billing',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    status: 'Pending',
  },
];

const mockDrivers: Driver[] = [
  {
    id: 'drv-1',
    name: 'Carlos Rivera',
    email: 'carlos.rivera@driver.apexlogistics.io',
    currentLocation: 'Dallas, TX',
    status: 'Available',
    cdlClass: 'Class A',
    endorsements: ['HazMat', 'Tanker'],
    hosAvailable: '9.5 hrs',
    score: 98,
    hosDutyStatus: 'On Duty',
    type: 'Company Driver',
  },
];

let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`);
    failedTests++;
  }
}

// TEST 1: Current company active team member
{
  const res = checkEmailAccountAssociation({
    email: 'sarah.jenkins@apexlogistics.io',
    currentCompanyId,
    teamUsers: mockTeamUsers,
    employeeInvites: mockInvites,
    drivers: mockDrivers,
  });

  assert(!res.isAvailable, 'Test 1.1: Active team member is marked not available');
  assert(res.association === 'current', 'Test 1.2: Association identified as current account');
  assert(res.accountType === 'Team Member (Dispatcher)', `Test 1.3: Account type identifies Dispatcher (got: ${res.accountType})`);
  assert(res.status === 'Active', `Test 1.4: Status identifies Active (got: ${res.status})`);
  assert(res.message.includes('Dispatcher') && res.message.includes('Active'), 'Test 1.5: Detailed contextual message generated');
}

// TEST 2: Current company pending approval team member
{
  const res = checkEmailAccountAssociation({
    email: 'dave.safety@apexlogistics.io',
    currentCompanyId,
    teamUsers: mockTeamUsers,
    employeeInvites: mockInvites,
    drivers: mockDrivers,
  });

  assert(!res.isAvailable, 'Test 2.1: Pending approval member is marked not available');
  assert(res.association === 'current', 'Test 2.2: Association identified as current account');
  assert(res.accountType === 'Team Member (Safety / Compliance)', 'Test 2.3: Account type identifies Safety / Compliance');
  assert(res.status === 'Pending Approval', 'Test 2.4: Status identifies Pending Approval');
}

// TEST 3: Current company pending invitation
{
  const res = checkEmailAccountAssociation({
    email: 'pending.clerk@apexlogistics.io',
    currentCompanyId,
    teamUsers: mockTeamUsers,
    employeeInvites: mockInvites,
    drivers: mockDrivers,
  });

  assert(!res.isAvailable, 'Test 3.1: Pending invite email is marked not available');
  assert(res.association === 'current', 'Test 3.2: Association identified as current account');
  assert(res.accountType === 'Pending Team Invite (Accountant / Billing)', 'Test 3.3: Account type identifies Pending Team Invite');
  assert(res.status === 'Pending Invitation', 'Test 3.4: Status identifies Pending Invitation');
}

// TEST 4: Current company driver
{
  const res = checkEmailAccountAssociation({
    email: 'carlos.rivera@driver.apexlogistics.io',
    currentCompanyId,
    teamUsers: mockTeamUsers,
    employeeInvites: mockInvites,
    drivers: mockDrivers,
  });

  assert(!res.isAvailable, 'Test 4.1: Driver email is marked not available');
  assert(res.association === 'current', 'Test 4.2: Association identified as current account');
  assert(res.accountType === 'Driver Profile (Company Driver)', `Test 4.3: Account type identifies Driver (got: ${res.accountType})`);
  assert(res.status === 'Available', `Test 4.4: Status identifies Available (got: ${res.status})`);
}

// TEST 5: External account (different company / tenant)
{
  const res = checkEmailAccountAssociation({
    email: 'external@otherfreight.com',
    currentCompanyId,
    teamUsers: mockTeamUsers,
    employeeInvites: mockInvites,
    drivers: mockDrivers,
  });

  assert(!res.isAvailable, 'Test 5.1: External email is marked not available');
  assert(res.association === 'external', 'Test 5.2: Association identified as external account');
  assert(res.accountType === undefined, 'Test 5.3: Account type is hidden for external account (privacy)');
  assert(res.status === undefined, 'Test 5.4: Status is hidden for external account (privacy)');
  assert(
    res.message === 'This email address is already registered with an existing account. Please enter a different company email address.',
    `Test 5.5: Generic privacy message displayed (got: ${res.message})`
  );
}

// TEST 6: Extra/Global registered accounts (e.g. system demo account)
{
  const res = checkEmailAccountAssociation({
    email: 'demo@gridtms.local',
    currentCompanyId,
    teamUsers: mockTeamUsers,
    employeeInvites: mockInvites,
    drivers: mockDrivers,
    extraRegisteredEmails: ['demo@gridtms.local'],
  });

  assert(!res.isAvailable, 'Test 6.1: Global demo account is marked not available');
  assert(res.association === 'external', 'Test 6.2: Identified as external registration');
  assert(
    res.message === 'This email address is already registered with an existing account. Please enter a different company email address.',
    'Test 6.3: Generic privacy message displayed'
  );
}

// TEST 7: Clean unassigned email
{
  const res = checkEmailAccountAssociation({
    email: 'alex.brandnew@apexlogistics.io',
    currentCompanyId,
    teamUsers: mockTeamUsers,
    employeeInvites: mockInvites,
    drivers: mockDrivers,
  });

  assert(res.isAvailable, 'Test 7.1: Clean email is marked available');
  assert(res.association === 'none', 'Test 7.2: Association is none');
  assert(res.message.includes('available'), 'Test 7.3: Availability message returned');
}

console.log(`\n=== TEST RESULTS: ${failedTests === 0 ? 'ALL PASSED' : `${failedTests} FAILURES`} ===`);
if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
