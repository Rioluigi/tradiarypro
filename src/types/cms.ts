export interface CMSData {
  hero_heading: string;
  hero_subheading: string;
  login_quote: string;
  stats_traders: string;
  stats_trades: string;
  stats_satisfaction: string;
  plan_free_price_monthly: string;
  plan_pro_price_monthly: string;
  plan_pro_price_yearly: string;
  plan_enterprise_price_monthly: string;
  plan_enterprise_price_yearly: string;
  footer_copyright: string;
  plan_free_visible: string;
  plan_pro_visible: string;
  plan_enterprise_visible: string;
}

export const cmsDefaults: CMSData = {
  hero_heading: 'Track, Analyze & Improve Your Trading Performance',
  hero_subheading: 'Tradiary helps you journal every trade, spot patterns, and become a consistently profitable trader.',
  login_quote: 'Discipline is not about perfect trades. It is about a consistent process every day.',
  stats_traders: '12k+',
  stats_trades: '1.4M+',
  stats_satisfaction: '98%',
  plan_free_price_monthly: '0',
  plan_pro_price_monthly: '14.99',
  plan_pro_price_yearly: '11.99',
  plan_enterprise_price_monthly: '49.99',
  plan_enterprise_price_yearly: '39.99',
  footer_copyright: '© 2026 Tradiary. All rights reserved.',
  plan_free_visible: 'true',
  plan_pro_visible: 'true',
  plan_enterprise_visible: 'true',
};
