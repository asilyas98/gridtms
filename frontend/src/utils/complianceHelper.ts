import { Driver, Truck as TruckType } from '../types';

export interface ComplianceStatus {
  status: 'Compliant' | 'Expiring' | 'Needs Attention';
  issues: {
    category: 'Regulatory' | 'Medical/Drug' | 'Safety' | 'General' | 'Maintenance';
    severity: 'critical' | 'warning' | 'info';
    message: string;
    details?: string;
  }[];
  score: number; // 0 to 100
}

/**
 * Checks compliance details of a Driver relative to current lock date (2026-05-25).
 */
export function getDriverCompliance(driver: Driver): ComplianceStatus {
  const issues: ComplianceStatus['issues'] = [];
  const today = new Date('2026-05-25');
  const thirtyDaysAhead = new Date('2026-06-24');

  // 1. CDL Check
  if (!driver.cdlNumber || !driver.cdlNumber.trim()) {
    issues.push({
      category: 'Regulatory',
      severity: 'critical',
      message: 'Missing CDL License Number',
      details: 'CDL credentials must be registered for dispatch duty.'
    });
  }

  if (driver.cdlExpiry) {
    const cdlDate = new Date(driver.cdlExpiry);
    if (cdlDate < today) {
      issues.push({
        category: 'Regulatory',
        severity: 'critical',
        message: `CDL License Expired on ${driver.cdlExpiry}`,
        details: 'Driver is legally prohibited from operating commercial motor vehicles.'
      });
    } else if (cdlDate <= thirtyDaysAhead) {
      issues.push({
        category: 'Regulatory',
        severity: 'warning',
        message: `CDL License Expiring on ${driver.cdlExpiry}`,
        details: 'CDL renewal processes should be initiated immediately.'
      });
    }
  } else {
    issues.push({
      category: 'Regulatory',
      severity: 'critical',
      message: 'CDL Expiry Date Not Documented',
      details: 'Please log the official expiration date of the CDL.'
    });
  }

  // 2. Medical Examiner Certificate
  if (driver.medicalCardExpiry) {
    const medDate = new Date(driver.medicalCardExpiry);
    if (medDate < today) {
      issues.push({
        category: 'Medical/Drug',
        severity: 'critical',
        message: `Medical Examiner Card Expired on ${driver.medicalCardExpiry}`,
        details: 'An updated Medical Certificate overlay is required for CDL validity.'
      });
    } else if (medDate <= thirtyDaysAhead) {
      issues.push({
        category: 'Medical/Drug',
        severity: 'warning',
        message: `Medical Card Expiring on ${driver.medicalCardExpiry}`,
        details: 'Schedule physical exams to restore medical clearance.'
      });
    }
  } else {
    issues.push({
      category: 'Medical/Drug',
      severity: 'warning',
      message: 'No Medical Card Expiration Logged',
      details: 'Unregistered medical credentials risk automatic CDL downgrade.'
    });
  }

  // 3. Drug and Alcohol test check
  if (driver.drugTestDate) {
    const drugDate = new Date(driver.drugTestDate);
    const oneYearAgo = new Date('2025-05-25');
    if (drugDate < oneYearAgo) {
      issues.push({
        category: 'Medical/Drug',
        severity: 'warning',
        message: `Annual Drug/Alcohol Test Overdue (Last test: ${driver.drugTestDate})`,
        details: 'FMCSA clearinghouse requires regular random or annual screening logs.'
      });
    }
  } else {
    issues.push({
      category: 'Medical/Drug',
      severity: 'warning',
      message: 'No Drug Screen Record Logged',
      details: 'Initial or scheduled drug screening is missing from the record system.'
    });
  }

  // 4. Contact / Backup emergency details
  if (!driver.phone || !driver.phone.trim()) {
    issues.push({
      category: 'General',
      severity: 'warning',
      message: 'Contact Phone Number Not Filed',
      details: 'Dispatcher is unable to communicate with driving assets during transit.'
    });
  }
  if (!driver.emergencyName || !driver.emergencyPhone) {
    issues.push({
      category: 'General',
      severity: 'info',
      message: 'Missing Emergency Contact Backup',
      details: 'Profile has no active emergency details filed in database archiving cabinet.'
    });
  }

  // 5. Check explicitly custom compliance library files
  if (driver.complianceDocs) {
    driver.complianceDocs.forEach(doc => {
      if (doc.status === 'Expired' || (doc.expiryDate && new Date(doc.expiryDate) < today)) {
        issues.push({
          category: 'Regulatory',
          severity: 'critical',
          message: `Document Expired: ${doc.name} (Expired ${doc.expiryDate})`,
          details: `The attached ${doc.type} vault document is no longer valid.`
        });
      } else if (doc.status === 'Expiring' || (doc.expiryDate && new Date(doc.expiryDate) <= thirtyDaysAhead)) {
        issues.push({
          category: 'Regulatory',
          severity: 'warning',
          message: `Document Expiring soon: ${doc.name} (Expires ${doc.expiryDate})`,
          details: `Renewal action required for archived ${doc.type}.`
        });
      }
    });
  }

  // Determine aggregate status
  let status: ComplianceStatus['status'] = 'Compliant';
  const hasCritical = issues.some(i => i.severity === 'critical');
  const hasWarning = issues.some(i => i.severity === 'warning');

  if (hasCritical) {
    status = 'Needs Attention';
  } else if (hasWarning) {
    status = 'Expiring';
  }

  // Score computation
  let score = 100;
  issues.forEach(issue => {
    if (issue.severity === 'critical') score -= 20;
    else if (issue.severity === 'warning') score -= 8;
    else score -= 2;
  });
  score = Math.max(10, score);

  return {
    status,
    issues,
    score
  };
}

