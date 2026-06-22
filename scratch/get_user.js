const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nyesnegslntedxpsfizx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55ZXNuZWdzbG50ZWR4cHNmaXp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU0ODE1MSwiZXhwIjoyMDk1MTI0MTUxfQ.6N21Tuy9VqMajDle52PbirDU6MdPqdC3jcscpuECDCY'
);

async function main() {
  const { data, error } = await supabase.from('profiles').select('id, email').limit(5);
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }
  console.log('Profiles in DB (service role):', data);
}

main();
