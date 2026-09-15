alter table public.monetization_settings
  add column if not exists premium_duration_days integer not null default 30,
  add column if not exists premium_period_label text not null default 'Mensal';

alter table public.monetization_settings
  drop constraint if exists monetization_settings_premium_duration_days_check;
alter table public.monetization_settings
  add constraint monetization_settings_premium_duration_days_check check (premium_duration_days between 1 and 3650);

alter table public.premium_requests
  add column if not exists duration_days integer,
  add column if not exists period_label text,
  add column if not exists starts_at timestamptz,
  add column if not exists expires_at timestamptz;

alter table public.profiles
  add column if not exists pro_started_at timestamptz,
  add column if not exists pro_expires_at timestamptz;

update public.monetization_settings
set premium_duration_days=coalesce(premium_duration_days,30),
    premium_period_label=coalesce(nullif(trim(premium_period_label),''),'Mensal')
where id='default';

create or replace function public.request_premium()
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  rid uuid;
  price numeric(10,2);
  duration integer;
  period text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  update public.profiles
  set is_pro=false, updated_at=now()
  where id=auth.uid() and is_pro=true and pro_expires_at is not null and pro_expires_at<=now();

  if exists(select 1 from public.profiles where id=auth.uid() and is_pro) then
    raise exception 'ALREADY_PRO';
  end if;
  if exists(select 1 from public.premium_requests where user_id=auth.uid() and status='pending') then
    raise exception 'PREMIUM_REQUEST_PENDING';
  end if;

  select premium_price,premium_duration_days,premium_period_label
    into price,duration,period
  from public.monetization_settings where id='default';

  insert into public.premium_requests(user_id,amount,duration_days,period_label)
  values(auth.uid(),coalesce(price,0),coalesce(duration,30),coalesce(nullif(trim(period),''),'Mensal'))
  returning id into rid;
  return rid;
end;
$$;

create or replace function public.apply_monetization_approval()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  start_at timestamptz;
  duration integer;
begin
  if old.status is distinct from new.status and new.status='approved' then
    new.reviewed_at=now();
    new.reviewed_by=auth.uid();
    if tg_table_name='premium_requests' then
      duration:=coalesce(new.duration_days,30);
      select case
        when is_pro=true and pro_expires_at is not null and pro_expires_at>now() then pro_expires_at
        else now()
      end into start_at
      from public.profiles where id=new.user_id;
      start_at:=coalesce(start_at,now());
      new.starts_at=start_at;
      new.expires_at=start_at + make_interval(days=>duration);
      update public.profiles
      set is_pro=true,
          pro_started_at=coalesce(pro_started_at,now()),
          pro_expires_at=new.expires_at,
          updated_at=now()
      where id=new.user_id;
    elsif tg_table_name='boost_requests' then
      update public.posts
      set is_boosted=true,
          boosted_until=greatest(coalesce(boosted_until,now()),now()) + make_interval(days=>new.days),
          updated_at=now()
      where id=new.post_id;
    end if;
  elsif old.status is distinct from new.status and new.status='rejected' then
    new.reviewed_at=now();
    new.reviewed_by=auth.uid();
  end if;
  return new;
end;
$$;

create or replace function public.refresh_my_pro_status()
returns table(is_pro boolean, pro_expires_at timestamptz)
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.profiles p
  set is_pro=false, updated_at=now()
  where p.id=auth.uid() and p.is_pro=true and p.pro_expires_at is not null and p.pro_expires_at<=now();
  return query select p.is_pro,p.pro_expires_at from public.profiles p where p.id=auth.uid();
end;
$$;

grant execute on function public.refresh_my_pro_status() to authenticated;
