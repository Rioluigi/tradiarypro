'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Trade } from '@/types/trade';
import { formatShortDate } from '@/lib/utils';
import { TrendingDown } from 'lucide-react';
import { useCurrency } from '@/components/providers/AppProvider';

interface CumulativeLossProps {
  trades: Trade[];
}

interface ChartDataPoint {
  date: string;
  loss: number;
  rawDate: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartDataPoint }>;
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  const { formatCurrency } = useCurrency();
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0];

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/95 backdrop-blur-sm p-3 shadow-xl">
      <p className="text-xs text-slate-400 mb-1">{data.payload.date}</p>
      <p className="text-sm font-bold text-red-400">
        {formatCurrency(-data.value)}
      </p>
      <p className="text-[10px] text-slate-500 mt-0.5">Cumulative Loss</p>
    </div>
  );
}

function buildCumulativeLossData(trades: Trade[]): ChartDataPoint[] {
  if (trades.length === 0) return [];

  // Sort by close_time ascending
  const sorted = [...trades].sort(
    (a, b) =>
      new Date(a.close_time).getTime() - new Date(b.close_time).getTime()
  );

  // Group by date for cleaner chart
  const dateMap = new Map<string, number>();
  let cumulative = 0;

  sorted.forEach((trade) => {
    if (trade.profit < 0) {
      cumulative += Math.abs(trade.profit);
    }
    const dateKey = new Date(trade.close_time).toISOString().split('T')[0];
    dateMap.set(dateKey, cumulative);
  });

  return Array.from(dateMap.entries()).map(([dateKey, loss]) => ({
    date: formatShortDate(dateKey),
    loss: parseFloat(loss.toFixed(2)),
    rawDate: dateKey,
  }));
}

export default function CumulativeLoss({ trades }: CumulativeLossProps) {
  const { formatCurrency, activeCurrencySymbol } = useCurrency();
  const data = buildCumulativeLossData(trades);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 animate-fade-in delay-200">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">
          Cumulative Loss
        </h2>
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <div className="w-16 h-16 rounded-2xl bg-slate-700/30 flex items-center justify-center mb-4">
            <TrendingDown size={28} className="text-slate-600" />
          </div>
          <p className="text-sm font-medium">No data available</p>
          <p className="text-xs text-slate-600 mt-1">
            Cumulative loss chart will appear once trades are recorded
          </p>
        </div>
      </div>
    );
  }

  const lastLoss = data[data.length - 1].loss;
  const gradientId = 'cumulativeLossGradient';

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 animate-fade-in delay-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Cumulative Loss
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Running total of loss over time
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-red-400">
            {formatCurrency(-lastLoss)}
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
            Total
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
                  stopColor="#ef4444"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="#ef4444"
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
              tickFormatter={(value: number) => `${activeCurrencySymbol}${value.toLocaleString()}`}
              dx={-8}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="loss"
              stroke="#ef4444"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{
                r: 5,
                fill: '#ef4444',
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
