-- Migration: Create user_task_progress table and optimize RLS
-- Source: Extracted from project txyscrgwnlqwkqqaonnu

create table if not exists public.user_task_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  task_type text not null default 'quiz',
  category text,
  difficulty double precision not null default 5.2,
  stability double precision not null default 0.6,
  retrievability double precision not null default 1.0,
  desired_retention double precision not null default 0.9,
  review_count integer not null default 0,
  lapse_count integer not null default 0,
  elapsed_days double precision not null default 0,
  scheduled_days double precision not null default 0,
  last_rating smallint,
  last_outcome text,
  last_reviewed_at timestamptz,
  due_date timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Add constraints
  constraint difficulty_range check (difficulty >= 1.0 and difficulty <= 10.0),
  constraint stability_positive check (stability > 0.0),
  constraint retrievability_range check (retrievability >= 0.0 and retrievability <= 1.0),
  constraint retention_range check (desired_retention >= 0.7 and desired_retention <= 0.99),
  constraint rating_range check (last_rating >= 1 and last_rating <= 4),
  
  -- Unique constraint for upsert
  unique(user_id, task_id)
);

-- Enable RLS
alter table public.user_task_progress enable row level security;

-- Policies (Optimized with Subqueries as per Advisor)
create policy "user_task_progress_select_own"
on public.user_task_progress
for select
using ((select auth.uid()) = user_id);

create policy "user_task_progress_insert_own"
on public.user_task_progress
for insert
with check ((select auth.uid()) = user_id);

create policy "user_task_progress_update_own"
on public.user_task_progress
for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "user_task_progress_delete_own"
on public.user_task_progress
for delete
using ((select auth.uid()) = user_id);

-- Update trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_task_progress_set_updated_at on public.user_task_progress;
create trigger trg_user_task_progress_set_updated_at
before update on public.user_task_progress
for each row execute function public.set_updated_at();
