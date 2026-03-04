create table if not exists public.user_task_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  task_type text not null default 'quiz',
  category text,

  difficulty double precision not null default 5.2 check (difficulty >= 1 and difficulty <= 10),
  stability double precision not null default 0.6 check (stability > 0),
  retrievability double precision not null default 1 check (retrievability >= 0 and retrievability <= 1),
  desired_retention double precision not null default 0.9 check (desired_retention >= 0.7 and desired_retention <= 0.99),

  review_count integer not null default 0,
  lapse_count integer not null default 0,
  elapsed_days double precision not null default 0,
  scheduled_days double precision not null default 0,
  last_rating smallint check (last_rating between 1 and 4),
  last_outcome text,

  last_reviewed_at timestamptz,
  due_date timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, task_id)
);

create index if not exists idx_user_task_progress_user_due
  on public.user_task_progress(user_id, due_date);

create index if not exists idx_user_task_progress_user_type_due
  on public.user_task_progress(user_id, task_type, due_date);

alter table public.user_task_progress enable row level security;

create policy "user_task_progress_select_own"
on public.user_task_progress
for select
using (auth.uid() = user_id);

create policy "user_task_progress_insert_own"
on public.user_task_progress
for insert
with check (auth.uid() = user_id);

create policy "user_task_progress_update_own"
on public.user_task_progress
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_task_progress_delete_own"
on public.user_task_progress
for delete
using (auth.uid() = user_id);

drop trigger if exists trg_user_task_progress_set_updated_at on public.user_task_progress;
create trigger trg_user_task_progress_set_updated_at
before update on public.user_task_progress
for each row execute function public.set_updated_at();
