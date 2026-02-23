// Vercel Serverless Function — verifies Stripe payment session
// Checks if a checkout session was actually paid

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripe = (await import('stripe')).default(process.env.STRIPE_SECRET_KEY);

  try {
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    return res.status(200).json({
      paid: session.payment_status === 'paid',
      email: session.customer_details?.email || null,
    });
  } catch (err) {
    console.error('Verify error:', err);
    return res.status(500).json({ error: err.message, paid: false });
  }
}
