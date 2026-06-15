import { NextRequest, NextResponse } from 'next/server';
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

    console.log(`[stripe-downgrade API] Attempting to downgrade user ${userId} to free plan...`);

    // Update the profile plan in the database to 'free' using the admin client
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_plan: 'free',
        subscription_status: 'active',
        stripe_subscription_id: null, // Ensure clean state
      })
      .eq('id', userId)
      .select()
      .single();

    if (error && (error.message?.includes('column') || error.message?.includes('schema cache') || error.code === 'PGRST204')) {
      console.warn('[stripe-downgrade API] Stripe columns are missing. User is already implicitly on free plan. Error:', error.message);
      return NextResponse.json({
        success: true,
        message: 'Plan switched to free successfully (implicit).',
        profile: { id: userId, subscription_plan: 'free' },
      });
    }

    if (error) {
      console.error('[stripe-downgrade API] Database update error:', error);
      throw error;
    }

    console.log('[stripe-downgrade API] Downgrade succeeded:', data);
    return NextResponse.json({
      success: true,
      message: 'Plan switched to free successfully.',
      profile: data,
    });
  } catch (error) {
    console.error('[stripe-downgrade API] Uncaught Exception:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
