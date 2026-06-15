import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CalculatorClient from './CalculatorClient';

export const metadata = {
  title: 'Risk Calculator - Tradiary',
  description: 'Calculate position sizing, risk/reward ratios, and pips at risk.',
};

export default async function CalculatorPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <CalculatorClient />;
}
