const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nyesnegslntedxpsfizx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55ZXNuZWdzbG50ZWR4cHNmaXp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU0ODE1MSwiZXhwIjoyMDk1MTI0MTUxfQ.6N21Tuy9VqMajDle52PbirDU6MdPqdC3jcscpuECDCY'; // service role to bypass RLS

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- DIAGNOSTICS START ---');
  
  // 1. Get profiles
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  console.log('Profiles in DB:', pErr ? pErr.message : profiles);

  // 2. Get accounts
  const { data: accounts, error: aErr } = await supabase.from('accounts').select('*');
  console.log('Accounts in DB:', aErr ? aErr.message : accounts);

  // 3. Get count of trades
  const { count, error: tCountErr } = await supabase.from('trades').select('*', { count: 'exact', head: true });
  console.log('Total Trades count in DB:', tCountErr ? tCountErr.message : count);

  if (count > 0) {
    const { data: trades, error: tErr } = await supabase.from('trades').select('*').limit(5);
    console.log('First 5 trades in DB:', tErr ? tErr.message : trades);
  }
  
  console.log('--- DIAGNOSTICS END ---');
}

run();
