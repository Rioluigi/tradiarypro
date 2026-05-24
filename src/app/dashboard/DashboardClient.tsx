'use client';

import KPICard from '@/components/dashboard/KPICard';
import RecentTrades from '@/components/dashboard/RecentTrades';
import EquityChart from '@/components/charts/EquityChart';
import { Trade, KPIData } from '@/types/trade';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import {
  DollarSign,
  Target,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

interface DashboardClientProps {
  kpis: KPIData;
  allTrades: Trade[];
  recentTrades: Trade[];
}

export default function DashboardClient({
  kpis,
  allTrades,
  recentTrades,
}: DashboardClientProps) {
  const plTrend = kpis.totalProfitLoss > 0 ? 'up' : kpis.totalProfitLoss < 0 ? 'down' : 'neutral';
  const wrTrend = kpis.winRate >= 50 ? 'up' : kpis.winRate > 0 ? 'down' : 'neutral';
  const pfTrend = kpis.profitFactor >= 1 ? 'up' : kpis.profitFactor > 0 ? 'down' : 'neutral';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">
          Dashboard
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Your trading journal overview at a glance
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <KPICard
          title="Total Profit/Loss"
          value={formatCurrency(kpis.totalProfitLoss)}
          icon={<DollarSign size={20} />}
          trend={plTrend}
          subtitle={
            kpis.totalTrades > 0
              ? `${kpis.totalTrades} total trades`
              : 'No trades yet'
          }
          delay={0}
        />
        <KPICard
          title="Win Rate"
          value={formatPercentage(kpis.winRate)}
          icon={<Target size={20} />}
          trend={wrTrend}
          subtitle={
            kpis.winRate >= 50
              ? 'Above 50% threshold'
              : kpis.totalTrades > 0
              ? 'Below 50% threshold'
              : 'No data'
          }
          delay={100}
        />
        <KPICard
          title="Profit Factor"
          value={
            kpis.profitFactor === Infinity
              ? '∞'
              : kpis.profitFactor.toFixed(2)
          }
          icon={<TrendingUp size={20} />}
          trend={pfTrend}
          subtitle={
            kpis.profitFactor >= 1
              ? 'Profitable ratio'
              : kpis.totalTrades > 0
              ? 'Below breakeven'
              : 'No data'
          }
          delay={200}
        />
        <KPICard
          title="Total Trades"
          value={kpis.totalTrades.toString()}
          icon={<BarChart3 size={20} />}
          trend="neutral"
          subtitle="All recorded transactions"
          delay={300}
        />
      </div>

      {/* Equity Curve */}
      <EquityChart trades={allTrades} />

      {/* Recent Trades */}
      <RecentTrades trades={recentTrades} />
    </div>
  );
}
