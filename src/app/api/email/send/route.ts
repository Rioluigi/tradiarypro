import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

// Admin client to query profiles and trades bypassing RLS
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

// Helper to check if caller is an admin
async function isAdmin(request: NextRequest): Promise<boolean> {
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
          // Boilplate, read-only
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, email, userId, token } = body as {
      type: 'welcome' | 'summary' | 'weekly-cron';
      email?: string;
      userId?: string;
      token?: string;
    };

    if (!type) {
      return NextResponse.json({ error: 'Missing email type' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn('[Email API] RESEND_API_KEY environment variable is not defined.');
    }

    // ────────────────────────────────────────────────────────────────
    // 1. WELCOME EMAIL
    // ────────────────────────────────────────────────────────────────
    if (type === 'welcome') {
      if (!email) {
        return NextResponse.json({ error: 'Missing recipient email' }, { status: 400 });
      }

      // Check if user profile exists
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('email', email)
        .single();

      if (!profile) {
        return NextResponse.json({ error: 'User email not found' }, { status: 404 });
      }

      const welcomeHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Tradiary! 🎉</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
            .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px; text-align: center; color: white; }
            .content { padding: 32px; }
            .feature { display: flex; align-items: flex-start; margin-bottom: 20px; }
            .feature-icon { font-size: 20px; margin-right: 12px; margin-top: 2px; }
            .feature-text h3 { margin: 0 0 4px 0; font-size: 16px; color: #0f172a; }
            .feature-text p { margin: 0; font-size: 14px; color: #64748b; line-height: 1.5; }
            .cta-btn { display: inline-block; padding: 12px 28px; background-color: #7c3aed; color: #ffffff !important; font-weight: bold; text-decoration: none; border-radius: 12px; margin-top: 10px; text-align: center; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2); }
            .footer { padding: 20px 32px; background-color: #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Welcome to Tradiary! 🚀</h1>
            </div>
            <div class="content">
              <p style="font-size: 16px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
                Hi <strong>${email}</strong>,
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 28px;">
                Terima kasih telah bergabung dengan <strong>Tradiary</strong> — platform trading journal modern yang dirancang untuk membantu Anda melacak, menganalisis, dan meningkatkan kedisiplinan trading Anda.
              </p>
              
              <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 20px;">Fitur Utama Tradiary:</h2>
              
              <div class="feature">
                <div class="feature-icon">📊</div>
                <div class="feature-text">
                  <h3>MetaTrader 5 Integration</h3>
                  <p>Koneksikan akun trading Anda via Webhook EA dan catat transaksi secara otomatis secara real-time.</p>
                </div>
              </div>

              <div class="feature">
                <div class="feature-icon">📈</div>
                <div class="feature-text">
                  <h3>Interactive Analytics</h3>
                  <p>Visualisasikan win rate, profit factor, best pair returns, dan kurva ekuitas secara mendalam.</p>
                </div>
              </div>

              <div class="feature">
                <div class="feature-icon">🤖</div>
                <div class="feature-text">
                  <h3>Gemini AI Trading Analysis</h3>
                  <p>Dapatkan insights trading otomatis, review per trade, dan feedback asisten psikologi trading harian.</p>
                </div>
              </div>

              <div style="text-align: center; margin-top: 32px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" class="cta-btn">Masuk Ke Dashboard</a>
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Tradiary. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const { data, error } = await resend.emails.send({
        from: 'Tradiary <onboarding@resend.dev>',
        to: email,
        subject: 'Welcome to Tradiary! 🎉',
        html: welcomeHtml,
      });

      if (error) {
        console.error('[Email API] Resend welcome error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Welcome email sent', data });
    }

    // ────────────────────────────────────────────────────────────────
    // 2. MANUAL SUMMARY (ADMIN TRIGGER)
    // ────────────────────────────────────────────────────────────────
    if (type === 'summary') {
      // Security check: must be admin
      const callerIsAdmin = await isAdmin(request);
      if (!callerIsAdmin) {
        return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
      }

      if (!userId || !email) {
        return NextResponse.json({ error: 'Missing target user ID or email' }, { status: 400 });
      }

      // Fetch trades for last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: trades, error: tradesError } = await supabaseAdmin
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .gte('close_time', sevenDaysAgo);

      if (tradesError) {
        return NextResponse.json({ error: 'Failed to fetch user trades' }, { status: 500 });
      }

      // Calculate stats
      const totalTrades = trades?.length || 0;
      let profitLoss = 0;
      let winningTrades = 0;
      let bestTrade: { symbol: string; profit: number } | null = null;

      if (trades && totalTrades > 0) {
        for (const t of trades) {
          profitLoss += Number(t.profit);
          if (Number(t.profit) > 0) {
            winningTrades++;
            if (!bestTrade || Number(t.profit) > bestTrade.profit) {
              bestTrade = { symbol: String(t.symbol), profit: Number(t.profit) };
            }
          }
        }
      }

      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

      const summaryHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Your Weekly Trading Summary</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
            .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { background: #0d0d1a; padding: 24px; text-align: center; color: white; border-bottom: 2px solid #7c3aed; }
            .content { padding: 32px; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 16px; margin: 24px 0; }
            .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; }
            .stat-val { font-size: 20px; font-weight: 800; margin-top: 4px; }
            .stat-label { font-size: 11px; text-transform: uppercase; tracking-spacing: 0.5px; color: #64748b; font-weight: 600; }
            .cta-btn { display: inline-block; padding: 12px 28px; background-color: #7c3aed; color: #ffffff !important; font-weight: bold; text-decoration: none; border-radius: 12px; margin-top: 20px; text-align: center; }
            .footer { padding: 20px 32px; background-color: #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #7c3aed;">Weekly Trading Summary</h1>
            </div>
            <div class="content">
              <p style="font-size: 15px; color: #334155;">Hi <strong>${email}</strong>,</p>
              <p style="font-size: 14px; color: #64748b;">Berikut adalah rangkuman performa trading Anda selama 7 hari terakhir:</p>
              
              <div class="grid">
                <div class="stat-box">
                  <div class="stat-label">Total Trades</div>
                  <div class="stat-val" style="color: #0f172a;">${totalTrades}</div>
                </div>
                <div class="stat-box">
                  <div class="stat-label">Win Rate</div>
                  <div class="stat-val" style="color: ${winRate >= 50 ? '#10b981' : '#f59e0b'};">${winRate.toFixed(1)}%</div>
                </div>
                <div class="stat-box">
                  <div class="stat-label">Total Net Profit/Loss</div>
                  <div class="stat-val" style="color: ${profitLoss >= 0 ? '#10b981' : '#ef4444'};">$${profitLoss.toFixed(2)}</div>
                </div>
                <div class="stat-box">
                  <div class="stat-label">Best Trade</div>
                  <div class="stat-val" style="color: #10b981; font-size: 14px; line-height: 1.5; margin-top: 8px;">
                    ${bestTrade ? `${bestTrade.symbol} ($${Number(bestTrade.profit).toFixed(2)})` : 'N/A'}
                  </div>
                </div>
              </div>

              <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
                Tetap disiplin, evaluasi jurnal trading Anda secara rutin di Tradiary, dan gunakan asisten AI kami untuk review performa trading Anda yang lebih mendalam.
              </p>

              <div style="text-align: center; margin-top: 16px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" class="cta-btn">Ke Jurnal Trading</a>
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Tradiary. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const { data, error } = await resend.emails.send({
        from: 'Tradiary Summary <weekly@resend.dev>',
        to: email,
        subject: 'Your Weekly Trading Summary',
        html: summaryHtml,
      });

      if (error) {
        console.error('[Email API] Resend manual summary error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Summary email sent', data });
    }

    // ────────────────────────────────────────────────────────────────
    // 3. WEEKLY CRON JOB (SEND TO ALL USERS EVERY MONDAY)
    // ────────────────────────────────────────────────────────────────
    if (type === 'weekly-cron') {
      // Validate Cron Token to protect endpoint
      const cronSecret = process.env.CRON_SECRET || 'weekly-secret-token';
      if (token !== cronSecret) {
        return NextResponse.json({ error: 'Forbidden: Invalid token' }, { status: 403 });
      }

      // Fetch all active profiles
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, email, is_active')
        .eq('is_active', true);

      if (profilesError || !profiles) {
        return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
      }

      const results = [];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      for (const profile of profiles) {
        const { data: trades } = await supabaseAdmin
          .from('trades')
          .select('*')
          .eq('user_id', profile.id)
          .gte('close_time', sevenDaysAgo);

        const totalTrades = trades?.length || 0;
        let profitLoss = 0;
        let winningTrades = 0;
        let bestTrade: { symbol: string; profit: number } | null = null;

        if (trades && totalTrades > 0) {
          for (const t of trades) {
            profitLoss += Number(t.profit);
            if (Number(t.profit) > 0) {
              winningTrades++;
              if (!bestTrade || Number(t.profit) > bestTrade.profit) {
                bestTrade = { symbol: String(t.symbol), profit: Number(t.profit) };
              }
            }
          }
        }

        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

        const summaryHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Your Weekly Trading Summary</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
              .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
              .header { background: #0d0d1a; padding: 24px; text-align: center; color: white; border-bottom: 2px solid #7c3aed; }
              .content { padding: 32px; }
              .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 16px; margin: 24px 0; }
              .stat-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; }
              .stat-val { font-size: 20px; font-weight: 800; margin-top: 4px; }
              .stat-label { font-size: 11px; text-transform: uppercase; tracking-spacing: 0.5px; color: #64748b; font-weight: 600; }
              .cta-btn { display: inline-block; padding: 12px 28px; background-color: #7c3aed; color: #ffffff !important; font-weight: bold; text-decoration: none; border-radius: 12px; margin-top: 20px; text-align: center; }
              .footer { padding: 20px 32px; background-color: #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #7c3aed;">Weekly Trading Summary</h1>
              </div>
              <div class="content">
                <p style="font-size: 15px; color: #334155;">Hi <strong>${profile.email}</strong>,</p>
                <p style="font-size: 14px; color: #64748b;">Berikut adalah rangkuman performa trading Anda selama 7 hari terakhir:</p>
                
                <div class="grid">
                  <div class="stat-box">
                    <div class="stat-label">Total Trades</div>
                    <div class="stat-val" style="color: #0f172a;">${totalTrades}</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-label">Win Rate</div>
                    <div class="stat-val" style="color: ${winRate >= 50 ? '#10b981' : '#f59e0b'};">${winRate.toFixed(1)}%</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-label">Total Net Profit/Loss</div>
                    <div class="stat-val" style="color: ${profitLoss >= 0 ? '#10b981' : '#ef4444'};">$${profitLoss.toFixed(2)}</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-label">Best Trade</div>
                    <div class="stat-val" style="color: #10b981; font-size: 14px; line-height: 1.5; margin-top: 8px;">
                      ${bestTrade ? `${bestTrade.symbol} ($${Number(bestTrade.profit).toFixed(2)})` : 'N/A'}
                    </div>
                  </div>
                </div>

                <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
                  Tetap disiplin, evaluasi jurnal trading Anda secara rutin di Tradiary, dan gunakan asisten AI kami untuk review performa trading Anda yang lebih mendalam.
                </p>

                <div style="text-align: center; margin-top: 16px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" class="cta-btn">Ke Jurnal Trading</a>
                </div>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} Tradiary. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        try {
          const { error } = await resend.emails.send({
            from: 'Tradiary Summary <weekly@resend.dev>',
            to: profile.email,
            subject: 'Your Weekly Trading Summary',
            html: summaryHtml,
          });
          
          results.push({ email: profile.email, success: !error, error: error?.message || null });
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan';
          results.push({ email: profile.email, success: false, error: errMsg });
        }
      }

      return NextResponse.json({ success: true, processed: results.length, details: results });
    }

    return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Email API] Unexpected error:', err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
