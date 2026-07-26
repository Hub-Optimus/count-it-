-- Run once in Supabase -> SQL Editor -> New query -> Run
-- Optional, per-exercise rep target (e.g. "work up to 15 reps before
-- adding weight"). Purely opt-in — an exercise with no row here just
-- gets a plain last-time comparison, no target-hit judgment.

create table if not exists public.exercise_targets (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  target_reps int not null,
  seed_weight numeric,
  seed_weight_unit text check (seed_weight_unit in ('kg', 'lbs')),
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_name)
);

alter table public.exercise_targets enable row level security;

create policy "own exercise targets" on public.exercise_targets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
