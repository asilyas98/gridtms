const {
  json,
  bodyJson,
  findVerifiedBusiness,
  BusinessVerificationError,
  DEV_OTP,
  otpMode,
  otpExpiryMinutes,
  createRegistrationChallenge,
  startSupabaseEmailSignup,
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
  const emailOtp = live ? null : DEV_OTP;
  let challengeId;
  try {
    if (live) await startSupabaseEmailSignup(body);
    challengeId = createRegistrationChallenge(body, emailOtp);
  } catch (error) {
    console.error('Supabase email signup error:', error);
    return json(503, { detail: error.message || 'Supabase could not send the verification email.' });
  }
  const minutes = otpExpiryMinutes();
  return json(200, {
    message: live
      ? 'Business verified. Enter the confirmation code sent to your email by Supabase.'
      : 'Business verified in local development mode. Enter the email test code shown below.',
    challenge_id: challengeId,
    expires_at: new Date(Date.now() + minutes * 60 * 1000).toISOString(),
    dev_email_otp: live ? null : emailOtp,
  });
};
