import { createClient } from '@/lib/supabase/server';
import { getCMSContent } from '@/lib/cms';
import PricingClient from './PricingClient';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const supabase = createClient();
  let userId: string | null = null;
  let userEmail = '';
  let currentPlan = 'free';
  let cmsData = null;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userId = user.id;
      userEmail = user.email || '';
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', user.id)
        .single();
        
      if (profile?.subscription_plan) {
        currentPlan = profile.subscription_plan;
      }
    }
    
    cmsData = await getCMSContent();
  } catch (err) {
    console.error('Error fetching user or CMS content in pricing page:', err);
  }

  return (
    <main>
      <PricingClient
        userId={userId}
        userEmail={userEmail}
        currentPlan={currentPlan}
        cmsData={cmsData || undefined}
      />
    </main>
  );
}
