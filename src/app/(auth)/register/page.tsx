'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, Check, TrendingUp } from 'lucide-react';

const getFriendlyErrorMessage = (msg: unknown): string => {
  if (!msg || typeof msg !== 'string') {
    return 'Registration failed. Please try again.';
  }

  const trimmed = msg.trim();
  if (trimmed === '{}') {
    return 'Registration failed. Please try again.';
  }

  // If it is a stringified JSON object, try to extract the message or use default
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object') {
        const innerMsg = parsed.message || (parsed.error as Record<string, unknown> | undefined)?.message || parsed.error_description;
        if (innerMsg && typeof innerMsg === 'string') {
          return innerMsg;
        }
      }
    } catch {
      // Ignored, proceed to normal string check
    }
  }

  const lowercaseMsg = trimmed.toLowerCase();
  if (lowercaseMsg.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (lowercaseMsg.includes('email')) {
    return 'There was a problem with the confirmation email. Please try again.';
  }
  if (lowercaseMsg.includes('already registered') || lowercaseMsg.includes('user already exists')) {
    return 'This email is already registered. Please sign in instead.';
  }

  return trimmed;
};

// ─── Plan Data ───
const plans = [
  {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: ['1 Trading Account', 'Basic Analytics', 'Trade History', 'Email Support'],
  },
  {
    name: 'Pro',
    monthlyPrice: 14.99,
    yearlyPrice: 149.99,
    features: ['5 Trading Accounts', 'Advanced Analytics', 'Calendar View', 'Priority Support', 'Webhook Integration'],
    popular: true,
  },
  {
    name: 'Enterprise',
    monthlyPrice: 49.99,
    yearlyPrice: 499.99,
    features: ['Unlimited Accounts', 'Custom Reports', 'API Access', 'Dedicated Support', 'Team Management', 'White-label'],
  },
];

// ─── Password Strength Calculator ───
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: '#ef4444' };
  if (score === 2) return { score: 2, label: 'Fair', color: '#f59e0b' };
  if (score === 3) return { score: 3, label: 'Good', color: '#3b82f6' };
  if (score >= 4) return { score: 4, label: 'Strong', color: '#22c55e' };
  return { score: 0, label: '', color: '#e2e8f0' };
}

