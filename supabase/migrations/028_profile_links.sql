create table if not exists public.profile_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  url text not null check (char_length(url) between 8 and 500),
  position integer not null default 0 check (position between 0 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_links_user_position_idx
  on public.profile_links(user_id, position, created_at);

alter table public.profile_links enable row level security;

drop policy if exists "profile links public read" on public.profile_links;
create policy "profile links public read" on public.profile_links
for select using (true);

drop policy if exists "profile links own insert" on public.profile_links;
create policy "profile links own insert" on public.profile_links
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "profile links own update" on public.profile_links;
create policy "profile links own update" on public.profile_links
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "profile links own delete" on public.profile_links;
create policy "profile links own delete" on public.profile_links
for delete to authenticated
using (auth.uid() = user_id);
