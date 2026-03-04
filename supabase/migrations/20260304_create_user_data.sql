create extension if not exists pgcrypto;

create table if not exists public.user_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  device_id text,
  progress_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

create policy "user_data_select_own"
on public.user_data
for select
using (auth.uid() = user_id);

create policy "user_data_insert_own"
on public.user_data
for insert
with check (auth.uid() = user_id);

create policy "user_data_update_own"
on public.user_data
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_data_delete_own"
on public.user_data
for delete
using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_data_set_updated_at on public.user_data;
create trigger trg_user_data_set_updated_at
before update on public.user_data
for each row execute function public.set_updated_at();
