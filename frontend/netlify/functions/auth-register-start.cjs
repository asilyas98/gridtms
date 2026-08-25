const { json, bodyJson, findVerifiedBusiness, DEV_OTP } = require('./_shared.cjs');
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  const body = await bodyJson(event);
  const verified = await findVerifiedBusiness(body);
  if (!verified) return json(403, { detail: 'Business verification failed. LLC/legal name, registered address, DOT, MC, and phone must match an active verified carrier record.' });
  return json(200, {
    message: 'Business verified in Netlify demo mode. Enter the 2-step test code.',
    challenge_id: `netlify-${Date.now()}`,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    dev_otp: DEV_OTP,
  });
};
