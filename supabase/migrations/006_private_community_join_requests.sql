create table if not exists public.community_join_requests (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  unique (community_id,user_id)
);

alter table public.community_join_requests enable row level security;

create policy "join requests read own owner admin"
on public.community_join_requests
for select
using (
  auth.uid() = user_id
  or public.is_admin()
  or exists (
    select 1 from public.communities c
    where c.id = community_id and c.owner_id = auth.uid()
  )
);

create policy "join requests create own private"
on public.community_join_requests
for insert
with check (
  auth.uid() = user_id
  and status = 'pending'
  and exists (
    select 1 from public.communities c
    where c.id = community_id and c.visibility = 'private' and c.owner_id <> auth.uid()
  )
  and not exists (
    select 1 from public.community_members cm
    where cm.community_id = community_join_requests.community_id and cm.user_id = auth.uid()
  )
);

create policy "join requests update owner admin"
on public.community_join_requests
for update
using (
  public.is_admin()
  or exists (
    select 1 from public.communities c
    where c.id = community_id and c.owner_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.communities c
    where c.id = community_id and c.owner_id = auth.uid()
  )
);

create policy "join requests delete own owner admin"
on public.community_join_requests
for delete
using (
  auth.uid() = user_id
  or public.is_admin()
  or exists (
    select 1 from public.communities c
    where c.id = community_id and c.owner_id = auth.uid()
  )
);

create policy "community owner admin add members"
on public.community_members
for insert
with check (
  public.is_admin()
  or exists (
    select 1 from public.communities c
    where c.id = community_id and c.owner_id = auth.uid()
  )
);

create index if not exists idx_community_join_requests_community_status on public.community_join_requests(community_id,status,created_at desc);
create index if not exists idx_community_join_requests_user on public.community_join_requests(user_id,created_at desc);
