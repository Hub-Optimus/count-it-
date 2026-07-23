-- ============================================================
-- Count It - database schema
-- Run once: Supabase Dashboard -> SQL Editor -> New query ->
-- paste everything -> Run
-- ============================================================

create extension if not exists pgcrypto;

-- One row per gym session
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  split text,                   -- optional session name, e.g. 'Push Day'; muscle focus is derived from exercises
  notes text,                   -- cardio, general session notes
  created_at timestamptz not null default now()
);

-- One row per exercise inside a session
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  position int not null default 0
);

-- One row per working set
create table if not exists public.sets (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  weight numeric,               -- null = not recorded, 0 = bodyweight / empty bar
  unit text not null default 'kg' check (unit in ('kg', 'lbs')),
  reps int,
  per_side boolean not null default false,  -- 'each hand' / one-side leg press weights
  feel text,                    -- 'easy', 'heavy at end', free text
  position int not null default 0
);

create index if not exists workouts_user_date_idx on public.workouts (user_id, date desc);
create index if not exists exercises_workout_idx  on public.exercises (workout_id);
create index if not exists exercises_user_name_idx on public.exercises (user_id, name);
create index if not exists sets_exercise_idx      on public.sets (exercise_id);
create index if not exists sets_user_idx          on public.sets (user_id);

-- Row level security: every user sees only their own data
alter table public.workouts  enable row level security;
alter table public.exercises enable row level security;
alter table public.sets      enable row level security;

create policy "own workouts" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own exercises" on public.exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own sets" on public.sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Body weight log (repeatable) + height on the profile - see body-metrics.sql
-- for the migration; included here too so a fresh install has everything.
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
