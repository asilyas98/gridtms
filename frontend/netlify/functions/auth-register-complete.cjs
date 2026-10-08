const {
  json,
  bodyJson,
  verifyRegistrationChallenge,
  otpMode,
  verifySupabaseEmailOtp,
} = require('./_shared.cjs');
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  const body = await bodyJson(event);
  let challenge;
  try {
    challenge = verifyRegistrationChallenge(body.challenge_id, body.email_otp_code, body);
  } catch (error) {
    return json(400, { detail: error.message || 'Invalid verification code.' });
  }
  const live = otpMode() !== 'dev';
  let authResult = null;
  if (live) {
    try {
      authResult = await verifySupabaseEmailOtp(challenge.email, body.email_otp_code);
    } catch (error) {
      console.error('Supabase email verification error:', error);
      return json(400, { detail: error.message || 'The Supabase email verification code is invalid or expired.' });
    }
  }
  return json(200, {
    ...(authResult || {}),
    message: live
      ? 'Email verified. Your Supabase account is ready and your phone number was saved as contact information.'
      : 'Development verification passed. Configure live OTP and Supabase keys to create a real account.',
    user: authResult?.user || {
      id: `netlify-user-${Date.now()}`,
      email: challenge.email,
      user_metadata: {
        full_name: body.full_name,
        legal_name: body.legal_name,
        business_verified: true,
        two_step_verified: true,
      },
    },
  });
};
