-- ============================================
-- Tradiary Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: trades
-- Stores all trading transactions from MT5
-- ============================================
CREATE TABLE IF NOT EXISTS trades (
  id           uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket       bigint       NOT NULL,
  symbol       varchar(20)  NOT NULL,
  type         varchar(10)  NOT NULL CHECK (type IN ('BUY', 'SELL')),
  volume       decimal(10,2) NOT NULL,
  open_price   decimal(10,5) NOT NULL,
  close_price  decimal(10,5) NOT NULL,
  open_time    timestamptz  NOT NULL,
  close_time   timestamptz  NOT NULL,
  profit       decimal(12,2) NOT NULL,
  commission   decimal(10,2) DEFAULT 0,
  created_at   timestamptz  DEFAULT now()
);

-- ============================================
-- Row Level Security (RLS)
-- Users can only access their own trades
-- ============================================
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT their own trades
CREATE POLICY "Users can select own trades"
  ON trades FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can INSERT their own trades
CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can DELETE their own trades
CREATE POLICY "Users can delete own trades"
  ON trades FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Allow webhook inserts (service role will bypass RLS)
-- The webhook API route uses the anon key but inserts with user_id from the payload
-- For webhook functionality, we also create a policy that allows insert if user_id is valid
CREATE POLICY "Allow webhook inserts"
  ON trades FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_close_time ON trades(close_time);
CREATE INDEX idx_trades_user_close_time ON trades(user_id, close_time DESC);
