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
            // Not modifying cookies in API route, just standard boilerplate
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Admin Overview API] Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    // Check caller's role in profiles
    const { data: callerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      console.error('[Admin Overview API] Access denied: User is not an admin', profileError);
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Fetch stats bypassing RLS
    // totalUsers
    const { count: totalUsers, error: usersErr } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    if (usersErr) throw usersErr;

    // totalTrades
    const { count: totalTrades, error: tradesErr } = await supabaseAdmin
      .from('trades')
      .select('*', { count: 'exact', head: true });
    if (tradesErr) throw tradesErr;

    // activeSubscribers
    const { count: activeSubscribers, error: subErr } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .in('subscription_plan', ['pro', 'enterprise'])
      .eq('subscription_status', 'active');
    if (subErr) throw subErr;

    // monthlyRevenue (hardcoded 0)
    const monthlyRevenue = 0;

    // recentUsers
    const { data: recentUsersData, error: recentErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, created_at, subscription_plan')
      .order('created_at', { ascending: false })
      .limit(5);
    if (recentErr) throw recentErr;

    const recentUsers = await Promise.all(
      (recentUsersData || []).map(async (u) => {
        const { count: uTrades, error: uTradesErr } = await supabaseAdmin
          .from('trades')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', u.id);
        
        if (uTradesErr) {
          console.error(`[Admin Overview API] Error fetching trades count for user ${u.id}:`, uTradesErr);
        }
        
        return {
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          subscription_plan: u.subscription_plan,
          tradesCount: uTrades || 0,
        };
      })
    );

    // chartData (last 7 days trades)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const { data: recentTrades, error: chartErr } = await supabaseAdmin
      .from('trades')
      .select('close_time')
      .gte('close_time', sevenDaysAgo.toISOString())
      .order('close_time', { ascending: true });
    if (chartErr) throw chartErr;

    // Group trades by date
    const dailyMap: { [key: string]: number } = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyMap[dateStr] = 0;
    }

    if (recentTrades) {
      recentTrades.forEach((trade) => {
        if (trade.close_time) {
          const tradeDateStr = new Date(trade.close_time).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
          if (tradeDateStr in dailyMap) {
            dailyMap[tradeDateStr] += 1;
          }
        }
      });
    }

    const chartData = Object.keys(dailyMap).map((date) => ({
      date,
      count: dailyMap[date],
    }));

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      totalTrades: totalTrades || 0,
      activeSubscribers: activeSubscribers || 0,
      monthlyRevenue,
      recentUsers,
      chartData,
    });

  } catch (error) {
    console.error('[Admin Overview API] Uncaught Exception:', error);
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
