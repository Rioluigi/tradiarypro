'use client';

import { useState, useMemo, useEffect } from 'react';
import { Trade } from '@/types/trade';
import { useCurrency } from '@/components/providers/AppProvider';
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  X,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import NotificationBell from '@/components/layout/NotificationBell';

interface CalendarClientProps {
  trades: Trade[];
  userId: string;
}

export default function CalendarClient({ trades, userId }: CalendarClientProps) {
  const {
    selectedAccountId,
    setSelectedAccountId,
    setSelectedCurrency,
    activeCurrency,
    accounts,
    formatCurrency,
    filterTrades,
  } = useCurrency();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Selected month state
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Modal state
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Filter trades by selected account
  const filteredTrades = useMemo(() => filterTrades(trades), [trades, filterTrades]);

  // Group trades by Sweden-formatted ISO date (YYYY-MM-DD) in local timezone
  const tradesByDate = useMemo(() => {
    const map: Record<string, Trade[]> = {};
    filteredTrades.forEach((trade) => {
      const dateStr = new Date(trade.close_time).toLocaleDateString('sv-SE');
      if (!map[dateStr]) {
        map[dateStr] = [];
      }
      map[dateStr].push(trade);
    });
    return map;
  }, [filteredTrades]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calendar calculations
  const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday: 0, Monday: 1...
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  // Create list of days for grid
  const calendarCells = useMemo(() => {
    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Prefix days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevMonthDate = new Date(year, month - 1, dayNum);
      const dateStr = prevMonthDate.toLocaleDateString('sv-SE');
      cells.push({ dateStr, dayNum, isCurrentMonth: false });
    }

    // Days in current month
    for (let i = 1; i <= daysInMonth; i++) {
      const currentMonthDate = new Date(year, month, i);
      const dateStr = currentMonthDate.toLocaleDateString('sv-SE');
      cells.push({ dateStr, dayNum: i, isCurrentMonth: true });
    }

    // Suffix days to complete the calendar grid (multiple of 7, max 42)
    const totalSlots = cells.length > 35 ? 42 : 35;
    const suffixCount = totalSlots - cells.length;
    for (let i = 1; i <= suffixCount; i++) {
      const nextMonthDate = new Date(year, month + 1, i);
      const dateStr = nextMonthDate.toLocaleDateString('sv-SE');
      cells.push({ dateStr, dayNum: i, isCurrentMonth: false });
    }

    return cells;
  }, [year, month, firstDayIndex, daysInMonth, prevMonthDays]);

  // Statistics for the current month
  const monthlyStats = useMemo(() => {
    // Filter trades closed in the currently navigated month
    const currentMonthTrades = filteredTrades.filter((t) => {
      const closeDate = new Date(t.close_time);
      return closeDate.getFullYear() === year && closeDate.getMonth() === month;
    });

    // Group by date to get daily profits
    const dailyPnLMap: Record<string, number> = {};
    currentMonthTrades.forEach((t) => {
      const dateStr = new Date(t.close_time).toLocaleDateString('sv-SE');
      dailyPnLMap[dateStr] = (dailyPnLMap[dateStr] || 0) + t.profit;
    });

    const dailyPnLs = Object.entries(dailyPnLMap).map(([date, profit]) => ({
      date,
      profit,
    }));

    const totalTradingDays = dailyPnLs.length;
    const winDays = dailyPnLs.filter((d) => d.profit > 0).length;
    const lossDays = dailyPnLs.filter((d) => d.profit < 0).length;

    const bestDay = dailyPnLs.length > 0
      ? dailyPnLs.reduce((best, d) => (d.profit > best.profit ? d : best))
      : null;
    const worstDay = dailyPnLs.length > 0
      ? dailyPnLs.reduce((worst, d) => (d.profit < worst.profit ? d : worst))
      : null;

    return {
      totalTradingDays,
      winDays,
      lossDays,
      bestDay,
      worstDay,
    };
  }, [filteredTrades, year, month]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Trades of the selected date for modal
  const selectedDateTrades = useMemo(() => {
    if (!selectedDateStr) return [];
    return tradesByDate[selectedDateStr] || [];
  }, [selectedDateStr, tradesByDate]);

  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto space-y-6" suppressHydrationWarning>
        <div className="animate-fade-in flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Calendar size={24} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">
                Trading Calendar
              </h1>
              <p className="text-slate-400 mt-0.5 text-sm">
                Track daily trading performance and journal metrics
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 h-[600px] flex items-center justify-center">
          <div className="text-slate-500 text-sm">Loading calendar...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6" suppressHydrationWarning>
      {/* Page Header */}
      <div className="animate-fade-in flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <Calendar size={24} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white">
              Trading Calendar
            </h1>
            <p className="text-slate-400 mt-0.5 text-sm">
              Track daily trading performance and journal metrics
            </p>
          </div>
        </div>

        {/* Global Filters */}
        <div className="flex items-center gap-3">
          {/* Account Dropdown */}
          <div className="relative">
            <Layers size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="pl-9 pr-8 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all cursor-pointer font-semibold appearance-none"
            >
              <option value="all" className="bg-slate-900 text-white">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id} className="bg-slate-900 text-white">
                  {acc.label || `Account #${acc.account_number}`}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">
              ▼
            </div>
          </div>

          {/* Currency Dropdown */}
          <div className="relative">
            <DollarSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={activeCurrency}
              disabled={selectedAccountId !== 'all'}
              onChange={(e) => setSelectedCurrency(e.target.value as 'USD' | 'IDR' | 'EUR')}
              className="pl-9 pr-8 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all cursor-pointer font-semibold appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="USD" className="bg-slate-900 text-white">USD ($)</option>
              <option value="IDR" className="bg-slate-900 text-white">IDR (Rp)</option>
              <option value="EUR" className="bg-slate-900 text-white">EUR (€)</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">
              ▼
            </div>
          </div>

          {/* Notification Bell */}
          <NotificationBell userId={userId} />
        </div>
      </div>

      {/* Calendar Card */}
      <div className="glass-card p-6 shadow-xl animate-fade-in delay-100">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            {monthNames[month]} <span className="text-slate-400 font-normal">{year}</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              title="Previous Month"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 border border-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              title="Next Month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Days of the Week Grid */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-xs font-semibold uppercase tracking-wider text-slate-500 py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid Cells */}
        <div className="grid grid-cols-7 gap-2">
          {calendarCells.map(({ dateStr, dayNum, isCurrentMonth }) => {
            const dayTrades = tradesByDate[dateStr] || [];
            const hasTrades = dayTrades.length > 0;
            const netProfit = hasTrades ? dayTrades.reduce((sum, t) => sum + t.profit, 0) : 0;
            const isProfit = netProfit > 0;
            const isLoss = netProfit < 0;

            return (
              <div
                key={dateStr}
                onClick={() => hasTrades && setSelectedDateStr(dateStr)}
                className={`
                  relative min-h-[75px] md:min-h-[90px] rounded-xl border p-2 flex flex-col justify-between transition-all duration-200 select-none
                  ${isCurrentMonth ? 'border-slate-700/30' : 'border-slate-800/10 opacity-20'}
                  ${hasTrades ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg' : 'bg-slate-900/10'}
                  ${isProfit ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-emerald-500/5' : ''}
                  ${isLoss ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40 hover:shadow-red-500/5' : ''}
                `}
              >
                {/* Day number */}
                <span className={`text-xs font-semibold self-end ${isCurrentMonth ? 'text-slate-400' : 'text-slate-600'}`}>
                  {dayNum}
                </span>

                {/* Day PnL value */}
                {hasTrades ? (
                  <div className="flex flex-col">
                    <span
                      className={`text-[10px] md:text-xs font-bold truncate leading-none ${
                        netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {formatCurrency(netProfit)}
                    </span>
                    <span className="text-[8px] text-slate-500 mt-1 self-start">
                      {dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                ) : (
                  <div className="h-4" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in delay-200">
        {/* Total Trading Days */}
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Trading Days</p>
            <h4 className="text-lg font-bold text-slate-100 mt-0.5">{monthlyStats.totalTradingDays} Days</h4>
          </div>
        </div>

        {/* Win vs Loss Days */}
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Win / Loss Days</p>
            <h4 className="text-lg font-bold text-slate-100 mt-0.5">
              {monthlyStats.winDays}W / {monthlyStats.lossDays}L
            </h4>
          </div>
        </div>

        {/* Best Trading Day */}
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Best Day</p>
            <h4 className="text-sm font-bold text-emerald-400 truncate mt-0.5">
              {monthlyStats.bestDay ? formatCurrency(monthlyStats.bestDay.profit) : 'No trades'}
            </h4>
            {monthlyStats.bestDay && (
              <p className="text-[9px] text-slate-500 truncate">
                {new Date(monthlyStats.bestDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* Worst Trading Day */}
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 flex-shrink-0">
            <TrendingDown size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Worst Day</p>
            <h4 className="text-sm font-bold text-red-400 truncate mt-0.5">
              {monthlyStats.worstDay ? formatCurrency(monthlyStats.worstDay.profit) : 'No trades'}
            </h4>
            {monthlyStats.worstDay && (
              <p className="text-[9px] text-slate-500 truncate">
                {new Date(monthlyStats.worstDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Trades Details Modal */}
      {selectedDateStr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setSelectedDateStr(null)}
          />

          {/* Modal Container */}
          <div className="glass-card w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col relative z-10 shadow-2xl border border-slate-700/50 animate-fade-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/30">
              <div>
                <h3 className="text-md font-bold text-slate-100 flex items-center gap-2">
                  <Calendar size={16} className="text-blue-400" />
                  Daily Trades Detail
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(selectedDateStr).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedDateStr(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/30 text-slate-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {selectedDateTrades.map((trade) => {
                const isBuy = trade.type === 'BUY';
                return (
                  <div
                    key={trade.id}
                    className="p-4 rounded-xl border border-slate-700/30 bg-slate-900/30 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 text-sm">{trade.symbol}</span>
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isBuy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {isBuy ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                          {trade.type}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                        <span>Ticket: {trade.ticket}</span>
                        <span>•</span>
                        <span>Vol: {trade.volume.toFixed(2)}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Price: {trade.open_price.toFixed(5)} → {trade.close_price.toFixed(5)}
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-sm font-bold ${
                          trade.profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {formatCurrency(trade.profit)}
                      </span>
                      {trade.commission !== 0 && (
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          Comm: {formatCurrency(trade.commission)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {selectedDateTrades.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">No trades found on this date.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
