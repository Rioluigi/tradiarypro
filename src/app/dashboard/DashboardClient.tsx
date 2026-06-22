'use client';

import { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import KPICard from '@/components/dashboard/KPICard';
import RecentTrades from '@/components/dashboard/RecentTrades';
const EquityChart = dynamic(() => import('@/components/charts/EquityChart'), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 h-96 flex items-center justify-center">
      <div className="text-slate-500 text-sm">Loading chart...</div>
    </div>
  ),
});
import { Trade, KPIData } from '@/types/trade';
import { formatPercentage, calculateKPIs, cn } from '@/lib/utils';
import { useCurrency } from '@/components/providers/AppProvider';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import NotificationBell from '@/components/layout/NotificationBell';
import {
  DollarSign,
  Target,
  TrendingUp,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Loader2,
  X,
  Rocket,
} from 'lucide-react';

interface DashboardClientProps {
  kpis: KPIData;
  allTrades: Trade[];
  recentTrades: Trade[];
  subscriptionStatus: string;
  subscriptionPlan: string;
  metadataPlan: string;
  stripeSubscriptionId: string | null;
  userId: string;
  userEmail: string;
}

export default function DashboardClient({
  allTrades,
  subscriptionStatus,
  subscriptionPlan,
  userId,
  userEmail,
}: DashboardClientProps) {
  const router = useRouter();
  const {
    selectedAccountId,
    setSelectedAccountId,
    setSelectedCurrency,
    activeCurrency,
    accounts,
    formatCurrency,
    filterTrades,
    isLiveRate,
    exchangeRates,
  } = useCurrency();

  const [localTrades, setLocalTrades] = useState<Trade[]>(allTrades);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsBannerDismissed(localStorage.getItem('tradiary_upgrade_banner_dismissed') === 'true');
    }
  }, []);



  const handleUpgradeToPro = async () => {
    try {
      setCheckoutLoading(true);
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'pro',
          billingCycle: 'monthly',
          userId,
          userEmail,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout. Please try again.');
      }
    } catch (err) {
      console.error('Direct upgrade error:', err);
      alert('An error occurred. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleUpdatePayment = async () => {
    try {
      setPortalLoading(true);
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        window.location.href = '/dashboard/config?tab=billing';
      }
    } catch (err) {
      console.error('Portal redirect error:', err);
      window.location.href = '/dashboard/config?tab=billing';
    } finally {
      setPortalLoading(false);
    }
  };

  // Sync state if server props change
  useEffect(() => {
    setLocalTrades(allTrades);
  }, [allTrades]);

  // Subscribe to real-time updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('schema-db-changes-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
        },
        (payload) => {
          setLocalTrades((prevTrades) => {
            if (payload.eventType === 'INSERT') {
              const newTrade = payload.new as Trade;
              if (prevTrades.some((t) => t.id === newTrade.id)) {
                return prevTrades;
              }
              const updated = [newTrade, ...prevTrades];
              return updated.sort((a, b) => new Date(b.close_time).getTime() - new Date(a.close_time).getTime());
            } else if (payload.eventType === 'UPDATE') {
              const updatedTrade = payload.new as Trade;
              return prevTrades.map((t) => (t.id === updatedTrade.id ? updatedTrade : t));
            } else if (payload.eventType === 'DELETE') {
              const oldTrade = payload.old as { id: string };
              return prevTrades.filter((t) => t.id !== oldTrade.id);
            }
            return prevTrades;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredAllTrades = useMemo(() => filterTrades(localTrades), [localTrades, filterTrades]);

  const kpis = useMemo(() => {
    return calculateKPIs(filteredAllTrades);
  }, [filteredAllTrades]);

  const recentTrades = useMemo(() => {
    return filteredAllTrades.slice(0, 5);
  }, [filteredAllTrades]);


  const plTrend = kpis.totalProfitLoss > 0 ? 'up' : kpis.totalProfitLoss < 0 ? 'down' : 'neutral';
  const wrTrend = kpis.winRate >= 50 ? 'up' : kpis.winRate > 0 ? 'down' : 'neutral';
  const pfTrend = kpis.profitFactor >= 1 ? 'up' : kpis.profitFactor > 0 ? 'down' : 'neutral';

  return (
    <div className="max-w-7xl mx-auto space-y-6" suppressHydrationWarning>
      {/* Past Due Warning Banner */}
      {subscriptionStatus === 'past_due' && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 text-amber-400">
              <AlertCircle size={20} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-400">Payment Failed</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Your subscription payment failed. Please update your payment method to avoid service interruption.
              </p>
            </div>
          </div>
          <button
            onClick={handleUpdatePayment}
            disabled={portalLoading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs transition-all duration-200"
          >
            {portalLoading && <Loader2 size={14} className="animate-spin" />}
            Update Payment Method
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="animate-fade-in flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            Dashboard
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Your trading journal overview at a glance
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5 overflow-visible">
          <div className="flex items-center gap-3 overflow-visible">
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
          
          {/* Live rate info */}
          {activeCurrency !== 'USD' && (
            <div className="text-[10px] text-slate-500 flex items-center gap-1.5 pr-1 mt-0.5 select-none animate-fade-in">
              <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isLiveRate ? "bg-emerald-500" : "bg-amber-500")} />
              <span>
                {isLiveRate ? 'Live Rate' : 'Fallback Rate'}: {activeCurrency === 'IDR' ? `1$ = Rp${exchangeRates.IDR.toLocaleString('id-ID')}` : `1$ = €${exchangeRates.EUR.toFixed(4)}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade Banner for Free Plan */}
      {subscriptionPlan === 'free' && !isBannerDismissed && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative animate-fade-in shadow-md">
          {/* Dismiss button */}
          <button
            onClick={() => {
              setIsBannerDismissed(true);
              if (typeof window !== 'undefined') {
                localStorage.setItem('tradiary_upgrade_banner_dismissed', 'true');
              }
            }}
            className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
            title="Dismiss"
            aria-label="Tutup banner"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center flex-shrink-0 text-indigo-600">
              <Rocket size={20} className="animate-bounce" />
            </div>
            <div className="pr-6">
              <h4 className="text-sm font-extrabold text-slate-900">You&apos;re on the Free Plan</h4>
              <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">
                Upgrade to Pro to unlock CSV import, advanced analytics, and more features.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center flex-shrink-0">
            <button
              onClick={() => router.push('/pricing')}
              className="px-4 py-2.5 rounded-xl border border-indigo-300 hover:border-indigo-400 text-indigo-700 hover:text-indigo-800 text-xs font-bold transition-all bg-white/50 active:scale-[0.98]"
            >
              See Plans
            </button>
            <button
              onClick={handleUpgradeToPro}
              disabled={checkoutLoading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/15 disabled:opacity-50 active:scale-[0.98]"
            >
              {checkoutLoading && <Loader2 size={14} className="animate-spin" />}
              Upgrade to Pro &rarr;
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
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

      {/* Cumulative Profit & Loss Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 lg:gap-6">
        <KPICard
          title="Cumulative Profit"
          value={formatCurrency(kpis.cumulativeProfit)}
          icon={<ArrowUpRight size={20} />}
          trend="up"
          subtitle={
            kpis.totalTrades > 0
              ? `${(kpis.cumulativeProfit / (kpis.cumulativeProfit + kpis.cumulativeLoss || 1) * 100).toFixed(1)}% of total volume`
              : 'No winning trades yet'
          }
          delay={400}
        />
        <KPICard
          title="Cumulative Loss"
          value={formatCurrency(-kpis.cumulativeLoss)}
          icon={<ArrowDownRight size={20} />}
          trend="down"
          subtitle={
            kpis.totalTrades > 0
              ? `${(kpis.cumulativeLoss / (kpis.cumulativeProfit + kpis.cumulativeLoss || 1) * 100).toFixed(1)}% of total volume`
              : 'No losing trades yet'
          }
          delay={500}
        />
      </div>



      {/* Equity Curve */}
      <EquityChart trades={filteredAllTrades} />

      {/* Recent Trades */}
      <RecentTrades trades={recentTrades} />

    </div>
  );
}

