import { Router, raw } from 'express';
import Stripe from 'stripe';
import { verifyAccessToken, getUserById, markUserPurchased } from '../auth';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia' as any,
});

const GAME_PRICE = 1000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

router.post('/checkout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
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
      success_url: `${FRONTEND_URL}/basketball?purchase=success`,
      cancel_url: `${FRONTEND_URL}/?purchase=cancelled`,
      metadata: { userId: payload.userId },
    });

    res.json({ session_id: session.id, checkout_url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

router.post('/webhook', raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;

      if (userId) {
        const wasUpdated = await markUserPurchased(
          userId,
          (session.customer as string) || '',
          (session.payment_intent as string) || ''
        );
        console.log(wasUpdated
          ? `User ${userId} purchase completed`
          : `User ${userId} already purchased (duplicate webhook ignored)`
        );
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

router.get('/status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
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
