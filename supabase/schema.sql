-- Run this in Supabase SQL Editor after creating your project

create table public.user_settings (
  id uuid primary key references auth.users(id) on delete cascade,
  birth_year integer not null default 2003,
  phases jsonb not null default '[]'::jsonb,
  reference_corpus numeric not null default 120233,
  reference_invested numeric not null default 104995,
  historical_xirr numeric not null default 0.1056,
  projected_xirr numeric not null default 0.12,
  goals jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Users manage own settings"
  on public.user_settings for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger settings_updated_at
  before update on public.user_settings
  for each row execute procedure public.touch_updated_at();
