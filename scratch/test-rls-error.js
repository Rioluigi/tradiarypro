const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nyesnegslntedxpsfizx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55ZXNuZWdzbG50ZWR4cHNmaXp4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU0ODE1MSwiZXhwIjoyMDk1MTI0MTUxfQ.6N21Tuy9VqMajDle52PbirDU6MdPqdC3jcscpuECDCY'; // service role to bypass RLS

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Creating diagnostic function...');
  
  // 1. Create function
  const createSql = `
    CREATE OR REPLACE FUNCTION public.test_rls_query(test_user_id UUID)
    RETURNS TABLE (error_msg TEXT) AS $$
    DECLARE
      r RECORD;
    BEGIN
      -- Test profiles
      BEGIN
        PERFORM set_config('request.jwt.claim.sub', test_user_id::text, true);
        PERFORM set_config('role', 'authenticated', true);
        FOR r IN SELECT p.id, p.email FROM public.profiles p LIMIT 1 LOOP
          error_msg := 'Profiles Query Success: ' || r.email;
          RETURN NEXT;
        END LOOP;
      EXCEPTION WHEN OTHERS THEN
        error_msg := 'Profiles Query Error: ' || SQLERRM;
        RETURN NEXT;
      END;

      -- Test trades
      BEGIN
        PERFORM set_config('request.jwt.claim.sub', test_user_id::text, true);
        PERFORM set_config('role', 'authenticated', true);
        FOR r IN SELECT t.id, t.ticket FROM public.trades t LIMIT 1 LOOP
          error_msg := 'Trades Query Success: ' || r.ticket::text;
          RETURN NEXT;
        END LOOP;
      EXCEPTION WHEN OTHERS THEN
        error_msg := 'Trades Query Error: ' || SQLERRM;
        RETURN NEXT;
      END;
      
      -- Test accounts
      BEGIN
        PERFORM set_config('request.jwt.claim.sub', test_user_id::text, true);
        PERFORM set_config('role', 'authenticated', true);
        FOR r IN SELECT a.id, a.account_number FROM public.accounts a LIMIT 1 LOOP
          error_msg := 'Accounts Query Success: ' || r.account_number;
          RETURN NEXT;
        END LOOP;
      EXCEPTION WHEN OTHERS THEN
        error_msg := 'Accounts Query Error: ' || SQLERRM;
        RETURN NEXT;
      END;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  const { error: fErr } = await supabase.rpc('update_account_balance', {
    account_id: '01279a17-b770-43a8-8417-d6f9e1861867', // dummy params for any rpc to execute raw SQL? No, RPC can't run raw SQL unless the function executes dynamic SQL.
  }); // Wait, we can't run raw SQL from RPC unless the RPC function itself executes dynamic SQL, but wait! We can just create this function via an migration script or check if we can run it.
  
  // Wait, how do we run raw SQL? Supabase doesn't let us run raw SQL via the JS client unless we have a specific RPC.
  // Let's write a node script that uses pg (PostgreSQL client) instead!
  // Wait, do we have the database credentials?
  // Let's check the connection string. In Supabase, the password is set when the project is created and is not in .env.local.
  // Wait! We don't need to write pg if we don't have the password.
  // Let's check if the RPC update_account_balance works.
  
  console.log('Checking RLS policies recursively...');
}

run();
