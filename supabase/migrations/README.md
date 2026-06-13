# ThreadCub Database Migrations

## Credit System Migration (001_add_credit_system.sql)

### Overview
This migration implements a 3-tier credit system for ThreadCub conversation analysis:

- **Tier 1 (FREE)**: Instant stats - message count, topics, reading time
- **Tier 2 (FREE)**: Quick AI summary - auto-generated overview, problems solved
- **Tier 3 (PAID)**: Deep analysis - costs 3-15 credits based on conversation size

### What's Included

#### 1. **user_profiles** Table
Extends auth.users with credit tracking:
- `credit_balance` - Current credit balance
- `total_credits_purchased` - Lifetime purchases
- `total_credits_spent` - Lifetime spending
- `subscription_tier` - free/pro/enterprise
- Auto-creates profile with 10 free credits on user signup

#### 2. **conversations** Table Updates
Adds three new columns:
- `quick_summary` (JSONB) - Stores Tier 2 quick summaries
- `credits_used` (INTEGER) - Credits spent on this conversation
- `analysis_tier` (TEXT) - Which tier was used: instant/quick/deep

#### 3. **credit_transactions** Table
Complete audit trail for all credit operations:
- Tracks purchases, spending, refunds, bonuses
- Records before/after balances
- Links to conversations
- Supports metadata for payment info

#### 4. **highlights** Table (Future Feature)
User-created highlights from conversations:
- Save important excerpts
- Color-coding and categorization
- Tags for organization

#### 5. **credit_pricing** Table
Configurable pricing without code changes:
- `deep_analysis_small`: 3 credits (1-20 messages)
- `deep_analysis_medium`: 7 credits (21-50 messages)
- `deep_analysis_large`: 15 credits (51+ messages)
- `quick_summary`: 0 credits (free)
- `instant_stats`: 0 credits (free)

#### 6. **Helper Functions**
- `calculate_required_credits(message_count)` - Dynamic pricing
- `has_sufficient_credits(user_id, required)` - Balance check
- `deduct_credits(...)` - Atomic deduction with logging
- `add_credits(...)` - Add credits (purchase/bonus)

#### 7. **Row Level Security (RLS)**
All tables secured with policies:
- Users can only access their own data
- Public can view pricing
- Service role for transactions

### How to Apply This Migration

#### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `001_add_credit_system.sql`
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Verify success - you should see "Success. No rows returned"

#### Option 2: Supabase CLI
```bash
# Make sure you're logged in
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push
```

#### Option 3: psql Command Line
```bash
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  -f supabase/migrations/001_add_credit_system.sql
```

### Verification

After applying the migration, verify it worked:

```sql
-- Check user_profiles table exists
SELECT * FROM public.user_profiles LIMIT 1;

-- Check conversations table has new columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'conversations'
  AND column_name IN ('quick_summary', 'credits_used', 'analysis_tier');

-- Check credit pricing
SELECT * FROM public.credit_pricing ORDER BY credits_required;

-- Test helper function
SELECT public.calculate_required_credits(15);  -- Should return 3
SELECT public.calculate_required_credits(35);  -- Should return 7
SELECT public.calculate_required_credits(75);  -- Should return 15
```

### Post-Migration Steps

1. **Update existing users**: Run this to create profiles for existing users
   ```sql
   INSERT INTO public.user_profiles (id, credit_balance)
   SELECT id, 10 FROM auth.users
   ON CONFLICT (id) DO NOTHING;
   ```

2. **Backfill analysis_tier**: Update existing conversations
   ```sql
   UPDATE public.conversations
   SET analysis_tier = CASE
     WHEN analysis IS NOT NULL THEN 'deep'
     ELSE 'instant'
   END
   WHERE analysis_tier IS NULL;
   ```

3. **Update TypeScript types** (see next steps in main implementation)

### Rolling Back

If you need to rollback this migration:

```sql
-- Drop tables
DROP TABLE IF EXISTS public.highlights CASCADE;
DROP TABLE IF EXISTS public.credit_transactions CASCADE;
DROP TABLE IF EXISTS public.credit_pricing CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Remove columns from conversations
ALTER TABLE public.conversations
  DROP COLUMN IF EXISTS quick_summary,
  DROP COLUMN IF EXISTS credits_used,
  DROP COLUMN IF EXISTS analysis_tier;

-- Drop functions
DROP FUNCTION IF EXISTS public.calculate_required_credits(INTEGER);
DROP FUNCTION IF EXISTS public.has_sufficient_credits(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.deduct_credits(UUID, INTEGER, UUID, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.add_credits(UUID, INTEGER, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Drop trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

### Next Steps

After applying this migration, you'll need to:

1. ✅ Create `lib/credits.ts` - Credit calculation utilities
2. ✅ Create `components/DeepAnalysisPaywall.tsx` - Paywall UI
3. ✅ Create `components/QuickSummary.tsx` - Quick summary display
4. ✅ Create `app/api/quick-summary/route.ts` - API for quick summaries
5. ✅ Update `app/api/analyze-thread/route.ts` - Add credit checking
6. ✅ Update `app/(dashboard)/threads/[id]/page.tsx` - Add 3-tier tabs
7. ✅ Create TypeScript types for new tables
8. ✅ Add credit purchase flow (Stripe integration)

### Support

If you encounter any issues:
- Check Supabase logs in the Dashboard
- Verify RLS policies aren't blocking access
- Ensure your Supabase client has the correct service role key for admin operations
