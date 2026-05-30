import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";

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
