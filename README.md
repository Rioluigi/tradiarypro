This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## 💳 Stripe Payment Integration Setup

Follow these steps to fully configure Stripe payment features for Tradiary in development/testing mode:

### 1. Database Migration
Run the SQL queries in [supabase/stripe-migration.sql](file:///d:/Antigravity/tradiary/supabase/stripe-migration.sql) in your Supabase SQL Editor to add the subscription columns to the `profiles` table.

### 2. Configure environment variables (`.env.local`)
Add the following keys to your `.env.local` file:
```env
# Stripe Keys (from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_51...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...

# Webhook Secret (from Stripe CLI)
STRIPE_WEBHOOK_SECRET=whsec_...

# Custom Product Price IDs (Create these in the Stripe Dashboard: Test Mode → Products)
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_YEARLY=price_...
```

### 3. Local Webhook Testing
1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli).
2. Authenticate the CLI:
   ```bash
   stripe login
   ```
3. Start forwarding webhook events to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. Copy the webhook secret (`whsec_...`) printed in the CLI output and save it as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

