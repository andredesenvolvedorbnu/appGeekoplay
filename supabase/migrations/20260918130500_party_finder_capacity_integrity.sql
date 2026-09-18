-- Keep Party Finder capacity authoritative in the database.
alter table public.party_finder_posts
  add column if not exists auto_closed boolean not null default false;

create or replace function public.guard_party_finder_join()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.party_finder_posts;
  current_members integer;
begin
  select * into p
  from public.party_finder_posts
  where id = new.party_id
  for update;

  if not found then
    raise exception 'PARTY_NOT_FOUND';
  end if;

  if p.status <> 'open' then
    raise exception 'PARTY_CLOSED';
  end if;

  if p.starts_at <= now() then
    raise exception 'PARTY_EXPIRED';
  end if;

  select count(*) into current_members
  from public.party_finder_members
  where party_id = new.party_id;

  if current_members >= p.seats_needed then
    raise exception 'PARTY_FULL';
  end if;

  return new;
end;
$$;

create or replace function public.sync_party_finder_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_party uuid;
  current_members integer;
  capacity integer;
  current_status text;
  was_auto_closed boolean;
  starts timestamptz;
begin
  target_party := coalesce(new.party_id, old.party_id);

  select seats_needed,status,auto_closed,starts_at
    into capacity,current_status,was_auto_closed,starts
  from public.party_finder_posts
  where id = target_party
  for update;

  if not found then
    return coalesce(new,old);
  end if;

  select count(*) into current_members
  from public.party_finder_members
  where party_id = target_party;

  if current_members >= capacity and current_status = 'open' then
    update public.party_finder_posts
       set status='closed',
           auto_closed=true,
           updated_at=now()
     where id=target_party;
  elsif tg_op = 'DELETE'
        and was_auto_closed
        and current_members < capacity
        and starts > now() then
    update public.party_finder_posts
       set status='open',
           auto_closed=false,
           updated_at=now()
     where id=target_party;
  end if;

  return coalesce(new,old);
end;
$$;

drop trigger if exists trg_guard_party_finder_join on public.party_finder_members;
create trigger trg_guard_party_finder_join
before insert on public.party_finder_members
for each row execute function public.guard_party_finder_join();

drop trigger if exists trg_sync_party_finder_capacity_insert on public.party_finder_members;
create trigger trg_sync_party_finder_capacity_insert
after insert on public.party_finder_members
for each row execute function public.sync_party_finder_capacity();

drop trigger if exists trg_sync_party_finder_capacity_delete on public.party_finder_members;
create trigger trg_sync_party_finder_capacity_delete
after delete on public.party_finder_members
for each row execute function public.sync_party_finder_capacity();

-- Mark already-full future/open parties consistently.
with counts as (
  select p.id,count(m.user_id)::integer as member_count
  from public.party_finder_posts p
  left join public.party_finder_members m on m.party_id=p.id
  group by p.id
)
update public.party_finder_posts p
   set status='closed',
       auto_closed=true,
       updated_at=now()
  from counts c
 where c.id=p.id
   and p.status='open'
   and c.member_count >= p.seats_needed;

revoke all on function public.guard_party_finder_join() from public,anon,authenticated;
revoke all on function public.sync_party_finder_capacity() from public,anon,authenticated;
grant execute on function public.guard_party_finder_join() to service_role;
grant execute on function public.sync_party_finder_capacity() to service_role;
