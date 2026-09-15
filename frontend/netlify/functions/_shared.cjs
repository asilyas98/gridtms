const crypto = require('node:crypto');

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

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeAddress(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bboulevard\b/g, 'blvd')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\broad\b/g, 'rd')
    .replace(/\blane\b/g, 'ln')
    .replace(/\bhighway\b/g, 'hwy')
    .replace(/\bsuite\b/g, 'ste')
    .replace(/[^a-z0-9]/g, '');
}

const STATE_CODES = {
  alabama: 'al', alaska: 'ak', arizona: 'az', arkansas: 'ar', california: 'ca', colorado: 'co',
  connecticut: 'ct', delaware: 'de', florida: 'fl', georgia: 'ga', hawaii: 'hi', idaho: 'id',
  illinois: 'il', indiana: 'in', iowa: 'ia', kansas: 'ks', kentucky: 'ky', louisiana: 'la',
  maine: 'me', maryland: 'md', massachusetts: 'ma', michigan: 'mi', minnesota: 'mn',
  mississippi: 'ms', missouri: 'mo', montana: 'mt', nebraska: 'ne', nevada: 'nv',
  newhampshire: 'nh', newjersey: 'nj', newmexico: 'nm', newyork: 'ny', northcarolina: 'nc',
  northdakota: 'nd', ohio: 'oh', oklahoma: 'ok', oregon: 'or', pennsylvania: 'pa',
  rhodeisland: 'ri', southcarolina: 'sc', southdakota: 'sd', tennessee: 'tn', texas: 'tx',
  utah: 'ut', vermont: 'vt', virginia: 'va', washington: 'wa', westvirginia: 'wv',
  wisconsin: 'wi', wyoming: 'wy', districtofcolumbia: 'dc',
};

function normalizeState(value) {
  const normalized = normalize(value);
  return STATE_CODES[normalized] || normalized;
}

class BusinessVerificationError extends Error {
  constructor(message, statusCode = 403) {
    super(message);
    this.name = 'BusinessVerificationError';
    this.statusCode = statusCode;
  }
}

function otpMode() {
  return String(process.env.OTP_MODE || 'dev').trim().toLowerCase();
}

function otpExpiryMinutes() {
  const value = Number.parseInt(process.env.OTP_EXPIRY_MINUTES || process.env.OTP_EXPIRATION_MINUTES || '10', 10);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 30) : 10;
}

function normalizePhone(value) {
  const raw = String(value || '').trim();
  if (raw.startsWith('+')) return `+${raw.slice(1).replace(/\D/g, '')}`;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return digits ? `+${digits}` : '';
}

function registrationFingerprint(payload = {}) {
  const fields = [
    'full_name', 'email', 'password', 'legal_name', 'registered_address',
    'registered_city', 'registered_state', 'registered_zip', 'phone',
    'dot_number', 'mc_number',
  ];
  const canonical = {};
  for (const field of fields) canonical[field] = String(payload[field] || '').trim();
  canonical.email = canonical.email.toLowerCase();
  canonical.phone = normalizePhone(canonical.phone);
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

function challengeSecret() {
  const secret = process.env.OTP_SIGNING_SECRET || (otpMode() === 'dev' ? process.env.DEMO_TOKEN || DEMO_TOKEN : '');
  if (!secret) throw new Error('OTP_SIGNING_SECRET is required when OTP_MODE is live.');
  return secret;
}

function hmac(value) {
  return crypto.createHmac('sha256', challengeSecret()).update(value).digest('base64url');
}

function createRegistrationChallenge(payload, otp) {
  const challenge = {
    v: 1,
    purpose: 'register',
    email: String(payload.email || '').trim().toLowerCase(),
    phone: normalizePhone(payload.phone),
    fingerprint: registrationFingerprint(payload),
    otp_hash: hmac(`otp:${otp}`),
    expires_at: Date.now() + otpExpiryMinutes() * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(challenge)).toString('base64url');
  return `${encoded}.${hmac(encoded)}`;
}

function verifyRegistrationChallenge(token, otp, payload) {
  const [encoded, signature] = String(token || '').split('.');
  if (!encoded || !signature) throw new Error('Invalid registration challenge.');
  const expectedSignature = hmac(encoded);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error('Invalid registration challenge.');
  }
  const challenge = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (challenge.purpose !== 'register' || Number(challenge.expires_at) < Date.now()) {
    throw new Error('Registration code has expired. Request a new code.');
  }
  if (challenge.fingerprint !== registrationFingerprint(payload)) {
    throw new Error('Registration details changed. Request a new code.');
  }
  const actualOtpHash = hmac(`otp:${String(otp || '').trim()}`);
  const actualBuffer = Buffer.from(actualOtpHash);
  const expectedOtpBuffer = Buffer.from(String(challenge.otp_hash || ''));
  if (actualBuffer.length !== expectedOtpBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedOtpBuffer)) {
    throw new Error('Invalid verification code.');
  }
  return challenge;
}

