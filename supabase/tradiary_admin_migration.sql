-- ============================================
-- SQL Migration: Add Profiles, Role Management, and Admin Bypass
-- ============================================

-- 1. Create Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create security definer function to avoid RLS recursion
-- This function runs with database owner privileges, bypassing RLS to check admin status safely.
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can select own profile or admin select all" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile or admin update all" ON public.profiles;

-- RLS Policies for profiles using the security definer helper
CREATE POLICY "Users can select own profile or admin select all"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id OR public.is_admin(auth.uid())
  );

CREATE POLICY "Users can update own profile or admin update all"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id OR public.is_admin(auth.uid())
  );

-- 3. Trigger to automatically create profile on auth.users registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, is_active)
  VALUES (new.id, new.email, 'user', true)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users
INSERT INTO public.profiles (id, email, role, is_active)
SELECT id, email, 'user', true FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 4. Update trades RLS Policies
DROP POLICY IF EXISTS "Users can select own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can select own trades or admin select all" ON public.trades;
CREATE POLICY "Users can select own trades or admin select all"
  ON public.trades FOR SELECT
  USING (
    auth.uid() = user_id OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can update own trades or admin update all" ON public.trades;
CREATE POLICY "Users can update own trades or admin update all"
  ON public.trades FOR UPDATE
  USING (
    auth.uid() = user_id OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can delete own trades or admin delete all" ON public.trades;
CREATE POLICY "Users can delete own trades or admin delete all"
  ON public.trades FOR DELETE
  USING (
    auth.uid() = user_id OR public.is_admin(auth.uid())
  );

-- 5. Update accounts RLS Policies
DROP POLICY IF EXISTS "Users can select own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can select own accounts or admin select all" ON public.accounts;
CREATE POLICY "Users can select own accounts or admin select all"
  ON public.accounts FOR SELECT
  USING (
    auth.uid() = user_id OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can insert own accounts or admin insert all" ON public.accounts;
CREATE POLICY "Users can insert own accounts or admin insert all"
  ON public.accounts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can update own accounts or admin update all" ON public.accounts;
CREATE POLICY "Users can update own accounts or admin update all"
  ON public.accounts FOR UPDATE
  USING (
    auth.uid() = user_id OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can delete own accounts or admin delete all" ON public.accounts;
CREATE POLICY "Users can delete own accounts or admin delete all"
  ON public.accounts FOR DELETE
  USING (
    auth.uid() = user_id OR public.is_admin(auth.uid())
  );
