import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/layout/Sidebar';
import BottomNavigation from '@/components/layout/BottomNavigation';
import AIChatAssistant from '@/components/dashboard/AIChatAssistant';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let subscriptionPlan = 'free';
  if (user) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', user.id)
        .single();
      if (profile?.subscription_plan) {
        subscriptionPlan = profile.subscription_plan;
      }
    } catch (err) {
      console.error('Error fetching subscription plan in layout:', err);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 themed-app relative" suppressHydrationWarning>
      <Sidebar userEmail={user?.email || ''} subscriptionPlan={subscriptionPlan} />



      {/* Main content area */}
      <main className="lg:pl-64 transition-all duration-300">
        <div className="min-h-screen p-4 pt-16 pb-24 lg:pt-4 lg:p-8">
          {children}
        </div>
      </main>

      {/* Floating AI Chat Assistant */}
      <AIChatAssistant userId={user?.id || ''} />

      <BottomNavigation />
    </div>
  );
}
