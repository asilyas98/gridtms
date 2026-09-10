const { json, bodyJson, DEV_OTP, makeAuthResult } = require('./_shared.cjs');
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  const body = await bodyJson(event);
  if (String(body.otp_code || '') !== DEV_OTP) return json(400, { detail: 'Invalid 2-step code. Demo code is 123456.' });
  return json(200, makeAuthResult());
};
