-- First 1,000 GeekoPlay members: permanent pioneer number + discovery prompt tracking.
alter table public.profiles
  add column if not exists pioneer_number integer,
  add column if not exists discovery_prompt_views smallint not null default 0;

alter table public.profiles
  drop constraint if exists profiles_pioneer_number_range,
  add constraint profiles_pioneer_number_range
    check (pioneer_number is null or pioneer_number between 1 and 1000);

alter table public.profiles
  drop constraint if exists profiles_discovery_prompt_views_range,
  add constraint profiles_discovery_prompt_views_range
    check (discovery_prompt_views between 0 and 2);

create unique index if not exists profiles_pioneer_number_uidx
  on public.profiles(pioneer_number)
  where pioneer_number is not null;

create sequence if not exists public.pioneer_geeks_seq start 1;

with ranked as (
  select id, row_number() over(order by created_at asc, id asc)::integer as rn
  from public.profiles
  where pioneer_number is null
),
eligible as (
  select id, rn
  from ranked
  where rn <= greatest(0, 1000 - (select count(*) from public.profiles where pioneer_number is not null))
),
base as (
  select coalesce(max(pioneer_number),0)::integer as max_number
  from public.profiles
)
update public.profiles p
set pioneer_number = base.max_number + e.rn
from eligible e, base
where p.id = e.id
  and base.max_number + e.rn <= 1000;

select setval(
  'public.pioneer_geeks_seq',
  greatest(coalesce((select max(pioneer_number) from public.profiles),0),1),
  coalesce((select max(pioneer_number) from public.profiles),0) > 0
);

create or replace function public.assign_pioneer_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number bigint;
begin
  if new.pioneer_number is not null then
    return new;
  end if;

  next_number := nextval('public.pioneer_geeks_seq');
  if next_number <= 1000 then
    new.pioneer_number := next_number::integer;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_pioneer_number on public.profiles;
create trigger trg_assign_pioneer_number
before insert on public.profiles
for each row execute function public.assign_pioneer_number();

create or replace function public.register_discovery_prompt_view()
returns table(pioneer_number integer, prompt_view smallint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  return query
  update public.profiles p
     set discovery_prompt_views = least((p.discovery_prompt_views + 1)::smallint, 2::smallint),
         updated_at = now()
   where p.id = auth.uid()
     and p.pioneer_number between 1 and 1000
     and p.discovery_prompt_views < 2
  returning p.pioneer_number, p.discovery_prompt_views;
end;
$$;

revoke all on function public.register_discovery_prompt_view() from public, anon;
grant execute on function public.register_discovery_prompt_view() to authenticated, service_role;
