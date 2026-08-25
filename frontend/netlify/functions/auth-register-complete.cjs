const { json, bodyJson, DEV_OTP } = require('./_shared.cjs');
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  const body = await bodyJson(event);
  if (String(body.otp_code || '') !== DEV_OTP) return json(400, { detail: 'Invalid 2-step code. Demo code is 123456.' });
  return json(200, {
    message: 'Demo account created. Now log in with demo/demo. Real Supabase account creation requires service-role environment variables.',
    user: { id: `netlify-user-${Date.now()}`, email: 'verified-demo@gridtms.local', user_metadata: { business_verified: true, two_step_verified: true } },
  });
};
