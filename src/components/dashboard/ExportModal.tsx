'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Trade } from '@/types/trade';
import { Account } from '@/components/providers/AppProvider';
import { exportToPDF, exportToExcel } from '@/lib/exportUtils';
import { useCurrency } from '@/components/providers/AppProvider';
import { Calendar, User as UserIcon, FileText, Download, X, Loader2 } from 'lucide-react';


interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
}

export default function ExportModal({ isOpen, onClose, trades }: ExportModalProps) {
  const { formatCurrency } = useCurrency();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  
  // Date states
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchUserAndAccounts = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      
      if (user) {
        const { data } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id);
        if (data) {
          setAccounts(data as Account[]);
        }
      }
    };
    if (isOpen) {
      fetchUserAndAccounts();
    }
  }, [isOpen]);

  // Filter trades locally
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      // Filter by account
      if (selectedAccountId !== 'all' && t.account_id !== selectedAccountId) {
        return false;
      }
      
      // Filter by date range
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (new Date(t.close_time) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(t.close_time) > to) return false;
      }
      
      return true;
    });
  }, [trades, selectedAccountId, dateFrom, dateTo]);

  const accountLabel = useMemo(() => {
    if (selectedAccountId === 'all') return 'All Accounts';
    const acc = accounts.find((a) => a.id === selectedAccountId);
    return acc ? `${acc.broker} - ${acc.account_number} (${acc.platform})` : 'Specific Account';
  }, [selectedAccountId, accounts]);

  const dateRangeStr = useMemo(() => {
    if (!dateFrom && !dateTo) return 'All Time';
    if (dateFrom && !dateTo) return `From ${dateFrom}`;
    if (!dateFrom && dateTo) return `Until ${dateTo}`;
    return `${dateFrom} to ${dateTo}`;
  }, [dateFrom, dateTo]);

  const handleExportPDF = async () => {
    setIsGenerating(true);
    setTimeout(() => {
      exportToPDF(filteredTrades, accountLabel, dateRangeStr, formatCurrency);
      setIsGenerating(false);
      onClose();
    }, 300);
  };

  const handleExportExcel = async () => {
    setIsGenerating(true);
    setTimeout(() => {
      exportToExcel(filteredTrades, accountLabel, dateRangeStr);
      setIsGenerating(false);
      onClose();
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop click to close */}
      <div className="absolute inset-0 cursor-default" onClick={() => !isGenerating && onClose()} />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Download size={18} className="text-blue-500" />
              Export Trades
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select account and date range to export reports
            </p>
          </div>
          {!isGenerating && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          
          {/* Account Filter */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Select Trading Account
            </label>
            <div className="relative">
              <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all appearance-none cursor-pointer"
              >
                <option value="all">All Accounts</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.label ? `${acc.label} (${acc.broker})` : `${acc.broker} - ${acc.account_number}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date range picker */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                From Date
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                To Date
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* Confirmation Box */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Trades to Export</div>
              <div className="text-sm font-bold text-slate-200 mt-0.5">{filteredTrades.length} trades will be exported</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Filtered Period</div>
              <div className="text-xs text-slate-400 font-semibold mt-0.5 max-w-[150px] truncate">{dateRangeStr}</div>
            </div>
          </div>

          {filteredTrades.length === 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-400 font-medium">
              No trades match your current filters. Please adjust the settings to export.
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
          {!isGenerating ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={filteredTrades.length === 0}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <FileText size={14} />
                Export Excel
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={filteredTrades.length === 0}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-all flex items-center gap-1.5 shadow-lg shadow-rose-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Download size={14} />
                Export PDF
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-center py-2 text-slate-400 text-xs font-medium gap-2">
              <Loader2 size={14} className="animate-spin text-blue-500" />
              Generating report, please wait...
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
