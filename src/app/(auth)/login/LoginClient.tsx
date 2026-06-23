'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, TrendingUp } from 'lucide-react';
import { CMSData, cmsDefaults } from '@/types/cms';

interface LoginClientProps {
  cmsData?: CMSData;
}

export default function LoginClient({ cmsData }: LoginClientProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fallbacks using cmsDefaults if keys are missing from cmsData
  const quote = cmsData?.login_quote || cmsDefaults.login_quote;
  const statsTraders = cmsData?.stats_traders || cmsDefaults.stats_traders;
  const statsTrades = cmsData?.stats_trades || cmsDefaults.stats_trades;
  const statsSatisfaction = cmsData?.stats_satisfaction || cmsDefaults.stats_satisfaction;
  const footerCopyright = cmsData?.footer_copyright || cmsDefaults.footer_copyright;

  const quoteAuthor = 
    quote.includes('Victor Sperandeo') || quote.includes('emotional discipline') 
      ? 'Victor Sperandeo' 
      : 'Tradiary Coach';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      
      // Promise.race to enforce an 8-second timeout on the credentials verification request
      const authResult = await Promise.race([
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), 8000)
        )
      ]);

      const { error: authError } = authResult;

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      // Successful login: Redirect immediately (optimistic UI)
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      console.error('Login error:', err);
      if (err instanceof Error && err.message === 'TIMEOUT') {
        setError('Login request timed out. Please check your connection and try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Column — Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative px-12"
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #e0e7ff 100%)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute top-20 left-20 w-32 h-32 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)' }}
        />
        <div className="absolute bottom-32 right-16 w-48 h-48 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
        />

        <div className="relative z-10 max-w-md text-center">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-8 shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              boxShadow: '0 8px 32px rgba(79, 70, 229, 0.3)',
            }}
          >
            <TrendingUp size={36} className="text-white" />
          </div>

          <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            Tradiary
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed mb-8">
            Your personal automated trading journal.
            Track, analyze, and improve your trading performance.
          </p>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-6 border-t border-b border-slate-200/50 py-6 w-full max-w-sm mx-auto mb-8">
            <div className="text-center">
              <p className="text-2xl font-extrabold text-slate-900 mb-1">{statsTraders}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Traders</p>
            </div>
            <div className="text-center border-l border-r border-slate-200/50">
              <p className="text-2xl font-extrabold text-slate-900 mb-1">{statsTrades}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Trades Logged</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-slate-900 mb-1">{statsSatisfaction}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Satisfaction</p>
            </div>
          </div>

          {/* Testimonial / Quote */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
            <p className="text-sm text-slate-600 italic leading-relaxed">
              &ldquo;{quote}&rdquo;
            </p>
            <p className="text-xs text-slate-400 mt-3 font-medium">
              — {quoteAuthor}
            </p>
          </div>
        </div>
      </div>

      {/* Right Column — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo (shown on small screens) */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              }}
            >
              <TrendingUp size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Tradiary</h1>
              <p className="text-xs text-slate-400">Trading Journal</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Sign in to your trading journal account
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 bg-white text-slate-900 text-sm placeholder-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:border-indigo-500"
                style={{ '--tw-ring-color': 'rgba(79, 70, 229, 0.3)' } as React.CSSProperties}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-2xl border border-slate-300 bg-white text-slate-900 text-sm placeholder-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:border-indigo-500"
                  style={{ '--tw-ring-color': 'rgba(79, 70, 229, 0.3)' } as React.CSSProperties}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl text-white text-sm font-bold uppercase tracking-wider transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.98]"
              style={{
                backgroundColor: '#0f172a',
                boxShadow: isLoading ? 'none' : '0 4px 14px rgba(15, 23, 42, 0.25)',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="font-semibold transition-colors"
                style={{ color: '#4f46e5' }}
              >
                Create account
              </Link>
            </p>
          </div>

          {/* Copyright notice at the bottom */}
          <p className="text-[10px] text-slate-450 mt-12 text-center select-none">
            {footerCopyright}
          </p>
        </div>
      </div>
    </div>
  );
}
