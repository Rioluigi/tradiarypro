const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nyesnegslntedxpsfizx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55ZXNuZWdzbG50ZWR4cHNmaXp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU0ODE1MSwiZXhwIjoyMDk1MTI0MTUxfQ.6N21Tuy9VqMajDle52PbirDU6MdPqdC3jcscpuECDCY'; // service role to bypass RLS

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Checking if notifications table exists...');
  const { data: nData, error: nErr } = await supabase.from('notifications').select('*').limit(1);
  if (nErr) {
    console.log('Notifications check error:', nErr.message);
  } else {
    console.log('Notifications table exists! Data:', nData);
  }

  console.log('Checking if journal_entries table exists...');
  const { data: jData, error: jErr } = await supabase.from('journal_entries').select('*').limit(1);
  if (jErr) {
    console.log('Journal entries check error:', jErr.message);
  } else {
    console.log('Journal entries table exists! Data:', jData);
  }
}

run();
