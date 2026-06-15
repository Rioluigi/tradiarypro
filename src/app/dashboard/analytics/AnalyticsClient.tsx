'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

const ProfitBySymbol = dynamic(() => import('@/components/charts/ProfitBySymbol'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 h-72 flex items-center justify-center animate-pulse">
      <div className="text-slate-500 text-sm">Loading chart...</div>
    </div>
  ),
});

const WinLossPie = dynamic(() => import('@/components/charts/WinLossPie'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 h-72 flex items-center justify-center animate-pulse">
      <div className="text-slate-500 text-sm">Loading chart...</div>
    </div>
  ),
});

const CumulativeProfit = dynamic(() => import('@/components/charts/CumulativeProfit'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 h-72 flex items-center justify-center animate-pulse">
      <div className="text-slate-500 text-sm">Loading chart...</div>
    </div>
  ),
});

const CumulativeLoss = dynamic(() => import('@/components/charts/CumulativeLoss'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 h-72 flex items-center justify-center animate-pulse">
      <div className="text-slate-500 text-sm">Loading chart...</div>
    </div>
  ),
});

import { Trade } from '@/types/trade';
import { useCurrency } from '@/components/providers/AppProvider';
import { calculateKPIs } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Download,
} from 'lucide-react';
import ExportModal from '@/components/dashboard/ExportModal';
import NotificationBell from '@/components/layout/NotificationBell';

interface AnalyticsClientProps {
  trades: Trade[];
  userId: string;
}

export default function AnalyticsClient({ trades, userId }: AnalyticsClientProps) {
  const { formatCurrency, filterTrades } = useCurrency();

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const filteredTrades = useMemo(() => filterTrades(trades), [trades, filterTrades]);

  // Compute some quick stats for the summary cards
  const wins = useMemo(() => filteredTrades.filter((t) => t.profit > 0), [filteredTrades]);
  const losses = useMemo(() => filteredTrades.filter((t) => t.profit < 0), [filteredTrades]);

  const kpis = useMemo(() => calculateKPIs(filteredTrades), [filteredTrades]);
  const { cumulativeProfit, cumulativeLoss } = kpis;

  const avgWin = useMemo(() =>
    wins.length > 0
      ? cumulativeProfit / wins.length
      : 0, [wins, cumulativeProfit]);

  const avgLoss = useMemo(() =>
    losses.length > 0
      ? -cumulativeLoss / losses.length
      : 0, [losses, cumulativeLoss]);

  const bestTrade = useMemo(() =>
    filteredTrades.length > 0
      ? filteredTrades.reduce((best, t) => (t.profit > best.profit ? t : best))
      : null, [filteredTrades]);

  const worstTrade = useMemo(() =>
    filteredTrades.length > 0
      ? filteredTrades.reduce((worst, t) => (t.profit < worst.profit ? t : worst))
      : null, [filteredTrades]);




  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            Analytics
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Visualize your trading performance with detailed charts and statistics
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Export Modal Button */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/40 hover:bg-slate-750 hover:border-slate-600 text-slate-200 text-sm font-medium transition-all duration-200"
          >
            <Download size={16} className="text-blue-400" />
            Export
          </button>

          {/* Notification Bell */}
          <NotificationBell userId={userId} />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 lg:gap-4 animate-fade-in delay-100">
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-400" />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Avg Win
            </span>
          </div>
          <p className="text-lg font-bold text-emerald-400">
            {formatCurrency(avgWin)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <TrendingDown size={16} className="text-red-400" />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Avg Loss
            </span>
          </div>
          <p className="text-lg font-bold text-red-400">
            {formatCurrency(avgLoss)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <BarChart3 size={16} className="text-blue-400" />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Best Trade
            </span>
          </div>
          <p className="text-lg font-bold text-emerald-400">
            {bestTrade ? formatCurrency(bestTrade.profit) : '$0.00'}
          </p>
          {bestTrade && (
            <p className="text-[10px] text-slate-500 mt-0.5">
              {bestTrade.symbol}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Target size={16} className="text-amber-400" />
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Worst Trade
            </span>
          </div>
          <p className="text-lg font-bold text-red-400">
            {worstTrade ? formatCurrency(worstTrade.profit) : '$0.00'}
          </p>
          {worstTrade && (
            <p className="text-[10px] text-slate-500 mt-0.5">
              {worstTrade.symbol}
            </p>
          )}
        </div>
      </div>



      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit by Symbol - Bar Chart */}
        <ProfitBySymbol trades={filteredTrades} />

        {/* Win vs Loss - Pie Chart */}
        <WinLossPie trades={filteredTrades} />
      </div>

      {/* Full-width Cumulative Profit Area Chart */}
      <CumulativeProfit trades={filteredTrades} />

      {/* Full-width Cumulative Loss Area Chart */}
      <CumulativeLoss trades={filteredTrades} />
      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        trades={filteredTrades}
      />
    </div>
  );
}
