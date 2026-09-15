create table if not exists public.premium_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  duration_days integer not null check (duration_days > 0),
  description text,
  payment_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.premium_requests add column if not exists plan_id uuid references public.premium_plans(id);
alter table public.premium_requests add column if not exists plan_name text;

insert into public.premium_plans (name,price,duration_days,description,sort_order)
select 'Trimestral',19.90,90,'90 dias de GeekoPlay PRO.',1
where not exists (select 1 from public.premium_plans where lower(name)=lower('Trimestral'));

insert into public.premium_plans (name,price,duration_days,description,sort_order)
select 'Semestral',35.00,180,'180 dias de GeekoPlay PRO.',2
where not exists (select 1 from public.premium_plans where lower(name)=lower('Semestral'));

insert into public.premium_plans (name,price,duration_days,description,sort_order)
select 'Anual',60.00,365,'365 dias de GeekoPlay PRO.',3
where not exists (select 1 from public.premium_plans where lower(name)=lower('Anual'));

alter table public.premium_plans enable row level security;

drop policy if exists "premium_plans_public_read" on public.premium_plans;
create policy "premium_plans_public_read" on public.premium_plans
for select using (
  is_active = true or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);

drop policy if exists "premium_plans_admin_all" on public.premium_plans;
create policy "premium_plans_admin_all" on public.premium_plans
for all using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create or replace function public.request_premium(selected_plan uuid)
returns uuid
language plpgsql
security definer
set search_path='public'
as $$
declare
  rid uuid;
  selected public.premium_plans%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists(select 1 from public.profiles where id=auth.uid() and is_pro) then raise exception 'ALREADY_PRO'; end if;
  if exists(select 1 from public.premium_requests where user_id=auth.uid() and status='pending') then raise exception 'PREMIUM_REQUEST_PENDING'; end if;

  select * into selected from public.premium_plans where id=selected_plan and is_active=true;
  if not found then raise exception 'PLAN_NOT_FOUND'; end if;

  insert into public.premium_requests(user_id,amount,duration_days,period_label,plan_id,plan_name)
  values(auth.uid(),selected.price,selected.duration_days,selected.name,selected.id,selected.name)
  returning id into rid;
  return rid;
end;
$$;

grant execute on function public.request_premium(uuid) to authenticated;

create or replace function public.apply_monetization_approval()
returns trigger
language plpgsql
security definer
set search_path='public'
as $$
begin
 if old.status is distinct from new.status and new.status='approved' then
   new.reviewed_at=now(); new.reviewed_by=auth.uid();
   if tg_table_name='premium_requests' then
     new.starts_at=now();
     new.expires_at=now() + make_interval(days=>coalesce(new.duration_days,30));
     update public.profiles set is_pro=true,pro_expires_at=new.expires_at,updated_at=now() where id=new.user_id;
   elsif tg_table_name='boost_requests' then
     update public.posts set is_boosted=true,boosted_until=greatest(coalesce(boosted_until,now()),now()) + make_interval(days=>new.days),updated_at=now() where id=new.post_id;
   end if;
 elsif old.status is distinct from new.status and new.status='rejected' then
   new.reviewed_at=now(); new.reviewed_by=auth.uid();
 end if;
 return new;
end;
$$;