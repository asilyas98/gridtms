const Stripe = require('stripe');
const { json } = require('./_shared.cjs');
const { rest } = require('./_server-data.cjs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { detail: 'Method not allowed.' });
  if (!process.env.STRIPE_WEBHOOK_SECRET) return json(503, { detail: 'Stripe webhook secret is not configured.' });
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const rawBody = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64') : event.body || '';
    const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
    const stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
    const object = stripeEvent.data.object;
    if (stripeEvent.type === 'checkout.session.completed') {
      const ownerId = object.metadata?.owner_id || object.client_reference_id;
      if (ownerId) await rest('tms_billing_accounts?on_conflict=owner_id', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ owner_id: ownerId, stripe_customer_id: object.customer, stripe_subscription_id: object.subscription, status: 'active', updated_at: new Date().toISOString() }),
      });
    }
    if (stripeEvent.type.startsWith('customer.subscription.')) {
      const ownerId = object.metadata?.owner_id;
      if (ownerId) await rest(`tms_billing_accounts?owner_id=eq.${encodeURIComponent(ownerId)}`, {
        method: 'PATCH', body: JSON.stringify({
          stripe_customer_id: object.customer,
          stripe_subscription_id: object.id,
          status: object.status,
          current_period_end: object.current_period_end ? new Date(object.current_period_end * 1000).toISOString() : null,
          cancel_at_period_end: Boolean(object.cancel_at_period_end),
          updated_at: new Date().toISOString(),
        }),
      });
    }
    return json(200, { received: true });
  } catch (error) {
    return json(400, { detail: `Webhook rejected: ${error.message}` });
  }
};
