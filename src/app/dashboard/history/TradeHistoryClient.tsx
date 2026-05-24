'use client';

import { useState, useMemo } from 'react';
import { Trade } from '@/types/trade';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Filter,
  X,
} from 'lucide-react';

interface TradeHistoryClientProps {
  trades: Trade[];
  symbols: string[];
}

type SortField = 'ticket' | 'symbol' | 'type' | 'volume' | 'open_price' | 'close_price' | 'open_time' | 'close_time' | 'profit' | 'commission';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 20;

export default function TradeHistoryClient({
  trades,
  symbols,
}: TradeHistoryClientProps) {
  // Filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterType, setFilterType] = useState('');

  // Sort state
  const [sortField, setSortField] = useState<SortField>('close_time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Filtered & sorted trades
  const filteredTrades = useMemo(() => {
    let result = [...trades];

    // Filter by date range
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter(
        (t) => new Date(t.close_time) >= from
      );
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(
        (t) => new Date(t.close_time) <= to
      );
    }

    // Filter by symbol
    if (filterSymbol) {
      result = result.filter((t) => t.symbol === filterSymbol);
    }

    // Filter by type
    if (filterType) {
      result = result.filter((t) => t.type === filterType);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = a[sortField];
      let bVal: string | number = b[sortField];

      if (sortField === 'open_time' || sortField === 'close_time') {
        aVal = new Date(aVal as string).getTime();
        bVal = new Date(bVal as string).getTime();
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal);
      }

      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return result;
  }, [trades, dateFrom, dateTo, filterSymbol, filterType, sortField, sortDirection]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTrades.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTrades = filteredTrades.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-slate-600" />;
    return sortDirection === 'asc' ? (
      <ArrowUp size={12} className="text-blue-400" />
    ) : (
      <ArrowDown size={12} className="text-blue-400" />
    );
  };

  // CSV Export
  const exportCSV = () => {
    const headers = [
      'Ticket',
      'Symbol',
      'Type',
      'Volume',
      'Open Price',
      'Close Price',
      'Open Time',
      'Close Time',
      'Profit',
      'Commission',
    ];

    const rows = filteredTrades.map((t) => [
      t.ticket,
      t.symbol,
      t.type,
      t.volume,
      t.open_price,
      t.close_price,
      t.open_time,
      t.close_time,
      t.profit,
      t.commission,
    ]);

    const csvContent =
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tradiary_trades_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setFilterSymbol('');
    setFilterType('');
    setCurrentPage(1);
  };

  const hasActiveFilters = dateFrom || dateTo || filterSymbol || filterType;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="animate-fade-in flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            Trade History
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Browse and manage all your recorded transactions
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={filteredTrades.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-4 lg:p-6 shadow-xl shadow-black/10 animate-fade-in delay-100">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-300">Filters</h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
            >
              <X size={12} />
              Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Date From */}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">
              From Date
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleFilterChange(setDateFrom, e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Date To */}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">
              To Date
            </label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => handleFilterChange(setDateTo, e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Symbol Filter */}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">
              Symbol
            </label>
            <select
              value={filterSymbol}
              onChange={(e) =>
                handleFilterChange(setFilterSymbol, e.target.value)
              }
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all appearance-none cursor-pointer"
            >
              <option value="">All Symbols</option>
              {symbols.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">
              Type
            </label>
            <select
              value={filterType}
              onChange={(e) =>
                handleFilterChange(setFilterType, e.target.value)
              }
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all appearance-none cursor-pointer"
            >
              <option value="">All Types</option>
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results summary */}
      <div className="flex items-center justify-between text-sm animate-fade-in delay-200">
        <p className="text-slate-500">
          Showing{' '}
          <span className="text-slate-300 font-medium">
            {filteredTrades.length === 0
              ? '0'
              : `${startIndex + 1}–${Math.min(
                  startIndex + ITEMS_PER_PAGE,
                  filteredTrades.length
                )}`}
          </span>{' '}
          of{' '}
          <span className="text-slate-300 font-medium">
            {filteredTrades.length}
          </span>{' '}
          trades
        </p>
        {hasActiveFilters && (
          <p className="text-slate-500">
            {filteredTrades.length !== trades.length && (
              <span className="text-amber-400 font-medium">
                Filtered from {trades.length} total
              </span>
            )}
          </p>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm shadow-xl shadow-black/10 animate-fade-in delay-200 overflow-hidden">
        {filteredTrades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <div className="w-16 h-16 rounded-2xl bg-slate-700/30 flex items-center justify-center mb-4">
              <Search size={28} className="text-slate-600" />
            </div>
            <p className="text-sm font-medium">No trades found</p>
            <p className="text-xs text-slate-600 mt-1">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'Connect your MetaTrader 5 to start tracking'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-800/80">
                  {([
                    { field: 'ticket' as SortField, label: 'Ticket' },
                    { field: 'symbol' as SortField, label: 'Symbol' },
                    { field: 'type' as SortField, label: 'Type' },
                    { field: 'volume' as SortField, label: 'Volume' },
                    { field: 'open_price' as SortField, label: 'Open Price' },
                    { field: 'close_price' as SortField, label: 'Close Price' },
                    { field: 'open_time' as SortField, label: 'Open Time' },
                    { field: 'close_time' as SortField, label: 'Close Time' },
                    { field: 'profit' as SortField, label: 'Profit' },
                    { field: 'commission' as SortField, label: 'Commission' },
                  ]).map(({ field, label }) => (
                    <th
                      key={field}
                      className="text-left py-3.5 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none"
                      onClick={() => handleSort(field)}
                    >
                      <div className="flex items-center gap-1.5">
                        {label}
                        {getSortIcon(field)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {paginatedTrades.map((trade, index) => (
                  <tr
                    key={trade.id}
                    className={cn(
                      'hover:bg-slate-700/20 transition-colors duration-150',
                      index % 2 === 1 && 'bg-slate-800/30'
                    )}
                  >
                    <td className="py-3 px-4 text-slate-400 font-mono text-xs">
                      {trade.ticket}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-200">
                        {trade.symbol}
                      </span>
                    </td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4 text-slate-300 text-right">
                      {trade.volume.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-xs text-right">
                      {trade.open_price.toFixed(5)}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-xs text-right">
                      {trade.close_price.toFixed(5)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">
                      {formatDate(trade.open_time)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">
                      {formatDate(trade.close_time)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={cn(
                          'font-semibold',
                          trade.profit >= 0
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        )}
                      >
                        {formatCurrency(trade.profit)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 text-xs">
                      {formatCurrency(trade.commission)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-slate-700/50 bg-slate-800/40">
            <p className="text-xs text-slate-500">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.max(1, p - 1))
                }
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        'w-8 h-8 rounded-lg text-xs font-medium transition-all',
                        currentPage === page
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                          : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                      )}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(totalPages, p + 1)
                  )
                }
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
