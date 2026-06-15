export function formatCurrency(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}$${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function calculateKPIs(trades: { profit: number }[]): {
  totalProfitLoss: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  cumulativeProfit: number;
  cumulativeLoss: number;
} {
  if (trades.length === 0) {
    return { totalProfitLoss: 0, winRate: 0, profitFactor: 0, totalTrades: 0, cumulativeProfit: 0, cumulativeLoss: 0 };
  }

  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.profit > 0);
  const losingTrades = trades.filter((t) => t.profit < 0);

  const totalProfitLoss = trades.reduce((sum, t) => sum + t.profit, 0);
  const winRate = (winningTrades.length / totalTrades) * 100;

  const cumulativeProfit = winningTrades.reduce((sum, t) => sum + t.profit, 0);
  const cumulativeLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0));
  const profitFactor = cumulativeLoss === 0 ? (cumulativeProfit > 0 ? Infinity : 0) : cumulativeProfit / cumulativeLoss;

  return { totalProfitLoss, winRate, profitFactor, totalTrades, cumulativeProfit, cumulativeLoss };
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
