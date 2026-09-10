const { json, bodyJson, findVerifiedBusiness } = require('./_shared.cjs');
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  const body = await bodyJson(event);
  const verified = await findVerifiedBusiness(body);
  if (!verified) return json(403, { verified: false, detail: 'Business verification failed. LLC/legal name, address, phone, DOT, and MC must match a verified active carrier record.' });
  return json(200, { verified: true, business: verified });
};
