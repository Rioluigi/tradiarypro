import Stripe from 'stripe';

// ─── Stripe Server-Side Client ───
// Requires STRIPE_SECRET_KEY in .env.local
// Example: STRIPE_SECRET_KEY=sk_test_51...
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiVersion: '2025-04-30.basil' as any,
  typescript: true,
});

// ─── Plan → Price ID Mapping ───
// Cara buat Price ID di Stripe:
// 1. Buka Stripe Dashboard → Product catalog
// 2. Klik "Add product"
// 3. Isi nama: "Tradiary Pro"
// 4. Tambah price: $14.99/month recurring (dan/atau $149.99/year recurring)
// 5. Copy Price ID (price_xxx) ke .env.local
//
// Lakukan hal yang sama untuk plan "Tradiary Enterprise" ($49.99/month dan $499.99/year)
export const PRICE_IDS: Record<string, Record<string, string>> = {
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || '',
  },
  enterprise: {
    monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || '',
    yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || '',
  },
};

// ─── Plan name resolver from Price ID ───
export function getPlanFromPriceId(priceId: string): string {
  for (const [plan, prices] of Object.entries(PRICE_IDS)) {
    if (Object.values(prices).includes(priceId)) {
      return plan;
    }
  }
  return 'free';
}
