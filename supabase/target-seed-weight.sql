-- Run once in Supabase -> SQL Editor -> New query -> Run
-- Optional seed weight, used only as a starting reference for a target
-- on an exercise with no logged history yet. Once real sessions exist,
-- the app derives the working weight from actual data instead - this
-- column is never read after that point.

alter table public.exercise_targets add column if not exists seed_weight numeric;
alter table public.exercise_targets add column if not exists seed_weight_unit text check (seed_weight_unit in ('kg', 'lbs'));
