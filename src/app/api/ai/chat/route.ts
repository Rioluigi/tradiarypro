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
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: 'Kamu adalah Tradiary AI Assistant, customer service dan asisten trading resmi Tradiary. Kamu HANYA boleh menjawab pertanyaan seputar:\n1. Fitur dan cara penggunaan Tradiary\n2. Analisis dan strategi trading\n3. Manajemen risiko dan psikologi trading\n4. Pertanyaan umum tentang trading forex, saham, crypto\n\nJika ditanya diluar topik tersebut, tolak dengan sopan dan arahkan kembali ke topik trading atau fitur Tradiary.\nJawab dalam Bahasa Indonesia. Singkat, jelas, dan actionable.',
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
    const errMsg = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[AI Chat API] Unexpected error:', err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
