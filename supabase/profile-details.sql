-- Run once in Supabase -> SQL Editor -> New query -> Run
-- Expanded onboarding: body basics, goal-driving fields, and optional
-- preferences, added to the existing profiles table (one row per user,
-- same pattern as goals/goal_note/height_cm already use).
--
-- onboarding_completed_at is the important one operationally: existing
-- users already have a profiles row (from the old goals-only onboarding),
-- so a plain "does a row exist" check would skip them past these new
-- questions entirely. The app checks this timestamp instead - null means
-- "show them onboarding," regardless of whether a row already exists.

alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists sex text check (sex in ('male', 'female'));

alter table public.profiles add column if not exists primary_goal text
  check (primary_goal in ('lose_fat', 'build_muscle', 'maintain', 'general_fitness', 'strength', 'endurance'));
alter table public.profiles add column if not exists target_weight numeric;
alter table public.profiles add column if not exists target_weight_unit text check (target_weight_unit in ('kg', 'lbs'));
alter table public.profiles add column if not exists activity_level text
  check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active'));
alter table public.profiles add column if not exists experience_level text
  check (experience_level in ('beginner', 'intermediate', 'advanced', 'pro'));
alter table public.profiles add column if not exists train_locations text[] not null default '{}';

alter table public.profiles add column if not exists injury_notes text;
alter table public.profiles add column if not exists workout_days_per_week int;
alter table public.profiles add column if not exists reminders_enabled boolean not null default true;
alter table public.profiles add column if not exists rest_day_nudges_enabled boolean not null default false;
alter table public.profiles add column if not exists dietary_prefs text[] not null default '{}';

alter table public.profiles add column if not exists onboarding_completed_at timestamptz;
