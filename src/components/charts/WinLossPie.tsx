'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Trade } from '@/types/trade';
import { Target } from 'lucide-react';

interface WinLossPieProps {
  trades: Trade[];
}

interface PieData {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: PieData }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0];

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/95 backdrop-blur-sm p-3 shadow-xl">
      <p className="text-xs text-slate-400 mb-1 font-medium">{data.payload.name}</p>
      <p className="text-sm font-bold" style={{ color: data.payload.color }}>
        {data.value} trade{data.value !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

interface CustomLegendProps {
  payload?: Array<{
    value: string;
    color: string;
    payload: { value: number };
  }>;
  total: number;
}

function CustomLegend({ payload, total }: CustomLegendProps) {
  if (!payload) return null;

  return (
    <div className="flex flex-col gap-2 mt-2">
      {payload.map((entry, index) => {
        const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(1) : '0';
        return (
          <div key={index} className="flex items-center gap-2.5">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-slate-400 flex-1">{entry.value}</span>
            <span className="text-xs font-semibold" style={{ color: entry.color }}>
              {entry.payload.value} ({percentage}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function WinLossPie({ trades }: WinLossPieProps) {
  const wins = trades.filter((t) => t.profit > 0).length;
  const losses = trades.filter((t) => t.profit < 0).length;
  const breakeven = trades.filter((t) => t.profit === 0).length;
  const total = trades.length;

  const data: PieData[] = [];
  if (wins > 0) data.push({ name: 'Win', value: wins, color: '#10b981' });
  if (losses > 0) data.push({ name: 'Loss', value: losses, color: '#ef4444' });
  if (breakeven > 0) data.push({ name: 'Breakeven', value: breakeven, color: '#64748b' });

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 animate-fade-in delay-100">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">
          Win vs Loss
        </h2>
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <div className="w-16 h-16 rounded-2xl bg-slate-700/30 flex items-center justify-center mb-4">
            <Target size={28} className="text-slate-600" />
          </div>
          <p className="text-sm font-medium">No data available</p>
          <p className="text-xs text-slate-600 mt-1">
            Win/Loss distribution will appear once trades are recorded
          </p>
        </div>
      </div>
    );
  }

  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0';

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 animate-fade-in delay-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Win vs Loss
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Distribution of winning and losing trades
          </p>
        </div>
        <div className="text-right">
          <p className={`text-xl font-bold ${parseFloat(winRate) >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
            {winRate}%
          </p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
            Win Rate
          </p>
        </div>
      </div>

      <div className="h-64 flex items-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              content={<CustomLegend total={total} />}
              verticalAlign="bottom"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
