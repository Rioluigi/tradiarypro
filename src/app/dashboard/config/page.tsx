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

  return (
    <WebhookConfigClient
      userId={user.id}
      hasReceivedData={(count ?? 0) > 0}
      tradeCount={count ?? 0}
    />
  );
}
