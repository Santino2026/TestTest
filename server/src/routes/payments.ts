import { Router, raw } from 'express';
import Stripe from 'stripe';
import { verifyAccessToken, getUserById, markUserPurchased } from '../auth';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as any,
});

const GAME_PRICE = 1000; // $10.00 in cents

// Create checkout session
router.post('/checkout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (payload.hasPurchased) {
      return res.status(400).json({ error: 'Already purchased' });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Sports League Office: Basketball',
              description: 'Full access to the basketball franchise simulation game',
            },
            unit_amount: GAME_PRICE,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/basketball?purchase=success`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/?purchase=cancelled`,
      metadata: {
        userId: payload.userId,
      },
    });

    res.json({ session_id: session.id, checkout_url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Stripe webhook - needs raw body, configured in index.ts
router.post('/webhook', raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;

      if (userId) {
        await markUserPurchased(
          userId,
          session.customer as string || '',
          session.payment_intent as string || ''
        );
        console.log(`User ${userId} purchase completed`);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

// Check purchase status
router.get('/status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ purchased: false });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.json({ purchased: false });
    }

    const user = await getUserById(payload.userId);
    res.json({ purchased: user?.has_purchased || false });
  } catch (error) {
    res.json({ purchased: false });
  }
});

export default router;
