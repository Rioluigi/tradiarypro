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
    const { userId, plan } = body as { userId: string; plan: string };

    console.log(`[select-plan API] Incoming request: userId=${userId}, plan=${plan}`);

    if (!userId || !plan) {
      console.error('[select-plan API] Error: Missing userId or plan in request body');
      return NextResponse.json({ error: 'Missing userId or plan' }, { status: 400 });
    }

    const lowerPlan = plan.toLowerCase();
    let data = null;
    let error = null;

    // Try updating all subscription-related columns
    console.log('[select-plan API] Attempting to update profiles with all columns...');
    const result = await supabaseAdmin
      .from('profiles')
      .update({
        onboarding_plan_selected: true,
        subscription_plan: lowerPlan,
        subscription_status: 'active',
        stripe_subscription_id: lowerPlan === 'free' ? null : undefined,
      })
      .eq('id', userId)
      .select()
      .single();

    data = result.data;
    error = result.error;

    // Fallback if Stripe columns are missing
    if (error && (error.message?.includes('column') || error.message?.includes('schema cache') || error.code === 'PGRST204')) {
      console.warn('[select-plan API] Stripe columns are missing in profiles table. Error:', error.message);
      console.log('[select-plan API] Falling back to updating onboarding_plan_selected ONLY...');
      
      const fallbackResult = await supabaseAdmin
        .from('profiles')
        .update({
          onboarding_plan_selected: true,
        })
        .eq('id', userId)
        .select()
        .single();
      
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      console.error('[select-plan API] Database update error:', error);
      throw error;
    }

    console.log('[select-plan API] Successfully updated profile:', data);
    return NextResponse.json({
      success: true,
      message: 'Plan selected successfully.',
      profile: data,
    });
  } catch (error) {
    console.error('[select-plan API] Uncaught Exception:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
