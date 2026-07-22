-- Run once in Supabase -> SQL Editor -> New query -> Run
-- Session names are now optional (the app derives muscle focus from the
-- exercises you log instead of requiring you to pick a split up front).

alter table public.workouts alter column split drop not null;
