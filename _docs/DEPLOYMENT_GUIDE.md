# ThreadCub - Vercel Production Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ Required Environment Variables

Add these to **Vercel** → **Settings** → **Environment Variables**:

| Variable | Type | Required For | Example Value |
|----------|------|--------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | All | `https://evbkoulaaityzztyutox.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | All | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Production, Preview | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `ANTHROPIC_API_KEY` | Secret | Production, Preview | `sk-ant-api03-...` |
| `OPENAI_API_KEY` | Secret | Production, Preview | `sk-proj-...` (optional) |
| `RESEND_API_KEY` | Secret | Production, Preview | `re_...` |
| `RESEND_FROM_EMAIL` | Public | Production, Preview | `hello@threadcub.com` |
| `NEXT_PUBLIC_SITE_URL` | Public | Production, Preview | `https://threadcub.com` |
| `STRIPE_PUBLISHABLE_KEY` | Public | Production, Preview | `pk_live_...` or `pk_test_...` |
| `STRIPE_SECRET_KEY` | Secret | Production, Preview | `sk_live_...` or `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Secret | Production, Preview | `whsec_...` |

**CRITICAL Variables**:

1. **`SUPABASE_SERVICE_ROLE_KEY`** - REQUIRED for credit system (deductCredits, addCredits)
   - Get from: Supabase Dashboard → Settings → API → `service_role` (secret)

2. **`STRIPE_SECRET_KEY`** - REQUIRED for payment processing
   - Get from: Stripe Dashboard → Developers → API Keys
   - Use test keys (`sk_test_...`) for testing, live keys (`sk_live_...`) for production

3. **`STRIPE_WEBHOOK_SECRET`** - REQUIRED for adding credits after payment
   - Get from: Stripe Dashboard → Webhooks → Your endpoint → Signing secret
   - See `STRIPE_SETUP.md` for detailed webhook configuration

### Environment Scopes

**Production**: Used for `threadcub.com` (main branch)
**Preview**: Used for branch deployments (feature branches)
**Development**: Used for local `vercel dev` (not needed since you use `npm run dev`)

**Recommendation**: Add all variables to **Production** and **Preview** scopes.

---

## 🔧 Pre-Deployment Code Changes

### 1. Add Missing Environment Variable to .env.local

```bash
# Add this line to .env.local for local development
SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key-from-supabase>"
```

Get the service role key from:
- Go to: https://supabase.com/dashboard/project/evbkoulaaityzztyutox/settings/api
- Copy the `service_role` (secret) key
- **NEVER commit this to git** - it's already in .gitignore

### 2. Files Already Configured

✅ `vercel.json` - Created with timeout settings for Deep Analysis
✅ `next.config.js` - Already configured for Vercel
✅ `.gitignore` - Already excludes .env files
✅ CORS - Already set to `Access-Control-Allow-Origin: *`

---

## 🚀 Deployment Steps

### Step 1: Commit vercel.json

```bash
git add vercel.json DEPLOYMENT_GUIDE.md
git commit -m "Add Vercel configuration for serverless function timeouts"
git push -u origin claude/implement-credit-system-01FCNbzArijP9qz2uDmAcifa
```

### Step 2: Merge to Main Branch

```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Merge your feature branch
git merge claude/implement-credit-system-01FCNbzArijP9qz2uDmAcifa

# Push to main
git push origin main
```

### Step 3: Configure Vercel Environment Variables

1. Go to: https://vercel.com/your-username/threadcub-app-mvp/settings/environment-variables

2. Add each environment variable:
   - Variable name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: `https://evbkoulaaityzztyutox.supabase.co`
   - Environments: ☑ Production ☑ Preview ☐ Development
   - Click "Save"

3. Repeat for ALL variables in the table above

**IMPORTANT**: For the `SUPABASE_SERVICE_ROLE_KEY`:
   - Go to Supabase Dashboard first to get the key
   - This is the most critical variable for credit system

### Step 4: Deploy to Vercel

**Option A: Automatic Deployment**
- Vercel automatically deploys when you push to `main`
- Wait for deployment to complete (2-3 minutes)

**Option B: Manual Deployment**
```bash
# If you have Vercel CLI installed
vercel --prod
```

### Step 5: Update Supabase Allowed Domains

1. Go to: https://supabase.com/dashboard/project/evbkoulaaityzztyutox/auth/url-configuration

2. Add your Vercel URL to **Redirect URLs**:
   - `https://threadcub.vercel.app/**` (or your custom domain)
   - `https://threadcub.com/**` (if using custom domain)

3. Add to **Site URL**:
   - `https://threadcub.com` (or `https://threadcub.vercel.app`)

