'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { useCurrency } from '@/components/providers/AppProvider';
import { cn } from '@/lib/utils';

interface Trade {
  id: string;
  user_id: string;
  account_id?: string;
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

interface Account {
  id: string;
  user_id: string;
  currency: string;
}

// Currency formatting config
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  IDR: 'Rp',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF ',
  SGD: 'S$',
  MYR: 'RM',
};

const CURRENCY_LOCALES: Record<string, string> = {
  USD: 'en-US',
  IDR: 'id-ID',
  EUR: 'de-DE',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  AUD: 'en-AU',
  CAD: 'en-CA',
  CHF: 'de-CH',
  SGD: 'en-SG',
  MYR: 'ms-MY',
};

const ZERO_DECIMAL_CURRENCIES = new Set(['IDR', 'JPY']);

/**
 * Format a profit/loss value with the correct currency symbol.
 * Respects zero-decimal currencies like IDR and JPY.
 */
function formatTradeProfit(value: number, currencyCode: string): string {
  const code = currencyCode.toUpperCase();
  const prefix = value >= 0 ? '+' : '-';
  const absValue = Math.abs(value);
  const locale = CURRENCY_LOCALES[code] || 'en-US';
  const symbol = CURRENCY_SYMBOLS[code] || `${code} `;
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(code);

  const formatted = absValue.toLocaleString(locale, {
    minimumFractionDigits: isZeroDecimal ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return `${prefix}${symbol}${formatted}`;
}

function MonitorTradesContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [trades, setTrades] = useState<Trade[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  // Filters
  const [emailQuery, setEmailQuery] = useState<string>('');
  const [symbolQuery, setSymbolQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;

  const [showProfitModal, setShowProfitModal] = useState<boolean>(false);

  const { exchangeRates, isLiveRate, selectedCurrency } = useCurrency();
  const [adminCurrency, setAdminCurrency] = useState<'USD' | 'IDR' | 'EUR'>('USD');

  // Initialize with global selected currency on mount
  useEffect(() => {
    if (selectedCurrency) {
      setAdminCurrency(selectedCurrency);
    }
  }, [selectedCurrency]);

  const searchParams = useSearchParams();

  // Read email from search query params on mount
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmailQuery(emailParam);
    }
  }, [searchParams]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowProfitModal(false);
      }
    };
    if (showProfitModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showProfitModal]);

  useEffect(() => {
    async function loadData() {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 15000); // 15 seconds timeout fallback

      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/admin/trades', {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error! Status: ${res.status}`);
        }

        const data = await res.json();
        setProfiles(data.profiles || []);
        setAccounts(data.accounts || []);
        setTrades(data.trades || []);
      } catch (err: unknown) {
        console.error('Error fetching admin trades:', err);
        let errMsg = 'Failed to load transaction monitor';
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            errMsg = 'Request timed out after 15 seconds. Please refresh the page.';
          } else {
            errMsg = err.message;
          }
        }
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Profile Map for fast email lookups
  const userMap = useMemo(() => {
    const map: { [userId: string]: string } = {};
    profiles.forEach((p) => {
      map[p.id] = p.email;
    });
    return map;
  }, [profiles]);

  // Account currency lookup maps
  const { accountCurrencyMap, userCurrencyMap } = useMemo(() => {
    // Map account_id -> currency
    const accMap: { [accountId: string]: string } = {};
    // Map user_id -> currency (first/primary account currency for fallback)
    const usrMap: { [userId: string]: string } = {};

    accounts.forEach((a) => {
      accMap[a.id] = a.currency.toUpperCase();
      // Use first encountered account currency as user default
      if (!usrMap[a.user_id]) {
        usrMap[a.user_id] = a.currency.toUpperCase();
      }
    });

    return { accountCurrencyMap: accMap, userCurrencyMap: usrMap };
  }, [accounts]);

  /**
   * Resolve the currency code for a given trade.
   * Priority: account_id -> user's first account -> 'USD' fallback
   */
  const getTradeCurrency = (trade: Trade): string => {
    if (trade.account_id && accountCurrencyMap[trade.account_id]) {
      return accountCurrencyMap[trade.account_id];
    }
    if (userCurrencyMap[trade.user_id]) {
      return userCurrencyMap[trade.user_id];
    }
    return 'USD';
  };

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

  // Global calculations based on currently filtered trades — grouped by currency
  const stats = useMemo(() => {
    let totalVolume = 0;
    const profitByCurrency: { [currency: string]: number } = {};
    const grossProfitByCurrency: { [currency: string]: number } = {};
    const grossLossByCurrency: { [currency: string]: number } = {};
    const countByCurrency: { [currency: string]: number } = {};

    let totalConvertedNet = 0;
    let totalConvertedProfit = 0;
    let totalConvertedLoss = 0;

    const rates: Record<string, number> = {
      USD: 1,
      IDR: exchangeRates.IDR || 16000,
      EUR: exchangeRates.EUR || 0.92,
      GBP: 0.79,
      JPY: 155,
      AUD: 1.5,
      CAD: 1.37,
      CHF: 0.9,
      SGD: 1.35,
      MYR: 4.7,
    };

    filteredTrades.forEach((trade) => {
      totalVolume += Number(trade.volume);
      const currency = getTradeCurrency(trade);
      const profit = Number(trade.profit);

      profitByCurrency[currency] = (profitByCurrency[currency] || 0) + profit;
      countByCurrency[currency] = (countByCurrency[currency] || 0) + 1;

      if (profit >= 0) {
        grossProfitByCurrency[currency] = (grossProfitByCurrency[currency] || 0) + profit;
      } else {
        grossLossByCurrency[currency] = (grossLossByCurrency[currency] || 0) + profit;
      }

      // Convert to adminCurrency
      const fromRate = rates[currency.toUpperCase()] || 1;
      const profitInUSD = profit / fromRate;
      const targetRate = rates[adminCurrency] || 1;
      const profitInTarget = profitInUSD * targetRate;

      totalConvertedNet += profitInTarget;
      if (profit >= 0) {
        totalConvertedProfit += profitInTarget;
      } else {
        totalConvertedLoss += profitInTarget;
      }
    });

    // Sort currencies: put USD first, then alphabetically
    const sortedCurrencies = Object.keys(profitByCurrency).sort((a, b) => {
      if (a === 'USD') return -1;
      if (b === 'USD') return 1;
      return a.localeCompare(b);
    });

    return {
      totalVolume,
      profitByCurrency,
      grossProfitByCurrency,
      grossLossByCurrency,
      countByCurrency,
      sortedCurrencies,
      count: filteredTrades.length,
      totalConvertedNet,
      totalConvertedProfit,
      totalConvertedLoss,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTrades, accountCurrencyMap, userCurrencyMap, adminCurrency, exchangeRates]);

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Monitor Trades
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Browse, search, and verify all transactions happening across the platform
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5 overflow-visible">
          <div className="flex items-center gap-3 overflow-visible">
            {/* Currency Selector Dropdown */}
            <div className="relative">
              <DollarSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={adminCurrency}
                onChange={(e) => setAdminCurrency(e.target.value as 'USD' | 'IDR' | 'EUR')}
                className="pl-9 pr-8 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all cursor-pointer font-semibold appearance-none"
              >
                <option value="USD" className="bg-slate-900 text-white">USD ($)</option>
                <option value="IDR" className="bg-slate-900 text-white">IDR (Rp)</option>
                <option value="EUR" className="bg-slate-900 text-white">EUR (€)</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">
                ▼
              </div>
            </div>
          </div>

          {/* Live rate info */}
          {adminCurrency !== 'USD' && (
            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 pr-1 mt-0.5 select-none animate-fade-in">
              <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isLiveRate ? "bg-emerald-500" : "bg-amber-500")} />
              <span>
                {isLiveRate ? 'Live Rate' : 'Fallback Rate'}: {adminCurrency === 'IDR' ? `1$ = Rp${exchangeRates.IDR.toLocaleString('id-ID')}` : `1$ = €${exchangeRates.EUR.toFixed(4)}`}
              </span>
            </div>
          )}
        </div>
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
            <div 
              className="w-10 h-10 rounded-xl border flex items-center justify-center"
              style={{
                backgroundColor: 'var(--accent-dim)',
                borderColor: 'var(--accent-border)',
                color: 'var(--accent)',
              }}
            >
              <Hash size={18} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Count of trades in query</p>
        </div>

        {/* Stat Card 2 — Net Profit Breakdown */}
        <div 
          onClick={() => setShowProfitModal(true)}
          className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden group cursor-pointer hover:border-purple-500/50 hover:bg-slate-900/85 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Net Profit</p>
              {stats.sortedCurrencies.length === 0 ? (
                <h3 className="text-2xl font-bold text-slate-500 mt-2">—</h3>
              ) : (
                <h3
                  className={`text-2xl font-bold mt-2 ${
                    stats.totalConvertedNet >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {formatTradeProfit(
                    stats.totalConvertedNet,
                    adminCurrency
                  )}
                </h3>
              )}
            </div>
            <div 
              className="w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: 'var(--accent-dim)',
                borderColor: 'var(--accent-border)',
                color: 'var(--accent)',
              }}
            >
              <DollarSign size={18} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {stats.sortedCurrencies.length > 1
              ? 'Klik untuk lihat breakdown semua currency'
              : 'Klik untuk lihat detail'}
          </p>
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
            <div 
              className="w-10 h-10 rounded-xl border flex items-center justify-center"
              style={{
                backgroundColor: 'var(--accent-dim)',
                borderColor: 'var(--accent-border)',
                color: 'var(--accent)',
              }}
            >
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
                  const tradeCurrency = getTradeCurrency(trade);
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
                        {formatTradeProfit(Number(trade.profit), tradeCurrency)}
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

      {/* Detail Modal for Net Profit Breakdown */}
      {showProfitModal && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 md:pt-24 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fade-in"
          onClick={() => setShowProfitModal(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800/80 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative my-8 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                Profit & Loss Breakdown
              </h3>
              <button 
                onClick={() => setShowProfitModal(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-850 p-1.5 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-6 divide-y divide-slate-850/50">
              {stats.sortedCurrencies.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  No trade data available to break down.
                </div>
              ) : (
                <>
                  {/* Original Breakdowns */}
                  <div className="space-y-6">
                    {stats.sortedCurrencies.map((currency, idx) => {
                      const net = stats.profitByCurrency[currency] || 0;
                      const profit = stats.grossProfitByCurrency[currency] || 0;
                      const loss = stats.grossLossByCurrency[currency] || 0;
                      const count = stats.countByCurrency[currency] || 0;

                      return (
                        <div key={currency} className={`${idx > 0 ? 'pt-6 border-t border-slate-200 dark:border-slate-800/50' : ''}`}>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-base font-bold tracking-wider font-mono" style={{ color: 'var(--accent)' }}>
                              {currency}
                            </span>
                            <span className="text-xs bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-full font-semibold">
                              {count} {count === 1 ? 'Trade' : 'Trades'}
                            </span>
                          </div>
                          
                          <div className="space-y-2 bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 rounded-xl p-4">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-500 dark:text-gray-400">Total Profit</span>
                              <span className="text-green-600 dark:text-green-400 font-mono font-semibold">
                                {formatTradeProfit(profit, currency)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-500 dark:text-gray-400">Total Loss</span>
                              <span className="text-red-600 dark:text-red-400 font-mono font-semibold">
                                {formatTradeProfit(loss, currency)}
                              </span>
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-2 flex justify-between items-center text-sm font-bold">
                              <span className="text-gray-700 dark:text-gray-300">Net</span>
                              <span className={`font-mono ${net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {formatTradeProfit(net, currency)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Converted Total Section */}
                  <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 tracking-wide" style={{ color: 'var(--accent)' }}>
                        Converted Total ({adminCurrency})
                      </span>
                      <span className="text-xs bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full font-semibold" style={{ backgroundColor: 'var(--accent-dim)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }}>
                        All Currencies
                      </span>
                    </div>

                    <div className="space-y-2 bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 rounded-xl p-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Total Converted Profit</span>
                        <span className="text-green-600 dark:text-green-400 font-mono font-semibold">
                          {formatTradeProfit(stats.totalConvertedProfit, adminCurrency)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Total Converted Loss</span>
                        <span className="text-red-600 dark:text-red-400 font-mono font-semibold">
                          {formatTradeProfit(stats.totalConvertedLoss, adminCurrency)}
                        </span>
                      </div>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-2 flex justify-between items-center text-sm font-bold">
                        <span className="text-gray-700 dark:text-gray-300">Net Converted Profit</span>
                        <span className={`font-mono ${stats.totalConvertedNet >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatTradeProfit(stats.totalConvertedNet, adminCurrency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-950/20 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowProfitModal(false)}
                className="px-4 py-2 text-white text-sm font-semibold rounded-xl transition-all font-medium shadow-lg hover:opacity-90 active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--accent)',
                  boxShadow: '0 4px 12px var(--accent-glow)',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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
