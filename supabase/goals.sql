-- F1: user goals
-- Run once in Supabase -> SQL Editor -> New query -> Run

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goals text[] not null default '{}',
  goal_note text,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
