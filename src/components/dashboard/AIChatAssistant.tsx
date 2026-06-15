'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Loader2, 
  Sparkles, 
  Brain, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  History,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Trade } from '@/types/trade';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface JournalEntry {
  id: string;
  user_id: string;
  content: string;
  ai_response: string | null;
  created_at: string;
}

interface AIChatAssistantProps {
  userId: string;
}

export default function AIChatAssistant({ userId }: AIChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'journal' | 'insights'>('chat');
  
  // AI Insights State
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<{
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } | null>(null);
  
  // Chat Bebas State
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: 'Halo! Saya Tradiary AI Assistant. Ada yang bisa saya bantu terkait performa trading, strategi, psikologi, atau manajemen risiko Anda hari ini?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Journal State
  const [journalInput, setJournalInput] = useState('');
  const [journalAiResponse, setJournalAiResponse] = useState('');
  const [isJournalAnalyzing, setIsJournalAnalyzing] = useState(false);
  const [pastJournals, setPastJournals] = useState<JournalEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedJournalId, setExpandedJournalId] = useState<string | null>(null);
  const [journalError, setJournalError] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchPastJournals = async () => {
    if (!userId) return;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setPastJournals(data);
      }
    } catch (err) {
      console.error('Error fetching past journals:', err);
    }
  };

  useEffect(() => {
    if (userId && isOpen && activeTab === 'journal') {
      fetchPastJournals();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isOpen, activeTab]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessageText = input.trim();
    setInput('');

    // Append user message
    const updatedMessages: Message[] = [...messages, { role: 'user', text: userMessageText }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      // Map to Gemini expected format
      const payloadMessages = updatedMessages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan pada asisten AI.');
      }

      setMessages((prev) => [...prev, { role: 'model', text: data.text }]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Koneksi ke AI terputus.';
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: `Maaf, terjadi kesalahan: ${errMsg}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeJournal = async () => {
    if (!journalInput.trim() || isJournalAnalyzing) return;
    setIsJournalAnalyzing(true);
    setJournalAiResponse('');
    setJournalError(null);
    try {
      console.log('Sending journal content for AI analysis:', journalInput);
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'journal',
          content: journalInput,
        }),
      });
      const data = await res.json();
      console.log('Received journal analysis response:', data);
      
      if (!res.ok) {
        setJournalError(data.error || 'Terjadi kesalahan saat menghubungi AI.');
        return;
      }
      
      const responseText = data.response;
      setJournalAiResponse(responseText);

      if (data.warning) {
        setJournalError(data.warning);
      }
      
      setJournalInput('');
      fetchPastJournals();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      console.error('Error in journal submission:', err);
      setJournalError(`Gagal menganalisis jurnal: ${errMsg}`);
    } finally {
      setIsJournalAnalyzing(false);
    }
  };

  const fetchTrades = async () => {
    setLoadingTrades(true);
    setInsightError(null);
    try {
      const supabase = createClient();
      
      // Get current session to ensure user session is active
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(`Gagal memverifikasi sesi: ${sessionError.message}`);
      }
      if (!session) {
        throw new Error('Sesi pengguna tidak aktif. Silakan login kembali.');
      }

      const activeUserId = session.user.id || userId;
      if (!activeUserId) {
        throw new Error('User ID tidak ditemukan.');
      }

      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', activeUserId)
        .order('close_time', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setTrades((data as Trade[]) || []);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data trade.';
      console.error('Error fetching trades for insights:', err);
      setInsightError(errMsg);
    } finally {
      setLoadingTrades(false);
    }
  };

  const handleGetInsights = async () => {
    if (trades.length === 0 || isAnalyzing) return;
    setIsAnalyzing(true);
    setInsights(null);
    setInsightError(null);
    try {
      console.log('Sending trades data for AI insights:', trades);
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'insight',
          trades: trades,
        }),
      });
      const data = await res.json();
      console.log('Received AI insights response:', data);
      
      if (!res.ok) {
        setInsightError(data.error || 'Gagal mengambil insight AI.');
        return;
      }
      setInsights(data);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      console.error('Error fetching AI insights:', err);
      setInsightError(`Gagal menganalisis trade: ${errMsg}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center text-white cursor-pointer shadow-xl transition-all duration-300 active:scale-[0.95]",
          isOpen 
            ? "bg-[#7c3aed] border border-purple-500 hover:bg-purple-600 shadow-purple-600/30 rotate-90" 
            : "bg-[#7c3aed] border border-purple-500 hover:bg-purple-500 shadow-purple-600/30 hover:shadow-purple-600/40"
        )}
        title="Tradiary AI Assistant"
      >
        {isOpen ? <X size={20} /> : <Bot size={20} className="animate-pulse" />}
      </button>

      {/* Chat Popup */}
      <div
        className={cn(
          "fixed bottom-20 right-6 z-40 w-[350px] sm:w-[400px] h-[480px] max-h-[75vh] max-w-[calc(100vw-2rem)]",
          "bg-[#0d0d1a]/95 backdrop-blur-xl border border-purple-500/20 rounded-2xl shadow-2xl shadow-black/30",
          "flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right",
          isOpen 
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" 
            : "opacity-0 translate-y-4 scale-95 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-purple-500/10 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
              <Sparkles size={16} />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
                Tradiary AI Assistant
              </h4>
              <p className="text-[10px] text-slate-500 font-medium">
                Powered by Gemini
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-purple-500/10 bg-[#0d0d1a]/80">
          <button
            onClick={() => setActiveTab('chat')}
            className={cn(
              "flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors",
              activeTab === 'chat'
                ? "border-purple-500 text-purple-400 bg-purple-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/10"
            )}
          >
            Chat Bebas
          </button>
          <button
            onClick={() => {
              setActiveTab('journal');
              fetchPastJournals();
            }}
            className={cn(
              "flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors",
              activeTab === 'journal'
                ? "border-purple-500 text-purple-400 bg-purple-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/10"
            )}
          >
            Journal Hari Ini
          </button>
          <button
            onClick={() => {
              setActiveTab('insights');
              fetchTrades();
            }}
            className={cn(
              "flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors",
              activeTab === 'insights'
                ? "border-purple-500 text-purple-400 bg-purple-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/10"
            )}
          >
            AI Insights
          </button>
        </div>

        {/* Messages Feed / Journal Content */}
        {activeTab === 'chat' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#080811]/30">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex w-full",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] text-xs px-3.5 py-2.5 rounded-2xl leading-relaxed font-medium break-words",
                    msg.role === 'user'
                      ? "bg-purple-600 text-white rounded-tr-none shadow-md shadow-purple-600/10"
                      : "bg-slate-800/80 text-slate-200 border border-slate-800 rounded-tl-none"
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex w-full justify-start animate-pulse">
                <div className="bg-slate-800/80 text-slate-400 text-xs px-3.5 py-2.5 rounded-2xl rounded-tl-none border border-slate-800 flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin text-purple-400" />
                  <span>AI sedang berpikir...</span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#080811]/30 scrollbar-thin scrollbar-thumb-purple-900/20">
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Catatan Jurnal Hari Ini
                </label>
                <textarea
                  value={journalInput}
                  onChange={(e) => setJournalInput(e.target.value)}
                  disabled={isJournalAnalyzing}
                  placeholder="Tulis emosi, kedisiplinan, manajemen risiko, atau setup menarik Anda hari ini..."
                  className="w-full min-h-[90px] p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/40 focus:border-purple-500/40 transition-all resize-none disabled:opacity-50"
                />
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => {
                    setShowHistory(!showHistory);
                    if (!showHistory) fetchPastJournals();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-850 text-slate-400 hover:text-slate-200 text-[10px] font-extrabold transition-all"
                >
                  <History size={12} />
                  {showHistory ? 'Sembunyikan Riwayat' : 'Riwayat Jurnal'}
                </button>

                <button
                  onClick={handleAnalyzeJournal}
                  disabled={isJournalAnalyzing || !journalInput.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold transition-all shadow-md shadow-purple-600/15 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {isJournalAnalyzing ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Menganalisis...
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} />
                      Analisis Jurnal
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI Loading State */}
            {isJournalAnalyzing && (
              <div className="flex flex-col items-center justify-center p-6 space-y-2.5 bg-purple-950/5 border border-purple-500/10 rounded-xl animate-pulse text-center">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                <p className="text-xs font-bold text-purple-300">AI sedang memproses catatan...</p>
                <p className="text-[10px] text-slate-500">Mengevaluasi aspek emosi, kedisiplinan, dan motivasi.</p>
              </div>
            )}

            {/* Error State */}
            {journalError && (
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-xs font-semibold leading-relaxed animate-fade-in flex items-start gap-2">
                <span className="flex-shrink-0">⚠️</span>
                <span>{journalError}</span>
              </div>
            )}

            {/* AI Response Display */}
            {journalAiResponse && !isJournalAnalyzing && (
              <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-950/10 shadow-inner space-y-2 animate-fade-in">
                <div className="flex items-center gap-1.5 text-purple-400">
                  <Brain size={14} />
                  <h4 className="text-[10px] font-bold uppercase tracking-wider">Feedback AI Coach</h4>
                </div>
                <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-medium">
                  {journalAiResponse}
                </div>
              </div>
            )}

            {/* History List */}
            {showHistory && (
              <div className="border-t border-purple-500/10 pt-4 space-y-3 animate-fade-in">
                <div className="flex items-center gap-1.5 text-slate-400 mb-2">
                  <BookOpen size={14} />
                  <h4 className="text-[10px] font-bold uppercase tracking-wider">Riwayat Jurnal</h4>
                </div>

                {pastJournals.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">Belum ada catatan jurnal harian.</p>
                ) : (
                  <div className="space-y-2.5">
                    {pastJournals.map((entry) => {
                      const isExpanded = expandedJournalId === entry.id;
                      return (
                        <div 
                          key={entry.id} 
                          className="rounded-lg border border-slate-800/40 bg-slate-900/20 overflow-hidden transition-all duration-200"
                        >
                          <div 
                            onClick={() => setExpandedJournalId(isExpanded ? null : entry.id)}
                            className="p-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-800/20 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] text-slate-500 font-bold">
                                {new Date(entry.created_at).toLocaleDateString('id-ID', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                              <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
                                {entry.content}
                              </p>
                            </div>
                            <div className="text-slate-500 flex-shrink-0">
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-3 pb-3 border-t border-slate-850 pt-2.5 space-y-2.5 bg-slate-900/40">
                              <div>
                                <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">Catatan Anda:</span>
                                <p className="text-xs text-slate-300 mt-0.5 italic">&ldquo;{entry.content}&rdquo;</p>
                              </div>
                              {entry.ai_response && (
                                <div className="pt-2 border-t border-slate-800/20">
                                  <span className="text-[9px] uppercase font-extrabold text-purple-400 tracking-wider flex items-center gap-1">
                                    <Brain size={11} /> Feedback AI Coach:
                                  </span>
                                  <p className="text-xs text-slate-300 mt-0.5 whitespace-pre-wrap leading-relaxed">
                                    {entry.ai_response}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#080811]/30 scrollbar-thin scrollbar-thumb-purple-900/20">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Brain size={14} className="text-purple-400" />
                    AI Trading Insights
                  </h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Analisis performa & rekomendasi Gemini
                  </p>
                </div>
                
                <button
                  onClick={handleGetInsights}
                  disabled={isAnalyzing || trades.length === 0 || loadingTrades}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-extrabold transition-all shadow-md shadow-purple-600/15 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Menganalisis...
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} />
                      Analisis Trade
                    </>
                  )}
                </button>
              </div>

              {loadingTrades && (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2">
                  <Loader2 size={20} className="text-purple-500 animate-spin" />
                  <span className="text-[10px]">Loading transactions...</span>
                </div>
              )}

              {!loadingTrades && trades.length === 0 && (
                <div className="text-center py-10 px-4 rounded-xl border border-slate-800 bg-slate-900/20">
                  <p className="text-xs text-slate-400 font-semibold">Belum ada data trades untuk dianalisis</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Hubungkan MT4/MT5 atau catat transaksi Anda terlebih dahulu.
                  </p>
                </div>
              )}

              {/* AI Loading State */}
              {isAnalyzing && (
                <div className="flex flex-col items-center justify-center py-8 space-y-2 bg-purple-950/5 border border-purple-500/10 rounded-xl animate-pulse text-center">
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  <p className="text-xs font-bold text-purple-300">AI sedang memproses transaksi Anda...</p>
                  <p className="text-[10px] text-slate-500">Mengkaji pola instrumen, win-rate, dan setup.</p>
                </div>
              )}

              {/* Error State */}
              {insightError && (
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-xs font-semibold leading-relaxed animate-fade-in flex items-start gap-2">
                  <span className="flex-shrink-0">⚠️</span>
                  <span>{insightError}</span>
                </div>
              )}

              {/* AI Results Display */}
              {insights && !isAnalyzing && (
                <div className="space-y-3 pt-1 animate-fade-in">
                  {/* Strengths */}
                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-emerald-400 border-b border-emerald-500/10 pb-1.5">
                      <TrendingUp size={14} />
                      <h4 className="text-[10px] font-bold uppercase tracking-wider">Kekuatan (Strengths)</h4>
                    </div>
                    <ul className="space-y-1.5">
                      {insights.strengths && Array.isArray(insights.strengths) ? (
                        insights.strengths.map((item, idx) => (
                          <li key={idx} className="text-[11px] text-slate-350 flex items-start gap-1.5 leading-relaxed">
                            <span className="text-emerald-400 flex-shrink-0">✓</span>
                            <span>{item}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-[11px] text-slate-500">Tidak ada data kekuatan.</li>
                      )}
                    </ul>
                  </div>

                  {/* Weaknesses */}
                  <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-red-400 border-b border-red-500/10 pb-1.5">
                      <AlertTriangle size={14} />
                      <h4 className="text-[10px] font-bold uppercase tracking-wider">Kelemahan (Weaknesses)</h4>
                    </div>
                    <ul className="space-y-1.5">
                      {insights.weaknesses && Array.isArray(insights.weaknesses) ? (
                        insights.weaknesses.map((item, idx) => (
                          <li key={idx} className="text-[11px] text-slate-350 flex items-start gap-1.5 leading-relaxed">
                            <span className="text-red-400 flex-shrink-0">⚠️</span>
                            <span>{item}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-[11px] text-slate-500">Tidak ada data kelemahan.</li>
                      )}
                    </ul>
                  </div>

                  {/* Recommendations */}
                  <div className="rounded-xl border border-purple-500/25 bg-purple-500/5 p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-purple-400 border-b border-purple-500/10 pb-1.5">
                      <Sparkles size={14} />
                      <h4 className="text-[10px] font-bold uppercase tracking-wider">Rekomendasi</h4>
                    </div>
                    <ul className="space-y-1.5">
                      {insights.recommendations && Array.isArray(insights.recommendations) ? (
                        insights.recommendations.map((item, idx) => (
                          <li key={idx} className="text-[11px] text-slate-350 flex items-start gap-1.5 leading-relaxed">
                            <span className="text-purple-400 flex-shrink-0">✦</span>
                            <span>{item}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-[11px] text-slate-500">Tidak ada rekomendasi.</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input Form for Chat tab */}
        {activeTab === 'chat' && (
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-purple-500/10 bg-slate-900/40 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="Tanyakan analisis, psikologi, atau strategi..."
              className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/40 focus:border-purple-500/40 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={cn(
                "w-8.5 h-8.5 rounded-xl flex items-center justify-center transition-all duration-200",
                "bg-purple-600 text-white hover:bg-purple-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              <Send size={14} />
            </button>
          </form>
        )}
      </div>
    </>
  );
}
