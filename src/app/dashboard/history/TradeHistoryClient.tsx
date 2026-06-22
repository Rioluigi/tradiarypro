'use client';

import { useState, useMemo, useEffect } from 'react';
import { Trade, TradeInsert } from '@/types/trade';
import { formatDate, cn } from '@/lib/utils';
import { useCurrency } from '@/components/providers/AppProvider';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
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
  BookOpen,
  Star,
  Upload,
  Trash2,
  Loader2,
  Maximize2,
  Brain,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import ExportModal from '@/components/dashboard/ExportModal';
import NotificationBell from '@/components/layout/NotificationBell';

const REQUIRED_FIELDS = [
  { key: 'ticket', label: 'Ticket / Order ID', required: true },
  { key: 'symbol', label: 'Symbol', required: true },
  { key: 'type', label: 'Type (BUY/SELL)', required: true },
  { key: 'volume', label: 'Volume (Lots)', required: true },
  { key: 'open_price', label: 'Open Price', required: true },
  { key: 'close_price', label: 'Close Price', required: true },
  { key: 'open_time', label: 'Open Time', required: true },
  { key: 'close_time', label: 'Close Time', required: true },
  { key: 'profit', label: 'Profit', required: true },
  { key: 'commission', label: 'Commission', required: false },
];

// Helper functions for CSV Parsing & Mapping
function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell);
        cell = '';
      } else if (char === '\r' || char === '\n') {
        row.push(cell);
        cell = '';
        if (row.length > 0 && row.some(c => c !== '')) {
          result.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n
        }
      } else {
        cell += char;
      }
    }
  }
  
  if (cell || row.length > 0) {
    row.push(cell);
    if (row.length > 0 && row.some(c => c !== '')) {
      result.push(row);
    }
  }
  
  return result;
}

function cleanNumber(val: string): number {
  if (!val) return 0;
  let clean = val.replace(/[^0-9.,-]/g, '').trim();
  if (!clean) return 0;
  
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/,/g, '');
  } else if (clean.includes(',')) {
    const parts = clean.split(',');
    if (parts.length === 2 && parts[1].length !== 3) {
      clean = clean.replace(/,/g, '.');
    } else {
      clean = clean.replace(/,/g, '');
    }
  }
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function cleanDate(val: string): string {
  if (!val) return '';
  let clean = val.trim();
  
  if (/^\d{4}\.\d{2}\.\d{2}/.test(clean)) {
    clean = clean.replace(/\./g, '-');
  } else if (/^\d{2}\.\d{2}\.\d{4}/.test(clean)) {
    const match = clean.match(/^(\d{2})\.(\d{2})\.(\d{4})(.*)$/);
    if (match) {
      clean = `${match[3]}-${match[2]}-${match[1]}${match[4]}`;
    }
  }
  
  const d = new Date(clean);
  if (isNaN(d.getTime())) {
    return '';
  }
  return d.toISOString();
}

function mapHeaders(headers: string[]): Record<string, number> {
  const normalized = headers.map(h => h.trim().toLowerCase());
  const mapping: Record<string, number> = {};

  const findIndex = (keys: string[]) => {
    return normalized.findIndex((h) => keys.some(key => h === key || h.includes(key)));
  };

  const ticketIdx = findIndex(['ticket', 'order', 'deal', 'position', '#']);
  if (ticketIdx !== -1) mapping.ticket = ticketIdx;

  const symbolIdx = findIndex(['symbol', 'item', 'asset', 'instrument']);
  if (symbolIdx !== -1) mapping.symbol = symbolIdx;

  const typeIdx = findIndex(['type', 'action', 'direction']);
  if (typeIdx !== -1) mapping.type = typeIdx;

  const volumeIdx = findIndex(['volume', 'size', 'lots', 'lot', 'vol']);
  if (volumeIdx !== -1) mapping.volume = volumeIdx;

  const profitIdx = findIndex(['profit', 'gain', 'pnl', 'gross profit']);
  if (profitIdx !== -1) mapping.profit = profitIdx;

  const commIdx = findIndex(['commission', 'comm.', 'fee', 'fees', 'comm']);
  if (commIdx !== -1) mapping.commission = commIdx;

  let openPriceIdx = findIndex(['open price', 'openprice', 'entry price', 'entryprice']);
  let closePriceIdx = findIndex(['close price', 'closeprice', 'exit price', 'exitprice']);
  if (openPriceIdx === -1 || closePriceIdx === -1) {
    const priceIndices = normalized.reduce<number[]>((acc, h, idx) => {
      if (h === 'price' || h.includes('price')) {
        acc.push(idx);
      }
      return acc;
    }, []);
    if (priceIndices.length >= 2) {
      if (openPriceIdx === -1) openPriceIdx = priceIndices[0];
      if (closePriceIdx === -1) closePriceIdx = priceIndices[1];
    } else if (priceIndices.length === 1 && openPriceIdx === -1) {
      openPriceIdx = priceIndices[0];
    }
  }
  if (openPriceIdx !== -1) mapping.open_price = openPriceIdx;
  if (closePriceIdx !== -1) mapping.close_price = closePriceIdx;

  let openTimeIdx = findIndex(['open time', 'opentime', 'entry time', 'entrytime']);
  let closeTimeIdx = findIndex(['close time', 'closetime', 'exit time', 'exittime']);
  if (openTimeIdx === -1 || closeTimeIdx === -1) {
    const timeIndices = normalized.reduce<number[]>((acc, h, idx) => {
      if (h === 'time' || h.includes('time')) {
        acc.push(idx);
      }
      return acc;
    }, []);
    if (timeIndices.length >= 2) {
      if (openTimeIdx === -1) openTimeIdx = timeIndices[0];
      if (closeTimeIdx === -1) closeTimeIdx = timeIndices[1];
    } else if (timeIndices.length === 1 && openTimeIdx === -1) {
      openTimeIdx = timeIndices[0];
    }
  }
  if (openTimeIdx !== -1) mapping.open_time = openTimeIdx;
  if (closeTimeIdx !== -1) mapping.close_time = closeTimeIdx;

  return mapping;
}

