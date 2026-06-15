'use client';

import { useState, useEffect } from 'react';
import { Users, History, TrendingUp, ShieldAlert, Loader2, CreditCard, DollarSign } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface ChartData {
  date: string;
  count: number;
}

interface RecentUserProfile {
  id: string;
  email: string;
  created_at: string;
  subscription_plan: 'free' | 'pro' | 'enterprise' | null;
  tradesCount: number;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Metrics
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);
  const [activeSubscribers, setActiveSubscribers] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUserProfile[]>([]);

  useEffect(() => {
    async function fetchStats() {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 15000); // 15 seconds timeout fallback

      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/admin/overview', {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error! Status: ${res.status}`);
        }

        const data = await res.json();
        
        setTotalUsers(data.totalUsers ?? 0);
        setTotalTrades(data.totalTrades ?? 0);
        setActiveSubscribers(data.activeSubscribers ?? 0);
        setMonthlyRevenue(data.monthlyRevenue ?? 0);
        setRecentUsers(data.recentUsers ?? []);
        setChartData(data.chartData ?? []);
      } catch (err: unknown) {
        console.error('Error fetching admin dashboard stats:', err);
        let errMsg = 'Failed to fetch admin stats';
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

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        <p className="text-slate-400 text-sm">Loading admin metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 max-w-md mx-auto text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-lg font-semibold text-white">Database Sync Required</h2>
        <p className="text-slate-400 text-sm leading-relaxed">
          {error.includes('does not exist')
            ? 'The Profiles table does not exist. Please apply the SQL migrations inside your Supabase SQL Editor.'
            : error}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Admin Overview
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Tradiary system status and transaction volume metrics
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric Card 1 */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 hover:border-purple-500/30 rounded-2xl p-6 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Users</p>
              <h3 className="text-3xl font-bold text-white mt-2 group-hover:text-purple-400 transition-colors">
                {totalUsers.toLocaleString()}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Users size={22} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">Count from profiles table</p>
        </div>

        {/* Metric Card 2 */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 hover:border-purple-500/30 rounded-2xl p-6 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Trades</p>
              <h3 className="text-3xl font-bold text-white mt-2 group-hover:text-purple-400 transition-colors">
                {totalTrades.toLocaleString()}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <History size={22} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">Count from trades table</p>
        </div>

        {/* Metric Card 3 */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 hover:border-purple-500/30 rounded-2xl p-6 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Subscribers</p>
              <h3 className="text-3xl font-bold text-white mt-2 group-hover:text-purple-400 transition-colors">
                {activeSubscribers.toLocaleString()}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <CreditCard size={22} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">Active Pro/Enterprise accounts</p>
        </div>

        {/* Metric Card 4 */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 hover:border-purple-500/30 rounded-2xl p-6 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Revenue</p>
              <h3 className="text-3xl font-bold text-white mt-2 group-hover:text-purple-400 transition-colors">
                ${monthlyRevenue.toFixed(2)}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <DollarSign size={22} />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">Stripe recurring sales</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">System Trading Activity</h3>
            <p className="text-xs text-slate-500">Volume distribution of closed trades over the last 7 days</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20">
            <TrendingUp size={14} />
            <span>Daily Counts</span>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="purpleBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  color: '#fff',
                }}
                labelStyle={{ fontWeight: 'bold', color: '#a855f7' }}
              />
              <Bar
                dataKey="count"
                fill="url(#purpleBar)"
                radius={[6, 6, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Users Section */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white">Recent Users</h3>
          <p className="text-xs text-slate-500">The 5 newest profiles registered on the platform</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-850 bg-slate-900/80">
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Join Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Trades Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/30">
              {recentUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-sm">
                    No users found.
                  </td>
                </tr>
              ) : (
                recentUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-200">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${
                        user.subscription_plan === 'enterprise'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : user.subscription_plan === 'pro'
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {user.subscription_plan || 'free'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-350">{user.tradesCount.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
