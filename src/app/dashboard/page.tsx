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

  const allTrades: Trade[] = (trades || []) as Trade[];
  const recentTrades = allTrades.slice(0, 5);
  const kpis = calculateKPIs(allTrades);

  return (
    <DashboardClient
      kpis={kpis}
      allTrades={allTrades}
      recentTrades={recentTrades}
    />
  );
}
