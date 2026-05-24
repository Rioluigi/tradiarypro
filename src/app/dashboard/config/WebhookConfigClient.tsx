'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WebhookConfigClientProps {
  userId: string;
  hasReceivedData: boolean;
  tradeCount: number;
}

const WEBHOOK_URL = 'https://tradiary-zeta.vercel.app/api/webhook';

const EA_CODE = `//+------------------------------------------------------------------+
//| Tradiary EA - Webhook Sender                                       |
//| Sends closed trade data to Tradiary webhook endpoint               |
//+------------------------------------------------------------------+
#property copyright "Tradiary"
#property version   "1.00"
#property strict

input string WebhookURL = "${WEBHOOK_URL}";
input string UserID = ""; // ← Paste your User ID here

#include <Trade\\Trade.mqh>

int OnInit() {
   Print("Tradiary EA initialized. Webhook URL: ", WebhookURL);
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason) {
   Print("Tradiary EA deinitialized.");
}

void OnTrade() {
   // Check for recently closed positions
   int totalDeals = HistoryDealsTotal();
   if(totalDeals <= 0) return;
   
   HistorySelect(TimeCurrent() - 60, TimeCurrent());
   
   for(int i = HistoryDealsTotal() - 1; i >= 0; i--) {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;
      
      ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(entry != DEAL_ENTRY_OUT) continue;
      
      string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
      long type = HistoryDealGetInteger(ticket, DEAL_TYPE);
      double volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
      double price = HistoryDealGetDouble(ticket, DEAL_PRICE);
      double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
      datetime time = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
      
      string typeStr = (type == DEAL_TYPE_BUY) ? "SELL" : "BUY";
      
      string json = "{\\"user_id\\": \\"" + UserID + "\\","
         + "\\"ticket\\": " + IntegerToString((int)ticket) + ","
         + "\\"symbol\\": \\"" + symbol + "\\","
         + "\\"type\\": \\"" + typeStr + "\\","
         + "\\"volume\\": " + DoubleToString(volume, 2) + ","
         + "\\"open_price\\": " + DoubleToString(price, 5) + ","
         + "\\"close_price\\": " + DoubleToString(price, 5) + ","
         + "\\"open_time\\": \\"" + TimeToString(time, TIME_DATE|TIME_SECONDS) + "\\","
         + "\\"close_time\\": \\"" + TimeToString(time, TIME_DATE|TIME_SECONDS) + "\\","
         + "\\"profit\\": " + DoubleToString(profit, 2) + ","
         + "\\"commission\\": " + DoubleToString(commission, 2)
         + "}";
      
      // Send HTTP POST
      string headers = "Content-Type: application/json\\r\\n";
      char post[];
      char result[];
      string resultHeaders;
      
      StringToCharArray(json, post, 0, WHOLE_ARRAY, CP_UTF8);
      
      int res = WebRequest("POST", WebhookURL, headers, 5000, post, result, resultHeaders);
      
      if(res == 200) {
         Print("✅ Trade sent to Tradiary: ", symbol, " ", typeStr, " P/L: ", profit);
      } else {
         Print("❌ Failed to send trade. HTTP ", res);
      }
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

  const copyToClipboard = async (text: string, type: 'url' | 'id' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else if (type === 'id') {
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
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
