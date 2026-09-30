import crypto from 'crypto';

interface StepResult {
  step: string;
  success: boolean;
  message?: string;
}

async function runSystemVerification() {
  console.log('=== RUNNING COMPLETE SYSTEM API & CRUD VERIFICATION ===\n');

  const BASE_URL = 'http://localhost:3000';
  const results: StepResult[] = [];

  const testId = `sys_test_${Date.now()}`;

  // 1. Health & Status
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    const ok = res.status === 200 && data.status === 'ok';
    results.push({ step: '1. Server Health Check (/api/health)', success: ok });
    console.log(`[${ok ? 'PASS' : 'FAIL'}] 1. Server Health Check (/api/health)`);
  } catch (err: any) {
    results.push({ step: '1. Server Health Check', success: false, message: err.message });
    console.log('[FAIL] 1. Server Health Check:', err.message);
  }

  // 2. Database Bootstrap API
  try {
    const res = await fetch(`${BASE_URL}/api/bootstrap`);
    const data = await res.json();
    const ok = res.status === 200 && data.success === true;
    results.push({ step: '2. Database Bootstrap (/api/bootstrap)', success: ok });
    console.log(`[${ok ? 'PASS' : 'FAIL'}] 2. Database Bootstrap (/api/bootstrap)`);
  } catch (err: any) {
    results.push({ step: '2. Database Bootstrap', success: false, message: err.message });
    console.log('[FAIL] 2. Database Bootstrap:', err.message);
  }

  // 3. Customer CRUD through REST API
  let createdCustomerId = '';
  try {
    const postRes = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: `Test Shipper ${testId}`,
        email: `shipper_${testId}@testcorp.io`,
        phone: '555-0199',
      }),
    });
    const postData = await postRes.json();
    createdCustomerId = postData.customer?.id || '';
    const insertOk = postRes.status === 201 && createdCustomerId;

    // Update
    let updateOk = false;
    if (createdCustomerId) {
      const putRes = await fetch(`${BASE_URL}/api/customers/${createdCustomerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: `Updated Shipper ${testId}` }),
      });
      updateOk = putRes.status === 200;
    }

    // Delete (cleanup)
    let deleteOk = false;
    if (createdCustomerId) {
      const delRes = await fetch(`${BASE_URL}/api/customers/${createdCustomerId}`, {
        method: 'DELETE',
      });
      deleteOk = delRes.status === 200;
    }

    const customerAllOk = insertOk && updateOk && deleteOk;
    results.push({ step: '3. Customers API CRUD & Isolation', success: Boolean(customerAllOk) });
    console.log(`[${customerAllOk ? 'PASS' : 'FAIL'}] 3. Customers API CRUD (Create, Update, Delete)`);
  } catch (err: any) {
    results.push({ step: '3. Customers API CRUD', success: false, message: err.message });
    console.log('[FAIL] 3. Customers API CRUD:', err.message);
  }

  // 4. Truck CRUD through REST API
  let createdTruckId = '';
  try {
    const postRes = await fetch(`${BASE_URL}/api/trucks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unit_number: `TRK-${testId.slice(-4)}`,
        make_model: 'Volvo VNL 860',
        vin: '4V4NC9EH8MN123456',
        status: 'Available',
      }),
    });
    const postData = await postRes.json();
    createdTruckId = postData.truck?.id || '';
    const insertOk = postRes.status === 201 && createdTruckId;

    let updateOk = false;
    if (createdTruckId) {
      const putRes = await fetch(`${BASE_URL}/api/trucks/${createdTruckId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Maintenance' }),
      });
      updateOk = putRes.status === 200;
    }

    let deleteOk = false;
    if (createdTruckId) {
      const delRes = await fetch(`${BASE_URL}/api/trucks/${createdTruckId}`, {
        method: 'DELETE',
      });
      deleteOk = delRes.status === 200;
    }

    const truckAllOk = insertOk && updateOk && deleteOk;
    results.push({ step: '4. Trucks API CRUD & Isolation', success: Boolean(truckAllOk) });
    console.log(`[${truckAllOk ? 'PASS' : 'FAIL'}] 4. Trucks API CRUD (Create, Update, Delete)`);
  } catch (err: any) {
    results.push({ step: '4. Trucks API CRUD', success: false, message: err.message });
    console.log('[FAIL] 4. Trucks API CRUD:', err.message);
  }

  // 5. Driver CRUD through REST API
  let createdDriverId = '';
  try {
    const postRes = await fetch(`${BASE_URL}/api/drivers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: `Driver ${testId}`,
        phone: '555-4321',
        license_number: 'CDL-TEST-99',
        status: 'Available',
      }),
    });
    const postData = await postRes.json();
    createdDriverId = postData.driver?.id || '';
    const insertOk = postRes.status === 201 && createdDriverId;

    let deleteOk = false;
    if (createdDriverId) {
      const delRes = await fetch(`${BASE_URL}/api/drivers/${createdDriverId}`, {
        method: 'DELETE',
      });
      deleteOk = delRes.status === 200;
    }

    const driverAllOk = insertOk && deleteOk;
    results.push({ step: '5. Drivers API CRUD & Isolation', success: Boolean(driverAllOk) });
    console.log(`[${driverAllOk ? 'PASS' : 'FAIL'}] 5. Drivers API CRUD (Create, Delete)`);
  } catch (err: any) {
    results.push({ step: '5. Drivers API CRUD', success: false, message: err.message });
    console.log('[FAIL] 5. Drivers API CRUD:', err.message);
  }

  // 6. Loads CRUD through REST API
  let createdLoadId = '';
  try {
    const postRes = await fetch(`${BASE_URL}/api/loads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        load_number: `LD-${testId.slice(-4)}`,
        revenue: 3200,
        miles: 650,
        status: 'Created',
        commodity: 'Dry Goods',
      }),
    });
    const postData = await postRes.json();
    createdLoadId = postData.load?.id || '';
    const insertOk = postRes.status === 201 && createdLoadId;

    let deleteOk = false;
    if (createdLoadId) {
      const delRes = await fetch(`${BASE_URL}/api/loads/${createdLoadId}`, {
        method: 'DELETE',
      });
      deleteOk = delRes.status === 200;
    }

    const loadAllOk = insertOk && deleteOk;
    results.push({ step: '6. Loads API CRUD & Isolation', success: Boolean(loadAllOk) });
    console.log(`[${loadAllOk ? 'PASS' : 'FAIL'}] 6. Loads API CRUD (Create, Delete)`);
  } catch (err: any) {
    results.push({ step: '6. Loads API CRUD', success: false, message: err.message });
    console.log('[FAIL] 6. Loads API CRUD:', err.message);
  }

  // 7. Company Settings API
  try {
    const postRes = await fetch(`${BASE_URL}/api/company-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        carrier_name: 'Apex Logistics Freight LLC',
        dot_number: '3829104',
        mc_number: '1192842',
      }),
    });
    const postData = await postRes.json();
    const settingsOk = postRes.status === 200 && postData.status === 'success';
    results.push({ step: '7. Company Settings API (/api/company-settings)', success: settingsOk });
    console.log(`[${settingsOk ? 'PASS' : 'FAIL'}] 7. Company Settings API (/api/company-settings)`);
  } catch (err: any) {
    results.push({ step: '7. Company Settings API', success: false, message: err.message });
    console.log('[FAIL] 7. Company Settings API:', err.message);
  }

  console.log('\n=== COMPLETE SYSTEM API RESULTS ===');
  const allPassed = results.every(r => r.success);
  console.log(`Summary: ${results.filter(r => r.success).length} / ${results.length} system components passed.`);

  if (!allPassed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSystemVerification();
