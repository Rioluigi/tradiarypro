//+------------------------------------------------------------------+
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
input string WebhookURL = "https://tradiarypro-64rq.vercel.app/api/webhook";
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
   // If the closing deal is a BUY, the original position was a SELL (Short).
   // If the closing deal is a SELL, the original position was a BUY (Long).
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
   
   // Build JSON payload (using double separator sanitization)
   string json = "{";
   json += "\"user_id\":\"" + UserID + "\",";
   if(StringLen(AccountID) > 0)
   {
      json += "\"account_id\":\"" + AccountID + "\",";
   }
   json += "\"ticket\":" + IntegerToString((long)ticket) + ",";
   json += "\"symbol\":\"" + symbol + "\",";
   json += "\"type\":\"" + typeStr + "\",";
   json += "\"volume\":" + SanitizeDouble(volume, 2) + ",";
   json += "\"open_price\":" + SanitizeDouble(open_price, 5) + ",";
   json += "\"close_price\":" + SanitizeDouble(price, 5) + ",";
   json += "\"open_time\":\"" + openTimeISO + "\",";
   json += "\"close_time\":\"" + closeTimeISO + "\",";
   json += "\"profit\":" + SanitizeDouble(profit, 2) + ",";
   json += "\"commission\":" + SanitizeDouble(commission, 2);
   json += "}";
   
   if(EnableLogs)
   {
      Print("Sending closed trade webhook to: ", WebhookURL);
      Print("Payload: ", json);
   }
   
   // Send HTTP POST request
   string headers = "Content-Type: application/json\r\n";
   char post[];
   char result_data[];
   string result_headers;
   
   // Copy string to char array *without* the trailing null-terminator (\0)
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
}
