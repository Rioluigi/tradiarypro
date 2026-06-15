'use client';

import { useState } from 'react';
import { CMSData } from '@/types/cms';
import {
  Save,
  Globe,
  Lock,
  DollarSign,
  Settings as SettingsIcon,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface CMSClientProps {
  initialData: CMSData;
}

export default function CMSClient({ initialData }: CMSClientProps) {
  const [settings, setSettings] = useState<CMSData>(initialData);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleInputChange = (key: keyof CMSData, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setToast(null);

      const res = await fetch('/api/admin/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save changes');

      // Success toast
      setToast({ message: 'Changes published successfully', type: 'success' });
      
      // Auto clear toast
      setTimeout(() => {
        setToast(null);
      }, 4000);
    } catch (err) {
      console.error('Error saving CMS settings:', err);
      const msg = err instanceof Error ? err.message : 'Failed to publish changes';
      setToast({ message: msg, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in relative pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl animate-slide-in-right ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 size={16} />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
            CMS Editor
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Modify public headings, pricing plan features, login page motivational copy, and footer text
          </p>
        </div>

        <div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-55 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-purple-600/15 active:scale-[0.98] transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Save size={14} />
                Save & Publish
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid of Sections */}
      <div className="space-y-6">
        {/* Section A: Hero */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <Globe className="text-purple-400" size={18} />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">A. Hero Section (Landing Page)</h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Hero Heading
              </label>
              <textarea
                value={settings.hero_heading}
                onChange={(e) => handleInputChange('hero_heading', e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Hero Subheading
              </label>
              <textarea
                value={settings.hero_subheading}
                onChange={(e) => handleInputChange('hero_subheading', e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Section B: Login Copy & Stats */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <Lock className="text-purple-400" size={18} />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">B. Login Page & Metrics</h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                Motivational Quote
              </label>
              <textarea
                value={settings.login_quote}
                onChange={(e) => handleInputChange('login_quote', e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Stat: Traders Counter
                </label>
                <input
                  type="text"
                  value={settings.stats_traders}
                  onChange={(e) => handleInputChange('stats_traders', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Stat: Trades Logged
                </label>
                <input
                  type="text"
                  value={settings.stats_trades}
                  onChange={(e) => handleInputChange('stats_trades', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                  Stat: Satisfaction
                </label>
                <input
                  type="text"
                  value={settings.stats_satisfaction}
                  onChange={(e) => handleInputChange('stats_satisfaction', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section C: Pricing */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <DollarSign className="text-purple-400" size={18} />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">C. Subscription Plans Pricing</h3>
          </div>

          <div className="space-y-6">
            {/* Free Plan */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-xs font-bold text-slate-350 uppercase">1. Free Plan</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Visible</span>
                  <input
                    type="checkbox"
                    checked={settings.plan_free_visible === 'true'}
                    onChange={(e) => handleInputChange('plan_free_visible', e.target.checked ? 'true' : 'false')}
                    className="w-4 h-4 rounded text-purple-600 border-slate-800 bg-slate-950 focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                    Monthly Cost ($)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={settings.plan_free_price_monthly}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-850 text-slate-500 text-sm cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-xs font-bold text-indigo-400 uppercase">2. Pro Plan</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Visible</span>
                  <input
                    type="checkbox"
                    checked={settings.plan_pro_visible === 'true'}
                    onChange={(e) => handleInputChange('plan_pro_visible', e.target.checked ? 'true' : 'false')}
                    className="w-4 h-4 rounded text-purple-600 border-slate-800 bg-slate-950 focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                    Monthly Price ($)
                  </label>
                  <input
                    type="text"
                    value={settings.plan_pro_price_monthly}
                    onChange={(e) => handleInputChange('plan_pro_price_monthly', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                    Equivalent Yearly Price ($/mo equivalent)
                  </label>
                  <input
                    type="text"
                    value={settings.plan_pro_price_yearly}
                    onChange={(e) => handleInputChange('plan_pro_price_yearly', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-xs font-bold text-amber-400 uppercase">3. Enterprise Plan</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">Visible</span>
                  <input
                    type="checkbox"
                    checked={settings.plan_enterprise_visible === 'true'}
                    onChange={(e) => handleInputChange('plan_enterprise_visible', e.target.checked ? 'true' : 'false')}
                    className="w-4 h-4 rounded text-purple-600 border-slate-800 bg-slate-950 focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                    Monthly Price ($)
                  </label>
                  <input
                    type="text"
                    value={settings.plan_enterprise_price_monthly}
                    onChange={(e) => handleInputChange('plan_enterprise_price_monthly', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                    Equivalent Yearly Price ($/mo equivalent)
                  </label>
                  <input
                    type="text"
                    value={settings.plan_enterprise_price_yearly}
                    onChange={(e) => handleInputChange('plan_enterprise_price_yearly', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section D: General */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <SettingsIcon className="text-purple-400" size={18} />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">D. General Configurations</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Footer Copyright Text
            </label>
            <input
              type="text"
              value={settings.footer_copyright}
              onChange={(e) => handleInputChange('footer_copyright', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/50 transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
