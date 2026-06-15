import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerClient } from '@supabase/ssr';

interface TradePayload {
  symbol: string;
  type: string;
  profit: number;
  volume: number;
  open_time: string;
  close_time: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user first
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.warn('[AI API] GEMINI_API_KEY environment variable is not defined.');
      return NextResponse.json({ error: 'AI Service key configuration missing. Please check env variables.' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);

    const body = await request.json();
    const { type, trades, trade, content } = body as {
      type: 'insight' | 'review' | 'journal';
      trades?: TradePayload[];
      trade?: Record<string, unknown>;
      content?: string;
    };

    if (!type) {
      return NextResponse.json({ error: 'Missing analysis type' }, { status: 400 });
    }

    // ────────────────────────────────────────────────────────────────
    // 1. TRADE INSIGHTS
    // ────────────────────────────────────────────────────────────────
    if (type === 'insight') {
      if (!trades || !Array.isArray(trades) || trades.length === 0) {
        return NextResponse.json({ error: 'Anda harus memiliki minimal 1 transaksi untuk dianalisis.' }, { status: 400 });
      }

      const cleanTrades = trades.map((t) => ({
        symbol: t.symbol,
        type: t.type,
        profit: t.profit,
        volume: t.volume,
        open_time: t.open_time,
        close_time: t.close_time,
      }));

      const prompt = `Anda adalah AI Analis Trading Profesional untuk platform Tradiary.
Tugas Anda adalah menganalisis data riwayat trading pengguna berikut dan memberikan analisis mendalam dalam Bahasa Indonesia.

Data Trading Pengguna:
${JSON.stringify(cleanTrades, null, 2)}

Harap berikan respon Anda dalam format JSON terstruktur dengan kunci berikut (Pastikan respon Anda HANYA berupa JSON valid, jangan tambahkan pembuka markdown \`\`\`json atau penjelas lainnya):
{
  "strengths": ["daftar kekuatan berdasarkan pola trading, waktu terbaik, atau profit tertinggi"],
  "weaknesses": ["daftar kelemahan/risiko yang terlihat dari data"],
  "recommendations": ["saran taktis konkret untuk meningkatkan performa trading"]
}

Fokuskan pada:
- Pola jam trading yang menghasilkan profit tertinggi vs loss terbesar.
- Pasangan simbol mata uang (currency pairs) terkuat.
- Konsistensi ukuran lot (volume) dan saran perbaikan.`;

      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-lite',
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      try {
        const jsonResult = JSON.parse(responseText || '{}');
        return NextResponse.json(jsonResult);
      } catch (err) {
        console.error('[AI API] Insight parse error. Raw text:', responseText, err);
        // Fallback if parsing fails
        return NextResponse.json({
          strengths: ['Berhasil menyelesaikan analisis trading secara keseluruhan.'],
          weaknesses: ['Gagal melakukan parsing detail JSON.'],
          recommendations: ['Silakan ulangi permintaan analisis beberapa saat lagi.'],
          raw: responseText,
        });
      }
    }

    // ────────────────────────────────────────────────────────────────
    // 2. SINGLE TRADE REVIEW
    // ────────────────────────────────────────────────────────────────
    if (type === 'review') {
      if (!trade) {
        return NextResponse.json({ error: 'Missing trade details' }, { status: 400 });
      }

      const prompt = `Anda adalah AI Analis Trading Profesional untuk platform Tradiary.
Tugas Anda adalah me-review satu transaksi trading berikut dan memberikan analisis mendalam dalam Bahasa Indonesia.

Detail Transaksi:
${JSON.stringify(trade, null, 2)}

Harap berikan respon Anda dalam format JSON terstruktur dengan kunci berikut (Pastikan respon Anda HANYA berupa JSON valid, jangan tambahkan pembuka markdown atau penjelas lainnya):
{
  "entryExitEvaluation": "evaluasi performa titik entry dan exit berdasarkan arah transaksi (BUY/SELL) dan pergerakan harga",
  "riskRewardEvaluation": "evaluasi ratio profit dibandingkan lot dan parameter transaksi",
  "suggestions": "saran konkret untuk transaksi sejenis di masa depan"
}

Respon harus dalam Bahasa Indonesia.`;

      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-lite',
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      try {
        const jsonResult = JSON.parse(responseText || '{}');
        return NextResponse.json(jsonResult);
      } catch (err) {
        console.error('[AI API] Review parse error. Raw text:', responseText, err);
        return NextResponse.json({
          entryExitEvaluation: 'Evaluasi titik masuk/keluar terhambat kesalahan format respon.',
          riskRewardEvaluation: 'Evaluasi rasio risiko terhambat kesalahan format respon.',
          suggestions: 'Ulangi review untuk melihat rekomendasi.',
          raw: responseText,
        });
      }
    }

    // ────────────────────────────────────────────────────────────────
    // 3. DAILY JOURNAL PROMPT / COACH FEEDBACK
    // ────────────────────────────────────────────────────────────────
    if (type === 'journal') {
      if (!content || !content.trim()) {
        return NextResponse.json({ error: 'Missing journal content' }, { status: 400 });
      }

      const prompt = `Anda adalah AI Trading Coach & Psikolog Trading profesional untuk platform Tradiary.
Pengguna menulis catatan jurnal trading harian berikut:
"${content}"

Berikan respon sebagai coach yang memotivasi, memberikan feedback konstruktif berdasarkan aspek psikologis trading (disiplin, emosi, manajemen risiko), serta memberikan pertanyaan reflektif untuk membantunya belajar.
Tanggapan harus dalam Bahasa Indonesia yang santun, profesional, dan interaktif.
Format keluaran Anda dalam Markdown polos dengan struktur/bagian yang jelas:
1. **Feedback Analisis**
2. **Pertanyaan Refleksi**
3. **Motivasi Harian**`;

      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-lite',
      });

      const result = await model.generateContent(prompt);
      return NextResponse.json({ response: result.response.text() });
    }

    return NextResponse.json({ error: 'Invalid analysis type' }, { status: 400 });

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[AI API] Unexpected error:', err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
