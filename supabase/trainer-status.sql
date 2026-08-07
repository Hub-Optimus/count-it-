-- Run once in Supabase -> SQL Editor -> New query -> Run
-- Whether the user currently trains with a PT/coach, independent of
-- experience level - a beginner or a pro can both have one. This is what
-- lets suggestions later decide "guide them directly" (no trainer) vs
-- "stay out of the way, they already have one" (has a trainer), rather
-- than experience_level alone trying to carry both signals at once.

alter table public.profiles add column if not exists has_trainer boolean;