async function sendTwilioSms(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_PHONE || process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !from) {
    throw new Error('SMS is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_PHONE.');
  }
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: normalizePhone(to), From: from, Body: message }),
  });
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error(`SMS delivery failed${details.message ? `: ${details.message}` : '.'}`);
  }
}

async function sendResendEmail(to, subject, text) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SIGNUP_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error('Email is not configured. Add RESEND_API_KEY and SIGNUP_FROM_EMAIL.');
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [String(to || '').trim().toLowerCase()], subject, text }),
  });
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    throw new Error(`Email delivery failed${details.message ? `: ${details.message}` : '.'}`);
  }
}

async function sendSignupCode(email, phone, otp) {
  const minutes = otpExpiryMinutes();
  const message = `Your GridTMS verification code is ${otp}. It expires in ${minutes} minutes.`;
  await Promise.all([
    sendTwilioSms(phone, message),
    sendResendEmail(email, 'Your GridTMS verification code', `${message}\n\nIf you did not request this code, you can ignore this email.`),
  ]);
}

async function sendWelcomeNotifications(email, phone, fullName) {
  const name = String(fullName || '').trim() || 'there';
  const message = `Welcome to GridTMS, ${name}! Your verified account has been created successfully.`;
  const results = await Promise.allSettled([
    sendTwilioSms(phone, message),
    sendResendEmail(email, 'Welcome to GridTMS', `${message}\n\nYou can now log in to your account.`),
  ]);
  return results.every((result) => result.status === 'fulfilled');
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

function findCachedBusiness(payload, verifiedBusinesses) {
  return verifiedBusinesses.find((b) => {
    const nameOk = normalize(payload.legal_name) === normalize(b.legal_name);
    const dotOk = digits(payload.dot_number) === digits(b.dot_number);
    const mcOk = digits(payload.mc_number) === digits(b.mc_number);
    const phoneOk = !payload.phone || digits(payload.phone).slice(-10) === digits(b.phone).slice(-10);
    const zipOk = !payload.registered_zip || digits(payload.registered_zip).slice(0, 5) === digits(b.zip || b.registered_zip).slice(0, 5);
    const cityOk = !payload.registered_city || normalize(payload.registered_city) === normalize(b.city || b.registered_city);
    const stateOk = !payload.registered_state || normalizeState(payload.registered_state) === normalizeState(b.state || b.registered_state);
    const addressValue = b.registered_address || b.address || '';
    const addressOk = !payload.registered_address || normalizeAddress(payload.registered_address) === normalizeAddress(addressValue);
    const activeOk = normalize(b.authority_status || b.status) === 'active';
    const verifiedOk = normalize(b.verification_status || 'verified') === 'verified';
    return nameOk && dotOk && mcOk && phoneOk && zipOk && cityOk && stateOk && addressOk && activeOk && verifiedOk;
  });
}

function unwrapFmcsaCarrier(data) {
  const content = data && data.content;
  const first = Array.isArray(content) ? content[0] : content;
  return first && first.carrier ? first.carrier : first;
}

function carrierField(carrier, ...names) {
  if (!carrier || typeof carrier !== 'object') return '';
  const entries = Object.entries(carrier);
  for (const name of names) {
    if (carrier[name] !== undefined && carrier[name] !== null) return carrier[name];
    const match = entries.find(([key]) => key.toLowerCase() === name.toLowerCase());
    if (match && match[1] !== undefined && match[1] !== null) return match[1];
  }
  return '';
}

function hasFmcsaValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function collectDocketNumbers(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectDocketNumbers(item, output);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (/(mc|docket).*number|number.*(mc|docket)/i.test(key) && (typeof item === 'string' || typeof item === 'number')) {
        const number = digits(item);
        if (number) output.push(number);
      } else {
        collectDocketNumbers(item, output);
      }
    }
  }
  return [...new Set(output)];
}

