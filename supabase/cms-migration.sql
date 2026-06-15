-- Create public cms_content table
CREATE TABLE IF NOT EXISTS public.cms_content (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.cms_content ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to avoid migration re-run errors
DROP POLICY IF EXISTS "Allow public read access" ON public.cms_content;
DROP POLICY IF EXISTS "Allow admin write access" ON public.cms_content;

-- Allow public read access to cms contents
CREATE POLICY "Allow public read access" ON public.cms_content
  FOR SELECT USING (true);

-- Allow only administrators to manage cms contents
CREATE POLICY "Allow admin write access" ON public.cms_content
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.profiles.id = auth.uid()
      AND public.profiles.role = 'admin'
    )
  );

-- Seed initial records
INSERT INTO public.cms_content (key, value) VALUES
('hero_heading', 'Track, Analyze & Improve Your Trading Performance'),
('hero_subheading', 'Tradiary helps you journal every trade, spot patterns, and become a consistently profitable trader.'),
('login_quote', 'Discipline is not about perfect trades. It is about a consistent process every day.'),
('stats_traders', '12k+'),
('stats_trades', '1.4M+'),
('stats_satisfaction', '98%'),
('plan_free_price_monthly', '0'),
('plan_pro_price_monthly', '14.99'),
('plan_pro_price_yearly', '11.99'),
('plan_enterprise_price_monthly', '49.99'),
('plan_enterprise_price_yearly', '39.99'),
('footer_copyright', '© 2026 Tradiary. All rights reserved.'),
('plan_free_visible', 'true'),
('plan_pro_visible', 'true'),
('plan_enterprise_visible', 'true')
ON CONFLICT (key) DO NOTHING;
