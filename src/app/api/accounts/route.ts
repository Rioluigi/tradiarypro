import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const controller = new AbortController();
  // Set an 8-second timeout for the Supabase query
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const body = await req.json();
    const { user_id, account_number, broker, platform, currency, label } = body;

    if (!user_id || !account_number || !broker) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('[POST /api/accounts] Inserting account for user:', user_id, 'Account:', account_number);

    const insertPromise = supabaseAdmin
      .from('accounts')
      .insert([
        {
          user_id,
          account_number,
          broker,
          platform,
          currency,
          label: label || null,
          balance: 0.00,
          is_active: true
        }
      ])
      .select()
      .single();

    const insertResult = await Promise.race([
      insertPromise,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 8000);
      })
    ]);

    clearTimeout(timeoutId);

    const { data, error } = insertResult;

    if (error) {
      console.error('[POST /api/accounts] DB Error:', error);
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    console.log('[POST /api/accounts] Successfully inserted account:', data.id);
    return NextResponse.json({ data }, { status: 200 });

  } catch (error: unknown) {
    clearTimeout(timeoutId);
    console.error('[POST /api/accounts] Catch Error:', error);
    
    if (error instanceof Error && error.message === 'TIMEOUT') {
      return NextResponse.json({ error: 'Request timed out waiting for database' }, { status: 504 });
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
