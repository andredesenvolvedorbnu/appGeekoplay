alter table public.premium_plans add column if not exists last_adjusted_year integer not null default extract(year from now())::int;

create table if not exists public.premium_alert_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  alert_key text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(user_id,alert_key,expires_at)
);
alter table public.premium_alert_log enable row level security;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='premium_alert_log' and policyname='premium alert own read') then
    create policy "premium alert own read" on public.premium_alert_log for select to authenticated using (auth.uid()=user_id);
  end if;
end $$;

create or replace function public.request_premium(selected_plan uuid)
returns uuid language plpgsql security definer set search_path='public' as $$
declare rid uuid; selected public.premium_plans%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.profiles set is_pro=false,updated_at=now() where id=auth.uid() and is_pro=true and pro_expires_at is not null and pro_expires_at<=now();
  if exists(select 1 from public.profiles where id=auth.uid() and is_pro and (pro_expires_at is null or pro_expires_at>now()+interval '30 days')) then raise exception 'RENEWAL_NOT_OPEN'; end if;
  if exists(select 1 from public.premium_requests where user_id=auth.uid() and status='pending') then raise exception 'PREMIUM_REQUEST_PENDING'; end if;
  select * into selected from public.premium_plans where id=selected_plan and is_active=true;
  if not found then raise exception 'PLAN_NOT_FOUND'; end if;
  insert into public.premium_requests(user_id,amount,duration_days,period_label,plan_id,plan_name)
  values(auth.uid(),selected.price,selected.duration_days,selected.name,selected.id,selected.name)
  returning id into rid;
  return rid;
end; $$;

create or replace function public.apply_monetization_approval()
returns trigger language plpgsql security definer set search_path='public' as $$
declare base_start timestamptz;
begin
 if old.status is distinct from new.status and new.status='approved' then
   new.reviewed_at=now(); new.reviewed_by=auth.uid();
   if tg_table_name='premium_requests' then
     select greatest(now(),coalesce(pro_expires_at,now())) into base_start from public.profiles where id=new.user_id;
     new.starts_at=base_start;
     new.expires_at=base_start + make_interval(days=>coalesce(new.duration_days,30));
     update public.profiles set is_pro=true,pro_started_at=coalesce(pro_started_at,now()),pro_expires_at=new.expires_at,updated_at=now() where id=new.user_id;
   elsif tg_table_name='boost_requests' then
     update public.posts set is_boosted=true,boosted_until=greatest(coalesce(boosted_until,now()),now()) + make_interval(days=>new.days),updated_at=now() where id=new.post_id;
   end if;
 elsif old.status is distinct from new.status and new.status='rejected' then
   new.reviewed_at=now(); new.reviewed_by=auth.uid();
 end if;
 return new;
end; $$;

create or replace function public.process_premium_lifecycle()
returns void language plpgsql security definer set search_path='public' as $$
declare r record; days_left integer; key text; ttl text; msg text;
begin
  for r in select id,pro_expires_at from public.profiles where is_pro=true and pro_expires_at is not null loop
    days_left:=ceil(extract(epoch from (r.pro_expires_at-now()))/86400.0); key:=null;
    if days_left between 25 and 30 then key:='expiring_30'; ttl:='Seu GeekoPlay PRO vence em breve'; msg:='Faltam cerca de 30 dias para o fim do seu PRO. Renove agora e continue com seus benefícios.';
    elsif days_left between 6 and 7 then key:='expiring_7'; ttl:='Seu PRO vence em 7 dias'; msg:='Seu GeekoPlay PRO está perto do fim. Escolha um plano e renove antes do vencimento.';
    elsif days_left between 0 and 1 then key:='expiring_1'; ttl:='Seu PRO vence amanhã'; msg:='Último aviso: renove seu GeekoPlay PRO para não perder selo, destaque e benefícios.'; end if;
    if key is not null then begin
      insert into public.premium_alert_log(user_id,alert_key,expires_at) values(r.id,key,r.pro_expires_at);
      insert into public.notifications(user_id,type,title,body,entity_type,is_read,created_at) values(r.id,'premium_expiring',ttl,msg,'premium',false,now());
    exception when unique_violation then null; end; end if;
  end loop;
  for r in update public.profiles set is_pro=false,updated_at=now() where is_pro=true and pro_expires_at is not null and pro_expires_at<=now() returning id,pro_expires_at loop begin
    insert into public.premium_alert_log(user_id,alert_key,expires_at) values(r.id,'expired',r.pro_expires_at);
    insert into public.notifications(user_id,type,title,body,entity_type,is_read,created_at) values(r.id,'premium_expired','Seu GeekoPlay PRO expirou','Seus benefícios PRO foram encerrados. Você pode escolher um novo plano e reativar quando quiser.','premium',false,now());
  exception when unique_violation then null; end; end loop;
end; $$;

create or replace function public.apply_annual_premium_adjustment()
returns void language plpgsql security definer set search_path='public' as $$
declare y integer:=extract(year from now())::int;
begin
  update public.premium_plans set price=round(price*1.10,2),last_adjusted_year=y,updated_at=now() where is_active=true and last_adjusted_year<y;
end; $$;

do $$ begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname='premium-lifecycle-daily';
    perform cron.schedule('premium-lifecycle-daily','15 8 * * *',$c$select public.process_premium_lifecycle();$c$);
    perform cron.unschedule(jobid) from cron.job where jobname='premium-annual-adjustment';
    perform cron.schedule('premium-annual-adjustment','5 3 1 1 *',$c$select public.apply_annual_premium_adjustment();$c$);
  end if;
end $$;