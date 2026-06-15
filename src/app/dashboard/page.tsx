import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calculateKPIs } from '@/lib/utils';
import { Trade } from '@/types/trade';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all trades for KPI calculation
  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .order('close_time', { ascending: false });

  // Fetch subscription info (safe fallback)
  let subscriptionPlan = 'free';
  let subscriptionStatus = 'active';
  let stripeSubscriptionId: string | null = null;

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan, subscription_status, stripe_subscription_id')
      .eq('id', user.id)
      .single();

    if (profile) {
      subscriptionPlan = profile.subscription_plan || 'free';
      subscriptionStatus = profile.subscription_status || 'active';
      stripeSubscriptionId = profile.stripe_subscription_id || null;

      // Self-healing: if database profile says 'free', check if user registered with a paid plan in user metadata
      const metaPlan = user.user_metadata?.plan;
      if (subscriptionPlan === 'free' && metaPlan && metaPlan.toLowerCase() !== 'free') {
        const parsedPlan = metaPlan.toLowerCase();
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .update({ subscription_plan: parsedPlan })
          .eq('id', user.id)
          .select('subscription_plan, subscription_status, stripe_subscription_id')
          .single();
        if (updatedProfile) {
          subscriptionPlan = updatedProfile.subscription_plan || 'free';
          subscriptionStatus = updatedProfile.subscription_status || 'active';
          stripeSubscriptionId = updatedProfile.stripe_subscription_id || null;
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch or self-heal profile subscription info:', err);
  }

  const allTrades: Trade[] = (trades || []) as Trade[];
  const recentTrades = allTrades.slice(0, 5);
  const kpis = calculateKPIs(allTrades);

  const metadataPlan = user.user_metadata?.plan || 'free';

  return (
    <DashboardClient
      kpis={kpis}
      allTrades={allTrades}
      recentTrades={recentTrades}
      subscriptionStatus={subscriptionStatus}
      subscriptionPlan={subscriptionPlan}
      metadataPlan={metadataPlan}
      stripeSubscriptionId={stripeSubscriptionId}
      userId={user.id}
      userEmail={user.email || ''}
    />
  );
}
