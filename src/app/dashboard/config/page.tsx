import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WebhookConfigClient from './WebhookConfigClient';

export default async function WebhookConfigPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user has any trades (to determine connection status)
  const { count } = await supabase
    .from('trades')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Fetch subscription data from profiles (safe fallback if columns don't exist yet)
  let subscriptionData = {
    subscription_plan: 'free',
    subscription_status: 'active',
    subscription_end_date: null as string | null,
    stripe_customer_id: null as string | null,
  };

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan, subscription_status, subscription_end_date, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profile) {
      subscriptionData = {
        subscription_plan: profile.subscription_plan || 'free',
        subscription_status: profile.subscription_status || 'active',
        subscription_end_date: profile.subscription_end_date || null,
        stripe_customer_id: profile.stripe_customer_id || null,
      };
    }
  } catch {
    // Columns may not exist yet if migration hasn't been run — use defaults
  }

  return (
    <WebhookConfigClient
      userId={user.id}
      userEmail={user.email || ''}
      hasReceivedData={(count ?? 0) > 0}
      tradeCount={count ?? 0}
      subscriptionPlan={subscriptionData.subscription_plan}
      subscriptionStatus={subscriptionData.subscription_status}
      subscriptionEndDate={subscriptionData.subscription_end_date}
      hasStripeCustomer={!!subscriptionData.stripe_customer_id}
    />
  );
}
