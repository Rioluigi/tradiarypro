import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

// Admin client utilizing service role key to bypass RLS
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate caller and check if they are an admin
    const cookiesStore = request.cookies;
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookiesStore.getAll();
          },
          setAll() {
            // Read-only
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Admin Trades API GET] Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    // Check caller's role in profiles
    const { data: callerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      console.error('[Admin Trades API GET] Access denied: User is not an admin', profileError);
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Fetch profiles
    const { data: profiles, error: profilesErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email');

    if (profilesErr) throw profilesErr;

    // 3. Fetch trades
    const { data: trades, error: tradesErr } = await supabaseAdmin
      .from('trades')
      .select('*')
      .order('open_time', { ascending: false });

    if (tradesErr) throw tradesErr;

    return NextResponse.json({
      profiles: profiles || [],
      trades: trades || [],
    });
  } catch (error) {
    console.error('[Admin Trades API GET] Uncaught Exception:', error);
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
