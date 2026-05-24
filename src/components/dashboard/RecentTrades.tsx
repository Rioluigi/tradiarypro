'use client';

import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Trade } from '@/types/trade';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface RecentTradesProps {
  trades: Trade[];
}

export default function RecentTrades({ trades }: RecentTradesProps) {
  if (trades.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 animate-fade-in">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">
          Recent Trades
        </h2>
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <div className="w-16 h-16 rounded-2xl bg-slate-700/30 flex items-center justify-center mb-4">
            <ArrowUpRight size={28} className="text-slate-600" />
          </div>
          <p className="text-sm font-medium">No trades yet</p>
          <p className="text-xs text-slate-600 mt-1">
            Connect your MetaTrader 5 to start tracking
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 animate-fade-in delay-500">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-100">Recent Trades</h2>
        <span className="text-xs text-slate-500 font-medium px-2.5 py-1 rounded-full bg-slate-700/50">
          Last {trades.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Symbol
              </th>
              <th className="text-left py-3 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Type
              </th>
              <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Volume
              </th>
              <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Profit
              </th>
              <th className="text-right py-3 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                Close Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {trades.map((trade, index) => (
              <tr
                key={trade.id}
                className="hover:bg-slate-700/20 transition-colors duration-150"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <td className="py-3 px-3">
                  <span className="font-medium text-slate-200">
                    {trade.symbol}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold',
                      trade.type === 'BUY'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    )}
                  >
                    {trade.type === 'BUY' ? (
                      <ArrowUpRight size={12} />
                    ) : (
                      <ArrowDownRight size={12} />
                    )}
                    {trade.type}
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-slate-300">
                  {trade.volume.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-right">
                  <span
                    className={cn(
                      'font-semibold',
                      trade.profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                    )}
                  >
                    {formatCurrency(trade.profit)}
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-slate-500 text-xs hidden md:table-cell">
                  {formatDate(trade.close_time)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
