import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Trade } from '@/types/trade';
import TradeHistoryClient from './TradeHistoryClient';

export default async function TradeHistoryPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all trades
  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .order('close_time', { ascending: false });

  const allTrades: Trade[] = (trades || []) as Trade[];

  // Get unique symbols for filter dropdown
  const symbols = Array.from(new Set(allTrades.map((t) => t.symbol))).sort();

  return <TradeHistoryClient trades={allTrades} symbols={symbols} userId={user.id} />;
}