async function fmcsaRequest(path, webKey) {
  const response = await fetch(`https://mobile.fmcsa.dot.gov/qc/services/${path}?webKey=${encodeURIComponent(webKey)}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new BusinessVerificationError('FMCSA rejected FMCSA_WEB_KEY. Replace it with a valid FMCSA web key in Netlify.', 503);
    }
    if (response.status === 404) {
      throw new BusinessVerificationError('No FMCSA carrier was found for that USDOT number.', 404);
    }
    throw new Error(`FMCSA lookup is temporarily unavailable (HTTP ${response.status}).`);
  }
  return response.json();
}

async function lookupFmcsaBusiness(payload = {}) {
  const webKey = process.env.FMCSA_WEB_KEY || process.env.DOT_PROVIDER_API_KEY;
  if (!webKey) {
    throw new BusinessVerificationError('Live FMCSA verification is not configured. Add FMCSA_WEB_KEY in Netlify.', 503);
  }
  const dotNumber = digits(payload.dot_number);
  if (!dotNumber) throw new BusinessVerificationError('A valid USDOT number is required.', 400);

  const data = await fmcsaRequest(`carriers/${encodeURIComponent(dotNumber)}`, webKey);
  const carrier = unwrapFmcsaCarrier(data);
  if (!carrier || typeof carrier !== 'object') {
    throw new BusinessVerificationError('FMCSA did not return a carrier for that USDOT number.', 404);
  }

  let mcNumbers = collectDocketNumbers(carrier);
  if (carrier.mcNumber) mcNumbers.push(digits(carrier.mcNumber));
  mcNumbers = [...new Set(mcNumbers.filter(Boolean))];
  if (payload.mc_number && !mcNumbers.includes(digits(payload.mc_number))) {
    try {
      const docketData = await fmcsaRequest(`carriers/${encodeURIComponent(dotNumber)}/docket-numbers`, webKey);
      mcNumbers = [...new Set([...mcNumbers, ...collectDocketNumbers(docketData)])];
    } catch (error) {
      if (error instanceof BusinessVerificationError && error.statusCode !== 404) throw error;
    }
  }

  const allowedValue = carrierField(carrier, 'allowedToOperate', 'allowToOperate');
  const outOfServiceValue = carrierField(carrier, 'outOfService');
  const allowed = ['y', 'yes', 'true', '1'].includes(normalize(allowedValue));
  const outOfService = ['y', 'yes', 'true', '1'].includes(normalize(outOfServiceValue));
  if (!allowed || outOfService) {
    throw new BusinessVerificationError('FMCSA found this carrier, but it is not currently allowed to operate.', 403);
  }

  const expected = {
    legal_name: carrierField(carrier, 'legalName', 'legal_name'),
    registered_address: carrierField(carrier, 'phyStreet', 'physicalAddress', 'phyAddress'),
    registered_city: carrierField(carrier, 'phyCity', 'physicalCity'),
    registered_state: carrierField(carrier, 'phyState', 'physicalState'),
    registered_zip: carrierField(carrier, 'phyZip', 'phyZipcode', 'phyZipCode', 'physicalZip', 'zipCode'),
    phone: carrierField(carrier, 'telephone', 'phone', 'phoneNumber'),
    dot_number: carrierField(carrier, 'dotNumber', 'usdotNumber') || dotNumber,
    mc_number: mcNumbers[0] ? `MC-${mcNumbers[0]}` : '',
  };
  const mismatches = [];
  if (normalize(payload.legal_name) !== normalize(expected.legal_name)) mismatches.push('legal name');
  if (digits(payload.dot_number) !== digits(expected.dot_number)) mismatches.push('USDOT number');
  if (!mcNumbers.includes(digits(payload.mc_number))) mismatches.push('MC number');
  // FMCSA documents that fields with no API value may be omitted. Validate every
  // optional field FMCSA actually returns, but do not treat an omitted value as
  // evidence that a user's matching SAFER value is wrong.
  if (hasFmcsaValue(expected.registered_address) && normalizeAddress(payload.registered_address) !== normalizeAddress(expected.registered_address)) mismatches.push('street address');
  if (hasFmcsaValue(expected.registered_city) && normalize(payload.registered_city) !== normalize(expected.registered_city)) mismatches.push('city');
  if (hasFmcsaValue(expected.registered_state) && normalizeState(payload.registered_state) !== normalizeState(expected.registered_state)) mismatches.push('state');
  if (hasFmcsaValue(expected.registered_zip) && digits(payload.registered_zip).slice(0, 5) !== digits(expected.registered_zip).slice(0, 5)) mismatches.push('ZIP code');
  if (hasFmcsaValue(expected.phone) && digits(payload.phone).slice(-10) !== digits(expected.phone).slice(-10)) mismatches.push('phone number');

  if (mismatches.length) {
    throw new BusinessVerificationError(`Business verification failed. These fields do not match FMCSA: ${mismatches.join(', ')}.`);
  }

  return {
    legal_name: expected.legal_name,
    dba_name: carrier.dbaName || null,
    registered_address: expected.registered_address || String(payload.registered_address || '').trim(),
    city: expected.registered_city || String(payload.registered_city || '').trim(),
    state: expected.registered_state || String(payload.registered_state || '').trim(),
    zip: expected.registered_zip || String(payload.registered_zip || '').trim(),
    phone: expected.phone || String(payload.phone || '').trim(),
    dot_number: String(expected.dot_number),
    mc_number: expected.mc_number || String(payload.mc_number),
    authority_status: 'ACTIVE',
    verification_status: 'verified',
    source: 'FMCSA_QCMobile',
    verified_at: new Date().toISOString(),
  };
}

async function cacheVerifiedBusiness(record) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const base = `${url.replace(/\/$/, '')}/rest/v1/verified_businesses`;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  const filter = `?dot_number=eq.${encodeURIComponent(record.dot_number)}`;
  const update = await fetch(`${base}${filter}`, { method: 'PATCH', headers, body: JSON.stringify(record) });
  if (update.ok) {
    const rows = await update.json().catch(() => []);
    if (Array.isArray(rows) && rows.length) return;
  }
  const insert = await fetch(base, { method: 'POST', headers, body: JSON.stringify(record) });
  if (!insert.ok) throw new Error(`Supabase cache returned HTTP ${insert.status}.`);
}

async function findVerifiedBusiness(payload = {}) {
  const hasFmcsaKey = Boolean(process.env.FMCSA_WEB_KEY || process.env.DOT_PROVIDER_API_KEY);
  if (hasFmcsaKey) {
    try {
      const verified = await lookupFmcsaBusiness(payload);
      await cacheVerifiedBusiness(verified).catch((error) => console.warn('Unable to cache FMCSA verification:', error.message));
      return verified;
    } catch (error) {
      if (error instanceof BusinessVerificationError) throw error;
      console.warn('FMCSA service error; checking Supabase verification cache:', error.message);
      const cached = findCachedBusiness(payload, await readVerifiedBusinesses());
      if (cached) return { ...cached, source: cached.source || 'supabase-cache' };
      throw new BusinessVerificationError('FMCSA verification is temporarily unavailable and no matching cached carrier was found.', 503);
    }
  }
  const verifiedBusinesses = await readVerifiedBusinesses();
  const cached = findCachedBusiness(payload, verifiedBusinesses);
  if (cached) return cached;
  throw new BusinessVerificationError('Live FMCSA verification is not configured and no matching verified carrier exists in Supabase.', 503);
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
  BusinessVerificationError,
  aiAnswerFromLiveData,
  otpMode,
  otpExpiryMinutes,
  createRegistrationChallenge,
  verifyRegistrationChallenge,
  sendSignupCode,
  sendWelcomeNotifications,
};
