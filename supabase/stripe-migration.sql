-- ============================================================
-- Tradiary — Stripe Subscription Migration
-- ============================================================
-- Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor → New Query).
-- This script is SAFE to run multiple times (uses IF NOT EXISTS).
-- It does NOT drop any tables or columns.
-- ============================================================

-- Add subscription columns to the profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Optional: Add an index on stripe_customer_id for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles (stripe_customer_id);