interface TradeHistoryClientProps {
  trades: Trade[];
  symbols: string[];
  userId: string;
}

type SortField = 'ticket' | 'symbol' | 'type' | 'volume' | 'open_price' | 'close_price' | 'open_time' | 'close_time' | 'profit' | 'commission';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 20;

export default function TradeHistoryClient({
  trades,
  symbols,
  userId,
}: TradeHistoryClientProps) {
  const { formatCurrency, filterTrades } = useCurrency();

  const [localTrades, setLocalTrades] = useState<Trade[]>(trades);

  // AI Review States
  const [selectedTradeForAI, setSelectedTradeForAI] = useState<Trade | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [aiReview, setAiReview] = useState<{
    entryExitEvaluation: string;
    riskRewardEvaluation: string;
    suggestions: string;
  } | null>(null);

  const handleAIReview = async (trade: Trade) => {
    setSelectedTradeForAI(trade);
    setIsReviewing(true);
    setAiReview(null);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'review',
          trade,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Maaf, terjadi kendala teknis. Tim kami akan segera memperbaikinya.');
      }
      setAiReview(data);
    } catch (err: unknown) {
      console.error('Error fetching AI trade review:', err);
      let errMsg = 'Maaf, terjadi kendala teknis. Tim kami akan segera memperbaikinya.';
      if (err instanceof Error) {
        const msg = err.message;
        if (msg.includes('gangguan sementara') || msg.includes('kendala teknis')) {
          errMsg = msg;
        } else {
          const lower = msg.toLowerCase();
          if (
            lower.includes('503') ||
            lower.includes('service unavailable') ||
            lower.includes('overload') ||
            lower.includes('timeout') ||
            lower.includes('deadline exceeded')
          ) {
            errMsg = 'Maaf, asisten AI sedang mengalami gangguan sementara. Silakan coba lagi dalam beberapa saat. Jika masalah berlanjut, Anda tetap bisa mengakses semua fitur trading journal seperti biasa.';
          }
        }
      }
      alert(errMsg);
      setSelectedTradeForAI(null);
    } finally {
      setIsReviewing(false);
    }
  };


  // Import CSV states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'importing' | 'summary'>('upload');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});
  const [existingTickets, setExistingTickets] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState({ imported: 0, duplicates: 0, invalid: 0 });
  const [dragOverImport, setDragOverImport] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Export states
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Delete states
  const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // Sync state if server props change
  useEffect(() => {
    setLocalTrades(trades);
  }, [trades]);

  // Subscribe to real-time updates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('schema-db-changes-history')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trades',
        },
        (payload) => {
          setLocalTrades((prevTrades) => {
            if (payload.eventType === 'INSERT') {
              const newTrade = payload.new as Trade;
              if (prevTrades.some((t) => t.id === newTrade.id)) {
                return prevTrades;
              }
              const updated = [newTrade, ...prevTrades];
              return updated.sort((a, b) => new Date(b.close_time).getTime() - new Date(a.close_time).getTime());
            } else if (payload.eventType === 'UPDATE') {
              const updatedTrade = payload.new as Trade;
              return prevTrades.map((t) => (t.id === updatedTrade.id ? updatedTrade : t));
            } else if (payload.eventType === 'DELETE') {
              const oldTrade = payload.old as { id: string };
              return prevTrades.filter((t) => t.id !== oldTrade.id);
            }
            return prevTrades;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Journal Drawer State
  const [selectedTradeForJournal, setSelectedTradeForJournal] = useState<Trade | null>(null);
  const [journalNotes, setJournalNotes] = useState('');
  const [journalStrategy, setJournalStrategy] = useState('');
  const [journalRating, setJournalRating] = useState(0);
  const [journalFile, setJournalFile] = useState<File | null>(null);
  const [journalFileUrl, setJournalFileUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Lightbox State
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Close lightbox on Escape press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxUrl(null);
      }
    };
    if (lightboxUrl) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxUrl]);

  const openJournalDrawer = (trade: Trade) => {
    setSelectedTradeForJournal(trade);
    setJournalNotes(trade.notes || '');
    setJournalStrategy(trade.strategy_tag || '');
    setJournalRating(trade.rating || 0);
    setJournalFile(null);
    setJournalFileUrl(trade.screenshot_url || null);
    setSaveError(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        setJournalFile(file);
        setJournalFileUrl(URL.createObjectURL(file));
      }
    }
  };

  const saveJournal = async () => {
    if (!selectedTradeForJournal) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const supabase = createClient();
      let finalScreenshotUrl = journalFileUrl;

      // Upload file if new one selected
      if (journalFile) {
        const fileExt = journalFile.name.split('.').pop();
        const filePath = `${selectedTradeForJournal.user_id}/${selectedTradeForJournal.id}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('trade-screenshots')
          .upload(filePath, journalFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('trade-screenshots')
          .getPublicUrl(filePath);

        finalScreenshotUrl = data.publicUrl;
      }

      // Update trade database
      const { error: updateError } = await supabase
        .from('trades')
        .update({
          notes: journalNotes || null,
          strategy_tag: journalStrategy || null,
          rating: journalRating > 0 ? journalRating : null,
          screenshot_url: finalScreenshotUrl || null,
        })
        .eq('id', selectedTradeForJournal.id);

      if (updateError) throw updateError;

      // Update local state so UI updates instantly
      setLocalTrades((prev) =>
        prev.map((t) =>
          t.id === selectedTradeForJournal.id
            ? {
                ...t,
                notes: journalNotes || null,
                strategy_tag: journalStrategy || null,
                rating: journalRating > 0 ? journalRating : null,
                screenshot_url: finalScreenshotUrl || null,
              }
            : t
        )
      );

      // Close drawer
      setSelectedTradeForJournal(null);
    } catch (err) {
      console.error('Error saving trade journal:', err);
      setSaveError('Failed to save journal. Ensure your database tables are migrated and bucket is active.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTrade = async () => {
    if (!tradeToDelete) return;
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', tradeToDelete.id);

      if (error) throw error;

      // Update local state to instantly reflect delete
      setLocalTrades((prev) => prev.filter((t) => t.id !== tradeToDelete.id));

      setToast({ message: `Trade #${tradeToDelete.ticket} successfully deleted`, type: 'success' });
      
      // Auto clear toast
      setTimeout(() => {
        setToast(null);
      }, 4000);

      // Close modal
      setTradeToDelete(null);
    } catch (err) {
      console.error('Error deleting trade:', err);
      setToast({ message: 'Failed to delete trade. Please try again.', type: 'error' });
      setTimeout(() => {
        setToast(null);
      }, 4000);
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV Import handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverImport(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setImportError(null);
    if (!file.name.endsWith('.csv')) {
      setImportError('Please upload a valid CSV file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setImportError('Failed to read file content.');
        return;
      }

      const rows = parseCSV(text);
      if (rows.length < 2) {
        setImportError('The uploaded file does not contain enough data.');
        return;
      }

      const headers = rows[0].map(h => h.trim());
      const dataRows = rows.slice(1);

      setCsvHeaders(headers);
      setCsvRows(dataRows);
      
      // Auto mapping
      const mapping = mapHeaders(headers);
      setColumnMapping(mapping);

      // Fetch existing tickets for duplicate validation
      if (currentUser) {
        try {
          const supabase = createClient();
          const { data } = await supabase
            .from('trades')
            .select('ticket')
            .eq('user_id', currentUser.id);
          
          const ticketSet = new Set<string>((data || []).map((t) => String(t.ticket)));
          setExistingTickets(ticketSet);
        } catch (err) {
          console.error('Error fetching existing tickets:', err);
        }
      }
      
      setImportStep('preview');
    };
    reader.onerror = () => {
      setImportError('Error reading file.');
    };
    reader.readAsText(file);
  };

  const handleMappingChange = (fieldKey: string, columnIndex: number) => {
    setColumnMapping((prev) => ({
      ...prev,
      [fieldKey]: columnIndex,
    }));
  };

  const closeImportModal = () => {
    setIsImportModalOpen(false);
    setImportStep('upload');
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMapping({});
    setImportProgress(0);
    setImportError(null);
  };

  // Dynamic Validation Report
  const validationReport = useMemo(() => {
    if (!csvRows.length || !columnMapping) return { valid: 0, duplicates: 0, invalid: 0, trades: [] };
    
    const tradesList: TradeInsert[] = [];
    let duplicates = 0;
    let invalid = 0;
    
    for (const row of csvRows) {
      const ticketVal = columnMapping.ticket !== undefined && columnMapping.ticket !== -1 ? row[columnMapping.ticket] : '';
      const symbolVal = columnMapping.symbol !== undefined && columnMapping.symbol !== -1 ? row[columnMapping.symbol] : '';
      const typeVal = columnMapping.type !== undefined && columnMapping.type !== -1 ? row[columnMapping.type] : '';
      const volumeVal = columnMapping.volume !== undefined && columnMapping.volume !== -1 ? row[columnMapping.volume] : '';
      const openPriceVal = columnMapping.open_price !== undefined && columnMapping.open_price !== -1 ? row[columnMapping.open_price] : '';
      const closePriceVal = columnMapping.close_price !== undefined && columnMapping.close_price !== -1 ? row[columnMapping.close_price] : '';
      const openTimeVal = columnMapping.open_time !== undefined && columnMapping.open_time !== -1 ? row[columnMapping.open_time] : '';
      const closeTimeVal = columnMapping.close_time !== undefined && columnMapping.close_time !== -1 ? row[columnMapping.close_time] : '';
      const profitVal = columnMapping.profit !== undefined && columnMapping.profit !== -1 ? row[columnMapping.profit] : '';
      const commVal = columnMapping.commission !== undefined && columnMapping.commission !== -1 ? row[columnMapping.commission] : '';
      
      const ticketNum = cleanNumber(ticketVal);
      const symbol = symbolVal ? symbolVal.trim().toUpperCase() : '';
      
      let type: 'BUY' | 'SELL' | null = null;
      const lowerType = typeVal ? typeVal.toLowerCase() : '';
      if (lowerType.includes('buy')) {
        type = 'BUY';
      } else if (lowerType.includes('sell')) {
        type = 'SELL';
      }
      
      const volume = cleanNumber(volumeVal);
      const openPrice = cleanNumber(openPriceVal);
      const closePrice = cleanNumber(closePriceVal);
      
      const openTimeIso = cleanDate(openTimeVal);
      const closeTimeIso = cleanDate(closeTimeVal);
      
      const profit = cleanNumber(profitVal);
      const commission = commVal ? cleanNumber(commVal) : 0;
      
      if (!ticketNum || !symbol || !type || volume <= 0 || openPrice <= 0 || closePrice <= 0 || !openTimeIso || !closeTimeIso) {
        invalid++;
        continue;
      }
      
      if (existingTickets.has(String(ticketNum))) {
        duplicates++;
        continue;
      }
      
      tradesList.push({
        user_id: currentUser?.id || '',
        ticket: ticketNum,
        symbol,
        type,
        volume,
        open_price: openPrice,
        close_price: closePrice,
        open_time: openTimeIso,
        close_time: closeTimeIso,
        profit,
        commission,
      });
    }
    
    return {
      valid: tradesList.length,
      duplicates,
      invalid,
      trades: tradesList
    };
  }, [csvRows, columnMapping, existingTickets, currentUser]);

  const handleImport = async () => {
    if (!currentUser) {
      alert('User not authenticated.');
      return;
    }
    
    setIsImporting(true);
    setImportStep('importing');
    setImportProgress(0);
    
    try {
      const supabase = createClient();
      const toInsert = validationReport.trades;
      const totalToInsert = toInsert.length;
      
      if (totalToInsert === 0) {
        setImportSummary({
          imported: 0,
          duplicates: validationReport.duplicates,
          invalid: validationReport.invalid,
        });
        setImportStep('summary');
        return;
      }
      
      const batchSize = 100;
      let imported = 0;
      
      for (let i = 0; i < totalToInsert; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        const { error } = await supabase.from('trades').insert(batch);
        
        if (error) {
          console.error('Batch insert error:', error);
          throw error;
        }
        
        imported += batch.length;
        setImportProgress(Math.round((imported / totalToInsert) * 100));
      }
      
      // Refresh local trades
      const { data: updatedTrades } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('close_time', { ascending: false });
        
      if (updatedTrades) {
        setLocalTrades(updatedTrades as Trade[]);
      }
      
      setImportSummary({
        imported,
        duplicates: validationReport.duplicates,
        invalid: validationReport.invalid,
      });
      setImportStep('summary');
    } catch (err) {
      console.error('Error during trade import:', err);
      alert('Import failed. Please check file format and try again.');
      setImportStep('preview');
    } finally {
      setIsImporting(false);
    }
  };

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
    let result = filterTrades(localTrades);

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
  }, [localTrades, dateFrom, dateTo, filterSymbol, filterType, sortField, sortDirection, filterTrades]);

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setIsImportModalOpen(true);
              setImportStep('upload');
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/40 hover:bg-slate-750 hover:border-slate-600 text-slate-200 text-sm font-medium transition-all duration-200"
          >
            <Upload size={16} />
            Import CSV
          </button>

          {/* Export Modal Button */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/40 hover:bg-slate-750 hover:border-slate-600 text-slate-200 text-sm font-medium transition-all duration-200"
          >
            <Download size={16} className="text-blue-400" />
            Export
          </button>

          {/* Notification Bell */}
          <NotificationBell userId={userId} />
        </div>
      </div>

      {/* Filters */}
      <div className="relative z-10 rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-4 lg:p-6 shadow-xl shadow-black/10 animate-fade-in delay-100">
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
                  <th className="text-right py-3.5 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider select-none">
                    Journal
                  </th>
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
                    <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap" suppressHydrationWarning>
                      {formatDate(trade.open_time)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap" suppressHydrationWarning>
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
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* AI Review Button */}
                        <button
                          onClick={() => handleAIReview(trade)}
                          className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 hover:bg-purple-500/20 transition-all duration-200"
                          title="AI Review"
                        >
                          <Brain size={14} />
                        </button>

                        <div className="relative inline-block group">
                          <button
                            onClick={() => openJournalDrawer(trade)}
                            className={cn(
                              'p-2 rounded-xl transition-all duration-200 border',
                              (trade.notes || trade.rating || trade.strategy_tag || trade.screenshot_url)
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-slate-700/30 border-slate-700/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                            )}
                            title="Open Journal"
                          >
                            <BookOpen size={14} />
                          </button>

                          {/* Tooltip on Hover */}
                          {(trade.notes || trade.rating || trade.strategy_tag || trade.screenshot_url) && (
                            <div className="absolute right-0 bottom-full mb-2 hidden group-hover:flex flex-col gap-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 p-3.5 rounded-xl shadow-2xl z-30 pointer-events-none text-left select-none animate-fade-in">
                              {trade.strategy_tag && (
                                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Strategy</span>
                                  <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">{trade.strategy_tag}</span>
                                </div>
                              )}
                              {trade.rating && (
                                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Rating</span>
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <Star
                                        key={s}
                                        size={10}
                                        className={cn(
                                          s <= (trade.rating || 0)
                                            ? "text-amber-400 fill-amber-400"
                                            : "text-slate-700"
                                        )}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {trade.notes && (
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Notes</span>
                                  <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed font-medium italic">&ldquo;{trade.notes}&rdquo;</p>
                                </div>
                              )}
                              {trade.screenshot_url && (
                                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                                  <span>Screenshot Chart</span>
                                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                    ● Attached
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Delete Trade Button */}
                        <button
                          onClick={() => setTradeToDelete(trade)}
                          className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:border-red-500/40 text-red-450 hover:bg-red-500/20 transition-all duration-200"
                          title="Delete Trade"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
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

      {/* Journal Right Drawer */}
      {selectedTradeForJournal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          {/* Backdrop click to cancel */}
          <div className="absolute inset-0" onClick={() => setSelectedTradeForJournal(null)} />

          {/* Drawer container */}
          <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 overflow-y-auto flex flex-col shadow-2xl z-10 animate-slide-in-right">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <BookOpen size={20} className="text-blue-500" />
                  Trade Journal
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Ticket #{selectedTradeForJournal.ticket} • {selectedTradeForJournal.symbol} • {selectedTradeForJournal.type}
                </p>
              </div>
              <button
                onClick={() => setSelectedTradeForJournal(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Message */}
            {saveError && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium">
                {saveError}
              </div>
            )}

            {/* Form */}
            <div className="flex-1 space-y-5">
              {/* Strategy Tag */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                  Strategy Tag
                </label>
                <select
                  value={journalStrategy}
                  onChange={(e) => setJournalStrategy(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700/50 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all appearance-none cursor-pointer"
                >
                  <option value="">No Strategy</option>
                  <option value="Breakout">Breakout</option>
                  <option value="Reversal">Reversal</option>
                  <option value="Trend">Trend</option>
                  <option value="Scalping">Scalping</option>
                  <option value="Swing">Swing</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Star Rating */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                  Trade Rating
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setJournalRating(star)}
                      className={cn(
                        "p-1 rounded-lg transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-blue-500",
                        star <= journalRating
                          ? "text-amber-400 scale-110"
                          : "text-slate-600 hover:text-slate-500 hover:scale-105"
                      )}
                    >
                      <Star size={24} fill={star <= journalRating ? "currentColor" : "none"} />
                    </button>
                  ))}
                  {journalRating > 0 && (
                    <button
                      type="button"
                      onClick={() => setJournalRating(0)}
                      className="ml-2 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Reason Entry */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                  Reason for Entry / Notes
                </label>
                <textarea
                  value={journalNotes}
                  onChange={(e) => setJournalNotes(e.target.value)}
                  placeholder="Explain why you took this trade, mistakes, learnings..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700/50 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all resize-none"
                />
              </div>

              {/* Screenshot Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                  Screenshot Chart
                </label>
                
                {journalFileUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 group cursor-pointer">
                    <img
                      src={journalFileUrl}
                      alt="Trade screenshot"
                      className="w-full max-h-48 object-contain"
                      onClick={() => setLightboxUrl(journalFileUrl)}
                      onDoubleClick={() => setLightboxUrl(journalFileUrl)}
                    />
                    
                    {/* Zoom Hint Icon (Always visible at corner) */}
                    <button
                      type="button"
                      onClick={() => setLightboxUrl(journalFileUrl)}
                      className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white hover:scale-105 transition-all z-10"
                      title="Zoom screenshot"
                    >
                      <Maximize2 size={12} />
                    </button>

                    <div 
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity duration-200"
                      onClick={(e) => {
                        if (e.target === e.currentTarget) {
                          setLightboxUrl(journalFileUrl);
                        }
                      }}
                      onDoubleClick={() => setLightboxUrl(journalFileUrl)}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        id="screenshot-change"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            setJournalFile(file);
                            setJournalFileUrl(URL.createObjectURL(file));
                          }
                        }}
                      />
                      <label
                        htmlFor="screenshot-change"
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg cursor-pointer transition-colors"
                      >
                        Change
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setJournalFile(null);
                          setJournalFileUrl(null);
                        }}
                        className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2",
                      dragActive
                        ? "border-blue-500 bg-blue-500/5"
                        : "border-slate-800 hover:border-slate-700 hover:bg-slate-800/10"
                    )}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      id="screenshot-upload"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setJournalFile(file);
                          setJournalFileUrl(URL.createObjectURL(file));
                        }
                      }}
                    />
                    <label
                      htmlFor="screenshot-upload"
                      className="cursor-pointer flex flex-col items-center gap-2 w-full h-full"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                        <Upload size={18} />
                      </div>
                      <div className="text-xs text-slate-400">
                        <span className="font-semibold text-blue-500">Click to upload</span> or drag and drop
                      </div>
                      <div className="text-[10px] text-slate-600">
                        PNG, JPG or WEBP up to 5MB
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-slate-800 pt-4 mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedTradeForJournal(null)}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl border border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveJournal}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Journal'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop click to close */}
          <div className="absolute inset-0 cursor-zoom-out" onClick={() => setLightboxUrl(null)} />

          {/* Close button in top-right */}
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-6 right-6 p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all z-10"
            title="Close Zoom"
          >
            <X size={20} />
          </button>

          {/* Fullscreen image container */}
          <div className="relative max-w-[90%] max-h-[90%] z-10 animate-scale-in">
            <img
              src={lightboxUrl}
              alt="Trade screenshot fullscreen"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-slate-800"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop click to close */}
          <div 
            className="absolute inset-0 cursor-default" 
            onClick={() => !isImporting && closeImportModal()} 
          />

          {/* Modal container */}
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Upload size={20} className="text-blue-500" />
                  Import CSV MT4 / MT5
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload trade reports from MetaTrader to sync your journal
                </p>
              </div>
              {!isImporting && (
                <button
                  onClick={closeImportModal}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* STEP 1: UPLOAD */}
              {importStep === 'upload' && (
                <div className="space-y-4">
                  {importError && (
                    <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400 font-medium">
                      {importError}
                    </div>
                  )}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverImport(true);
                    }}
                    onDragLeave={() => setDragOverImport(false)}
                    onDrop={handleFileDrop}
                    onClick={() => document.getElementById('csv-file-input')?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3",
                      dragOverImport
                        ? "border-blue-500 bg-blue-500/5"
                        : "border-slate-800 hover:border-slate-700 hover:bg-slate-800/10"
                    )}
                  >
                    <input
                      type="file"
                      accept=".csv"
                      id="csv-file-input"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 shadow-inner">
                      <Upload size={22} className="text-blue-500" />
                    </div>
                    <div className="text-sm font-semibold text-slate-200">
                      Drag and drop your CSV file here
                    </div>
                    <div className="text-xs text-slate-500">
                      or <span className="text-blue-500 hover:underline font-medium">browse files</span> from your computer
                    </div>
                    <div className="text-[10px] bg-slate-800/50 text-slate-400 border border-slate-800 px-3 py-1 rounded-md mt-2">
                      Supports standard exports from MT4 & MT5
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: PREVIEW & MAPPING */}
              {importStep === 'preview' && (
                <div className="space-y-6">
                  {REQUIRED_FIELDS.some(f => f.required && (columnMapping[f.key] === undefined || columnMapping[f.key] === -1)) && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-400 font-medium">
                      Please map all required columns marked with (*) to enable import.
                    </div>
                  )}

                  {/* Header Mapping Section */}
                  <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-4 space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Column Field Mapping
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {REQUIRED_FIELDS.map((field) => {
                        const isMapped = columnMapping[field.key] !== undefined && columnMapping[field.key] !== -1;
                        return (
                          <div key={field.key} className="space-y-1.5">
                            <label className="block text-xs font-medium text-slate-400">
                              {field.label} {field.required && <span className="text-red-400">*</span>}
                            </label>
                            <select
                              value={columnMapping[field.key] !== undefined ? columnMapping[field.key] : -1}
                              onChange={(e) => handleMappingChange(field.key, parseInt(e.target.value))}
                              className={cn(
                                "w-full px-3 py-2 rounded-xl text-xs bg-slate-900 border text-slate-300 focus:outline-none focus:ring-1 transition-all cursor-pointer",
                                isMapped 
                                  ? "border-slate-800 focus:ring-blue-500/40 focus:border-blue-500/40" 
                                  : field.required 
                                    ? "border-red-500/30 focus:ring-red-500/40 focus:border-red-500/40 text-red-400"
                                    : "border-slate-800 focus:ring-slate-500/40 focus:border-slate-500/40"
                              )}
                            >
                              <option value={-1}>-- Ignore Field --</option>
                              {csvHeaders.map((header, idx) => (
                                <option key={idx} value={idx}>
                                  {header || `Column ${idx + 1}`}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Preview Table Section */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Preview Mapped Data (First 5 Rows)
                    </h4>
                    <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-900/50">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-800/40 border-b border-slate-800 text-[10px] text-slate-500 uppercase font-semibold">
                            <th className="p-3">Ticket</th>
                            <th className="p-3">Symbol</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Vol</th>
                            <th className="p-3 text-right">Open Price</th>
                            <th className="p-3 text-right">Close Price</th>
                            <th className="p-3">Open Time</th>
                            <th className="p-3">Close Time</th>
                            <th className="p-3 text-right">Profit</th>
                            <th className="p-3 text-right">Comm.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {csvRows.slice(0, 5).map((row, rowIdx) => {
                            const ticketVal = columnMapping.ticket !== undefined && columnMapping.ticket !== -1 ? row[columnMapping.ticket] : '';
                            const symbolVal = columnMapping.symbol !== undefined && columnMapping.symbol !== -1 ? row[columnMapping.symbol] : '';
                            const typeVal = columnMapping.type !== undefined && columnMapping.type !== -1 ? row[columnMapping.type] : '';
                            const volumeVal = columnMapping.volume !== undefined && columnMapping.volume !== -1 ? row[columnMapping.volume] : '';
                            const openPriceVal = columnMapping.open_price !== undefined && columnMapping.open_price !== -1 ? row[columnMapping.open_price] : '';
                            const closePriceVal = columnMapping.close_price !== undefined && columnMapping.close_price !== -1 ? row[columnMapping.close_price] : '';
                            const openTimeVal = columnMapping.open_time !== undefined && columnMapping.open_time !== -1 ? row[columnMapping.open_time] : '';
                            const closeTimeVal = columnMapping.close_time !== undefined && columnMapping.close_time !== -1 ? row[columnMapping.close_time] : '';
                            const profitVal = columnMapping.profit !== undefined && columnMapping.profit !== -1 ? row[columnMapping.profit] : '';
                            const commVal = columnMapping.commission !== undefined && columnMapping.commission !== -1 ? row[columnMapping.commission] : '';

                            const ticketNum = cleanNumber(ticketVal);
                            const symbol = symbolVal ? symbolVal.trim().toUpperCase() : '-';
                            let type = 'BUY';
                            if (typeVal) {
                              const lt = typeVal.toLowerCase();
                              if (lt.includes('sell')) type = 'SELL';
                            }
                            const volume = cleanNumber(volumeVal);
                            const openPrice = cleanNumber(openPriceVal);
                            const closePrice = cleanNumber(closePriceVal);
                            const profit = cleanNumber(profitVal);
                            const commission = commVal ? cleanNumber(commVal) : 0;

                            return (
                              <tr key={rowIdx} className="hover:bg-slate-800/20 text-slate-300 font-medium">
                                <td className="p-3 text-slate-500 font-mono">{ticketNum || ticketVal || '-'}</td>
                                <td className="p-3 text-slate-200">{symbol}</td>
                                <td className="p-3">
                                  {typeVal ? (
                                    <span className={cn(
                                      "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                      type === 'BUY' ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                                    )}>
                                      {type}
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className="p-3">{volume.toFixed(2)}</td>
                                <td className="p-3 text-right font-mono">{openPrice.toFixed(5)}</td>
                                <td className="p-3 text-right font-mono">{closePrice.toFixed(5)}</td>
                                <td className="p-3 text-[10px] text-slate-500 whitespace-nowrap" suppressHydrationWarning>{openTimeVal ? formatDate(cleanDate(openTimeVal)) : '-'}</td>
                                <td className="p-3 text-[10px] text-slate-500 whitespace-nowrap" suppressHydrationWarning>{closeTimeVal ? formatDate(cleanDate(closeTimeVal)) : '-'}</td>
                                <td className={cn(
                                  "p-3 text-right font-semibold",
                                  profit >= 0 ? "text-emerald-400" : "text-red-400"
                                )}>
                                  {formatCurrency(profit)}
                                </td>
                                <td className="p-3 text-right text-slate-500 font-mono">{formatCurrency(commission)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary of validation */}
                  <div className="grid grid-cols-3 gap-3 border-t border-slate-800 pt-4">
                    <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl text-center">
                      <div className="text-xs text-slate-500 font-medium">Valid to Import</div>
                      <div className="text-xl font-bold text-emerald-400 mt-1">
                        {validationReport.valid}
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl text-center" title="Trades that already exist in database (same ticket ID)">
                      <div className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1">
                        Duplicates <span className="text-[10px] text-slate-600">(Skip)</span>
                      </div>
                      <div className="text-xl font-bold text-amber-400 mt-1">
                        {validationReport.duplicates}
                      </div>
                    </div>
                    <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl text-center" title="Rows missing required fields or having negative values">
                      <div className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1">
                        Invalid <span className="text-[10px] text-slate-600">(Skip)</span>
                      </div>
                      <div className="text-xl font-bold text-red-400 mt-1">
                        {validationReport.invalid}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: IMPORTING */}
              {importStep === 'importing' && (
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <Loader2 size={36} className="text-blue-500 animate-spin" />
                  </div>
                  <div className="text-center space-y-2">
                    <h4 className="text-sm font-semibold text-slate-200">Importing trades...</h4>
                    <p className="text-xs text-slate-500">Writing records to database. Please do not close this modal.</p>
                  </div>
                  <div className="w-full max-w-md bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(37,99,235,0.5)]"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-400 font-mono font-medium">
                    {importProgress}%
                  </div>
                </div>
              )}

              {/* STEP 4: SUMMARY */}
              {importStep === 'summary' && (
                <div className="space-y-6 py-4">
                  <div className="flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-bold text-slate-100">Import Completed</h4>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Your trading reports have been processed successfully.
                    </p>
                  </div>

                  <div className="max-w-md mx-auto bg-slate-800/40 border border-slate-800 rounded-xl divide-y divide-slate-800 overflow-hidden">
                    <div className="flex justify-between p-4 text-sm">
                      <span className="text-slate-400 font-medium">Successfully Imported</span>
                      <span className="text-emerald-400 font-bold">{importSummary.imported} trades</span>
                    </div>
                    <div className="flex justify-between p-4 text-sm">
                      <span className="text-slate-400 font-medium">Duplicates Skipped</span>
                      <span className="text-amber-400 font-semibold">{importSummary.duplicates} trades</span>
                    </div>
                    <div className="flex justify-between p-4 text-sm">
                      <span className="text-slate-400 font-medium">Invalid Rows Skipped</span>
                      <span className="text-red-400 font-semibold">{importSummary.invalid} rows</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer Actions */}
            {importStep !== 'importing' && (
              <div className="p-5 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
                {importStep === 'upload' && (
                  <button
                    onClick={closeImportModal}
                    className="px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-sm font-medium transition-all duration-150"
                  >
                    Cancel
                  </button>
                )}

                {importStep === 'preview' && (
                  <>
                    <button
                      onClick={() => setImportStep('upload')}
                      className="px-5 py-2.5 rounded-xl border border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-sm font-medium transition-all duration-150"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={REQUIRED_FIELDS.some(f => f.required && (columnMapping[f.key] === undefined || columnMapping[f.key] === -1))}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none text-white text-sm font-medium transition-all duration-200 shadow-lg shadow-blue-500/25"
                    >
                      Import Trades
                    </button>
                  </>
                )}

                {importStep === 'summary' && (
                  <button
                    onClick={closeImportModal}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all duration-200 shadow-lg shadow-blue-500/25"
                  >
                    Close
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        trades={localTrades}
      />

      {/* AI Review Modal */}
      {selectedTradeForAI && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0e0e1e] border border-purple-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-purple-950/20 animate-scale-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-purple-500/10 bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Brain size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    AI Trade Review
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Analisis transaksi untuk ticket #{selectedTradeForAI.ticket}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTradeForAI(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Quick Trade Specs */}
              <div className="grid grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 text-center font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-sans font-semibold tracking-wider">Symbol</span>
                  <span className="text-sm font-bold text-slate-200">{selectedTradeForAI.symbol}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-sans font-semibold tracking-wider">Type</span>
                  <span className={cn(
                    "text-xs font-extrabold px-2 py-0.5 rounded-md inline-block mt-0.5",
                    selectedTradeForAI.type === 'BUY' ? "bg-emerald-500/10 text-emerald-450" : "bg-red-500/10 text-red-450"
                  )}>{selectedTradeForAI.type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-sans font-semibold tracking-wider">Volume</span>
                  <span className="text-sm font-bold text-slate-200">{selectedTradeForAI.volume.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-sans font-semibold tracking-wider">Profit</span>
                  <span className={cn(
                    "text-sm font-bold",
                    selectedTradeForAI.profit >= 0 ? "text-emerald-400" : "text-red-400"
                  )}>{formatCurrency(selectedTradeForAI.profit)}</span>
                </div>
              </div>

              {/* Loader */}
              {isReviewing && (
                <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
                  <Loader2 size={32} className="text-purple-500 animate-spin" />
                  <p className="text-sm font-semibold text-purple-300">AI sedang meninjau transaksi Anda...</p>
                  <p className="text-xs text-slate-500">Menganalisis efisiensi eksekusi entry/exit serta parameter risiko.</p>
                </div>
              )}

              {/* Review Sections */}
              {aiReview && !isReviewing && (
                <div className="space-y-4 animate-fade-in">
                  {/* Entry/Exit Evaluation */}
                  <div className="p-4 rounded-xl border border-purple-500/10 bg-purple-500/5 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider flex items-center gap-1.5">
                      <Sparkles size={12} /> Evaluasi Entry & Exit
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {aiReview.entryExitEvaluation}
                    </p>
                  </div>

                  {/* Risk/Reward Evaluation */}
                  <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-1.5">
                      📊 Evaluasi Risk & Reward
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {aiReview.riskRewardEvaluation}
                    </p>
                  </div>

                  {/* Suggestions */}
                  <div className="p-4 rounded-xl border border-slate-700/60 bg-slate-800/20 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                      💡 Saran untuk Trade Sejenis
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {aiReview.suggestions}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-purple-500/10 bg-slate-900/30 flex justify-end">
              <button
                onClick={() => setSelectedTradeForAI(null)}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-750 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/10 active:scale-[0.98]"
              >
                Tutup Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {tradeToDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop click to close */}
          <div 
            className="absolute inset-0 cursor-default" 
            onClick={() => !isDeleting && setTradeToDelete(null)} 
          />

          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Trash2 size={16} className="text-red-500" />
                Hapus Transaksi
              </h3>
              {!isDeleting && (
                <button
                  onClick={() => setTradeToDelete(null)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-6 space-y-3">
              <p className="text-sm text-slate-350 leading-relaxed">
                Hapus trade <span className="font-semibold text-white">#{tradeToDelete.ticket}</span> (<span className="font-semibold text-slate-200">{tradeToDelete.symbol}</span>)? Tindakan ini tidak bisa dibatalkan.
              </p>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTradeToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-xs font-semibold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteTrade}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all shadow-lg shadow-red-950/20 flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  'Hapus'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl animate-slide-in-right ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 size={16} />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
