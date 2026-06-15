'use client';

import { useState } from 'react';
import {
  TrendingUp,
  Check,
  Crown,
  Zap,
  Building2,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanOnboardingClientProps {
  userId: string;
  userEmail: string;
}

const PLANS = [
  {
    name: 'Free',
    key: 'free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    icon: Zap,
    features: ['1 Trading Account', 'Basic Analytics', 'Manual Trade History Log', 'Standard Email Support'],
    badge: 'No credit card required',
    color: '#64748b',
    bgColor: 'rgba(100,116,139,0.05)',
    borderColor: 'rgba(100,116,139,0.2)',
    ctaText: 'Start for Free',
  },
  {
    name: 'Pro',
    key: 'pro',
    monthlyPrice: 14.99,
    yearlyPrice: 11.99, // $143.88 billed yearly (20% off $14.99/mo)
    icon: Crown,
    features: [
      '5 Trading Accounts',
      'Advanced Analytics & KPIs',
      'Equity Curve & Calendar View',
      'MT5 Webhook Integration',
      'CSV Trade Import (MT4/MT5)',
      'Priority Support Response',
    ],
    badge: '7-Day Free Trial',
    popular: true,
    color: '#4f46e5',
    bgColor: 'rgba(79,70,229,0.05)',
    borderColor: 'rgba(79,70,229,0.3)',
    ctaText: 'Start 7-Day Free Trial',
  },
  {
    name: 'Enterprise',
    key: 'enterprise',
    monthlyPrice: 49.99,
    yearlyPrice: 39.99, // $479.88 billed yearly (20% off $49.99/mo)
    icon: Building2,
    features: [
      'Unlimited Trading Accounts',
      'Custom Analytics & Reports',
      'Full REST API Access',
      'Dedicated Account Manager',
      'Team Management Controls',
      'White-label Branding',
    ],
    badge: 'For prop traders',
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.05)',
    borderColor: 'rgba(245,158,11,0.2)',
    ctaText: 'Start 7-Day Free Trial',
  },
];

export default function PlanOnboardingClient({
  userId,
  userEmail,
}: PlanOnboardingClientProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planKey: string) => {
    try {
      setLoadingPlan(planKey);

      // 1. Free Plan -> set onboarding_plan_selected = true in profiles database first and redirect
      if (planKey === 'free') {
        const selectRes = await fetch('/api/onboarding/select-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, plan: planKey }),
        });
        const selectData = await selectRes.json();
        if (!selectData.success) {
          throw new Error(selectData.error || 'Failed to select free plan');
        }
        window.location.href = '/dashboard';
        return;
      }

      // 2. Pro/Enterprise Plan -> checkout session redirect directly WITHOUT setting onboarding_plan_selected = true first
      const checkoutRes = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planKey,
          billingCycle,
          userId,
          userEmail,
        }),
      });
      const checkoutData = await checkoutRes.json();

      if (checkoutData.url) {
        window.location.href = checkoutData.url;
      } else {
        alert(checkoutData.error || 'Failed to trigger checkout session. Redirecting to onboarding.');
        window.location.href = '/onboarding/plan';
      }
    } catch (err) {
      console.error('Onboarding checkout selection error:', err);
      alert('An error occurred during selection. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-6 font-sans">
      {/* ─── HEADER ─── */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between pb-8 border-b border-slate-200/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md">
            <TrendingUp size={16} />
          </div>
          <span className="font-bold text-lg text-slate-800">Tradiary</span>
        </div>
        <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100/60 shadow-sm">
          Step 3 of 3 — Choose your plan
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="max-w-5xl w-full mx-auto my-12 text-center flex-1 flex flex-col justify-center">
        {/* Intro */}
        <div className="max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Choose the plan that fits your trading
          </h1>
          <p className="text-slate-500 mt-3 text-sm md:text-base leading-relaxed">
            Start free, upgrade anytime. No hidden fees. Cancel anytime during trial to avoid billing.
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200',
              billingCycle === 'monthly'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-500 border border-slate-200 hover:text-slate-800'
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5',
              billingCycle === 'yearly'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-500 border border-slate-200 hover:text-slate-800'
            )}
          >
            Yearly
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white shadow-sm shadow-emerald-500/10">
              Save 20%
            </span>
          </button>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
          {PLANS.map((plan) => {
            const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
            const PlanIcon = plan.icon;
            const isPro = plan.key === 'pro';
            const isLoading = loadingPlan === plan.key;

            return (
              <div
                key={plan.key}
                className={cn(
                  'bg-white rounded-3xl border p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-xl relative',
                  isPro
                    ? 'border-indigo-600 shadow-xl shadow-indigo-600/5 ring-1 ring-indigo-600/20 scale-[1.02] md:scale-[1.03]'
                    : 'border-slate-200/80 shadow-sm'
                )}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full shadow-lg shadow-indigo-600/20">
                    Most Popular
                  </span>
                )}

                <div>
                  {/* Plan Icon and Badge */}
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center border"
                      style={{ backgroundColor: plan.bgColor, borderColor: plan.borderColor }}
                    >
                      <PlanIcon size={20} style={{ color: plan.color }} />
                    </div>
                    {plan.badge && (
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
                        style={{
                          backgroundColor: isPro ? 'rgba(79,70,229,0.1)' : plan.bgColor,
                          borderColor: plan.borderColor,
                          color: plan.color,
                        }}
                      >
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  {/* Plan Name */}
                  <h3 className="text-lg font-bold text-slate-800 text-left">{plan.name}</h3>

                  {/* Plan Pricing */}
                  <div className="mt-2 mb-6 text-left">
                    <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      {price === 0 ? '$0' : `$${price}`}
                    </span>
                    {price > 0 && (
                      <span className="text-xs text-slate-400 font-medium ml-1">
                        /month
                      </span>
                    )}
                    {billingCycle === 'yearly' && price > 0 && (
                      <p className="text-[10px] text-emerald-500 font-bold mt-1">
                        Billed annually (${(price * 12).toFixed(2)}/yr)
                      </p>
                    )}
                    {price === 0 && (
                      <p className="text-[10px] text-slate-400 font-medium mt-1">
                        Free forever
                      </p>
                    )}
                  </div>

                  <hr className="border-slate-100 mb-6" />

                  {/* Features List */}
                  <ul className="space-y-3.5 mb-8 text-left">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-500">
                        <Check size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className={cn(idx === 0 && "font-bold text-slate-700")}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Call to Action Button */}
                <button
                  type="button"
                  onClick={() => handleSelectPlan(plan.key)}
                  disabled={loadingPlan !== null}
                  className={cn(
                    'w-full py-3.5 rounded-2xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 group',
                    isPro
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/25 active:scale-[0.98]'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-800 active:scale-[0.98]'
                  )}
                >
                  {isLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      {plan.ctaText}
                      <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── BOTTOM NOTES & SKIP ─── */}
      <div className="max-w-2xl w-full mx-auto text-center space-y-6 pt-8 border-t border-slate-200/60">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-xs text-slate-400 font-medium select-none">
          <span className="flex items-center gap-1.5">
            🔒 Secure payment powered by Stripe
          </span>
          <span className="hidden sm:inline">•</span>
          <span>Cancel trial anytime, no questions asked</span>
          <span className="hidden sm:inline">•</span>
          <span>All paid plans include 7-day free trial</span>
        </div>

        <div>
          <button
            onClick={() => handleSelectPlan('free')}
            disabled={loadingPlan !== null}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1.5 mx-auto border-b border-transparent hover:border-slate-350 pb-0.5"
          >
            {loadingPlan === 'free' ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              'Skip for now, use Free plan'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
