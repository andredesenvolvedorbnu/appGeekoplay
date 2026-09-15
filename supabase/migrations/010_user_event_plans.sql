create table if not exists public.user_event_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  event_date timestamptz not null,
  location text not null check (char_length(location) between 2 and 180),
  note text,
  shared_post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_event_plans_user_date_idx
  on public.user_event_plans(user_id,event_date desc);

alter table public.user_event_plans enable row level security;

drop policy if exists "event plans public read" on public.user_event_plans;
create policy "event plans public read"
  on public.user_event_plans for select using (true);

drop policy if exists "event plans create own" on public.user_event_plans;
create policy "event plans create own"
  on public.user_event_plans for insert with check (auth.uid()=user_id);

drop policy if exists "event plans update own" on public.user_event_plans;
create policy "event plans update own"
  on public.user_event_plans for update
  using (auth.uid()=user_id)
  with check (auth.uid()=user_id);

drop policy if exists "event plans delete own" on public.user_event_plans;
create policy "event plans delete own"
  on public.user_event_plans for delete using (auth.uid()=user_id);

grant select on public.user_event_plans to anon, authenticated;
grant insert,update,delete on public.user_event_plans to authenticated;
