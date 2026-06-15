-- ============================================
-- SQL Migration: Phase 5 Notifications & Journal Entries
-- ============================================

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to prevent duplication errors
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

-- Create RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);


-- 2. Create journal_entries table
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  ai_response text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on journal_entries
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can insert their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can update their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can delete their own journal entries" ON public.journal_entries;

-- Create RLS Policies for journal_entries
CREATE POLICY "Users can view their own journal entries"
  ON public.journal_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journal entries"
  ON public.journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journal entries"
  ON public.journal_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journal entries"
  ON public.journal_entries FOR DELETE
  USING (auth.uid() = user_id);


-- 3. Automatic Triggers for Notifications
CREATE OR REPLACE FUNCTION public.handle_trade_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_total_trades bigint;
  v_winning_trades bigint;
  v_win_rate numeric;
BEGIN
  -- 1. Notification: Trade Added
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    NEW.user_id,
    'Trade Added',
    'Trade Added: ' || NEW.symbol || ' ' || NEW.type || ' berhasil dicatat',
    'info'
  );

  -- 2. Notification: Big Win! (profit > 500)
  IF NEW.profit > 500 THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.user_id,
      'Big Win!',
      'Big Win! Trade ' || NEW.symbol || ' profit $' || trim(to_char(NEW.profit, '999,999,999.00')),
      'success'
    );
  END IF;

  -- 3. Notification: Win Rate Drop (< 40%)
  SELECT COUNT(*), COUNT(CASE WHEN profit > 0 THEN 1 END)
  INTO v_total_trades, v_winning_trades
  FROM public.trades
  WHERE user_id = NEW.user_id;

  IF v_total_trades > 0 THEN
    v_win_rate := (v_winning_trades::numeric / v_total_trades::numeric) * 100.0;
    IF v_win_rate < 40.0 THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        NEW.user_id,
        'Win Rate Alert',
        'Win rate kamu turun ke ' || round(v_win_rate, 1) || '%, evaluasi strategi',
        'warning'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_trade_inserted ON public.trades;
CREATE TRIGGER on_trade_inserted
  AFTER INSERT ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.handle_trade_notifications();
