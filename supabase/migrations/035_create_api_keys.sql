create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key_value text not null unique,
  name text not null default 'Default',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.api_keys enable row level security;

create policy "Users can manage their own API keys"
  on public.api_keys
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
