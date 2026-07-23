-- Run once in Supabase -> SQL Editor -> New query -> Run
-- Body weight logged over time (repeatable, like a workout) so goal
-- tracking can show a real trend, not just a single snapshot. Height is
-- a single value on the profile since it doesn't change for adults.

create table if not exists public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  weight numeric,
  weight_unit text check (weight_unit in ('kg', 'lbs')),
  created_at timestamptz not null default now()
);

create index if not exists body_metrics_user_date_idx on public.body_metrics (user_id, date desc);

alter table public.body_metrics enable row level security;

create policy "own body metrics" on public.body_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.profiles add column if not exists height_cm numeric;
