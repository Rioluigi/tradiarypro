-- ============================================
-- SQL Migration: Add Trade Journal Features
-- ============================================

-- 1. Add journal columns to the trades table
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS strategy_tag VARCHAR(50),
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- 2. Create the 'trade-screenshots' storage bucket (if it doesn't already exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('trade-screenshots', 'trade-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Define Row-Level Security (RLS) policies for the storage bucket
-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy A: Allow anyone to view screenshots (Public bucket)
CREATE POLICY "Allow public read access to trade screenshots"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'trade-screenshots');

-- Policy B: Allow authenticated users to upload screenshots
CREATE POLICY "Allow authenticated insert access to trade screenshots"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'trade-screenshots');

-- Policy C: Allow authenticated users to delete screenshots
CREATE POLICY "Allow authenticated delete access to trade screenshots"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'trade-screenshots');
