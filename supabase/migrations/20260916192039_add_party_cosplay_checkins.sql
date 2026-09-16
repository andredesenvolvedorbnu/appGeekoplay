-- Final features recorded in the original GeekoPlay specification:
-- Party Finder, cosplay profiles and event check-ins.

create table public.party_finder_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  game text not null check (char_length(game) between 2 and 100),
  platform text not null check (platform in ('PC','PlayStation','Xbox','Nintendo','Mobile','Mesa/RPG','Outro')),
  starts_at timestamptz not null,
  seats_needed integer not null check (seats_needed between 1 and 99),
  details text check (details is null or char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.party_finder_members (
  party_id uuid not null references public.party_finder_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (party_id,user_id)
);

create index party_finder_posts_discovery_idx on public.party_finder_posts(status,starts_at);
create index party_finder_members_user_idx on public.party_finder_members(user_id);

create table public.cosplay_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  character_name text not null check (char_length(character_name) between 2 and 100),
  fandom text not null check (char_length(fandom) between 2 and 100),
  description text check (description is null or char_length(description) <= 1500),
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cosplay_photos (
  id uuid primary key default gen_random_uuid(),
  cosplay_profile_id uuid not null references public.cosplay_profiles(id) on delete cascade,
  image_url text not null,
  caption text check (caption is null or char_length(caption) <= 300),
  created_at timestamptz not null default now()
);

create table public.cosplay_appearances (
  id uuid primary key default gen_random_uuid(),
  cosplay_profile_id uuid not null references public.cosplay_profiles(id) on delete cascade,
  appearance_type text not null check (appearance_type in ('event','competition')),
  name text not null check (char_length(name) between 2 and 150),
  year integer check (year between 1950 and 2200),
  placement text check (placement is null or char_length(placement) <= 100),
  created_at timestamptz not null default now()
);

create index cosplay_profiles_owner_idx on public.cosplay_profiles(owner_id);
create index cosplay_photos_profile_idx on public.cosplay_photos(cosplay_profile_id,created_at desc);
create index cosplay_appearances_profile_idx on public.cosplay_appearances(cosplay_profile_id,year desc);

create table public.event_checkins (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  primary key (event_id,user_id)
);

create index event_checkins_recent_idx on public.event_checkins(event_id,checked_in_at desc);
create index event_checkins_user_idx on public.event_checkins(user_id);

alter table public.party_finder_posts enable row level security;
alter table public.party_finder_members enable row level security;
alter table public.cosplay_profiles enable row level security;
alter table public.cosplay_photos enable row level security;
alter table public.cosplay_appearances enable row level security;
alter table public.event_checkins enable row level security;

create policy "party posts authenticated read" on public.party_finder_posts
for select to authenticated using (true);
create policy "party posts create own" on public.party_finder_posts
for insert to authenticated with check ((select auth.uid())=author_id);
create policy "party posts update own" on public.party_finder_posts
for update to authenticated using ((select auth.uid())=author_id)
with check ((select auth.uid())=author_id);
create policy "party posts delete own" on public.party_finder_posts
for delete to authenticated using ((select auth.uid())=author_id or public.is_admin());

create policy "party members authenticated read" on public.party_finder_members
for select to authenticated using (true);
create policy "party members join self" on public.party_finder_members
for insert to authenticated with check ((select auth.uid())=user_id);
create policy "party members leave self or owner" on public.party_finder_members
for delete to authenticated using (
  (select auth.uid())=user_id
  or exists(select 1 from public.party_finder_posts p where p.id=party_id and p.author_id=(select auth.uid()))
  or public.is_admin()
);

create policy "cosplay profiles authenticated read" on public.cosplay_profiles
for select to authenticated using (true);
create policy "cosplay profiles create own" on public.cosplay_profiles
for insert to authenticated with check ((select auth.uid())=owner_id);
create policy "cosplay profiles update own" on public.cosplay_profiles
for update to authenticated using ((select auth.uid())=owner_id)
with check ((select auth.uid())=owner_id);
create policy "cosplay profiles delete own" on public.cosplay_profiles
for delete to authenticated using ((select auth.uid())=owner_id or public.is_admin());

create policy "cosplay photos authenticated read" on public.cosplay_photos
for select to authenticated using (true);
create policy "cosplay photos owner insert" on public.cosplay_photos
for insert to authenticated with check (exists(
  select 1 from public.cosplay_profiles p
  where p.id=cosplay_profile_id and p.owner_id=(select auth.uid())
));
create policy "cosplay photos owner delete" on public.cosplay_photos
for delete to authenticated using (exists(
  select 1 from public.cosplay_profiles p
  where p.id=cosplay_profile_id and (p.owner_id=(select auth.uid()) or public.is_admin())
));

create policy "cosplay appearances authenticated read" on public.cosplay_appearances
for select to authenticated using (true);
create policy "cosplay appearances owner insert" on public.cosplay_appearances
for insert to authenticated with check (exists(
  select 1 from public.cosplay_profiles p
  where p.id=cosplay_profile_id and p.owner_id=(select auth.uid())
));
create policy "cosplay appearances owner delete" on public.cosplay_appearances
for delete to authenticated using (exists(
  select 1 from public.cosplay_profiles p
  where p.id=cosplay_profile_id and (p.owner_id=(select auth.uid()) or public.is_admin())
));

create policy "event checkins authenticated read" on public.event_checkins
for select to authenticated using (true);
create policy "event checkins create own" on public.event_checkins
for insert to authenticated with check (
  (select auth.uid())=user_id
  and exists(
    select 1 from public.event_attendees a
    where a.event_id=event_checkins.event_id
      and a.user_id=(select auth.uid())
      and a.status in ('going','confirmed')
  )
  and exists(
    select 1 from public.events e
    where e.id=event_checkins.event_id
      and now() between e.starts_at-interval '6 hours'
                    and coalesce(e.ends_at,e.starts_at+interval '24 hours')+interval '6 hours'
  )
);
create policy "event checkins refresh own" on public.event_checkins
for update to authenticated using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id);
create policy "event checkins delete own" on public.event_checkins
for delete to authenticated using ((select auth.uid())=user_id or public.is_admin());

