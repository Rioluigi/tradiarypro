-- ============================================
-- SQL Migration: Add unique constraint on (ticket, user_id)
-- ============================================

-- Table constraint to prevent duplicate trades for a user
ALTER TABLE trades 
ADD CONSTRAINT unique_ticket_user UNIQUE (ticket, user_id);
