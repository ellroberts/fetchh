# ThreadCub — Supabase Launch Cheat Sheet

A quick reference for monitoring users, usage, and health at launch.

---

## 👥 User Overview

All users with waitlist status, tier, and RAG usage at a glance.

```sql
SELECT 
  u.email,
  u.created_at,
  w.status AS waitlist_status,
  p.subscription_tier,
  p.rag_queries_this_period,
  p.rag_period_start
FROM auth.users u
LEFT JOIN public.waitlist w ON w.email = u.email
LEFT JOIN public.user_profiles p ON p.id = u.id
ORDER BY u.created_at DESC;
```

---

## 📊 RAG Query Usage

How many queries each user has used this period.

```sql
SELECT 
  u.email,
  p.subscription_tier,
  p.rag_queries_this_period,
  p.rag_period_start
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
ORDER BY p.rag_queries_this_period DESC NULLS LAST;
```

---

## ⏳ Waitlist Status

See all waitlist entries and their current status.

```sql
SELECT 
  email,
  status,
  created_at,
  approved_at,
  user_id IS NOT NULL AS has_account
FROM public.waitlist
ORDER BY created_at DESC;
```

Pending users only:

```sql
SELECT email, created_at
FROM public.waitlist
WHERE status = 'pending'
ORDER BY created_at ASC;
```

---

## 🚨 Users Missing a Profile

New signups who don't have a user_profiles row (will break RAG limits).

```sql
SELECT u.email, u.created_at
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
WHERE p.id IS NULL;
```

Fix missing profiles:

```sql
INSERT INTO public.user_profiles (id, subscription_tier, rag_queries_this_period, rag_period_start)
SELECT u.id, 'free', 0, NOW()
FROM auth.users u
LEFT JOIN public.user_profiles p ON p.id = u.id
WHERE p.id IS NULL;
```

---

## 💳 Subscription Tiers

Count of users per tier.

```sql
SELECT 
  subscription_tier,
  COUNT(*) AS user_count
FROM public.user_profiles
GROUP BY subscription_tier
ORDER BY user_count DESC;
```

---

## 🗂️ Conversation Stats

Total conversations per user.

```sql
SELECT 
  u.email,
  COUNT(c.id) AS conversation_count,
  MAX(c.created_at) AS last_import
FROM auth.users u
LEFT JOIN public.conversations c ON c.user_id = u.id
GROUP BY u.email
ORDER BY conversation_count DESC;
```

---

## 🧠 Embedding / Indexing Health

Conversations that are imported but not yet indexed.

```sql
SELECT 
  u.email,
  COUNT(*) AS unindexed_count
FROM public.conversations c
JOIN auth.users u ON u.id = c.user_id
WHERE c.has_embeddings = false
GROUP BY u.email
ORDER BY unindexed_count DESC;
```

---

## 🔧 Admin Actions

**Approve a waitlisted user:**

```sql
UPDATE public.waitlist
SET status = 'approved', approved_at = NOW()
WHERE email = 'user@example.com';
```

**Upgrade a user's subscription tier:**

```sql
UPDATE public.user_profiles
SET subscription_tier = 'pro'
WHERE id = (SELECT id FROM auth.users WHERE email = 'user@example.com');
```

**Reset a user's RAG query count:**

```sql
UPDATE public.user_profiles
SET rag_queries_this_period = 0, rag_period_start = NOW()
WHERE id = (SELECT id FROM auth.users WHERE email = 'user@example.com');
```

**Give yourself unlimited access:**

```sql
UPDATE public.user_profiles
SET subscription_tier = 'unlimited'
WHERE id = (SELECT id FROM auth.users WHERE email = 'elliot.roberts@gmail.com');
```

---

## ✅ Pre-Launch Checklist

- [ ] All approved users have a `user_profiles` row
- [ ] No users stuck on `pending` who should be `approved`
- [ ] Your own account is set to `unlimited` tier
- [ ] No conversations stuck unindexed (`has_embeddings = false`)
- [ ] RLS admin policies use your real email, not a test account