create or replace function public.guard_party_finder_join()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare target public.party_finder_posts%rowtype;
declare joined_count integer;
begin
  select * into target from public.party_finder_posts where id=new.party_id for update;
  if not found or target.status<>'open' or target.starts_at<=now() then
    raise exception 'PARTY_CLOSED';
  end if;
  if target.author_id=new.user_id then raise exception 'PARTY_OWNER'; end if;
  select count(*) into joined_count from public.party_finder_members where party_id=new.party_id;
  if joined_count>=target.seats_needed then raise exception 'PARTY_FULL'; end if;
  return new;
end;
$$;

create or replace function public.close_full_party_finder()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.party_finder_posts p
  set status='closed',updated_at=now()
  where p.id=new.party_id
    and (select count(*) from public.party_finder_members m where m.party_id=p.id)>=p.seats_needed;
  return new;
end;
$$;

revoke all on function public.guard_party_finder_join() from public,anon,authenticated;
revoke all on function public.close_full_party_finder() from public,anon,authenticated;

create trigger party_finder_join_guard
before insert on public.party_finder_members
for each row execute function public.guard_party_finder_join();
create trigger party_finder_auto_close
after insert on public.party_finder_members
for each row execute function public.close_full_party_finder();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('cosplay','cosplay',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "public read cosplay" on storage.objects
for select using (bucket_id='cosplay');
create policy "authenticated upload cosplay" on storage.objects
for insert to authenticated with check (
  bucket_id='cosplay' and (storage.foldername(name))[1]=(select auth.uid())::text
);
create policy "owner update cosplay" on storage.objects
for update to authenticated using (bucket_id='cosplay' and owner_id=(select auth.uid())::text)
with check (bucket_id='cosplay' and owner_id=(select auth.uid())::text);
create policy "owner delete cosplay" on storage.objects
for delete to authenticated using (bucket_id='cosplay' and owner_id=(select auth.uid())::text);

alter publication supabase_realtime add table public.party_finder_posts;
alter publication supabase_realtime add table public.party_finder_members;
alter publication supabase_realtime add table public.cosplay_profiles;
alter publication supabase_realtime add table public.cosplay_photos;
alter publication supabase_realtime add table public.cosplay_appearances;
alter publication supabase_realtime add table public.event_checkins;
