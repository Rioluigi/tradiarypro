'use client';

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Trade } from '@/types/trade';
import { formatShortDate, formatCurrency } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

interface EquityChartProps {
  trades: Trade[];
}

interface ChartDataPoint {
  date: string;
  equity: number;
  rawDate: string;
}

function buildEquityData(trades: Trade[]): ChartDataPoint[] {
  if (trades.length === 0) return [];

  // Sort trades by close_time ascending
  const sorted = [...trades].sort(
    (a, b) => new Date(a.close_time).getTime() - new Date(b.close_time).getTime()
  );

  let cumulative = 0;
  return sorted.map((trade) => {
    cumulative += trade.profit;
    return {
      date: formatShortDate(trade.close_time),
      equity: parseFloat(cumulative.toFixed(2)),
      rawDate: trade.close_time,
    };
  });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartDataPoint }>;
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0];
  const isPositive = data.value >= 0;

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/95 backdrop-blur-sm p-3 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{data.payload.date}</p>
      <p
        className={`text-sm font-bold ${
          isPositive ? 'text-emerald-400' : 'text-red-400'
        }`}
      >
        {formatCurrency(data.value)}
      </p>
      <p className="text-[10px] text-slate-500 mt-0.5">Cumulative Equity</p>
    </div>
  );
}

export default function EquityChart({ trades }: EquityChartProps) {
  const data = buildEquityData(trades);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 animate-fade-in delay-400">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">
          Equity Curve
        </h2>
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <div className="w-16 h-16 rounded-2xl bg-slate-700/30 flex items-center justify-center mb-4">
            <TrendingUp size={28} className="text-slate-600" />
          </div>
          <p className="text-sm font-medium">No data available</p>
          <p className="text-xs text-slate-600 mt-1">
            Your equity curve will appear once trades are recorded
          </p>
        </div>
      </div>
    );
  }

  const lastEquity = data[data.length - 1].equity;
  const isPositive = lastEquity >= 0;
  const gradientId = 'equityGradient';

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 animate-fade-in delay-400">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Equity Curve
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Cumulative profit over time
          </p>
        </div>
        <div className="text-right">
          <p
            className={`text-xl font-bold ${
              isPositive ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatCurrency(lastEquity)}
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
            Current Equity
          </p>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={isPositive ? '#10b981' : '#ef4444'}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={isPositive ? '#10b981' : '#ef4444'}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(51, 65, 85, 0.3)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickFormatter={(value: number) => `$${value}`}
              dx={-8}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="equity"
              stroke={isPositive ? '#10b981' : '#ef4444'}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{
                r: 5,
                fill: isPositive ? '#10b981' : '#ef4444',
                stroke: '#1e293b',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
