-- Migration 037: Create try_sessions table for /try email gate and usage limits

create table try_sessions (
  token      uuid        primary key default gen_random_uuid(),
  email      text        not null,
  niche      text        not null check (niche in ('designers', 'builders', 'general')),
  try_count  integer     not null default 0,
  created_at timestamptz not null default now()
);

-- Service-role key bypasses RLS; no public access needed for this table.
alter table public.try_sessions enable row level security;
