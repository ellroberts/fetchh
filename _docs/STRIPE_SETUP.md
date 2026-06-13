# Stripe Integration Setup Guide

Complete guide for setting up Stripe payment integration for ThreadCub credit purchases.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [Stripe Dashboard Configuration](#stripe-dashboard-configuration)
6. [Testing with Test Mode](#testing-with-test-mode)
7. [Production Deployment](#production-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Overview

ThreadCub uses Stripe Checkout for secure credit purchases. The integration includes:

- **Stripe Checkout**: Hosted payment page (PCI-compliant)
- **Webhook Handler**: Automatically adds credits after successful payment
- **Credit Packages**: 4 pricing tiers (10, 25, 50, 100 credits)
- **Transaction Logging**: Full audit trail in `credit_transactions` table

### Payment Flow

```
User clicks "Buy Now"
  → Create Checkout Session (API)
  → Redirect to Stripe Checkout
  → User pays with card
  → Stripe sends webhook
  → Credits added to account
  → Redirect to success page
```

---

## Prerequisites

Before starting, ensure you have:

- ✅ Stripe account (sign up at https://stripe.com)
- ✅ Supabase project with `user_credits` table
- ✅ `SUPABASE_SERVICE_ROLE_KEY` configured (required for webhook)
- ✅ Vercel deployment OR local development environment

---

## Environment Variables

### Required Variables

Add these to `.env.local` (development) AND Vercel (production):

```bash
# Stripe Keys (from Stripe Dashboard → Developers → API Keys)
STRIPE_PUBLISHABLE_KEY=pk_test_...  # or pk_live_... for production
STRIPE_SECRET_KEY=sk_test_...       # or sk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_...     # from Stripe Dashboard → Webhooks

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # CRITICAL for webhook!

# Site URL (for Stripe redirects)
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app  # or http://localhost:3000
```

### Getting Your Stripe Keys

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com
2. **Enable Test Mode** (toggle in top right)
3. **Navigate to**: Developers → API Keys
4. **Copy keys**:
   - `Publishable key` → `STRIPE_PUBLISHABLE_KEY`
   - `Secret key` → `STRIPE_SECRET_KEY` (click "Reveal test key")

⚠️ **IMPORTANT**: Keep `STRIPE_SECRET_KEY` secure! Never commit to git or expose to client-side.

---

## Database Setup

### 1. Run Migration

The `credit_transactions` table is created by migration file:

```bash
# If using Supabase CLI
supabase db push

# Or manually run the SQL from:
supabase/migrations/003_add_credit_transactions.sql
```

### 2. Verify Tables Exist

Check in Supabase Dashboard → Table Editor:

- ✅ `user_credits` - Stores user credit balances
- ✅ `credit_transactions` - Logs all transactions (purchases, deductions, etc.)

### 3. Test Database Access

```sql
-- Run in Supabase SQL Editor
SELECT * FROM user_credits LIMIT 1;
SELECT * FROM credit_transactions LIMIT 1;
```

---

## Stripe Dashboard Configuration

### 1. Create Webhook Endpoint

**Why?** Stripe needs to notify your app when payments succeed.

**Steps:**

1. Go to: https://dashboard.stripe.com/test/webhooks
2. Click **"Add endpoint"**
3. **Endpoint URL**:
   - **Local dev**: Use Stripe CLI (see below)
   - **Production**: `https://your-app.vercel.app/api/webhooks/stripe`
4. **Events to listen for**:
   - Select: `checkout.session.completed`
5. Click **"Add endpoint"**
6. **Copy webhook signing secret**: `whsec_...`
7. Add to `.env.local`: `STRIPE_WEBHOOK_SECRET=whsec_...`

### 2. Using Stripe CLI for Local Development

**Install Stripe CLI:**

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (with Scoop)
scoop install stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux.deb
sudo dpkg -i stripe_linux.deb
```

**Forward webhooks to localhost:**

```bash
# Login to Stripe
stripe login

# Forward webhooks (run in separate terminal)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook signing secret (whsec_...) to .env.local
```

**Output will show:**
```
> Ready! Your webhook signing secret is whsec_1234567890abcdef (^C to quit)
```

Add this to `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef
```

### 3. Test Product Configuration (Optional)

You can create products in Stripe Dashboard, but our integration uses **dynamic pricing** (created on-the-fly via `price_data`), so this is **not required**.

---

## Testing with Test Mode

### 1. Use Stripe Test Cards

Stripe provides test cards for different scenarios:

```
✅ SUCCESS (standard):
Card: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)

✅ SUCCESS (3D Secure):
Card: 4000 0025 0000 3155
Requires authentication popup

❌ DECLINE (insufficient funds):
Card: 4000 0000 0000 9995

❌ DECLINE (generic):
Card: 4000 0000 0000 0002
```

### 2. End-to-End Test Flow

**Step 1**: Start development server
```bash
npm run dev
```

**Step 2**: Start Stripe webhook listener (separate terminal)
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Step 3**: Test purchase
1. Navigate to: http://localhost:3000/buy-credits
2. Click "Buy Now" on any package
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout
5. Verify redirect to success page
6. Check Stripe CLI terminal for webhook event
7. Verify credits added in Supabase:
   ```sql
   SELECT * FROM user_credits WHERE user_id = 'your-user-id';
   SELECT * FROM credit_transactions ORDER BY created_at DESC LIMIT 5;
   ```

### 3. Verify Webhook Handling

**Check webhook logs:**

1. Stripe Dashboard → Developers → Webhooks
2. Click on your endpoint
3. View event attempts
4. Check for successful deliveries (200 status)

**Check server logs:**
```bash
# Your Next.js terminal should show:
[Stripe Webhook] Event received: checkout.session.completed
[Stripe Webhook] Checkout completed: { sessionId: '...', metadata: {...} }
[Stripe Webhook] Adding credits: { userId: '...', credits: 25 }
[Stripe Webhook] Credits added successfully: { previousCredits: 0, creditsAdded: 25, newTotal: 25 }
```

---

## Production Deployment

### 1. Switch to Live Mode

**Get live API keys:**

1. Go to Stripe Dashboard
2. **Disable Test Mode** (toggle in top right)
3. Navigate to: Developers → API Keys
4. Copy **live keys**:
   - `Publishable key` → starts with `pk_live_...`
   - `Secret key` → starts with `sk_live_...`

### 2. Add Environment Variables to Vercel

```bash
# Via Vercel Dashboard
1. Go to: Vercel → Your Project → Settings → Environment Variables
2. Add all variables:
   - STRIPE_PUBLISHABLE_KEY (pk_live_...)
   - STRIPE_SECRET_KEY (sk_live_...)
   - STRIPE_WEBHOOK_SECRET (whsec_... from webhook endpoint)
   - NEXT_PUBLIC_SITE_URL (https://your-domain.com)
3. Scopes: ☑️ Production ☑️ Preview
4. Click "Save"

# Or via Vercel CLI
vercel env add STRIPE_PUBLISHABLE_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
```

### 3. Create Live Webhook Endpoint

1. Go to: https://dashboard.stripe.com/webhooks (live mode)
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://your-app.vercel.app/api/webhooks/stripe`
4. **Events**: `checkout.session.completed`
5. Click **"Add endpoint"**
6. **Copy signing secret** → Add to Vercel env vars as `STRIPE_WEBHOOK_SECRET`

### 4. Deploy to Production

```bash
git add .
git commit -m "Add Stripe payment integration"
git push origin main
```

Vercel will auto-deploy with new environment variables.

### 5. Production Testing Checklist

Before going live:

- [ ] Test card purchase in production (use test mode first!)
- [ ] Verify webhook delivery in Stripe Dashboard
- [ ] Check credits added in Supabase production database
- [ ] Test success/cancel redirects
- [ ] Verify transaction logging in `credit_transactions`
- [ ] Test with real card (small amount)
- [ ] Check email confirmation (if implemented)
- [ ] Review Stripe Dashboard for any errors

---

## Troubleshooting

### Issue: Webhook not receiving events

**Symptoms:**
- Payment succeeds but credits not added
- No webhook logs in Stripe Dashboard

**Solutions:**

1. **Check webhook URL is correct**:
   - Stripe Dashboard → Webhooks → Click endpoint
   - Verify URL: `https://your-app.vercel.app/api/webhooks/stripe`

2. **Check webhook secret**:
   ```bash
   # Verify STRIPE_WEBHOOK_SECRET is set in Vercel
   vercel env ls
   ```

3. **Check webhook signature verification**:
   - Look for "Signature verification failed" in Vercel logs
   - Ensure webhook secret matches Stripe Dashboard

4. **Test webhook manually**:
   ```bash
   # Use Stripe CLI
   stripe trigger checkout.session.completed
   ```

### Issue: "STRIPE_SECRET_KEY not configured"

**Solution:**

```bash
# Add to .env.local
STRIPE_SECRET_KEY=sk_test_your_key_here

# Restart dev server
npm run dev
```

### Issue: "SUPABASE_SERVICE_ROLE_KEY not configured"

**Why it's needed:** Service role key bypasses RLS policies to add credits from webhook.

**Solution:**

1. Get key from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
2. Copy `service_role` (secret) key
3. Add to `.env.local` and Vercel:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
   ```

### Issue: Credits not added after payment

**Check:**

1. **Webhook delivered?**
   - Stripe Dashboard → Webhooks → Recent events
   - Look for 200 response status

2. **Check Vercel logs**:
   ```bash
   vercel logs --follow
   ```
   Look for:
   - `[Stripe Webhook] Event received`
   - `[Stripe Webhook] Credits added successfully`

3. **Check database**:
   ```sql
   -- Verify user_credits updated
   SELECT * FROM user_credits WHERE user_id = 'user-id';

   -- Check transaction log
   SELECT * FROM credit_transactions
   WHERE stripe_session_id = 'cs_test_...'
   ORDER BY created_at DESC;
   ```

4. **Check metadata**:
   - Webhook needs `userId` and `credits` in session metadata
   - Check `/api/create-checkout-session/route.ts` passes metadata

### Issue: TypeScript errors

**Common fixes:**

```bash
# Install type definitions
npm install --save-dev @types/stripe

# Clear Next.js cache
rm -rf .next
npm run dev
```

### Issue: Redirect URLs not working

**Check:**

1. `NEXT_PUBLIC_SITE_URL` is set correctly:
   - Local: `http://localhost:3000`
   - Production: `https://your-app.vercel.app`

2. Success/cancel pages exist:
   - `/credits/success`
   - `/buy-credits` (with `?canceled=true` param)

---

## Additional Resources

- **Stripe Docs**: https://stripe.com/docs
- **Stripe Checkout**: https://stripe.com/docs/payments/checkout
- **Webhook Guide**: https://stripe.com/docs/webhooks
- **Test Cards**: https://stripe.com/docs/testing
- **Stripe CLI**: https://stripe.com/docs/stripe-cli

---

## Support

If you encounter issues:

1. Check Vercel deployment logs
2. Check Stripe Dashboard → Events
3. Check Supabase logs
4. Review this guide's troubleshooting section

**Common Issues:**
- 90% of issues are environment variables not set correctly
- Check `.env.local` for local dev
- Check Vercel dashboard for production
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set (critical!)

---

## Summary Checklist

### Local Development
- [ ] Install Stripe packages (`npm install stripe @stripe/stripe-js`)
- [ ] Add Stripe test keys to `.env.local`
- [ ] Run database migration for `credit_transactions`
- [ ] Start Stripe CLI webhook listener
- [ ] Test purchase with test card `4242 4242 4242 4242`
- [ ] Verify credits added in Supabase

### Production Deployment
- [ ] Get Stripe live keys
- [ ] Add all env vars to Vercel (Production scope)
- [ ] Create live webhook endpoint in Stripe
- [ ] Deploy to Vercel
- [ ] Test with real card (small amount)
- [ ] Monitor Stripe Dashboard for errors
- [ ] Monitor Vercel logs for webhook events

---

**🎉 You're all set! Your Stripe integration is ready to process payments.**

For questions or issues, check the troubleshooting section or review Stripe's excellent documentation.
