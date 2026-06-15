import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICE_IDS } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Admin client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plan, billingCycle, userId, userEmail } = body as {
      plan: string;
      billingCycle: 'monthly' | 'yearly';
      userId: string;
      userEmail: string;
    };

    if (!plan || !billingCycle || !userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: plan, billingCycle, userId, userEmail' },
        { status: 400 }
      );
    }

    // Validate plan
    const planPrices = PRICE_IDS[plan];
    if (!planPrices) {
      return NextResponse.json(
        { error: `Invalid plan: ${plan}. Valid plans: ${Object.keys(PRICE_IDS).join(', ')}` },
        { status: 400 }
      );
    }

    const priceId = planPrices[billingCycle];
    if (!priceId) {
      return NextResponse.json(
        { error: `Invalid billing cycle: ${billingCycle}` },
        { status: 400 }
      );
    }

    // Check if user already has a Stripe customer ID
    let stripeCustomerId: string | null = null;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profile?.stripe_customer_id) {
      stripeCustomerId = profile.stripe_customer_id;
    } else {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { supabase_user_id: userId },
      });
      stripeCustomerId = customer.id;

      // Save customer ID to profiles
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', userId);
    }

    // Create Checkout Session
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId || undefined,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?onboarding=complete`,
      cancel_url: `${appUrl}/onboarding/plan`,
      subscription_data: {
        trial_period_days: parseInt(process.env.NEXT_PUBLIC_TRIAL_DAYS || '7', 10),
        metadata: {
          supabase_user_id: userId,
          plan,
          billing_cycle: billingCycle,
        },
      },
      metadata: {
        supabase_user_id: userId,
        plan,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
