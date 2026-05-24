'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Trade } from '@/types/trade';
import { formatCurrency } from '@/lib/utils';
import { BarChart3 } from 'lucide-react';

interface ProfitBySymbolProps {
  trades: Trade[];
}

interface SymbolData {
  symbol: string;
  profit: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: SymbolData }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0];
  const isPositive = data.value >= 0;

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/95 backdrop-blur-sm p-3 shadow-xl">
      <p className="text-xs text-slate-400 mb-1 font-medium">{label}</p>
      <p
        className={`text-sm font-bold ${
          isPositive ? 'text-emerald-400' : 'text-red-400'
        }`}
      >
        {formatCurrency(data.value)}
      </p>
      <p className="text-[10px] text-slate-500 mt-0.5">Total Profit/Loss</p>
    </div>
  );
}

function buildSymbolData(trades: Trade[]): SymbolData[] {
  const symbolMap = new Map<string, number>();

  trades.forEach((trade) => {
    const current = symbolMap.get(trade.symbol) || 0;
    symbolMap.set(trade.symbol, current + trade.profit);
  });

  return Array.from(symbolMap.entries())
    .map(([symbol, profit]) => ({
      symbol,
      profit: parseFloat(profit.toFixed(2)),
    }))
    .sort((a, b) => b.profit - a.profit);
}

export default function ProfitBySymbol({ trades }: ProfitBySymbolProps) {
  const data = buildSymbolData(trades);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 animate-fade-in">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">
          Profit by Symbol
        </h2>
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <div className="w-16 h-16 rounded-2xl bg-slate-700/30 flex items-center justify-center mb-4">
            <BarChart3 size={28} className="text-slate-600" />
          </div>
          <p className="text-sm font-medium">No data available</p>
          <p className="text-xs text-slate-600 mt-1">
            Symbol performance will appear once trades are recorded
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Profit by Symbol
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Total profit/loss grouped by trading instrument
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 font-medium">
            {data.length} symbol{data.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(51, 65, 85, 0.3)"
              vertical={false}
            />
            <XAxis
              dataKey="symbol"
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(51, 65, 85, 0.2)' }} />
            <Bar
              dataKey="profit"
              radius={[6, 6, 0, 0]}
              maxBarSize={56}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.profit >= 0 ? '#10b981' : '#ef4444'}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
