// server.js (Node.js backend)
require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Your sk_test_...
const app = express();
app.use(express.json());
app.use(express.static('public')); // Serve HTML/JS from /public folder

// Create Checkout Session (emoji triggers this)
app.post('/create-checkout-session', async (req, res) => {
  const { emoji } = req.body; // e.g., '🔥'
  const amount = emoji === '🔥' ? 500 : 100; // $5 or $1 in cents

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `Emoji Pay: ${emoji}` },
        unit_amount: amount,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: 'http://localhost:3000/success',
    cancel_url: 'http://localhost:3000/cancel',
  });

  res.json({ id: session.id });
});

// Webhook for post-payment events (e.g., fulfillment)
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log(`Payment succeeded for Emoji: ${session.line_items.data[0].description}`);
    // TODO: Send email, update DB, or LLM-reconcile here
  }

  res.json({ received: true });
});

app.listen(3000, () => console.log('Server on http://localhost:3000'));
