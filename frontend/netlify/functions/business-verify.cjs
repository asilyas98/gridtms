const { json, bodyJson, findVerifiedBusiness, BusinessVerificationError } = require('./_shared.cjs');
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  const body = await bodyJson(event);
  let verified;
  try {
    verified = await findVerifiedBusiness(body);
  } catch (error) {
    console.error('Business verification error:', error);
    const status = error instanceof BusinessVerificationError ? error.statusCode : 503;
    return json(status, { verified: false, detail: error.message || 'Unable to verify this business with FMCSA.' });
  }
  return json(200, { verified: true, business: verified });
};

