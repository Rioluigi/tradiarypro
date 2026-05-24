import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Trade } from '@/types/trade';
import AnalyticsClient from './AnalyticsClient';

export default async function AnalyticsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all trades for analytics
  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .order('close_time', { ascending: false });

  const allTrades: Trade[] = (trades || []) as Trade[];

  return <AnalyticsClient trades={allTrades} />;
}
