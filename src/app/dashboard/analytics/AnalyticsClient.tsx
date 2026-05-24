'use client';

import ProfitBySymbol from '@/components/charts/ProfitBySymbol';
import WinLossPie from '@/components/charts/WinLossPie';
import CumulativeProfit from '@/components/charts/CumulativeProfit';
import { Trade } from '@/types/trade';
import { formatCurrency } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
} from 'lucide-react';

interface AnalyticsClientProps {
  trades: Trade[];
}

export default function AnalyticsClient({ trades }: AnalyticsClientProps) {
  // Compute some quick stats for the summary cards
  const wins = trades.filter((t) => t.profit > 0);
  const losses = trades.filter((t) => t.profit < 0);
  const avgWin =
    wins.length > 0
      ? wins.reduce((sum, t) => sum + t.profit, 0) / wins.length
      : 0;
  const avgLoss =
    losses.length > 0
      ? losses.reduce((sum, t) => sum + t.profit, 0) / losses.length
      : 0;
  const bestTrade =
    trades.length > 0
      ? trades.reduce((best, t) => (t.profit > best.profit ? t : best))
      : null;
  const worstTrade =
    trades.length > 0
      ? trades.reduce((worst, t) => (t.profit < worst.profit ? t : worst))
      : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">
          Analytics
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Visualize your trading performance with detailed charts and statistics
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 animate-fade-in delay-100">
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
        <ProfitBySymbol trades={trades} />

        {/* Win vs Loss - Pie Chart */}
        <WinLossPie trades={trades} />
      </div>

      {/* Full-width Cumulative Profit Area Chart */}
      <CumulativeProfit trades={trades} />
    </div>
  );
}