// ─── Steps ───
const steps = [
  { num: '01', label: 'Choose Plan' },
  { num: '02', label: 'Create Account' },
  { num: '03', label: 'Verify Email' },
  { num: '04', label: 'Start Trading' },
];

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Free');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const planParam = params.get('plan');
      if (planParam) {
        const matched = planParam.toLowerCase();
        if (matched === 'pro') {
          setSelectedPlan('Pro');
        } else if (matched === 'enterprise') {
          setSelectedPlan('Enterprise');
        }
      }
    }
  }, []);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const isFormValid = firstName.trim() && lastName.trim() && email.trim() && password.length >= 6;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isFormValid) {
      setError('Please fill in all fields correctly');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`.trim(),
            plan: selectedPlan,
          },
        },
      });

      if (authError) {
        setError(getFriendlyErrorMessage(authError.message));
        return;
      }

      // Trigger Welcome Email
      try {
        await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'welcome',
            email,
          }),
        });
      } catch (err) {
        console.error('Failed to trigger welcome email API:', err);
      }

      // Save plan to localStorage for Dashboard modal trigger fallback
      if (typeof window !== 'undefined') {
        localStorage.setItem('tradiary_selected_plan', selectedPlan.toLowerCase());
      }

      if (data.session) {
        // Auto-confirmed session, redirect straight to dashboard
        window.location.href = '/dashboard';
      } else {
        // Verification required, show verification screen
        setSuccess(true);
      }
    } catch (err: unknown) {
      let msg = 'An unexpected error occurred. Please try again.';
      if (err) {
        if (typeof err === 'string') {
          msg = err;
        } else if (err instanceof Error) {
          msg = err.message;
        } else if (typeof err === 'object') {
          const obj = err as Record<string, unknown>;
          const innerMsg = obj.message || (obj.error as Record<string, unknown> | undefined)?.message || obj.error_description;
          if (typeof innerMsg === 'string') {
            msg = innerMsg;
          } else {
            msg = JSON.stringify(err);
          }
        }
      }
      setError(getFriendlyErrorMessage(msg));
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Success Screen ───
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-10 shadow-xl text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-500 mx-auto mb-6">
            <Check size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your email!</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
            We have sent a verification link to{' '}
            <span className="font-semibold" style={{ color: '#4f46e5' }}>{email}</span>.
            Please check your inbox to complete registration.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm font-semibold transition-colors"
            style={{ color: '#4f46e5' }}
          >
            ← Back to Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* ─── Left Column: Steps + Plans ─── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-16 py-12"
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e8ecf1 100%)',
        }}
      >
        {/* Step Indicator */}
        <div className="flex items-center gap-4 mb-10">
          {steps.map((step, idx) => (
            <div key={step.num} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{
                    backgroundColor: idx <= 1 ? '#4f46e5' : '#e2e8f0',
                    color: idx <= 1 ? '#ffffff' : '#94a3b8',
                  }}
                >
                  {step.num}
                </span>
                <span className={`text-xs font-medium ${idx <= 1 ? 'text-slate-700' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className="w-8 h-px bg-slate-300" />
              )}
            </div>
          ))}
        </div>

        {/* Heading */}
        <h1 className="text-3xl xl:text-4xl font-bold text-slate-900 leading-tight mb-3 tracking-tight">
          Set up your Tradiary<br />membership in one page
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Select a plan that fits your trading needs.
        </p>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setBillingCycle('monthly')}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              backgroundColor: billingCycle === 'monthly' ? '#0f172a' : '#f1f5f9',
              color: billingCycle === 'monthly' ? '#ffffff' : '#64748b',
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2"
            style={{
              backgroundColor: billingCycle === 'yearly' ? '#0f172a' : '#f1f5f9',
              color: billingCycle === 'yearly' ? '#ffffff' : '#64748b',
            }}
          >
            Yearly
            <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
              style={{
                backgroundColor: billingCycle === 'yearly' ? 'rgba(255,255,255,0.2)' : '#dbeafe',
                color: billingCycle === 'yearly' ? '#ffffff' : '#3b82f6',
              }}
            >
              Save 20%
            </span>
          </button>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-3 gap-3">
          {plans.map((plan) => {
            const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
            return (
              <div
                key={plan.name}
                className="relative text-left p-4 rounded-2xl border border-slate-200 bg-white"
              >
                {plan.popular && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md mb-2 inline-block"
                    style={{ backgroundColor: '#eef2ff', color: '#4f46e5' }}
                  >
                    Popular
                  </span>
                )}

                <h3 className="text-sm font-bold text-slate-900 mb-1">{plan.name}</h3>
                <p className="text-xl font-bold text-slate-900 mb-3">
                  {price === 0 ? 'Free' : `$${price}`}
                  {price > 0 && (
                    <span className="text-xs text-slate-400 font-normal">
                      /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  )}
                </p>

                <ul className="space-y-1.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Check size={12} style={{ color: '#4f46e5' }} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Right Column: Registration Form ─── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' }}
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
              Create your account
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Start tracking your trades automatically
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Name Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="register-first-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  First Name
                </label>
                <input
                  id="register-first-name"
                  type="text"
                  autoComplete="given-name"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 bg-white text-slate-900 text-sm placeholder-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:border-indigo-500"
                  style={{ '--tw-ring-color': 'rgba(79, 70, 229, 0.3)' } as React.CSSProperties}
                />
              </div>
              <div>
                <label htmlFor="register-last-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Last Name
                </label>
                <input
                  id="register-last-name"
                  type="text"
                  autoComplete="family-name"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 bg-white text-slate-900 text-sm placeholder-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:border-indigo-500"
                  style={{ '--tw-ring-color': 'rgba(79, 70, 229, 0.3)' } as React.CSSProperties}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email address
              </label>
              <input
                id="register-email"
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
              <label htmlFor="register-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min 6 characters"
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

              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="mt-2.5">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: passwordStrength.score >= level ? passwordStrength.color : '#e2e8f0',
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-medium" style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>


            {/* Error */}
            {error && typeof error === 'string' && (
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
              disabled={isLoading || !isFormValid}
              className="w-full py-3.5 rounded-2xl text-white text-sm font-bold uppercase tracking-wider transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.98]"
              style={{
                backgroundColor: '#0f172a',
                boxShadow: (isLoading || !isFormValid) ? 'none' : '0 4px 14px rgba(15, 23, 42, 0.25)',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Register'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-semibold transition-colors"
                style={{ color: '#4f46e5' }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
