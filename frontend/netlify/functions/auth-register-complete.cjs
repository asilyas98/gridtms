const {
  json,
  bodyJson,
  verifyRegistrationChallenge,
  otpMode,
  sendWelcomeNotifications,
} = require('./_shared.cjs');
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return json(200, {});
  const body = await bodyJson(event);
  let challenge;
  try {
    challenge = verifyRegistrationChallenge(body.challenge_id, body.otp_code, body);
  } catch (error) {
    return json(400, { detail: error.message || 'Invalid verification code.' });
  }
  let welcomeSent = true;
  if (otpMode() !== 'dev') {
    welcomeSent = await sendWelcomeNotifications(challenge.email, challenge.phone, body.full_name);
  }
  return json(200, {
    message: welcomeSent
      ? 'Account created. A welcome email and text message were sent.'
      : 'Account created, but one or more welcome notifications could not be delivered.',
    notifications_sent: welcomeSent,
    user: {
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

