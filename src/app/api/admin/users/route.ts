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
      console.error('[Admin Users API GET] Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    // Check caller's role in profiles
    const { data: callerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      console.error('[Admin Users API GET] Access denied: User is not an admin', profileError);
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Parse pagination & search params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const search = (searchParams.get('search') || '').trim();
    const offset = (page - 1) * limit;

    // 3. Build profiles query with optional search filter
    let countQuery = supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    let dataQuery = supabaseAdmin
      .from('profiles')
      .select('id, email, role, is_active, created_at, subscription_plan')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      countQuery = countQuery.ilike('email', `%${search}%`);
      dataQuery = dataQuery.ilike('email', `%${search}%`);
    }

    // Execute count and data queries in parallel
    const [countResult, dataResult] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (countResult.error) throw countResult.error;
    if (dataResult.error) throw dataResult.error;

    const totalCount = countResult.count || 0;
    const profiles = dataResult.data || [];

    // 4. Fetch trade counts ONLY for users on the current page (efficient batch)
    const tradeCounts: { [userId: string]: number } = {};
    if (profiles.length > 0) {
      const userIds = profiles.map((p) => p.id);
      
      // Fetch trade counts in parallel for each user on the page
      await Promise.all(
        userIds.map(async (userId) => {
          const { count, error: countErr } = await supabaseAdmin
            .from('trades')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
            
          if (!countErr) {
            tradeCounts[userId] = count || 0;
          } else {
            tradeCounts[userId] = 0;
          }
        })
      );
    }

    return NextResponse.json({
      profiles,
      tradeCounts,
      totalCount,
      page,
      limit,
    });
  } catch (error) {
    console.error('[Admin Users API GET] Uncaught Exception:', error);
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
      console.error('[Admin Users API] Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    // Check caller's role in profiles
    const { data: callerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      console.error('[Admin Users API] Access denied: User is not an admin', profileError);
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Parse request parameters
    const body = await request.json();
    const { targetUserId, action } = body as { targetUserId: string; action: 'toggle-active' | 'toggle-role' };

    if (!targetUserId || !action) {
      return NextResponse.json({ error: 'Bad Request: Missing targetUserId or action' }, { status: 400 });
    }

    // Safety check: Cannot demote or suspend oneself
    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'Safety Violation: You cannot modify your own administrative account status.' }, { status: 400 });
    }

    // 3. Fetch target user's current status
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('role, is_active, email')
      .eq('id', targetUserId)
      .single();

    if (targetError || !targetProfile) {
      console.error('[Admin Users API] Target user not found:', targetError);
      return NextResponse.json({ error: 'Target user profile not found' }, { status: 404 });
    }

    let updatePayload: Record<string, string | boolean> = {};

    if (action === 'toggle-active') {
      const nextActiveState = !targetProfile.is_active;
      updatePayload = { is_active: nextActiveState };
      console.log(`[Admin Users API] Toggling active status for user ${targetProfile.email} (${targetUserId}) to ${nextActiveState}`);
    } else if (action === 'toggle-role') {
      const nextRole = targetProfile.role === 'admin' ? 'user' : 'admin';
      updatePayload = { role: nextRole };
      console.log(`[Admin Users API] Toggling role for user ${targetProfile.email} (${targetUserId}) to ${nextRole}`);
    } else {
      return NextResponse.json({ error: 'Bad Request: Invalid action' }, { status: 400 });
    }

    // 4. Update database bypassing RLS using admin client
    const { data: updatedData, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updatePayload)
      .eq('id', targetUserId)
      .select()
      .single();

    if (updateError) {
      console.error('[Admin Users API] Error updating user status:', updateError);
      return NextResponse.json({ error: `Update failed: ${updateError.message}` }, { status: 500 });
    }

    console.log(`[Admin Users API] Successfully updated user ${targetProfile.email} (${targetUserId}):`, updatePayload);

    return NextResponse.json({
      success: true,
      message: 'User status updated successfully.',
      profile: updatedData,
    });
  } catch (error) {
    console.error('[Admin Users API] Uncaught Exception:', error);
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
