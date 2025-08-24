import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
// import { buffer } from 'micro';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

// Disable body parsing for this endpoint (required for webhooks)
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    // 1. Get the raw body and signature
    const rawBody = await req.arrayBuffer();
    const buf = Buffer.from(rawBody);
    const sig = req.headers.get('stripe-signature')!;

    // 2. Construct the event
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err) {
      console.error('Webhook signature verification failed.', err);
      return new Response(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown Error'}`, {
        status: 400
      });
    }

    // 3. Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // 4. Update the database with payment information
      if (session.payment_status === 'paid' && session.metadata?.userId) {
        // Create or update the payment record
        await prisma.payment.create({
          data: {
            stripePaymentIntentId: session.payment_intent as string,
            amount: session.amount_total!,
            currency: session.currency!,
            status: session.payment_status,
            userId: session.metadata.userId,
          }
        });
      }
    }

    // 5. Return a 200 response to acknowledge receipt of the event
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

