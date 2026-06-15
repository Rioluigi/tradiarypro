import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PlanOnboardingClient from './PlanOnboardingClient';

export default async function PlanOnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch profiles table to verify if onboarding_plan_selected is already true
  // This is a safety guard for direct links
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_plan_selected')
      .eq('id', user.id)
      .single();

    if (profile?.onboarding_plan_selected) {
      redirect('/dashboard');
    }
  } catch (err) {
    console.error('Failed checking onboarding status in server component:', err);
  }

  return (
    <PlanOnboardingClient
      userId={user.id}
      userEmail={user.email || ''}
    />
  );
}
