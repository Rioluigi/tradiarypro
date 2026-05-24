export interface Trade {
  id: string;
  user_id: string;
  account_id?: string;
  ticket: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  open_price: number;
  close_price: number;
  open_time: string;
  close_time: string;
  profit: number;
  commission: number;
  created_at: string;
}

export interface TradeInsert {
  user_id: string;
  account_id?: string;
  ticket: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  open_price: number;
  close_price: number;
  open_time: string;
  close_time: string;
  profit: number;
  commission?: number;
}

export interface WebhookPayload {
  user_id: string;
  account_id?: string;
  ticket: number;
  symbol: string;
  type: string;
  volume: number;
  open_price: number;
  close_price: number;
  open_time: string;
  close_time: string;
  profit: number;
  commission: number;
}

export interface KPIData {
  totalProfitLoss: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
}
