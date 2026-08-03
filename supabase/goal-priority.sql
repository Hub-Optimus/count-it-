-- Run once in Supabase -> SQL Editor -> New query -> Run
--
-- Replaces the single "primary_goal" onboarding question with a
-- rank-ordered multi-select: goal_priority[0] is the top pick and is
-- what drives the roadmap; the rest still shape session composition
-- instead of sitting decorative. Order = priority, exactly as tapped
-- during onboarding.
--
-- primary_goal is left in place (unused going forward) rather than
-- dropped, so nothing breaks mid-rollout.

alter table public.profiles add column if not exists goal_priority text[] not null default '{}';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'goal_priority_valid_values'
  ) then
    alter table public.profiles add constraint goal_priority_valid_values
      check (goal_priority <@ array['lose_fat','build_muscle','maintain','general_fitness','strength','endurance']::text[]);
  end if;
end $$;

-- Backfill: carry each existing single primary_goal into position 0 of
-- the new ranked array, so nobody loses their current goal on rollout.
update public.profiles
set goal_priority = array[primary_goal]
where primary_goal is not null and goal_priority = '{}';
