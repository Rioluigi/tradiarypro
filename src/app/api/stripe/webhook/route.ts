import { NextRequest, NextResponse } from 'next/server';
import { stripe, getPlanFromPriceId } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Admin client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ─── Checkout completed ───
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan || 'pro';

        if (!userId) {
          console.warn('checkout.session.completed: no supabase_user_id in metadata');
          break;
        }

        // Retrieve subscription details
        let subscriptionEndDate: string | null = null;
        let subscriptionId: string | null = null;

        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          subscriptionId = subscription.id;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          subscriptionEndDate = new Date((subscription as any).current_period_end * 1000).toISOString();
        }

        await supabaseAdmin
          .from('profiles')
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            subscription_plan: plan,
            subscription_status: 'active',
            subscription_end_date: subscriptionEndDate,
            onboarding_plan_selected: true,
          })
          .eq('id', userId);

        console.log(`✅ checkout.session.completed: userId=${userId}, plan=${plan}`);
        break;
      }

      // ─── Subscription updated ───
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Resolve plan from the price ID
        const priceId = subscription.items.data[0]?.price?.id || '';
        const plan = getPlanFromPriceId(priceId);

        const status = subscription.cancel_at_period_end ? 'cancelling' : subscription.status;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const endDate = new Date((subscription as any).current_period_end * 1000).toISOString();

        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_plan: plan || undefined,
            subscription_status: status,
            subscription_end_date: endDate,
            stripe_subscription_id: subscription.id,
          })
          .eq('stripe_customer_id', customerId);

        console.log(`✅ customer.subscription.updated: customer=${customerId}, status=${status}`);
        break;
      }

      // ─── Subscription deleted (cancelled) ───
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_plan: 'free',
            subscription_status: 'cancelled',
            stripe_subscription_id: null,
            subscription_end_date: null,
          })
          .eq('stripe_customer_id', customerId);

        console.log(`✅ customer.subscription.deleted: customer=${customerId} → downgraded to free`);
        break;
      }

      // ─── Invoice payment failed ───
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: 'past_due',
          })
          .eq('stripe_customer_id', customerId);

        console.log(`⚠️ invoice.payment_failed: customer=${customerId} → past_due`);
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing Stripe webhook event:', error);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
