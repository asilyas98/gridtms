const DEMO_TOKEN = 'gridtms-demo-token';
const DEV_OTP = '123456';

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

async function bodyJson(event) {
  try { return event.body ? JSON.parse(event.body) : {}; } catch { return {}; }
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function tokenFrom(event) {
  return String(event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '').trim();
}

function requireDemoAuth(event) {
  const token = tokenFrom(event);
  return token === DEMO_TOKEN || token.startsWith('netlify-demo-token-');
}

function makeAuthResult(user = {}) {
  return {
    access_token: user.access_token || DEMO_TOKEN,
    token_type: 'bearer',
    user: {
      id: user.id || 'demo-user',
      email: user.email || 'demo@gridtms.local',
      user_metadata: {
        full_name: user.full_name || 'Demo Dispatcher',
        legal_name: user.legal_name || 'Demo Trucking LLC',
        business_verified: true,
        two_step_verified: true,
        demo: true,
        ...(user.user_metadata || {}),
      },
    },
  };
}


async function readVerifiedBusinesses() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/verified_businesses?select=*&limit=100`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) return [];
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) ? rows : [];
}

async function findVerifiedBusiness(payload = {}) {
  const verifiedBusinesses = await readVerifiedBusinesses();
  return verifiedBusinesses.find((b) => {
    const nameOk = normalize(payload.legal_name) === normalize(b.legal_name);
    const dotOk = normalize(payload.dot_number) === normalize(b.dot_number);
    const mcOk = normalize(payload.mc_number) === normalize(b.mc_number);
    const phoneOk = !payload.phone || normalize(payload.phone) === normalize(b.phone);
    const zipOk = !payload.registered_zip || normalize(payload.registered_zip) === normalize(b.zip || b.registered_zip);
    const cityOk = !payload.registered_city || normalize(payload.registered_city) === normalize(b.city || b.registered_city);
    const addressValue = b.registered_address || b.address || '';
    const addressOk = !payload.registered_address || normalize(payload.registered_address).includes(normalize(addressValue).slice(0, 8)) || normalize(addressValue).includes(normalize(payload.registered_address).slice(0, 8));
    const activeOk = normalize(b.authority_status || b.status) === 'active';
    const verifiedOk = normalize(b.verification_status || 'verified') === 'verified';
    return nameOk && dotOk && mcOk && phoneOk && zipOk && cityOk && addressOk && activeOk && verifiedOk;
  });
}


function money(n) {
  return Number(n || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function aiAnswerFromLiveData(message = '', context = { available: [] }) {
  const data = {};
  for (const item of context.available || []) data[item.table] = item.rows || [];
  const customers = data.tms_customers || data.customers || [];
  const loads = data.tms_loads || data.shipments || [];
  const drivers = data.tms_drivers || [];
  const trucks = data.tms_trucks || [];
  const invoices = data.tms_invoices || [];
  const verified = data.verified_businesses || data.verified_carriers || [];
  const msg = String(message).toLowerCase();

  if (msg.includes('company') || msg.includes('business') || msg.includes('dot') || msg.includes('mc')) {
    if (verified.length === 0) return 'I do not see a verified business/carrier record in Supabase yet. Add a record to verified_businesses or verified_carriers first.';
    const b = verified[0];
    return `Your verified company record is ${b.legal_name || b.company_name || 'unnamed company'}${b.dba_name ? `, DBA ${b.dba_name}` : ''}. DOT: ${b.dot_number || 'missing'}, MC: ${b.mc_number || 'missing'}, authority: ${b.authority_status || b.status || 'missing'}, verification: ${b.verification_status || 'missing'}.`;
  }

  if (msg.includes('load')) {
    if (loads.length === 0) return 'You currently have 0 loads saved in Supabase. Create a load in Load Management and I will be able to summarize it here.';
    const total = loads.reduce((sum, l) => sum + Number(l.revenue || l.rate || 0), 0);
    return `You have ${loads.length} saved load${loads.length === 1 ? '' : 's'} in Supabase with total revenue ${money(total)}. Recent loads: ${loads.slice(0, 5).map(l => `${l.load_number || l.shipment_number || l.loadNumber || l.id}: ${l.customer_name || l.customer || 'unknown customer'} ${l.origin || ''} → ${l.destination || ''} (${l.status || 'no status'})`).join('; ')}.`;
  }

  if (msg.includes('customer')) {
    if (customers.length === 0) return 'You currently have 0 customers saved in Supabase. Add a customer from Customer Directory and I will be able to answer customer questions.';
    return `You have ${customers.length} customer${customers.length === 1 ? '' : 's'} saved in Supabase: ${customers.slice(0, 10).map(c => c.company_name || c.full_name || c.name || c.id).join(', ')}.`;
  }

  if (msg.includes('driver')) {
    if (drivers.length === 0) return 'You currently have 0 drivers saved in Supabase. Add a driver from Asset Management and I will be able to summarize driver status.';
    return `You have ${drivers.length} driver${drivers.length === 1 ? '' : 's'} saved in Supabase: ${drivers.slice(0, 10).map(d => `${d.full_name || d.name || d.id} (${d.status || 'no status'})`).join(', ')}.`;
  }

  if (msg.includes('truck') || msg.includes('unit')) {
    if (trucks.length === 0) return 'You currently have 0 trucks/units saved in Supabase. Add a unit from Asset Management to link trucks with drivers and loads.';
    return `You have ${trucks.length} unit${trucks.length === 1 ? '' : 's'} saved in Supabase: ${trucks.slice(0, 10).map(t => `${t.unit_number || t.unitNumber || t.id} (${t.status || 'no status'})`).join(', ')}.`;
  }

  if (msg.includes('invoice') || msg.includes('revenue')) {
    if (invoices.length === 0 && loads.length === 0) return 'There are 0 invoices and 0 loads saved in Supabase right now, so I do not have revenue data yet.';
    const invoiceTotal = invoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const loadTotal = loads.reduce((sum, l) => sum + Number(l.revenue || l.rate || 0), 0);
    return `Saved Supabase totals: ${invoices.length} invoice${invoices.length === 1 ? '' : 's'} totaling ${money(invoiceTotal)} and ${loads.length} load${loads.length === 1 ? '' : 's'} totaling ${money(loadTotal)} in load revenue.`;
  }

  return `I am connected to live Supabase data. Current saved records: ${customers.length} customers, ${loads.length} loads, ${drivers.length} drivers, ${trucks.length} units, and ${invoices.length} invoices. Ask me about any of those records.`;
}

module.exports = {
  DEMO_TOKEN,
  DEV_OTP,
  json,
  bodyJson,
  requireDemoAuth,
  makeAuthResult,
  findVerifiedBusiness,
  aiAnswerFromLiveData,
};
