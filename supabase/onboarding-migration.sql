-- ============================================================
-- Tradiary — Onboarding Plan Selection Migration
-- ============================================================
-- Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor → New Query).
-- This script is SAFE to run multiple times (uses IF NOT EXISTS).
-- It does NOT drop any tables or columns.
-- ============================================================

-- Add onboarding_plan_selected column to the profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_plan_selected boolean DEFAULT false;

-- Index for optimization
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_plan_selected ON profiles (onboarding_plan_selected);
