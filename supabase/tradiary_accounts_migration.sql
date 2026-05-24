-- ============================================
-- SQL Migration: Create accounts table and update trades
-- ============================================

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id             uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number varchar(50)  NOT NULL,
  broker         varchar(100) NOT NULL,
  platform       varchar(10)  NOT NULL CHECK (platform IN ('MT4', 'MT5')),
  balance        decimal(15,2) NOT NULL DEFAULT 0.00,
  currency       varchar(10)  NOT NULL DEFAULT 'USD',
  label          varchar(100),
  is_active      boolean      NOT NULL DEFAULT true,
  created_at     timestamptz  DEFAULT now(),
  updated_at     timestamptz  DEFAULT now()
);

-- Add account_id column to existing trades table
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id) ON DELETE CASCADE;

-- Enable Row Level Security (RLS) on accounts
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Policies for accounts
CREATE POLICY "Users can select own accounts"
  ON accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts"
  ON accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts"
  ON accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_account_id ON trades(account_id);
