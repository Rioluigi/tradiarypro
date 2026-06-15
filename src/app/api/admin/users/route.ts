import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

// Admin client utilizing service role key to bypass RLS
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
