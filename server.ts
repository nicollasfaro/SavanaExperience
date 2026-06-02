import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import webpush from "web-push";

// Web Push API Subscriptions storage
interface PushSubscriptionStore {
  userId: string;
  subscription: webpush.PushSubscription;
}
let pushSubscriptions: PushSubscriptionStore[] = [];

let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || ''
};

// If no VAPID keys exist, dynamically generate them for standard local development
if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  const generated = webpush.generateVAPIDKeys();
  vapidKeys = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey
  };
  console.log("Web Push: Dynamically generated standard VAPID keys");
}

webpush.setVapidDetails(
  'mailto:ciuldinciuldin@gmail.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Let stripe validation happen later when env is provided, or initialize it lazily
  let stripeClient: Stripe | null = null;
  function getStripe(): Stripe {
    if (!stripeClient) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new Error('STRIPE_SECRET_KEY environment variable is required');
      }
      stripeClient = new Stripe(key, { apiVersion: '2023-10-16' as any });
    }
    return stripeClient;
  }

  // --- WEB PUSH ENDPOINTS ---
  app.get('/api/push/public-key', (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  app.post('/api/push/subscribe', express.json(), (req, res) => {
    try {
      const { userId, subscription } = req.body;
      if (!userId || !subscription) {
        return res.status(400).json({ error: 'Missing userId or subscription object' });
      }

      // Filter duplicate endpoints for this user or standard stale endpoints
      pushSubscriptions = pushSubscriptions.filter(item => item.subscription.endpoint !== subscription.endpoint);

      pushSubscriptions.push({ userId, subscription });
      res.status(201).json({ success: true, count: pushSubscriptions.length });
    } catch (err: any) {
      console.error("Error subscribing to push notifications:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/push/notify-live', express.json(), async (req, res) => {
    try {
      const { courseId, courseTitle, moduleTitle, roomId, studentIds } = req.body;
      if (!courseId || !courseTitle || !moduleTitle) {
        return res.status(400).json({ error: 'Missing course or module metadata' });
      }

      const targets = studentIds && Array.isArray(studentIds) ? studentIds : [];
      let matchedSubs = pushSubscriptions;
      
      if (targets.length > 0) {
        matchedSubs = pushSubscriptions.filter(sub => targets.includes(sub.userId));
      }

      const payload = JSON.stringify({
        title: '🔴 AULA AO VIVO INICIADA!',
        body: `A aula virtual "${moduleTitle}" de seu curso "${courseTitle}" começou agora. Clique para participar!`,
        url: `/?course=${courseId}&room=${roomId || ''}`
      });

      const promises = matchedSubs.map(async (subStore) => {
        try {
          await webpush.sendNotification(subStore.subscription, payload);
        } catch (err: any) {
          // If the service worker is expired or subscription is invalid, drop it
          if (err.statusCode === 410 || err.statusCode === 404) {
            pushSubscriptions = pushSubscriptions.filter(item => item.subscription.endpoint !== subStore.subscription.endpoint);
          } else {
            console.warn(`Could not dispatch background push notification to user ${subStore.userId}:`, err.message);
          }
        }
      });

      await Promise.all(promises);
      res.json({ success: true, sentCount: matchedSubs.length });
    } catch (err: any) {
      console.error("Error triggering push notifier:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/create-checkout-session', express.json(), async (req, res) => {
    try {
      const stripe = getStripe();
      const { courseId, courseTitle, coursePrice } = req.body;

      if (!courseId || !courseTitle || typeof coursePrice !== 'number') {
        return res.status(400).json({ error: 'Missing req parameters' });
      }

      // Convert price from BRL decimal to cents (e.g. 50.50 -> 5050)
      const unitAmount = Math.round(coursePrice * 100);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: courseTitle,
                metadata: {
                  courseId: courseId
                }
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        // In preview environments the origin URL might change, try to use req headers or a known root:
        success_url: `${req.headers.origin}?session_id={CHECKOUT_SESSION_ID}&course_id=${courseId}&success=true`,
        cancel_url: `${req.headers.origin}?canceled=true`,
        metadata: {
          courseId: courseId
        }
      });

      res.json({ id: session.id, url: session.url });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
