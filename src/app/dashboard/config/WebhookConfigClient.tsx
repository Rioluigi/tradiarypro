'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface WebhookConfigClientProps {
  userId: string;
  hasReceivedData: boolean;
  tradeCount: number;
}

const WEBHOOK_URL = 'https://tradiary-zeta.vercel.app/api/webhook';

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
input string WebhookURL = "\${WEBHOOK_URL}";
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
   json += "\\\\"user_id\\\\":\\\\"" + UserID + "\\\\",";
   if(StringLen(AccountID) > 0)
   {
      json += "\\\\"account_id\\\\":\\\\"" + AccountID + "\\\\",";
   }
   json += "\\\\"ticket\\\\":" + IntegerToString((long)ticket) + ",";
   json += "\\\\"symbol\\\\":\\\\"" + symbol + "\\\\",";
   json += "\\\\"type\\\\":\\\\"" + typeStr + "\\\\",";
   json += "\\\\"volume\\\\":" + SanitizeDouble(volume, 2) + ",";
   json += "\\\\"open_price\\\\":" + SanitizeDouble(open_price, 5) + ",";
   json += "\\\\"close_price\\\\":" + SanitizeDouble(price, 5) + ",";
   json += "\\\\"open_time\\\\":\\\\"" + openTimeISO + "\\\\",";
   json += "\\\\"close_time\\\\":\\\\"" + closeTimeISO + "\\\\",";
   json += "\\\\"profit\\\\":" + SanitizeDouble(profit, 2) + ",";
   json += "\\\\"commission\\\\":" + SanitizeDouble(commission, 2);
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

export default function WebhookConfigClient({
  userId,
  hasReceivedData,
  tradeCount,
}: WebhookConfigClientProps) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  interface Account {
    id: string;
    user_id: string;
    account_number: string;
    broker: string;
    platform: 'MT4' | 'MT5';
    balance: number;
    currency: string;
    label: string | null;
    is_active: boolean;
    created_at: string;
  }

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
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

  const supabase = createClient();

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoadingAccounts(true);
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAccounts(data || []);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('Error fetching accounts:', errorMsg);
      } finally {
        setLoadingAccounts(false);
      }
    };

    if (userId) {
      fetchAccounts();
    }
  }, [userId, supabase]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setSubmitting(true);
      const { data, error } = await supabase
        .from('accounts')
        .insert([
          {
            user_id: userId,
            account_number: accountNumber.trim(),
            broker: broker.trim(),
            platform,
            currency,
            label: label.trim() || null,
            balance: 0.00,
            is_active: true
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setFormSuccess('Account added successfully!');
      setAccountNumber('');
      setBroker('');
      setLabel('');
      setAccounts(prev => [data, ...prev]);

      setTimeout(() => setFormSuccess(null), 3000);
    } catch (err) {
      console.error('Error adding account:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to add account';
      setFormError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account? This will also delete all associated trades.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setAccounts(prev => prev.filter(acc => acc.id !== id));
    } catch (err) {
      console.error('Error deleting account:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete account';
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">
          Webhook Configuration
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Connect your MetaTrader 5 to start receiving trade data automatically
        </p>
      </div>

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
            className="flex-shrink-0 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-blue-500/25"
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
          <a
            href="/downloads/Tradiary_EA.mq5"
            download="Tradiary_EA.mq5"
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all duration-200 shadow-lg shadow-blue-500/25 whitespace-nowrap"
          >
            <Download size={18} />
            Download EA
          </a>
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
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500 text-sm"
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
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500 text-sm"
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
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm cursor-pointer"
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
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm cursor-pointer"
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
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 mt-2"
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

            {loadingAccounts ? (
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
                  https://tradiary-zeta.vercel.app
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
    </div>
  );
}
