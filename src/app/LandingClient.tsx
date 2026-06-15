'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  BookOpen,
  BarChart3,
  LineChart,
  Calendar,
  Percent,
  Sparkles,
  Check,
  Menu,
  X,
  ArrowRight,
  Shield,
} from 'lucide-react';

interface LandingClientProps {
  cmsContent?: Record<string, unknown>[];
}

export default function LandingClient({ cmsContent }: LandingClientProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Scroll listener for sticky navbar styling
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for scroll reveal animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-active');
          }
        });
      },
      { threshold: 0.1 }
    );
    const elements = document.querySelectorAll('.scroll-reveal');
    elements.forEach((el) => observer.observe(el));
    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  // Parse CMS pricing content if available, fallback to defaults
  const pricing = {
    free: {
      monthly: 0,
      yearly: 0,
    },
    pro: {
      monthly: 14.99,
      yearly: 11.99,
    },
    enterprise: {
      monthly: 49.99,
      yearly: 39.99,
    },
  };

  let heroHeading = 'Track, Analyze & Improve Your Trading Performance';
  let heroSubheading = 'Tradiary helps you journal every trade, spot patterns, and become a consistently profitable trader.';
  let statsTraders = '12k+';
  let statsTrades = '1.4M+';
  let statsSatisfaction = '98%';
  let footerCopyright = '© 2026 Tradiary. All rights reserved.';

  let planFreeVisible = true;
  let planProVisible = true;
  let planEnterpriseVisible = true;

  if (cmsContent && Array.isArray(cmsContent)) {
    cmsContent.forEach((item) => {
      const key = item.key as string;
      const val = item.value as string;
      if (key === 'hero_heading') heroHeading = val;
      if (key === 'hero_subheading') heroSubheading = val;
      if (key === 'stats_traders') statsTraders = val;
      if (key === 'stats_trades') statsTrades = val;
      if (key === 'stats_satisfaction') statsSatisfaction = val;
      if (key === 'footer_copyright') footerCopyright = val;

      if (key === 'plan_free_visible') planFreeVisible = val === 'true';
      if (key === 'plan_pro_visible') planProVisible = val === 'true';
      if (key === 'plan_enterprise_visible') planEnterpriseVisible = val === 'true';

      if ((key === 'plan_free_price_monthly' || key === 'price_free_monthly') && !isNaN(parseFloat(val))) pricing.free.monthly = parseFloat(val);
      if ((key === 'plan_free_price_yearly' || key === 'price_free_yearly') && !isNaN(parseFloat(val))) pricing.free.yearly = parseFloat(val);
      if ((key === 'plan_pro_price_monthly' || key === 'price_pro_monthly') && !isNaN(parseFloat(val))) pricing.pro.monthly = parseFloat(val);
      if ((key === 'plan_pro_price_yearly' || key === 'price_pro_yearly') && !isNaN(parseFloat(val))) pricing.pro.yearly = parseFloat(val);
      if ((key === 'plan_enterprise_price_monthly' || key === 'price_enterprise_monthly') && !isNaN(parseFloat(val))) pricing.enterprise.monthly = parseFloat(val);
      if ((key === 'plan_enterprise_price_yearly' || key === 'price_enterprise_yearly') && !isNaN(parseFloat(val))) pricing.enterprise.yearly = parseFloat(val);
    });
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-500/10 selection:text-indigo-600">
      <style>{`
        .scroll-reveal {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform, opacity;
        }
        .scroll-reveal.reveal-active {
          opacity: 1;
          transform: translateY(0);
        }
        .delay-75 { transition-delay: 75ms; }
        .delay-100 { transition-delay: 100ms; }
        .delay-150 { transition-delay: 150ms; }
        .delay-200 { transition-delay: 200ms; }
        .delay-300 { transition-delay: 300ms; }
        .delay-400 { transition-delay: 400ms; }
        .delay-500 { transition-delay: 500ms; }
      `}</style>

      {/* ─── NAVBAR ─── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
            ? 'bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm py-4'
            : 'bg-transparent py-6'
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/25 transition-transform group-hover:scale-105">
              <TrendingUp size={18} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-800 bg-clip-text text-transparent">
              Tradiary
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
              Pricing
            </a>
            <a href="#testimonials" className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
              Testimonials
            </a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-bold text-slate-700 hover:text-indigo-600 px-4 py-2.5 rounded-xl transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-100 shadow-xl py-6 px-6 flex flex-col gap-5 animate-scale-in">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold text-slate-600 hover:text-indigo-600 py-1 transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold text-slate-600 hover:text-indigo-600 py-1 transition-colors"
            >
              Pricing
            </a>
            <a
              href="#testimonials"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold text-slate-600 hover:text-indigo-600 py-1 transition-colors"
            >
              Testimonials
            </a>
            <hr className="border-slate-100" />
            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/10 transition-colors"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden relative">
        {/* Decorative background lights */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(79, 70, 229, 0.2) 0%, transparent 70%)' }}
        />
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)' }}
        />

        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-6 shadow-sm shadow-indigo-500/5 animate-fade-in">
            <Sparkles size={13} className="text-indigo-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              Trading Journal for Modern Traders
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 tracking-tight leading-[1.1] max-w-4xl mb-6 animate-fade-in delay-100">
            {heroHeading}
          </h1>

          {/* Subheading */}
          <p className="text-lg text-slate-500 max-w-2xl leading-relaxed mb-10 animate-fade-in delay-200">
            {heroSubheading}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 w-full sm:w-auto animate-fade-in delay-300">
            <Link
              href="/register"
              className="w-full sm:w-auto text-center font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-8 py-4 rounded-2xl shadow-xl shadow-indigo-600/10 hover:shadow-indigo-600/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
            >
              Start for Free
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto text-center font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 px-8 py-4 rounded-2xl shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Sign In
            </Link>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-8 md:gap-16 border-t border-b border-slate-100 py-8 w-full max-w-3xl mb-20 animate-fade-in delay-400">
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">{statsTraders}</p>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Traders</p>
            </div>
            <div className="text-center border-l border-r border-slate-100">
              <p className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">{statsTrades}</p>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Trades Logged</p>
            </div>
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">{statsSatisfaction}</p>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Satisfaction</p>
            </div>
          </div>

          {/* Mockup Dashboard Preview */}
          <div className="w-full max-w-5xl rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3 shadow-2xl shadow-slate-900/10 animate-fade-in delay-500 select-none">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden text-left">
              {/* Mock Top bar */}
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-1 text-[10px] text-slate-400 font-semibold shadow-sm">
                  tradiary.com/dashboard
                </div>
                <div className="w-10" />
              </div>

              {/* Mock Dashboard Layout */}
              <div className="p-6 bg-slate-50/40 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Side info columns */}
                <div className="md:col-span-2 space-y-6">
                  {/* Cards row */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Profit/Loss</p>
                      <p className="text-lg font-bold text-emerald-500">+$2,450.25</p>
                      <span className="text-[9px] font-semibold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-1.5 inline-block">
                        ▲ 12.4%
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Win Rate</p>
                      <p className="text-lg font-bold text-indigo-600">68.4%</p>
                      <span className="text-[9px] font-semibold text-slate-400 mt-2 block">
                        48 Wins / 22 Losses
                      </span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Profit Factor</p>
                      <p className="text-lg font-bold text-slate-900">2.15</p>
                      <span className="text-[9px] font-semibold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-1.5 inline-block">
                        Excellent Edge
                      </span>
                    </div>
                  </div>

                  {/* Chart representation */}
                  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm h-64 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs font-bold text-slate-800">Equity Curve</p>
                        <p className="text-[10px] text-slate-400">Account growth over the last 30 trades</p>
                      </div>
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                        Live Sync
                      </span>
                    </div>

                    {/* Simulated SVG Graph */}
                    <div className="flex-1 w-full relative">
                      <svg viewBox="0 0 400 120" className="w-full h-full text-indigo-500 overflow-visible" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="mockChartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {/* Grid lines */}
                        <line x1="0" y1="20" x2="400" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                        <line x1="0" y1="60" x2="400" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                        <line x1="0" y1="100" x2="400" y2="100" stroke="#f1f5f9" strokeWidth="1" />

                        {/* Area */}
                        <path
                          d="M0,110 L20,95 L40,102 L60,85 L80,90 L100,70 L120,78 L140,55 L160,63 L180,48 L200,52 L220,35 L240,40 L260,25 L280,30 L300,18 L320,24 L340,12 L360,16 L380,5 L400,2 L400,120 L0,120 Z"
                          fill="url(#mockChartGrad)"
                        />
                        {/* Path Line */}
                        <path
                          d="M0,110 L20,95 L40,102 L60,85 L80,90 L100,70 L120,78 L140,55 L160,63 L180,48 L200,52 L220,35 L240,40 L260,25 L280,30 L300,18 L320,24 L340,12 L360,16 L380,5 L400,2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        {/* Pulse dot */}
                        <circle cx="400" cy="2" r="4" fill="#4f46e5" />
                        <circle cx="400" cy="2" r="8" fill="none" stroke="#4f46e5" strokeWidth="1.5" className="animate-ping" style={{ transformOrigin: '400px 2px' }} />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Right side list */}
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                      <p className="text-xs font-bold text-slate-800">Recent Trades</p>
                      <span className="text-[10px] font-semibold text-indigo-600">See All</span>
                    </div>
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800">EURUSD Buy</p>
                          <p className="text-[9px] text-slate-400">1.0924 • 1.2 Lots • Closed</p>
                        </div>
                        <p className="text-xs font-bold text-emerald-500">+$340.00</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800">GBPUSD Sell</p>
                          <p className="text-[9px] text-slate-400">1.2650 • 0.8 Lots • Closed</p>
                        </div>
                        <p className="text-xs font-bold text-emerald-500">+$210.00</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800">XAUUSD Buy</p>
                          <p className="text-[9px] text-slate-400">2318.5 • 0.5 Lots • Closed</p>
                        </div>
                        <p className="text-xs font-bold text-red-500">-$95.00</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800">AUDUSD Buy</p>
                          <p className="text-[9px] text-slate-400">0.6610 • 1.5 Lots • Closed</p>
                        </div>
                        <p className="text-xs font-bold text-emerald-500">+$180.00</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 mt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Shield size={12} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-800">MetaTrader 5 Sync</p>
                        <p className="text-[8px] text-slate-400">Encrypted webhook integration</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES SECTION ─── */}
      <section id="features" className="py-20 md:py-28 bg-slate-50/50 border-t border-slate-100/60 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 scroll-reveal">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-3">
              Powerful Features
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Everything you need to trade smarter
            </h3>
            <p className="text-sm text-slate-500 mt-3.5 leading-relaxed">
              Tradiary equips you with advanced analytics, interactive charting, and automatic synchronizations to take the guesswork out of trading.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl border border-slate-150 p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 scroll-reveal">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-6">
                <BookOpen size={22} />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2.5">Trade Journal</h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                Log every trade manually with our highly optimized, distraction-free entry forms, or automate everything via MT5 webhook sync.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl border border-slate-150 p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 scroll-reveal delay-100">
              <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 mb-6">
                <BarChart3 size={22} />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2.5">Analytics Dashboard</h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                Visualize win rates, profit factors, average wins/losses, best pair returns, and hold-time stats in real-time.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl border border-slate-150 p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 scroll-reveal delay-200">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6">
                <LineChart size={22} />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2.5">Equity Curve</h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                Analyze your account growth curve over time. Understand drawing-down trends and periods of explosive compound profit growth.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-2xl border border-slate-150 p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 scroll-reveal">
              <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600 mb-6">
                <Calendar size={22} />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2.5">Calendar View</h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                See your wins and losses plotted cleanly on a calendar grid. Discover if certain weekdays or month-ends yield poorer results.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-2xl border border-slate-150 p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 scroll-reveal delay-100">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-6">
                <Percent size={22} />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2.5">Risk Calculator</h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                Calculate proper lot sizes, exact dollar risks, and risk-reward ratios. Plan and size trades to preserve your precious capital.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-2xl border border-slate-150 p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group scroll-reveal delay-200">
              <div className="absolute top-4 right-4 bg-indigo-50 text-indigo-600 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                Coming Soon
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6 transition-transform group-hover:scale-105">
                <Sparkles size={22} />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2.5">AI Insights</h4>
              <p className="text-sm text-slate-500 leading-relaxed">
                Receive personalized trade suggestions and risk warnings coached directly by a specialized LLM trained on thousands of trades.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRICING SECTION ─── */}
      <section id="pricing" className="py-20 md:py-28 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12 scroll-reveal">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-3">
              Pricing Plans
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Simple, transparent pricing
            </h3>
            <p className="text-sm text-slate-500 mt-3.5 leading-relaxed">
              No hidden fees, no complicated contracts. Choose a plan that suits your trading scale.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3.5 mb-14 scroll-reveal delay-75">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${billingCycle === 'monthly'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-50 text-slate-500 hover:text-slate-800'
                }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${billingCycle === 'yearly'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-50 text-slate-500 hover:text-slate-800'
                }`}
            >
              Yearly
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500 text-white">
                Save 20%
              </span>
            </button>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch scroll-reveal delay-150">
            {/* Free Plan */}
            {planFreeVisible && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300">
                <div>
                  <h4 className="text-base font-bold text-slate-900 mb-2">Free</h4>
                  <p className="text-xs text-slate-400 mb-6">Ideal to start journaling your edge</p>
                  <p className="text-4xl font-extrabold text-slate-900 tracking-tight mb-6">
                    $0
                    <span className="text-sm text-slate-400 font-normal">
                      /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </p>
                  <hr className="border-slate-100 mb-6" />
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start gap-3 text-xs text-slate-600">
                      <Check size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span>1 Trading Account</span>
                    </li>
                    <li className="flex items-start gap-3 text-xs text-slate-600">
                      <Check size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span>Basic Analytics & Stats</span>
                    </li>
                    <li className="flex items-start gap-3 text-xs text-slate-600">
                      <Check size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span>Manual Trade History Log</span>
                    </li>
                    <li className="flex items-start gap-3 text-xs text-slate-600">
                      <Check size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span>Standard Email Support</span>
                    </li>
                  </ul>
                </div>
                <Link
                  href="/register"
                  className="w-full text-center py-3.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-150 transition-colors"
                >
                  Get Started Free
                </Link>
              </div>
            )}

            {/* Pro Plan */}
            {planProVisible && (
              <div className="bg-white rounded-2xl border-2 border-indigo-600 p-8 shadow-xl relative flex flex-col justify-between hover:scale-[1.01] transition-all duration-300">
                <div className="absolute top-0 right-8 -translate-y-1/2 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-lg shadow-indigo-600/20">
                  Popular
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 mb-2">Pro</h4>
                  <p className="text-xs text-slate-400 mb-6">Designed for professional traders</p>
                  <p className="text-4xl font-extrabold text-slate-900 tracking-tight mb-6">
                    ${billingCycle === 'monthly' ? pricing.pro.monthly : pricing.pro.yearly}
                    <span className="text-sm text-slate-400 font-normal">
                      /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </p>
                  <hr className="border-slate-100 mb-6" />
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start gap-3 text-xs text-slate-600">
                      <Check size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span className="font-semibold text-slate-800">5 Trading Accounts</span>
                    </li>
                    <li className="flex items-start gap-3 text-xs text-slate-600">
                      <Check size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span>Advanced Statistics & KPI Cards</span>
                    </li>
                    <li className="flex items-start gap-3 text-xs text-slate-600">
                      <Check size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span>Equity Curve & Calendar View</span>
                    </li>
                    <li className="flex items-start gap-3 text-xs text-slate-600">
                      <Check size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span>MT5 Webhook Integration</span>
                    </li>
                    <li className="flex items-start gap-3 text-xs text-slate-600">
                      <Check size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span>Priority Support Response</span>
                    </li>
                  </ul>
                </div>
                <Link
                  href="/register?plan=pro"
                  className="w-full text-center py-3.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 transition-all"
                >
                  Start Free Trial
                </Link>
              </div>
            )}

            {/* Enterprise Plan */}
            {planEnterpriseVisible && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300">
                <div>
                  <h4 className="text-base font-bold text-slate-900 mb-2">Enterprise</h4>
                  <p className="text-xs text-slate-400 mb-6">For proprietary funds and teams</p>
                  <p className="text-4xl font-extrabold text-slate-900 tracking-tight mb-6">
                    ${billingCycle === 'monthly' ? pricing.enterprise.monthly : pricing.enterprise.yearly}
                    <span className="text-sm text-slate-400 font-normal">
                      /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </p>
                  <hr className="border-slate-100 mb-6" />
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start gap-3 text-xs text-slate-600">
                      <Check size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span className="font-semibold text-slate-800">Unlimited Accounts</span>
                    </li>
                    <li className="flex items-start gap-3 text-xs text-slate-600">
                      <Check size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span>Custom Reports & Whitelabelling</span>
                    </li>
                    <li className="flex items-start gap-3 text-xs text-slate-600">
                      <Check size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span>Full REST API Access</span>
                    </li>
                    <li className="flex items-start gap-3 text-xs text-slate-600">
                      <Check size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span>Dedicated Account Manager</span>
                    </li>
                    <li className="flex items-start gap-3 text-xs text-slate-600">
                      <Check size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                      <span>Team Management Controls</span>
                    </li>
                  </ul>
                </div>
                <Link
                  href="/register?plan=enterprise"
                  className="w-full text-center py-3.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-155 transition-colors"
                >
                  Contact Us
                </Link>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-slate-400 font-medium mt-10">
            No credit card required for Free plan. You can upgrade, downgrade, or cancel at any time.
          </p>
        </div>
      </section>

      {/* ─── TESTIMONIALS SECTION ─── */}
      <section id="testimonials" className="py-20 md:py-28 bg-slate-50/50 border-t border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 scroll-reveal">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-3">
              Testimonials
            </h2>
            <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Trusted by traders worldwide
            </h3>
            <p className="text-sm text-slate-500 mt-3.5 leading-relaxed">
              Traders from multiple backgrounds use Tradiary to document and analyze their execution daily. Here is what they say.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {/* Testimonial 1 */}
            <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow scroll-reveal">
              <p className="text-sm text-slate-600 italic leading-relaxed mb-6">
                &ldquo;Finally a journal that doesn&apos;t feel like homework.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                  TR
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Rio Luigi</p>
                  <p className="text-[10px] text-slate-400">@TradeRLD.FX</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow scroll-reveal delay-100">
              <p className="text-sm text-slate-600 italic leading-relaxed mb-6">
                &ldquo;My win rate improved 15% in 2 months.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                  RF
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Rega Aditiya</p>
                  <p className="text-[10px] text-slate-400">@rega.fx</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow scroll-reveal delay-200">
              <p className="text-sm text-slate-600 italic leading-relaxed mb-6">
                &ldquo;The analytics alone are worth it.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                  SC
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Reza Alfariji</p>
                  <p className="text-[10px] text-slate-400">@scalper99</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA SECTION ─── */}
      <section className="py-20 md:py-24 relative overflow-hidden bg-slate-900 text-white scroll-reveal">
        {/* Background gradient layout */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-indigo-900 opacity-95" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #ffffff 0%, transparent 60%)' }}
        />

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Ready to become a better trader?
          </h2>
          <p className="text-indigo-100 max-w-xl mx-auto leading-relaxed mb-10 text-sm md:text-base">
            Join thousands of smart traders already using Tradiary to journal, analyze, and optimize their path to consistency.
          </p>
          <Link
            href="/register"
            className="inline-block font-bold text-indigo-600 bg-white hover:bg-slate-50 px-8 py-4 rounded-2xl shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Start for Free
          </Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-slate-950 text-slate-400 py-12 md:py-16 border-t border-slate-900 select-none">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6 items-start">
          {/* Logo & Tagline */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <TrendingUp size={16} className="text-white" />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">
                Tradiary
              </span>
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
              Automated trading journal synchronizing data directly from MetaTrader 5. Built for disciplined, modern traders.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap gap-x-12 gap-y-4 md:justify-center col-span-1 md:col-span-2 md:w-full">
            <a href="#features" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">
              Pricing
            </a>
            <Link href="/privacy" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 border-t border-slate-900/60 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-slate-600">
            {footerCopyright}
          </p>
          <p className="text-[9px] text-slate-700">
            Disclaimer: Trading financial instruments involves high risk. Past performance is not indicative of future results.
          </p>
        </div>
      </footer>
    </div>
  );
}
