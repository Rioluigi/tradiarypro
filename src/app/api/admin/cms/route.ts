import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
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
            // Not modifying cookies, standard boilerplate
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Admin CMS API] Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    // Check caller's role in profiles
    const { data: callerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      console.error('[Admin CMS API] Access denied: User is not an admin', profileError);
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Parse payload settings
    const body = await request.json();
    const { settings } = body as { settings: Record<string, string> };

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Bad Request: Missing or invalid settings object' }, { status: 400 });
    }

    // 3. Compile upsert payload
    const upsertData = Object.entries(settings).map(([key, value]) => ({
      key,
      value: String(value),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }));

    console.log(`[Admin CMS API] Saving ${upsertData.length} entries to cms_content...`);

    // 4. Update Supabase bypassing RLS using admin client
    const { error: upsertError } = await supabaseAdmin
      .from('cms_content')
      .upsert(upsertData, { onConflict: 'key' });

    if (upsertError) {
      console.error('[Admin CMS API] Upsert failed:', upsertError);
      return NextResponse.json({ error: `Save failed: ${upsertError.message}` }, { status: 500 });
    }

    console.log('[Admin CMS API] Successfully published settings changes.');

    try {
      revalidatePath('/');
      revalidatePath('/pricing');
      console.log('[Admin CMS API] Revalidated paths: / and /pricing');
    } catch (revalErr) {
      console.warn('[Admin CMS API] Failed to revalidate paths:', revalErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Changes published successfully',
    });
  } catch (error) {
    console.error('[Admin CMS API] Uncaught Exception:', error);
    const msg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
