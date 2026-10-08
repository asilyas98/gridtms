import { CompanyUser, EmployeeInvite, Driver } from '../types';

export interface AccountCheckResult {
  isAvailable: boolean;
  association: 'none' | 'current' | 'external';
  accountType?: string;
  status?: string;
  message: string;
  suggestedAction?: string;
  matchedEntity?: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
}

/**
 * Validates whether an email address is already registered or associated with any account.
 * 
 * Rules:
 * 1. If associated with the current logged-in company account:
 *    Show detailed account type and current status.
 * 2. If associated with an account outside the current company (or global user account):
 *    Show a generic message preserving cross-tenant privacy.
 * 3. If unregistered:
 *    Allow proceeding with employee invitation.
 */
export function checkEmailAccountAssociation(params: {
  email: string;
  currentCompanyId?: string;
  teamUsers: CompanyUser[];
  employeeInvites: EmployeeInvite[];
  drivers: Driver[];
  extraRegisteredEmails?: string[];
}): AccountCheckResult {
  const cleanEmail = String(params.email || '').trim().toLowerCase();

  // Basic email pattern check
  if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.length < 5) {
    return {
      isAvailable: false,
      association: 'none',
      message: 'Please enter a valid work email address.',
    };
  }

  const currentCompanyId = params.currentCompanyId || 'carrier-corp-1';

  // 1. Check Team Users roster
  const matchedTeamUser = params.teamUsers.find(
    u => u.email && u.email.trim().toLowerCase() === cleanEmail
  );

  if (matchedTeamUser) {
    const isCurrentAccount = !matchedTeamUser.companyId || matchedTeamUser.companyId === currentCompanyId;
    if (isCurrentAccount) {
      return {
        isAvailable: false,
        association: 'current',
        accountType: `Team Member (${matchedTeamUser.role})`,
        status: matchedTeamUser.status,
        message: `This email is already registered in your company as a ${matchedTeamUser.role} with status: ${matchedTeamUser.status}.`,
        suggestedAction: 'You can update their role, permissions, or credentials directly in your Team Management roster.',
        matchedEntity: {
          id: matchedTeamUser.id,
          name: matchedTeamUser.name,
          email: matchedTeamUser.email,
          role: matchedTeamUser.role,
        },
      };
    } else {
      // External tenant account - generic message
      return {
        isAvailable: false,
        association: 'external',
        message: 'This email address is already registered with an existing account. Please enter a different company email address.',
        suggestedAction: 'For security and data privacy, existing accounts cannot be re-invited across companies.',
      };
    }
  }

  // 2. Check Pending / Active Employee Invites
  const matchedInvite = params.employeeInvites.find(
    inv => inv.email && inv.email.trim().toLowerCase() === cleanEmail && inv.status !== 'Expired'
  );

  if (matchedInvite) {
    const isCurrentAccount = !matchedInvite.companyId || matchedInvite.companyId === currentCompanyId;
    if (isCurrentAccount) {
      const inviteStatusText = matchedInvite.status === 'Pending' ? 'Pending Invitation' : matchedInvite.status;
      return {
        isAvailable: false,
        association: 'current',
        accountType: `Pending Team Invite (${matchedInvite.role})`,
        status: inviteStatusText,
        message: `An invitation has already been issued to this email for role ${matchedInvite.role} with status: ${inviteStatusText}.`,
        suggestedAction: 'You can copy the invite link again or revoke the pending invitation in the roster below.',
        matchedEntity: {
          id: matchedInvite.id,
          name: matchedInvite.name,
          email: matchedInvite.email,
          role: matchedInvite.role,
        },
      };
    } else {
      // External invite
      return {
        isAvailable: false,
        association: 'external',
        message: 'This email address is already registered with an existing account. Please enter a different company email address.',
        suggestedAction: 'For security and data privacy, existing accounts cannot be re-invited across companies.',
      };
    }
  }

  // 3. Check Driver Roster
  const matchedDriver = params.drivers.find(
    d => d.email && d.email.trim().toLowerCase() === cleanEmail
  );

  if (matchedDriver) {
    return {
      isAvailable: false,
      association: 'current',
      accountType: `Driver Profile (${matchedDriver.type || 'Company Driver'})`,
      status: matchedDriver.status,
      message: `This email is already associated with Driver ${matchedDriver.name} with status: ${matchedDriver.status}.`,
      suggestedAction: 'To grant dispatch or administrative access to this driver, manage their permissions in the driver profile or use a dedicated dispatch email.',
      matchedEntity: {
        id: matchedDriver.id,
        name: matchedDriver.name,
        email: matchedDriver.email || cleanEmail,
        role: 'Driver',
      },
    };
  }

  // 4. Check external/extra registered accounts (e.g. system demo accounts or stored auth users outside this company)
  const extraEmails = params.extraRegisteredEmails || [];
  if (extraEmails.map(e => e.toLowerCase()).includes(cleanEmail)) {
    return {
      isAvailable: false,
      association: 'external',
      message: 'This email address is already registered with an existing account. Please enter a different company email address.',
      suggestedAction: 'Please provide a unique email address designated for this company.',
    };
  }

  // 5. Unregistered and fully available
  return {
    isAvailable: true,
    association: 'none',
    message: 'Email address is verified and available for invitation.',
  };
}
