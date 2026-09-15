const crypto = require('node:crypto');
const {
  json,
  bodyJson,
  findVerifiedBusiness,
  BusinessVerificationError,
  DEV_OTP,
  otpMode,
  otpExpiryMinutes,
  createRegistrationChallenge,
  sendSignupCode,
} = require('./_shared.cjs');
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  const body = await bodyJson(event);
  let verified;
  try {
    verified = await findVerifiedBusiness(body);
  } catch (error) {
    console.error('Business verification error:', error);
    const status = error instanceof BusinessVerificationError ? error.statusCode : 503;
    return json(status, { detail: error.message || 'Unable to verify this business with FMCSA.' });
  }
  const live = otpMode() !== 'dev';
  const otp = live ? String(crypto.randomInt(100000, 1000000)) : DEV_OTP;
  let challengeId;
  try {
    challengeId = createRegistrationChallenge(body, otp);
    if (live) await sendSignupCode(body.email, body.phone, otp);
  } catch (error) {
    console.error('Registration notification error:', error);
    return json(503, { detail: error.message || 'Unable to send the verification email and text message.' });
  }
  const minutes = otpExpiryMinutes();
  return json(200, {
    message: live
      ? 'Business verified. A verification code was sent by email and text message.'
      : 'Business verified in local development mode. Enter the test code shown below.',
    challenge_id: challengeId,
    expires_at: new Date(Date.now() + minutes * 60 * 1000).toISOString(),
    dev_otp: live ? null : otp,
  });
};

