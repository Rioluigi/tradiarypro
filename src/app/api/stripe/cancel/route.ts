import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Admin client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body as { userId: string };

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Look up stripe_subscription_id from profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', userId)
      .single();

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active Stripe subscription found to cancel.' },
        { status: 404 }
      );
    }

    // Cancel the subscription at the end of the billing period
    const subscription = await stripe.subscriptions.update(
      profile.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    );

    // Update subscription status in database immediately as well (webhook will also verify this)
    await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'cancelling',
      })
      .eq('id', userId);

    return NextResponse.json({
      success: true,
      message: 'Subscription will be cancelled at the end of the billing period.',
      subscription,
    });
  } catch (error) {
    console.error('Stripe cancel subscription error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
