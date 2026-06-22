import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerClient } from '@supabase/ssr';

interface ChatMessage {
  role: 'user' | 'model' | 'system';
  parts: { text: string }[];
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
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
      console.warn('[AI Chat API] GEMINI_API_KEY environment variable is not defined.');
      return NextResponse.json({ error: 'AI configuration key missing.' }, { status: 500 });
    }

    // 2. Parse payload
    const body = await request.json();
    const { messages } = body as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid chat messages history' }, { status: 400 });
    }

    // Filter out system messages so they are not sent in history
    const cleanMessages = messages.filter((m) => m.role !== 'system');

    // Remove first message if role is 'model' to ensure history starts with 'user'
    while (cleanMessages.length > 0 && cleanMessages[0].role === 'model') {
      cleanMessages.shift();
    }

    if (cleanMessages.length === 0) {
      return NextResponse.json({ error: 'No valid chat messages history remaining' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);

    const systemInstruction = 
      'Kamu adalah Tradiary AI Assistant, asisten trading dan customer service resmi untuk platform Tradiary.\n' +
      'Kamu memiliki pengetahuan lengkap tentang fitur-fitur Tradiary berikut ini. SELALU jawab berdasarkan daftar fitur ini dan JANGAN pernah mengatakan suatu fitur tidak tersedia jika ada dalam daftar berikut:\n' +
      '- **Dashboard**: Menyajikan gambaran umum statistik trading (overview stats) dan grafik kurva ekuitas (equity curve).\n' +
      '- **Trade History (Riwayat Transaksi)**: Dilengkapi fitur penyaringan (filter), ekspor data ke format CSV dan PDF, serta fitur hapus transaksi (delete trade) dengan modal konfirmasi keamanan.\n' +
      '- **Analytics (Analisis)**: Menyediakan grafik performa trading serta wawasan analisis bertenaga AI (AI Trading Insights).\n' +
      '- **Calculator (Kalkulator Risiko)**: Membantu perhitungan ukuran posisi dan manajemen risiko (risk calculator).\n' +
      '- **Calendar (Kalender Trading)**: Visualisasi kalender harian untuk melacak aktivitas dan performa trading dari waktu ke waktu.\n' +
      '- **Trading Journal AI**: Pencatatan harian jurnal trading (journal notes, strategy tag, rating, screenshot chart) disertai feedback analisis AI otomatis.\n' +
      '- **Notifikasi In-App**: Pemberitahuan langsung di dalam aplikasi (seperti alert penambahan trade baru, pencapaian keuntungan besar / big win, dan alert rasio kemenangan / win rate alert).\n' +
      '- **Multi-Currency Support**: Mendukung berbagai mata uang akun secara dinamis (USD, IDR, EUR, GBP, JPY, AUD, CAD, CHF, SGD, MYR) dengan konversi kurs real-time.\n' +
      '- **Admin Panel**: Akses eksklusif untuk administrator untuk mengelola pengguna (manage users), memantau transaksi platform (monitor trades dengan breakdown mata uang), dan mempublikasikan teks/konten via CMS Editor.\n\n' +
      'Aturan Penting:\n' +
      '1. Jawab HANYA pertanyaan seputar fitur Tradiary, analisis/strategi trading, manajemen risiko, psikologi trading, dan edukasi umum trading (forex, saham, crypto).\n' +
      '2. Tolak dengan sopan pertanyaan di luar topik tersebut dan arahkan kembali ke topik trading/Tradiary.\n' +
      '3. SELALU jawab dalam Bahasa Indonesia yang profesional, ramah, singkat, jelas, dan actionable.';

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction: systemInstruction,
    });
 
    // 3. Format history for startChat (excluding the latest user message)
    // Gemini startChat history expects format: { role: 'user' | 'model', parts: [{ text: string }] }[]
    const history = cleanMessages.slice(0, cleanMessages.length - 1).map((m) => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: m.parts,
    }));
 
    const lastMessage = cleanMessages[cleanMessages.length - 1].parts[0].text;
 
    // 4. Start chat session and send message
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage);
    const responseText = result.response.text();
 
    return NextResponse.json({ text: responseText });
 
  } catch (err: unknown) {
    console.error('[AI Chat API] Unexpected error:', err);
    
    let friendlyMessage = 'Maaf, terjadi kendala teknis. Tim kami akan segera memperbaikinya.';
    let isServiceUnavailable = false;

    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      // Detect 503 Service Unavailable, overloaded, or typical timeout/gateway errors
      if (
        msg.includes('503') || 
        msg.includes('service unavailable') || 
        msg.includes('overload') || 
        msg.includes('timeout') || 
        msg.includes('deadline exceeded')
      ) {
        isServiceUnavailable = true;
      }
    }

    if (isServiceUnavailable) {
      friendlyMessage = 'Maaf, asisten AI sedang mengalami gangguan sementara. Silakan coba lagi dalam beberapa saat. Jika masalah berlanjut, Anda tetap bisa mengakses semua fitur trading journal seperti biasa.';
    }

    return NextResponse.json({ error: friendlyMessage }, { status: isServiceUnavailable ? 503 : 500 });
  }
}
