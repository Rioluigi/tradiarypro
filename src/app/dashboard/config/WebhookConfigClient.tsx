'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Copy,
  Check,
  ExternalLink,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  BookOpen,
  FileCode,
  Settings,
  AlertCircle,
  Trash2,
  Plus,
  Download,
  Layers,
  CreditCard,
  Crown,
  Zap,
  Building2,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useTheme, ACCENT_COLORS, AccentColor } from '@/components/providers/ThemeProvider';
import { useCurrency } from '@/components/providers/AppProvider';
import NotificationBell from '@/components/layout/NotificationBell';

interface WebhookConfigClientProps {
  userId: string;
  userEmail: string;
  hasReceivedData: boolean;
  tradeCount: number;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionEndDate: string | null;
  hasStripeCustomer: boolean;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tradiarypro.vercel.app';
const WEBHOOK_URL = `${SITE_URL}/api/webhook`;

const EA_CODE = `//+------------------------------------------------------------------+
//|                                                 Tradiary_EA.mq5   |
//|                                                         Tradiary |
//|                                             https://tradiary.pro |
//+------------------------------------------------------------------+
#property copyright "Tradiary"
#property link      "https://tradiary.pro"
#property version   "1.01"
#property description "Expert Advisor to sync closed trades with Tradiary dashboard via webhook."
#property strict

//--- Input parameters
input string WebhookURL = "${WEBHOOK_URL}";
input string UserID     = ""; // Paste your User ID here
input string AccountID  = ""; // Paste your Account ID here
input bool   EnableLogs = true;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   if(EnableLogs)
   {
      Print("Tradiary EA Initialized.");
      Print("Webhook URL: ", WebhookURL);
      Print("User ID:     ", UserID);
      Print("Account ID:  ", AccountID);
   }
   
   // Check if WebhookURL or UserID is empty
   if(StringLen(WebhookURL) == 0)
   {
      Print("❌ Error: WebhookURL is not set.");
      return(INIT_PARAMETERS_INCORRECT);
   }
   if(StringLen(UserID) == 0)
   {
      Print("❌ Error: UserID is not set.");
      return(INIT_PARAMETERS_INCORRECT);
   }
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   if(EnableLogs)
   {
      Print("Tradiary EA Deinitialized. Reason: ", reason);
   }
}

//+------------------------------------------------------------------+
//| Helper to convert datetime to ISO 8601 string                    |
//+------------------------------------------------------------------+
string TimeToISOString(datetime time)
{
   MqlDateTime dt;
   TimeToStruct(time, dt);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ", dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec);
}

//+------------------------------------------------------------------+
//| Helper to format double to string ensuring dot decimal separator |
//+------------------------------------------------------------------+
string SanitizeDouble(double value, int digits)
{
   string s = DoubleToString(value, digits);
   StringReplace(s, ",", ".");
   return s;
}

//+------------------------------------------------------------------+
//| Expert trade transaction function                                |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   // We are only interested in additions of deals to the history
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD)
   {
      return;
   }
   
   ulong ticket = trans.deal;
   if(ticket == 0)
   {
      return;
   }
   
   // Select the deal from history to inspect it
   if(!HistoryDealSelect(ticket))
   {
      if(EnableLogs)
      {
         Print("❌ Failed to select deal ticket: ", ticket);
      }
      return;
   }
   
   // Get deal entry type
   ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY);
   
   // We only process closing deals (out, out by, or in/out reversal)
   if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_OUT_BY && entry != DEAL_ENTRY_INOUT)
   {
      if(EnableLogs)
      {
         Print("ℹ️ Deal ", ticket, " ignored (not a closing deal, entry type: ", EnumToString(entry), ")");
      }
      return;
   }
   
   // Gather deal information
   string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
   long type = HistoryDealGetInteger(ticket, DEAL_TYPE);
   double volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
   double price = HistoryDealGetDouble(ticket, DEAL_PRICE); // Close price
   double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
   double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
   datetime close_time = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
   
   // Determine the trade type (original position direction)
   string typeStr = (type == DEAL_TYPE_BUY) ? "SELL" : "BUY";
   
   // Find the corresponding opening deal to get the correct open price and open time
   ulong position_id = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
   double open_price = 0;
   datetime open_time = 0;
   
   if(HistorySelectByPosition(position_id))
   {
      int position_deals = HistoryDealsTotal();
      for(int j = 0; j < position_deals; j++)
      {
         ulong deal_ticket = HistoryDealGetTicket(j);
         if(deal_ticket == 0) continue;
         
         ENUM_DEAL_ENTRY deal_entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(deal_ticket, DEAL_ENTRY);
         if(deal_entry == DEAL_ENTRY_IN)
         {
            open_price = HistoryDealGetDouble(deal_ticket, DEAL_PRICE);
            open_time = (datetime)HistoryDealGetInteger(deal_ticket, DEAL_TIME);
            break;
         }
      }
   }
   
   // Fallback if opening deal is not found in history
   if(open_time == 0)
   {
      open_price = price;
      open_time = close_time - 1; // Ensure close_time is strictly greater than open_time
      if(EnableLogs)
      {
         Print("⚠️ Opening deal not found in history for position ", position_id, ". Using fallback open time.");
      }
   }
   
   // Format timestamps as ISO 8601 strings
   string openTimeISO = TimeToISOString(open_time);
   string closeTimeISO = TimeToISOString(close_time);
   
   // Build JSON payload
   string json = "{";
   json += "\\\"user_id\\\":\\\"" + UserID + "\\\",";
   if(StringLen(AccountID) > 0)
   {
      json += "\\\"account_id\\\":\\\"" + AccountID + "\\\",";
   }
   json += "\\\"ticket\\\":" + IntegerToString((long)ticket) + ",";
   json += "\\\"symbol\\\":\\\"" + symbol + "\\\",";
   json += "\\\"type\\\":\\\"" + typeStr + "\\\",";
   json += "\\\"volume\\\":" + SanitizeDouble(volume, 2) + ",";
   json += "\\\"open_price\\\":" + SanitizeDouble(open_price, 5) + ",";
   json += "\\\"close_price\\\":" + SanitizeDouble(price, 5) + ",";
   json += "\\\"open_time\\\":\\\"" + openTimeISO + "\\\",";
   json += "\\\"close_time\\\":\\\"" + closeTimeISO + "\\\",";
   json += "\\\"profit\\\":" + SanitizeDouble(profit, 2) + ",";
   json += "\\\"commission\\\":" + SanitizeDouble(commission, 2);
   json += "}";
   
   if(EnableLogs)
   {
      Print("Sending closed trade webhook to: ", WebhookURL);
      Print("Payload: ", json);
   }
   
   // Send HTTP POST request
   string headers = "Content-Type: application/json\\\\r\\\\n";
   char post[];
   char result_data[];
   string result_headers;
   
   // Copy string to char array *without* the trailing null-terminator (\\0)
   int json_len = StringLen(json);
   StringToCharArray(json, post, 0, json_len, CP_UTF8);
   
   if(EnableLogs)
   {
      Print("Payload length: ", json_len, " bytes, Send buffer size: ", ArraySize(post), " bytes");
   }
   
   // Call WebRequest synchronously (blocking) with a 5-second timeout
   int response_code = WebRequest("POST", WebhookURL, headers, 5000, post, result_data, result_headers);
   
   if(response_code == 200)
   {
      Print("✅ Trade successfully synced with Tradiary. Ticket: ", ticket, ", Symbol: ", symbol, ", P/L: ", profit);
   }
   else
   {
      string response_body = CharArrayToString(result_data, 0, WHOLE_ARRAY, CP_UTF8);
      Print("❌ Failed to sync trade. HTTP Status Code: ", response_code);
      Print("Response Body: ", response_body);
   }
}`;

// ─── Plan Data ───


export default function WebhookConfigClient({
  userId,
  hasReceivedData,
  tradeCount,
  subscriptionPlan,
  subscriptionStatus,
  subscriptionEndDate,
  hasStripeCustomer,
}: WebhookConfigClientProps) {
  const [activeTab, setActiveTab] = useState<'webhook' | 'appearance' | 'billing'>('webhook');
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'billing' || tab === 'appearance' || tab === 'webhook') {
        setActiveTab(tab);
      }
    }
  }, []);

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const {
    accounts,
    setAccounts,
    refreshAccounts,
    loadingAccounts,
  } = useCurrency();

  const [isAccountsLoading, setIsAccountsLoading] = useState(loadingAccounts);

  useEffect(() => {
    setIsAccountsLoading(loadingAccounts);
  }, [loadingAccounts]);

  useEffect(() => {
    if (isAccountsLoading) {
      const timer = setTimeout(() => {
        console.log('[WebhookConfigClient] 3-second timeout reached. Auto-resolving accounts loading to false.');
        setIsAccountsLoading(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAccountsLoading]);

  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null);

  // Form states
  const [accountNumber, setAccountNumber] = useState('');
  const [broker, setBroker] = useState('');
  const [platform, setPlatform] = useState<'MT4' | 'MT5'>('MT5');
  const [currency, setCurrency] = useState('USD');
  const [label, setLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    refreshAccounts(userId);
  }, [userId]);

  const supabase = useMemo(() => createClient(), []);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    setFormSuccess(null);

    if (!accountNumber.trim()) {
      setFormError('Account Number is required');
      return;
    }
    if (!broker.trim()) {
      setFormError('Broker name is required');
      return;
    }

    try {
      console.log('[handleAddAccount] Starting submission...', { accountNumber, broker, platform, currency, label });
      setSubmitting(true);
      
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          account_number: accountNumber.trim(),
          broker: broker.trim(),
          platform,
          currency,
          label: label.trim() || null
        })
      });

      const result = await res.json();
      console.log('[handleAddAccount] API response received:', result);

      if (!res.ok) {
        throw { message: result.error, code: result.code };
      }

      const { data: newAccount } = result;

      // Reset form immediately
      setAccountNumber('');
      setBroker('');
      setLabel('');
      setFormSuccess('Account added successfully!');

      // Optimistic update: add the new account to the top of the list
      if (newAccount) {
        console.log('[handleAddAccount] Performing optimistic state update with:', newAccount);
        setAccounts(prev => [newAccount, ...prev]);
      }



      setTimeout(() => setFormSuccess(null), 3000);
    } catch (err) {
      console.error('[handleAddAccount] Error caught in block:', err);
      let errorMsg = 'Failed to add account';
      const typedErr = err as { code?: string; message?: string };
      
      if (err instanceof Error && err.message === 'TIMEOUT') {
        errorMsg = 'Request timed out. Please check your connection and try again.';
      } else if (typedErr?.code === '23505') {
        errorMsg = 'This account number already exists.';
      } else if (typedErr?.message) {
        errorMsg = typedErr.message;
      }
      setFormError(errorMsg);
    } finally {
      console.log('[handleAddAccount] Finally block reached. Resetting submitting to false.');
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account? This will also delete all associated trades.')) {
      return;
    }

    try {
      console.log('[handleDeleteAccount] Deleting account:', id);
      const deletePromise = supabase
        .from('accounts')
        .delete()
        .eq('id', id);

      console.log('[handleDeleteAccount] Executing DB delete (8s timeout)...');
      const deleteResult = await Promise.race([
        deletePromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 8000))
      ]);
      
      console.log('[handleDeleteAccount] DB response received:', deleteResult);
      const { error } = deleteResult;
      if (error) throw error;
      
      console.log('[handleDeleteAccount] Delete successful. Updating local state.');
      setAccounts(prev => prev.filter(acc => acc.id !== id));
      
      console.log('[handleDeleteAccount] Triggering global accounts refresh in background...');
      refreshAccounts(userId).catch(err => {
        console.error('[handleDeleteAccount] Background refreshAccounts error:', err);
      });
    } catch (err) {
      console.error('[handleDeleteAccount] Error caught in block:', err);
      let errorMsg = 'Failed to delete account';
      const typedErr = err as { message?: string };
      
      if (err instanceof Error && err.message === 'TIMEOUT') {
        errorMsg = 'Delete request timed out. Please try again.';
      } else if (typedErr?.message) {
        errorMsg = typedErr.message;
      }
      alert(errorMsg);
    }
  };

  const copyToClipboard = async (text: string, type: 'url' | 'id' | 'code' | 'account') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else if (type === 'id') {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      } else if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else if (type === 'account') {
        setCopiedAccountId(text);
        setTimeout(() => setCopiedAccountId(null), 2000);
      }
    } catch {
      // fallback
    }
  };

  const handleDownloadEA = () => {
    try {
      const blob = new Blob([EA_CODE], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Tradiary_EA.mq5';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading EA file:', err);
    }
  };

  // ─── Billing State ───

  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will still have access to your plan benefits until the end of the billing period.')) {
      return;
    }

    try {
      setCancelLoading(true);
      const res = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Your subscription has been set to cancel at the end of the current billing cycle.');
        window.location.reload();
      } else {
        alert(data.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      console.error('Cancel error:', err);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };



  const handleManageBilling = async () => {
    try {
      setPortalLoading(true);
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to open billing portal');
      }
    } catch (err) {
      console.error('Portal error:', err);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setPortalLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Active', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', text: '#22c55e' };
      case 'cancelling':
        return { label: 'Cancelling', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', text: '#f59e0b' };
      case 'past_due':
        return { label: 'Past Due', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', text: '#ef4444' };
      case 'cancelled':
        return { label: 'Cancelled', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', text: '#ef4444' };
      default:
        return { label: status, bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', text: '#64748b' };
    }
  };

  const headerText = {
    webhook: { title: 'Webhook Configuration', subtitle: 'Connect your MetaTrader 5 to start receiving trade data automatically' },
    appearance: { title: 'Pengaturan Tampilan', subtitle: 'Sesuaikan tema dasar dan warna aksen untuk personalisasi dashboard Anda' },
    billing: { title: 'Billing & Subscription', subtitle: 'Manage your subscription plan, payment method, and billing history' },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" suppressHydrationWarning>
      {/* Page Header */}
      <div className="animate-fade-in flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            {headerText[activeTab].title}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            {headerText[activeTab].subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 self-end sm:self-center">
          <NotificationBell userId={userId} />
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="flex border-b border-slate-700/50 pb-px mb-6 animate-fade-in">
        <button
          onClick={() => setActiveTab('webhook')}
          className={cn(
            'px-5 py-3 text-sm font-semibold border-b-2 transition-all duration-200 focus:outline-none',
            activeTab === 'webhook'
              ? 'border-accent text-accent font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          )}
          style={activeTab === 'webhook' ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
        >
          Integrasi Webhook
        </button>
        <button
          onClick={() => setActiveTab('appearance')}
          className={cn(
            'px-5 py-3 text-sm font-semibold border-b-2 transition-all duration-200 focus:outline-none',
            activeTab === 'appearance'
              ? 'border-accent text-accent font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          )}
          style={activeTab === 'appearance' ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
        >
          Tampilan
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={cn(
            'px-5 py-3 text-sm font-semibold border-b-2 transition-all duration-200 focus:outline-none flex items-center gap-2',
            activeTab === 'billing'
              ? 'border-accent text-accent font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          )}
          style={activeTab === 'billing' ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
        >
          <CreditCard size={16} />
          Billing
        </button>
      </div>

      {activeTab === 'webhook' && (
        <>
          {/* Connection Status */}
          <div
            className={cn(
              'rounded-2xl border p-6 shadow-xl shadow-black/10 animate-fade-in transition-all duration-300',
              hasReceivedData
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-amber-500/30 bg-amber-500/5'
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center',
                  hasReceivedData ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                )}
              >
                {hasReceivedData ? (
                  <Wifi size={24} className="text-emerald-400" />
                ) : (
                  <WifiOff size={24} className="text-amber-400" />
                )}
              </div>
              <div>
                <h3
                  className={cn(
                    'font-semibold',
                    hasReceivedData ? 'text-emerald-400' : 'text-amber-400'
                  )}
                >
                  {hasReceivedData ? 'Connected' : 'Waiting for Connection'}
                </h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  {hasReceivedData
                    ? `${tradeCount} trade(s) received successfully`
                    : 'No data received yet. Follow the guide below to connect.'}
                </p>
              </div>
              {hasReceivedData && (
                <div className="ml-auto">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Webhook URL Card */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 animate-fade-in delay-100">
            <div className="flex items-center gap-2 mb-4">
              <ExternalLink size={18} className="text-blue-400" />
              <h2 className="text-lg font-semibold text-slate-100">
                Webhook URL
              </h2>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Use this URL as the webhook endpoint in your MetaTrader 5 Expert Advisor.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/50 text-sm text-blue-400 font-mono truncate">
                {WEBHOOK_URL}
              </div>
              <button
                onClick={() => copyToClipboard(WEBHOOK_URL, 'url')}
                className="flex-shrink-0 px-4 py-3 rounded-xl text-white text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg"
                style={{
                  backgroundColor: 'var(--accent)',
                  boxShadow: '0 4px 12px var(--accent-glow)'
                }}
              >
                {copiedUrl ? (
                  <>
                    <Check size={16} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* User ID Card */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 animate-fade-in delay-200">
            <div className="flex items-center gap-2 mb-4">
              <Settings size={18} className="text-blue-400" />
              <h2 className="text-lg font-semibold text-slate-100">
                Your User ID
              </h2>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Include this ID in every webhook payload so the system knows which account the trade belongs to.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/50 text-sm text-emerald-400 font-mono truncate">
                {userId}
              </div>
              <button
                onClick={() => copyToClipboard(userId, 'id')}
                className="flex-shrink-0 px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-all duration-200 flex items-center gap-2"
              >
                {copiedId ? (
                  <>
                    <Check size={16} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Download EA Card */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 animate-fade-in delay-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <FileCode size={24} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">
                    Tradiary Expert Advisor
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Download the MQ5 Expert Advisor file to run on your MetaTrader 5 terminal.
                  </p>
                </div>
              </div>
              <button
                onClick={handleDownloadEA}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-medium transition-all duration-200 shadow-lg whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--accent)',
                  boxShadow: '0 4px 12px var(--accent-glow)'
                }}
              >
                <Download size={18} />
                Download EA
              </button>
            </div>
          </div>

          {/* Account Management Card */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 animate-fade-in delay-250">
            <div className="flex items-center gap-2 mb-6">
              <Layers size={18} className="text-blue-400" />
              <h2 className="text-lg font-semibold text-slate-100">
                Account Management
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Side: Add Account Form */}
              <div>
                <h3 className="text-md font-semibold text-slate-200 mb-4">Add Account</h3>
                <form onSubmit={handleAddAccount} className="space-y-4">
                  {formError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-fade-in">
                      <AlertCircle size={14} className="flex-shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}
                  {formSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
                      <Check size={14} className="flex-shrink-0" />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 50912345"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-white focus:outline-none transition-colors placeholder:text-slate-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Broker *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. IC Markets"
                      value={broker}
                      onChange={(e) => setBroker(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-white focus:outline-none transition-colors placeholder:text-slate-500 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">
                        Platform *
                      </label>
                      <select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value as 'MT4' | 'MT5')}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-white focus:outline-none transition-colors text-sm cursor-pointer"
                      >
                        <option value="MT4" className="bg-slate-900 text-white">MT4</option>
                        <option value="MT5" className="bg-slate-900 text-white">MT5</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">
                        Currency *
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-white focus:outline-none transition-colors text-sm cursor-pointer"
                      >
                        <option value="USD" className="bg-slate-900 text-white">USD</option>
                        <option value="IDR" className="bg-slate-900 text-white">IDR</option>
                        <option value="EUR" className="bg-slate-900 text-white">EUR</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Label / Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Personal Live Account"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-white focus:outline-none transition-colors placeholder:text-slate-500 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-4 py-3 rounded-xl text-white text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg mt-2"
                    style={{
                      backgroundColor: 'var(--accent)',
                      boxShadow: '0 4px 12px var(--accent-glow)'
                    }}
                  >
                    {submitting ? (
                      'Adding...'
                    ) : (
                      <>
                        <Plus size={16} />
                        Add Account
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Right Side: Account List */}
              <div className="flex flex-col h-full">
                <h3 className="text-md font-semibold text-slate-200 mb-4">Your Accounts</h3>

                 {isAccountsLoading ? (
                  <div className="space-y-3 animate-pulse">
                    {[1, 2].map((n) => (
                      <div key={n} className="h-24 rounded-xl bg-slate-900/40 border border-slate-700/30" />
                    ))}
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border border-dashed border-slate-700/50 rounded-xl bg-slate-900/25">
                    <Layers size={32} className="text-slate-600 mb-2" />
                    <p className="text-sm text-slate-400 font-medium">No accounts added yet</p>
                    <p className="text-xs text-slate-500 mt-1">Add your trading account to manage and generate webhooks</p>
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
                    {accounts.map((account) => (
                      <div
                        key={account.id}
                        className="p-4 rounded-xl bg-slate-900/40 border border-slate-700/30 flex items-center justify-between gap-4 transition-all duration-200 hover:border-slate-700/50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-100 truncate text-sm">
                              {account.label || `Account #${account.account_number}`}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {account.platform}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {account.currency}
                            </span>
                          </div>

                          <div className="text-xs text-slate-400 mt-1 truncate">
                            {account.broker} • No: {account.account_number}
                          </div>

                          <div className="flex items-center gap-1.5 mt-2">
                            <span className="text-[10px] font-mono text-slate-500 truncate max-w-[150px] sm:max-w-none">
                              ID: {account.id}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(account.id, 'account')}
                              className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                              title="Copy Account ID"
                              aria-label="Salin ID Akun"
                            >
                              {copiedAccountId === account.id ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(account.id)}
                          className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
                          title="Delete Account"
                          aria-label="Hapus Akun"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* JSON Payload Example */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 animate-fade-in delay-300">
            <div className="flex items-center gap-2 mb-4">
              <FileCode size={18} className="text-blue-400" />
              <h2 className="text-lg font-semibold text-slate-100">
                Expected JSON Payload
              </h2>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Your MetaTrader 5 EA should send a POST request with this JSON format:
            </p>
            <pre className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/50 text-sm text-slate-300 font-mono overflow-x-auto">
              {`{
  "user_id": "${userId}",
  "ticket": 123456789,
  "symbol": "XAUUSD",
  "type": "BUY",
  "volume": 0.10,
  "open_price": 2345.50,
  "close_price": 2356.75,
  "open_time": "2026-01-15T08:30:00Z",
  "close_time": "2026-01-15T10:45:00Z",
  "profit": 112.50,
  "commission": -2.50
}`}
            </pre>
          </div>

          {/* Installation Guide */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm shadow-xl shadow-black/10 animate-fade-in delay-400 overflow-hidden">
            <button
              onClick={() => setGuideOpen(!guideOpen)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-700/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <BookOpen size={20} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">
                    Installation Guide
                  </h2>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Step-by-step guide to set up the Expert Advisor in MetaTrader 5
                  </p>
                </div>
              </div>
              {guideOpen ? (
                <ChevronUp size={20} className="text-slate-400" />
              ) : (
                <ChevronDown size={20} className="text-slate-400" />
              )}
            </button>

            {guideOpen && (
              <div className="px-6 pb-6 space-y-6 border-t border-slate-700/50 pt-6">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-200 mb-2">
                      Allow WebRequest in MetaTrader 5
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Go to <span className="text-slate-200 font-medium">Tools → Options → Expert Advisors</span>.
                      Check &quot;Allow WebRequest for listed URL&quot; and add:
                    </p>
                    <code className="mt-2 inline-block px-3 py-1.5 rounded-lg bg-slate-900/80 text-sm text-blue-400 font-mono border border-slate-700/50">
                      {SITE_URL}
                    </code>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-200 mb-2">
                      Create the Expert Advisor file
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed mb-3">
                      Open <span className="text-slate-200 font-medium">MetaEditor</span> (F4).
                      Create a new Expert Advisor named <span className="text-slate-200 font-medium">Tradiary</span>.
                      Replace the content with the code below:
                    </p>
                    <div className="relative">
                      <button
                        onClick={() => copyToClipboard(EA_CODE, 'code')}
                        className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 font-medium transition-colors flex items-center gap-1.5 z-10"
                      >
                        {copiedCode ? (
                          <>
                            <Check size={12} />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            Copy Code
                          </>
                        )}
                      </button>
                      <pre className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/50 text-xs text-slate-400 font-mono overflow-x-auto max-h-64 overflow-y-auto">
                        {EA_CODE}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-200 mb-2">
                      Configure the EA
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Compile the EA (F5), then go back to MetaTrader 5.
                      In the <span className="text-slate-200 font-medium">Navigator</span> panel, find <span className="text-slate-200 font-medium">Tradiary</span> under Expert Advisors.
                      Drag it to any chart. In the settings, paste your <span className="text-emerald-400 font-medium">User ID</span> shown above.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-200 mb-2">
                      Enable AutoTrading
                    </h3>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Make sure the <span className="text-slate-200 font-medium">AutoTrading</span> button in the toolbar is active (green).
                      The EA will now automatically send closed trade data to Tradiary.
                    </p>
                  </div>
                </div>

                {/* Warning */}
                <div className="flex gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-400">
                      Important
                    </p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      The EA must be running on at least one chart for the webhook to work.
                      It will capture trades from all symbols, not just the chart it&apos;s attached to.
                      Keep MetaTrader 5 open for real-time data sync.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'appearance' && (
        <div className="space-y-6">
          {/* Card untuk Mode/Tema */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 animate-fade-in">
            <h2 className="text-lg font-semibold text-slate-100 mb-2">
              Pilih Tema
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Pilih antara tema gelap (default) dan tema terang.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dark Theme Card */}
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={cn(
                  'relative overflow-hidden rounded-xl border p-5 text-left transition-all duration-300 group hover:scale-[1.01] flex flex-col justify-between h-44',
                  theme === 'dark'
                    ? 'border-accent bg-slate-900/60 shadow-lg shadow-accent/5'
                    : 'border-slate-700/50 bg-slate-900/20 hover:border-slate-600'
                )}
                style={theme === 'dark' ? { borderColor: 'var(--accent)' } : undefined}
              >
                <div className="flex justify-between items-start w-full">
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-accent transition-colors" style={theme === 'dark' ? { color: 'var(--accent)' } : undefined}>
                      Dark Mode
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Default yang nyaman untuk mata</p>
                  </div>
                  {theme === 'dark' && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: 'var(--accent)' }}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
                
                {/* Visual Mini Mockup Dark Mode */}
                <div className="w-full h-16 rounded-lg bg-[#09090b] border border-[#1c1c1e] p-2 mt-4 flex gap-2 overflow-hidden pointer-events-none select-none">
                  <div className="w-8 h-full rounded bg-[#0f0f11] border border-[#1c1c1e] flex flex-col gap-1 p-1">
                    <div className="w-full h-1 rounded bg-slate-800" />
                    <div className="w-3/4 h-1 rounded bg-slate-800" />
                  </div>
                  <div className="flex-1 h-full flex flex-col gap-1.5">
                    <div className="flex gap-1">
                      <div className="w-8 h-4 rounded bg-[#0f0f11] border border-[#1c1c1e] p-0.5 flex flex-col gap-0.5">
                        <div className="w-full h-0.5 rounded bg-slate-800" />
                        <div className="w-1/2 h-0.5 rounded" style={{ backgroundColor: 'var(--accent)' }} />
                      </div>
                      <div className="w-8 h-4 rounded bg-[#0f0f11] border border-[#1c1c1e] p-0.5 flex flex-col gap-0.5">
                        <div className="w-full h-0.5 rounded bg-slate-800" />
                        <div className="w-2/3 h-0.5 rounded bg-emerald-500" />
                      </div>
                    </div>
                    <div className="flex-1 rounded bg-[#0f0f11] border border-[#1c1c1e] p-1 flex flex-col gap-0.5 justify-center">
                      <div className="w-full h-1 rounded" style={{ backgroundColor: 'var(--accent)' }} />
                      <div className="w-full h-1 rounded" style={{ backgroundColor: 'var(--accent-dim)' }} />
                    </div>
                  </div>
                </div>
              </button>

              {/* Light Theme Card */}
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={cn(
                  'relative overflow-hidden rounded-xl border p-5 text-left transition-all duration-300 group hover:scale-[1.01] flex flex-col justify-between h-44',
                  theme === 'light'
                    ? 'border-accent bg-slate-200/20 shadow-lg shadow-accent/5'
                    : 'border-slate-700/50 bg-slate-900/20 hover:border-slate-600'
                )}
                style={theme === 'light' ? { borderColor: 'var(--accent)' } : undefined}
              >
                <div className="flex justify-between items-start w-full">
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-accent transition-colors" style={theme === 'light' ? { color: 'var(--accent)' } : undefined}>
                      Light Mode
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Bersih, cerah, dan kontras tinggi</p>
                  </div>
                  {theme === 'light' && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: 'var(--accent)' }}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
                
                {/* Visual Mini Mockup Light Mode */}
                <div className="w-full h-16 rounded-lg bg-[#fafafa] border border-[#e4e4e7] p-2 mt-4 flex gap-2 overflow-hidden pointer-events-none select-none">
                  <div className="w-8 h-full rounded bg-white border border-[#e4e4e7] flex flex-col gap-1 p-1">
                    <div className="w-full h-1 rounded bg-slate-200" />
                    <div className="w-3/4 h-1 rounded bg-slate-200" />
                  </div>
                  <div className="flex-1 h-full flex flex-col gap-1.5">
                    <div className="flex gap-1">
                      <div className="w-8 h-4 rounded bg-white border border-[#e4e4e7] p-0.5 flex flex-col gap-0.5">
                        <div className="w-full h-0.5 rounded bg-slate-200" />
                        <div className="w-1/2 h-0.5 rounded" style={{ backgroundColor: 'var(--accent)' }} />
                      </div>
                      <div className="w-8 h-4 rounded bg-white border border-[#e4e4e7] p-0.5 flex flex-col gap-0.5">
                        <div className="w-full h-0.5 rounded bg-slate-200" />
                        <div className="w-2/3 h-0.5 rounded bg-emerald-500" />
                      </div>
                    </div>
                    <div className="flex-1 rounded bg-white border border-[#e4e4e7] p-1 flex flex-col gap-0.5 justify-center">
                      <div className="w-full h-1 rounded" style={{ backgroundColor: 'var(--accent)' }} />
                      <div className="w-full h-1 rounded" style={{ backgroundColor: 'var(--accent-dim)' }} />
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Card untuk Accent Color */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10 animate-fade-in delay-100">
            <h2 className="text-lg font-semibold text-slate-100 mb-2">
              Warna Aksen
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Pilih warna aksen utama yang akan digunakan untuk tombol, link aktif, chart, dan indikator.
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((key) => {
                const colorDef = ACCENT_COLORS[key];
                const isSelected = accentColor === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAccentColor(key)}
                    className={cn(
                      'flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-all duration-300 group hover:scale-[1.03]',
                      isSelected
                        ? 'border-accent bg-slate-900/40 shadow-sm'
                        : 'border-slate-700/40 bg-slate-900/10 hover:border-slate-600'
                    )}
                    style={isSelected ? { borderColor: colorDef.hex } : undefined}
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md transition-transform duration-300 group-hover:scale-105"
                      style={{
                        backgroundColor: colorDef.hex,
                        boxShadow: `0 4px 10px ${colorDef.glow}`,
                      }}
                    >
                      {isSelected && <Check size={18} strokeWidth={2.5} />}
                    </div>
                    <span 
                      className={cn(
                        'text-xs font-medium transition-colors',
                        isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                      )}
                      style={isSelected ? { color: colorDef.hex } : undefined}
                    >
                      {colorDef.name}
                    </span>
                  </button>
                );
              })}
            </div>
            
            {/* Live Preview Section */}
            <div className="mt-8 pt-6 border-t border-slate-700/40">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Pratinjau Langsung (Live Preview)
              </h3>
              
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                    style={{
                      backgroundColor: 'var(--accent)',
                      boxShadow: '0 2px 8px var(--accent-glow)'
                    }}
                  >
                    <Settings size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Elemen Antarmuka</h4>
                    <p className="text-xs text-slate-500">Warna aksen akan diaplikasikan seketika.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <span 
                    className="text-xs font-semibold px-2.5 py-1 rounded-full border"
                    style={{
                      backgroundColor: 'var(--accent-dim)',
                      borderColor: 'var(--accent-border)',
                      color: 'var(--accent)'
                    }}
                  >
                    Badge Aktif
                  </span>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white shadow"
                    style={{
                      backgroundColor: 'var(--accent)',
                      boxShadow: '0 2px 8px var(--accent-glow)'
                    }}
                  >
                    Tombol Utama
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Billing Tab ─── */}
      {activeTab === 'billing' && (
        <div className="space-y-6 animate-fade-in">
          {/* Current Plan Card */}
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-6 shadow-xl shadow-black/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: subscriptionPlan === 'pro'
                      ? 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.05))'
                      : subscriptionPlan === 'enterprise'
                      ? 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))'
                      : 'linear-gradient(135deg, rgba(100,116,139,0.2), rgba(100,116,139,0.05))',
                    border: `1px solid ${subscriptionPlan === 'pro' ? 'rgba(139,92,246,0.3)' : subscriptionPlan === 'enterprise' ? 'rgba(245,158,11,0.3)' : 'rgba(100,116,139,0.3)'}`,
                  }}
                >
                  {subscriptionPlan === 'pro' ? (
                    <Crown size={24} style={{ color: '#8b5cf6' }} />
                  ) : subscriptionPlan === 'enterprise' ? (
                    <Building2 size={24} style={{ color: '#f59e0b' }} />
                  ) : (
                    <Zap size={24} style={{ color: '#64748b' }} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-white capitalize">
                      {subscriptionPlan} Plan
                    </h2>
                    <span
                      className={cn(
                        "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border tracking-wide select-none",
                        subscriptionPlan === 'free'
                          ? "bg-slate-700/10 border-slate-700/30 text-slate-400"
                          : subscriptionPlan === 'pro'
                          ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                          : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                      )}
                    >
                      {subscriptionPlan.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const badge = getStatusBadge(subscriptionStatus);
                      return (
                        <span
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-full border"
                          style={{ backgroundColor: badge.bg, borderColor: badge.border, color: badge.text }}
                        >
                          {badge.label}
                        </span>
                      );
                    })()}
                    {subscriptionEndDate && (
                      <span className="text-xs text-slate-500" suppressHydrationWarning>
                        {subscriptionStatus === 'cancelling' ? 'Ends' : 'Renews'}{' '}
                        {new Date(subscriptionEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <a
                  href="/pricing"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-700 border border-indigo-600/30 text-sm font-bold text-white transition-all duration-200 shadow-md shadow-indigo-600/10 active:scale-[0.98]"
                  style={{ backgroundColor: '#4f46e5' }}
                >
                  <ArrowUpRight size={14} />
                  Upgrade Plan
                </a>
                {hasStripeCustomer && (
                  <button
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700/50 bg-slate-900/50 text-sm font-medium text-slate-300 hover:text-white hover:border-slate-600 transition-all duration-200 disabled:opacity-50"
                  >
                    {portalLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ExternalLink size={14} />
                    )}
                    Manage Billing
                  </button>
                )}
                {subscriptionPlan !== 'free' && subscriptionStatus === 'active' && (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={cancelLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-sm font-medium text-red-400 hover:text-red-350 hover:border-red-500/30 transition-all duration-200 disabled:opacity-50"
                  >
                    {cancelLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>

            {/* Past Due Warning */}
            {subscriptionStatus === 'past_due' && (
              <div className="mt-4 flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-400">Payment Failed</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your last payment was unsuccessful. Please update your payment method to avoid service interruption.
                  </p>
                </div>
                <button
                  onClick={handleManageBilling}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all"
                  style={{ backgroundColor: '#ef4444' }}
                >
                  Update Payment
                </button>
              </div>
            )}
          </div>

          {/* Upgrade Section for Free users */}
          {subscriptionPlan === 'free' && (
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 shadow-xl shadow-indigo-600/5 animate-fade-in">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 flex-shrink-0">
                  <Crown size={24} />
                </div>
                <div>
                  <h3 className="text-md font-bold text-white">Upgrade to Pro</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-lg leading-relaxed">
                    Unlock advanced statistics, 5 trading accounts, MT5 webhook syncing, CSV trade import features, calendar views, and priority support.
                  </p>
                </div>
              </div>
              <a
                href="/pricing"
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-bold text-sm transition-all duration-200 shadow-lg shadow-indigo-600/15 whitespace-nowrap active:scale-[0.98]"
                style={{ backgroundColor: '#4f46e5' }}
              >
                Upgrade Plan ✨
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
