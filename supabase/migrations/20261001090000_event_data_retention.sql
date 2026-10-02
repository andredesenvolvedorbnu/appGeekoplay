-- GeekoPlay retention policy
-- Event data: deleted 15 days after event end.
-- Satisfaction data: preserved independently for 3 months after event end.

create table if not exists public.event_feedback_archive (
  id uuid primary key,
  event_id uuid not null,
  user_id uuid not null,
  age_range text,
  city text,
  occupation text,
  income_range text,
  interests text[] not null default '{}',
  main_interest text,
  monthly_geek_spend text,
  first_time boolean,
  discovery_channel text,
  reason text,
  came_with text,
  time_at_event text,
  areas_visited text[] not null default '{}',
  longest_area text,
  event_spend text,
  spend_categories text[] not null default '{}',
  from_other_city boolean,
  nights integer,
  score integer,
  would_return boolean,
  improvement text,
  created_at timestamptz not null,
  event_title text not null,
  event_starts_at timestamptz,
  event_ends_at timestamptz,
  archived_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists event_feedback_archive_event_idx on public.event_feedback_archive(event_id);
create index if not exists event_feedback_archive_expires_idx on public.event_feedback_archive(expires_at);
alter table public.event_feedback_archive enable row level security;
drop policy if exists "event feedback archive admin read" on public.event_feedback_archive;
create policy "event feedback archive admin read" on public.event_feedback_archive for select to authenticated using (public.is_admin());
revoke all on public.event_feedback_archive from anon;
grant select on public.event_feedback_archive to authenticated;

create or replace view public.event_feedback_retained with (security_invoker=true) as
select id,event_id,user_id,age_range,city,occupation,income_range,interests,main_interest,monthly_geek_spend,first_time,discovery_channel,reason,came_with,time_at_event,areas_visited,longest_area,event_spend,spend_categories,from_other_city,nights,score,would_return,improvement,created_at
from public.event_feedback
union all
select id,event_id,user_id,age_range,city,occupation,income_range,interests,main_interest,monthly_geek_spend,first_time,discovery_channel,reason,came_with,time_at_event,areas_visited,longest_area,event_spend,spend_categories,from_other_city,nights,score,would_return,improvement,created_at
from public.event_feedback_archive
where expires_at > now();

grant select on public.event_feedback_retained to authenticated;

create or replace function public.archive_feedback_and_delete_old_events()
returns jsonb language plpgsql security definer set search_path=public
as $$
declare archived_count integer:=0; deleted_events integer:=0;
begin
  insert into public.event_feedback_archive (
    id,event_id,user_id,age_range,city,occupation,income_range,interests,main_interest,monthly_geek_spend,first_time,discovery_channel,reason,came_with,time_at_event,areas_visited,longest_area,event_spend,spend_categories,from_other_city,nights,score,would_return,improvement,created_at,event_title,event_starts_at,event_ends_at,archived_at,expires_at
  )
  select f.id,f.event_id,f.user_id,f.age_range,f.city,f.occupation,f.income_range,f.interests,f.main_interest,f.monthly_geek_spend,f.first_time,f.discovery_channel,f.reason,f.came_with,f.time_at_event,f.areas_visited,f.longest_area,f.event_spend,f.spend_categories,f.from_other_city,f.nights,f.score,f.would_return,f.improvement,f.created_at,e.title,e.starts_at,e.ends_at,now(),coalesce(e.ends_at,e.starts_at)+interval '3 months'
  from public.event_feedback f
  join public.events e on e.id=f.event_id
  where coalesce(e.ends_at,e.starts_at) < now()-interval '15 days'
    and coalesce(e.ends_at,e.starts_at)+interval '3 months' > now()
  on conflict (id) do nothing;
  get diagnostics archived_count=row_count;

  delete from public.events e where coalesce(e.ends_at,e.starts_at) < now()-interval '15 days';
  get diagnostics deleted_events=row_count;

  return jsonb_build_object('archived_feedback',archived_count,'deleted_events',deleted_events,'ran_at',now());
end;$$;

create or replace function public.purge_expired_event_feedback()
returns jsonb language plpgsql security definer set search_path=public
as $$
declare purged integer:=0;
begin
  delete from public.event_feedback_archive where expires_at <= now();
  get diagnostics purged=row_count;
  return jsonb_build_object('purged_feedback',purged,'ran_at',now());
end;$$;

revoke all on function public.archive_feedback_and_delete_old_events() from public,anon,authenticated;
revoke all on function public.purge_expired_event_feedback() from public,anon,authenticated;
grant execute on function public.archive_feedback_and_delete_old_events() to service_role;
grant execute on function public.purge_expired_event_feedback() to service_role;

create or replace function public.admin_event_feedback_overview()
returns table(event_id uuid,title text,starts_at timestamptz,response_count bigint,avg_score numeric,tourists bigint,would_return bigint)
language plpgsql security definer set search_path=public
as $$
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin') then raise exception 'ADMIN_REQUIRED'; end if;
  return query
  with meta as (
    select e.id event_id,e.title,e.starts_at from public.events e
    union
    select a.event_id,max(a.event_title),max(a.event_starts_at) from public.event_feedback_archive a where a.expires_at>now() group by a.event_id
  )
  select m.event_id,m.title,m.starts_at,count(f.id)::bigint,round(avg(f.score)::numeric,2),count(*) filter(where f.from_other_city is true)::bigint,count(*) filter(where f.would_return is true)::bigint
  from meta m join public.event_feedback_retained f on f.event_id=m.event_id
  group by m.event_id,m.title,m.starts_at having count(f.id)>0
  order by m.starts_at desc nulls last;
end;$$;

-- Keep existing summary RPC semantics, but source from retained feedback.
create or replace function public.admin_event_feedback_summary(target_event uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare result jsonb;
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin') then raise exception 'ADMIN_REQUIRED'; end if;
  select jsonb_build_object(
    'response_count',count(*),'avg_score',round(avg(ef.score)::numeric,2),'would_return_yes',count(*) filter(where ef.would_return is true),'first_time_yes',count(*) filter(where ef.first_time is true),'tourists',count(*) filter(where ef.from_other_city is true),'avg_nights',round(avg(ef.nights) filter(where ef.nights is not null)::numeric,2),
    'age_range',coalesce((select jsonb_object_agg(k,c) from (select coalesce(f.age_range,'Não informado') k,count(*) c from public.event_feedback_retained f where f.event_id=target_event group by 1 order by c desc)s),'{}'::jsonb),
    'city',coalesce((select jsonb_object_agg(k,c) from (select coalesce(f.city,'Não informado') k,count(*) c from public.event_feedback_retained f where f.event_id=target_event group by 1 order by c desc)s),'{}'::jsonb),
    'occupation',coalesce((select jsonb_object_agg(k,c) from (select coalesce(f.occupation,'Não informado') k,count(*) c from public.event_feedback_retained f where f.event_id=target_event group by 1 order by c desc)s),'{}'::jsonb),
    'income_range',coalesce((select jsonb_object_agg(k,c) from (select coalesce(f.income_range,'Não informado') k,count(*) c from public.event_feedback_retained f where f.event_id=target_event group by 1 order by c desc)s),'{}'::jsonb),
    'main_interest',coalesce((select jsonb_object_agg(k,c) from (select coalesce(f.main_interest,'Não informado') k,count(*) c from public.event_feedback_retained f where f.event_id=target_event group by 1 order by c desc)s),'{}'::jsonb),
    'monthly_geek_spend',coalesce((select jsonb_object_agg(k,c) from (select coalesce(nullif(trim(f.monthly_geek_spend),''),'Não informado') k,count(*) c from public.event_feedback_retained f where f.event_id=target_event group by 1 order by c desc)s),'{}'::jsonb),
    'discovery_channel',coalesce((select jsonb_object_agg(k,c) from (select coalesce(nullif(trim(f.discovery_channel),''),'Não informado') k,count(*) c from public.event_feedback_retained f where f.event_id=target_event group by 1 order by c desc)s),'{}'::jsonb),
    'reason',coalesce((select jsonb_object_agg(k,c) from (select coalesce(nullif(trim(f.reason),''),'Não informado') k,count(*) c from public.event_feedback_retained f where f.event_id=target_event group by 1 order by c desc)s),'{}'::jsonb),
    'came_with',coalesce((select jsonb_object_agg(k,c) from (select coalesce(nullif(trim(f.came_with),''),'Não informado') k,count(*) c from public.event_feedback_retained f where f.event_id=target_event group by 1 order by c desc)s),'{}'::jsonb),
    'time_at_event',coalesce((select jsonb_object_agg(k,c) from (select coalesce(nullif(trim(f.time_at_event),''),'Não informado') k,count(*) c from public.event_feedback_retained f where f.event_id=target_event group by 1 order by c desc)s),'{}'::jsonb),
    'longest_area',coalesce((select jsonb_object_agg(k,c) from (select coalesce(nullif(trim(f.longest_area),''),'Não informado') k,count(*) c from public.event_feedback_retained f where f.event_id=target_event group by 1 order by c desc)s),'{}'::jsonb),
    'event_spend',coalesce((select jsonb_object_agg(k,c) from (select coalesce(nullif(trim(f.event_spend),''),'Não informado') k,count(*) c from public.event_feedback_retained f where f.event_id=target_event group by 1 order by c desc)s),'{}'::jsonb),
    'score',coalesce((select jsonb_object_agg(k,c) from (select coalesce(f.score::text,'Não informado') k,count(*) c from public.event_feedback_retained f where f.event_id=target_event group by 1 order by c desc)s),'{}'::jsonb),
    'interests',coalesce((select jsonb_object_agg(k,c) from (select x k,count(*) c from public.event_feedback_retained f cross join lateral unnest(coalesce(f.interests,array[]::text[])) x where f.event_id=target_event group by x order by c desc)s),'{}'::jsonb),
    'areas_visited',coalesce((select jsonb_object_agg(k,c) from (select x k,count(*) c from public.event_feedback_retained f cross join lateral unnest(coalesce(f.areas_visited,array[]::text[])) x where f.event_id=target_event group by x order by c desc)s),'{}'::jsonb),
    'spend_categories',coalesce((select jsonb_object_agg(k,c) from (select x k,count(*) c from public.event_feedback_retained f cross join lateral unnest(coalesce(f.spend_categories,array[]::text[])) x where f.event_id=target_event group by x order by c desc)s),'{}'::jsonb)
  ) into result from public.event_feedback_retained ef where ef.event_id=target_event;
  return coalesce(result,'{}'::jsonb);
end;$$;

revoke all on function public.admin_event_feedback_overview() from public;
grant execute on function public.admin_event_feedback_overview() to authenticated;
revoke all on function public.admin_event_feedback_summary(uuid) from public;
grant execute on function public.admin_event_feedback_summary(uuid) to authenticated;

do $$ declare j bigint; begin
  select jobid into j from cron.job where jobname='geekoplay-events-cleanup' limit 1; if j is not null then perform cron.unschedule(j); end if;
  select jobid into j from cron.job where jobname='geekoplay-feedback-cleanup' limit 1; if j is not null then perform cron.unschedule(j); end if;
end $$;

select cron.schedule('geekoplay-events-cleanup','10 4 * * *','select public.archive_feedback_and_delete_old_events();');
select cron.schedule('geekoplay-feedback-cleanup','40 4 * * *','select public.purge_expired_event_feedback();');