---

## 🧪 Post-Deployment Testing

### Critical Path Testing (Do in order)

1. **Authentication**
   - ✅ Visit https://threadcub.com/auth
   - ✅ Sign in with existing account
   - ✅ Check if redirected to /dashboard

2. **Conversation Import**
   - ✅ Go to dashboard
   - ✅ Upload a conversation via Chrome extension
   - ✅ Check if platform is detected correctly (not "unknown")
   - ✅ Verify stats show correctly

3. **Credit System**
   - ✅ View a conversation
   - ✅ Check credit balance displays
   - ✅ Click "Unlock Deep Analysis"
   - ✅ Verify paywall shows correct credit cost
   - ✅ Click unlock button
   - ✅ Wait for analysis (may take 30-60 seconds)
   - ✅ Verify credits deducted AFTER analysis completes
   - ✅ Check analysis quality meets requirements

4. **Error Handling**
   - ✅ Try unlocking with insufficient credits
   - ✅ Verify error message displays correctly
   - ✅ Check Vercel logs for any errors

### Check Vercel Logs

1. Go to: https://vercel.com/your-username/threadcub-app-mvp/deployments
2. Click on latest deployment
3. Go to "Functions" tab
4. Check logs for:
   - `🔑 API Key configured: Yes`
   - `📊 Analyzing conversation with X messages`
   - `✅ Analysis successful, now deducting credits`
   - Look for any ❌ errors

---

## ⚠️ Common Issues & Solutions

### Issue: "ANTHROPIC_API_KEY not configured"
**Solution**: Environment variable not set in Vercel
- Go to Vercel → Settings → Environment Variables
- Add `ANTHROPIC_API_KEY` with your key
- Redeploy

### Issue: "Failed to deduct credits"
**Solution**: Missing `SUPABASE_SERVICE_ROLE_KEY`
- Get from Supabase Dashboard → API Settings
- Add to Vercel environment variables
- Redeploy

### Issue: "Function execution timed out"
**Solution**: Deep Analysis takes too long
- Check `vercel.json` exists with `maxDuration: 60`
- Vercel Pro plan allows up to 60 seconds (Hobby plan: 10 seconds)
- Consider upgrading to Pro if on Hobby plan

### Issue: Platform shows "Unknown"
**Solution**: Auto-detection not working
- Check Chrome extension is sending conversation data
- Check Vercel logs for `🔍 Auto-detected platform:` messages
- Run SQL script: `scripts/update-platforms.sql` for existing conversations

### Issue: Build fails with TypeScript errors
**Solution**:
- Check specific error in Vercel build logs
- May need to fix type errors before deploying
- Can temporarily disable: `eslint.ignoreDuringBuilds: true` is already set

---

## 📊 Monitoring & Performance

### Vercel Analytics
- Enable in: Vercel Dashboard → Analytics
- Monitor:
  - Page load times
  - API route performance
  - Error rates

### Supabase Monitoring
- Check: Supabase Dashboard → Database → Usage
- Monitor:
  - Database size
  - API requests
  - Credit transactions

### Cost Monitoring
- Anthropic API: https://console.anthropic.com/
- OpenAI API: https://platform.openai.com/usage
- Vercel: https://vercel.com/dashboard/usage

---

## 🔐 Security Checklist

✅ `.env` files in `.gitignore`
✅ `SUPABASE_SERVICE_ROLE_KEY` never committed
✅ `ANTHROPIC_API_KEY` stored as Vercel secret
✅ CORS configured (currently allows all - consider restricting)
✅ Supabase RLS policies enabled (from migration)
✅ Credit deduction happens server-side only

---

## 📞 Support & Troubleshooting

**If deployment fails:**
1. Check Vercel build logs
2. Check environment variables are set
3. Check Supabase is accessible
4. Check API keys are valid

**For help:**
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs

---

## ✅ Deployment Success Criteria

Your deployment is successful when:
- ✅ Site loads at https://threadcub.com
- ✅ User can sign in
- ✅ Conversations can be imported
- ✅ Platform detection works
- ✅ Credit balance displays
- ✅ Deep Analysis unlocks and charges credits
- ✅ Analysis quality meets requirements
- ✅ No errors in Vercel logs
- ✅ All environment variables set

---

**Your Next Steps:**
1. Get `SUPABASE_SERVICE_ROLE_KEY` from Supabase Dashboard
2. Add it to .env.local for testing
3. Commit and push vercel.json
4. Merge to main branch
5. Add ALL environment variables to Vercel
6. Deploy and test!

Good luck! 🚀
