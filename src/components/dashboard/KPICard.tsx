'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  delay?: number;
}

export default function KPICard({
  title,
  value,
  icon,
  trend = 'neutral',
  subtitle,
  delay = 0,
}: KPICardProps) {
  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    neutral: 'text-slate-400',
  };

  const trendBg = {
    up: 'bg-emerald-500/10',
    down: 'bg-red-500/10',
    neutral: 'bg-slate-500/10',
  };

  const trendIcon = {
    up: <TrendingUp size={14} />,
    down: <TrendingDown size={14} />,
    neutral: <Minus size={14} />,
  };

  return (
    <div
      className="group relative rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 transition-all duration-300 hover:border-slate-600/50 hover:shadow-2xl hover:shadow-blue-500/5 hover:-translate-y-0.5 animate-fade-in overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-600/0 group-hover:from-blue-500/5 group-hover:to-blue-600/5 transition-all duration-500 rounded-2xl" />

      <div className="relative">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <div className="w-10 h-10 rounded-xl bg-slate-700/50 flex items-center justify-center text-slate-400 group-hover:text-blue-400 transition-colors duration-300">
            {icon}
          </div>
        </div>

        {/* Value */}
        <div className="flex items-end gap-3">
          <p
            className={cn(
              'text-2xl font-bold tracking-tight',
              trend === 'up' && 'text-emerald-400',
              trend === 'down' && 'text-red-400',
              trend === 'neutral' && 'text-white'
            )}
          >
            {value}
          </p>
        </div>

        {/* Subtitle / Trend */}
        {subtitle && (
          <div className="mt-3 flex items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                trendBg[trend],
                trendColors[trend]
              )}
            >
              {trendIcon[trend]}
              {subtitle}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