/**
 * Checks compliance details of a Unit (Truck or Trailer) relative to current lock date (2026-05-25).
 */
export function getTruckCompliance(truck: TruckType): ComplianceStatus {
  const issues: ComplianceStatus['issues'] = [];
  const today = new Date('2026-05-25');
  const thirtyDaysAhead = new Date('2026-06-24');
  const typeStr = truck.type || '';
  const isTrailer = typeStr.toLowerCase().includes('trailer') ||
    typeStr.toLowerCase().includes('van') ||
    typeStr.toLowerCase().includes('reefer') ||
    typeStr.toLowerCase().includes('flatbed');

  const nameLabel = isTrailer ? 'Trailer' : 'Power unit';

  // 1. FMCSA PM maintenance check
  if (truck.pmStatus === 'Overdue') {
    issues.push({
      category: 'Maintenance',
      severity: 'critical',
      message: `${nameLabel} Preventative Maintenance Overdue`,
      details: 'Immediate fleet shop servicing is requested components check.'
    });
  } else if (truck.pmStatus === 'Due') {
    issues.push({
      category: 'Maintenance',
      severity: 'warning',
      message: `${nameLabel} PM Service is Due`,
      details: 'Schedule routine maintenance intervals within 500 miles.'
    });
  }

  // 2. DOT Inspection check
  if (truck.annualInspectionExpiry) {
    const inspDate = new Date(truck.annualInspectionExpiry);
    if (inspDate < today) {
      issues.push({
        category: 'Safety',
        severity: 'critical',
        message: `Annual DOT Inspection Expired on ${truck.annualInspectionExpiry}`,
        details: 'Operating on public highways with expired DOT inspections triggers FMCSA fines.'
      });
    } else if (inspDate <= thirtyDaysAhead) {
      issues.push({
        category: 'Safety',
        severity: 'warning',
        message: `Annual DOT Inspection Expiring on ${truck.annualInspectionExpiry}`,
        details: 'Book a certified highway service technician to conduct mandatory inspections.'
      });
    }
  } else {
    issues.push({
      category: 'Safety',
      severity: 'critical',
      message: 'No Annual DOT Inspection Recorded',
      details: 'Mandatory inspections must be certified annually for fleet compliance.'
    });
  }

  // 3. State/Ifta cab Registration Card check
  if (truck.registrationExpiry) {
    const regDate = new Date(truck.registrationExpiry);
    if (regDate < today) {
      issues.push({
        category: 'Regulatory',
        severity: 'critical',
        message: `Cab Card / Plate Registration Expired on ${truck.registrationExpiry}`,
        details: 'State vehicle license plate registration is invalid.'
      });
    } else if (regDate <= thirtyDaysAhead) {
      issues.push({
        category: 'Regulatory',
        severity: 'warning',
        message: `Registration Plate Expiring on ${truck.registrationExpiry}`,
        details: 'Submit plate tax and renewal requests to State DOT.'
      });
    }
  } else {
    issues.push({
      category: 'Regulatory',
      severity: 'warning',
      message: 'No Vehicle Plate Registration Expiry Recorded',
      details: 'Registration renewal tracking is offline for this asset. Please supply an expiry date.'
    });
  }

  // 4. Custom cabinet documents list checks
  if (truck.complianceDocs) {
    truck.complianceDocs.forEach(doc => {
      if (doc.status === 'Expired' || (doc.expiryDate && new Date(doc.expiryDate) < today)) {
        issues.push({
          category: 'Regulatory',
          severity: 'critical',
          message: `Document Expired: ${doc.name} (Expired ${doc.expiryDate})`,
          details: `The attached safety document of type ${doc.type} is invalid.`
        });
      } else if (doc.status === 'Expiring' || (doc.expiryDate && new Date(doc.expiryDate) <= thirtyDaysAhead)) {
        issues.push({
          category: 'Regulatory',
          severity: 'warning',
          message: `Document Expiring soon: ${doc.name} (Expires ${doc.expiryDate})`,
          details: `Schedule renewal scan uploads for archived files.`
        });
      }
    });
  }

  // 5. Driver assignment missing checks
  if (!truck.driverId && !isTrailer) {
    issues.push({
      category: 'General',
      severity: 'info',
      message: 'Unassigned Power Unit Asset',
      details: 'Tractor has no registered operator driver linked to active duty.'
    });
  }

  // Aggregate status
  let status: ComplianceStatus['status'] = 'Compliant';
  const hasCritical = issues.some(i => i.severity === 'critical');
  const hasWarning = issues.some(i => i.severity === 'warning');

  if (hasCritical) {
    status = 'Needs Attention';
  } else if (hasWarning) {
    status = 'Expiring';
  }

  // Calculate generic index score
  let score = 100;
  issues.forEach(issue => {
    if (issue.severity === 'critical') score -= 20;
    else if (issue.severity === 'warning') score -= 10;
    else score -= 3;
  });
  score = Math.max(15, score);

  return {
    status,
    issues,
    score
  };
}
