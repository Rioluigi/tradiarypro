const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nyesnegslntedxpsfizx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55ZXNuZWdzbG50ZWR4cHNmaXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NDgxNTEsImV4cCI6MjA5NTEyNDE1MX0.kvbYoGJl7wSKQICKs9iwHpxU_Sz9wNOBldxxLhgXknA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const email = `tradiarytest123@gmail.com`;
  const password = 'Password123!';

  console.log(`Registering test user: ${email}...`);
  
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    console.error('Sign up error:', signUpError.message);
    return;
  }

  const user = signUpData.user;
  console.log('Successfully registered user ID:', user.id);

  console.log('Attempting to select own profile...');
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*');
  
  if (profileErr) {
    console.error('Profiles query failed:', profileErr.message);
  } else {
    console.log('Profiles query success. Count:', profile.length);
  }

  console.log('Attempting to select own accounts...');
  const { data: accounts, error: accountsErr } = await supabase
    .from('accounts')
    .select('*');

  if (accountsErr) {
    console.error('Accounts query failed:', accountsErr.message);
  } else {
    console.log('Accounts query success. Count:', accounts.length);
  }

  console.log('Attempting to select own trades...');
  const { data: trades, error: tradesErr } = await supabase
    .from('trades')
    .select('*');

  if (tradesErr) {
    console.error('Trades query failed:', tradesErr.message);
  } else {
    console.log('Trades query success. Count:', trades.length);
  }
}

run();
