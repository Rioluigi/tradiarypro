'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCurrency } from '@/components/providers/AppProvider';
import {
  Search,
  User,
  X,
  Loader2,
  ShieldAlert,
  Layers,
  DollarSign,
  Hash,
} from 'lucide-react';

interface Trade {
  id: string;
  user_id: string;
  ticket: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  open_price: number;
  close_price: number;
  open_time: string;
  close_time: string;
  profit: number;
  commission: number;
}

interface Profile {
  id: string;
  email: string;
}

function MonitorTradesContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [trades, setTrades] = useState<Trade[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  
  // Filters
  const [emailQuery, setEmailQuery] = useState<string>('');
  const [symbolQuery, setSymbolQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;

  const { formatCurrency } = useCurrency();
  const supabase = createClient();
  const searchParams = useSearchParams();

  // Read email from search query params on mount
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmailQuery(emailParam);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch user profiles to map user_id -> email
        const { data: profilesData, error: profilesErr } = await supabase
          .from('profiles')
          .select('id, email');

        if (profilesErr) throw profilesErr;
        setProfiles(profilesData || []);

        // 2. Fetch all trades
        const { data: tradesData, error: tradesErr } = await supabase
          .from('trades')
          .select('*')
          .order('open_time', { ascending: false });

        if (tradesErr) throw tradesErr;
        setTrades(tradesData || []);
      } catch (err: unknown) {
        console.error('Error fetching admin trades:', err);
        const errMsg = err instanceof Error ? err.message : 'Failed to load transaction monitor';
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase]);

  // Profile Map for fast email lookups
  const userMap = useMemo(() => {
    const map: { [userId: string]: string } = {};
    profiles.forEach((p) => {
      map[p.id] = p.email;
    });
    return map;
  }, [profiles]);

  // Reset all filters
  const resetFilters = () => {
    setEmailQuery('');
    setSymbolQuery('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Filtered Trades
  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      // User Email Filter
      if (emailQuery) {
        const email = userMap[trade.user_id] || '';
        if (!email.toLowerCase().includes(emailQuery.toLowerCase())) {
          return false;
        }
      }

      // Symbol Filter
      if (
        symbolQuery &&
        !trade.symbol.toLowerCase().includes(symbolQuery.toLowerCase())
      ) {
        return false;
      }

      // Date Range Filters (applies to open_time)
      if (startDate) {
        const tradeDate = new Date(trade.open_time);
        const filterStartDate = new Date(startDate);
        filterStartDate.setHours(0, 0, 0, 0);
        if (tradeDate < filterStartDate) return false;
      }

      if (endDate) {
        const tradeDate = new Date(trade.open_time);
        const filterEndDate = new Date(endDate);
        filterEndDate.setHours(23, 59, 59, 999);
        if (tradeDate > filterEndDate) return false;
      }

      return true;
    });
  }, [trades, emailQuery, symbolQuery, startDate, endDate, userMap]);

  // Global calculations based on currently filtered trades
  const stats = useMemo(() => {
    let totalVolume = 0;
    let totalProfit = 0;

    filteredTrades.forEach((trade) => {
      totalVolume += Number(trade.volume);
      totalProfit += Number(trade.profit);
    });

    return {
      totalVolume,
      totalProfit,
      count: filteredTrades.length,
    };
  }, [filteredTrades]);

  // Paginated Trades
  const paginatedTrades = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTrades.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTrades, currentPage]);

  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage);

  // Ensure current page is in bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [filteredTrades.length, totalPages, currentPage]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        <p className="text-slate-400 text-sm">Loading transaction records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 max-w-md mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-lg font-semibold text-white">Access Denied / Error</h2>
        <p className="text-slate-400 text-sm leading-relaxed">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
          Monitor Trades
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Browse, search, and verify all transactions happening across the platform
        </p>
      </div>

      {/* Global Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Stat Card 1 */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Trades</p>
              <h3 className="text-2xl font-bold text-white mt-2">
                {stats.count.toLocaleString()}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Hash size={18} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Count of trades in query</p>
        </div>

        {/* Stat Card 2 */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Net Profit</p>
              <h3
                className={`text-2xl font-bold mt-2 ${
                  stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(stats.totalProfit)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Combined net gain/loss in current filter</p>
        </div>

        {/* Stat Card 3 */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Volume</p>
              <h3 className="text-2xl font-bold text-white mt-2">
                {stats.totalVolume.toFixed(2)} lots
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Layers size={18} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Combined transaction lot sizes</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search User Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
              Search User Email
            </label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. user@example.com"
                value={emailQuery}
                onChange={(e) => {
                  setEmailQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all"
              />
            </div>
          </div>

          {/* Symbol Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
              Filter by Symbol
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. EURUSD, XAUUSD"
                value={symbolQuery}
                onChange={(e) => {
                  setSymbolQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all"
              />
            </div>
          </div>

          {/* Date Range Start */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
              Start Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Date Range End */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
              End Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all [color-scheme:dark]"
              />
            </div>
          </div>
        </div>

        {/* Reset Filters */}
        {(emailQuery || symbolQuery || startDate || endDate) && (
          <div className="flex justify-end mt-4">
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-350 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X size={12} />
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Trades Table */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-850 bg-slate-900/80">
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ticket</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">User Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Symbol</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Volume</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Profit / Loss</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Open Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/30">
              {paginatedTrades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 text-sm">
                    No trades match the current filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedTrades.map((trade) => {
                  const userEmail = userMap[trade.user_id] || 'Unknown User';
                  const isProfit = Number(trade.profit) >= 0;

                  return (
                    <tr
                      key={trade.id}
                      className="hover:bg-slate-800/20 transition-colors text-sm"
                    >
                      <td className="px-6 py-4 font-mono font-medium text-slate-400">
                        {trade.ticket}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-200">
                        {userEmail}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-100">
                        {trade.symbol}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                            trade.type === 'BUY'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {trade.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-300">
                        {Number(trade.volume).toFixed(2)}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-mono font-bold ${
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatCurrency(Number(trade.profit))}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(trade.open_time).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-850 bg-slate-900/40 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing Page {currentPage} of {totalPages} ({filteredTrades.length} total trades)
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700/50 hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200 border border-slate-700/50 hover:bg-slate-750 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MonitorTrades() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        <p className="text-slate-400 text-sm">Loading transaction monitor...</p>
      </div>
    }>
      <MonitorTradesContent />
    </Suspense>
  );
}
