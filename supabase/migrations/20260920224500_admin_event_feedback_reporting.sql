
create or replace function public.admin_event_feedback_overview()
returns table(
  event_id uuid,
  title text,
  starts_at timestamptz,
  response_count bigint,
  avg_score numeric,
  tourists bigint,
  would_return bigint
)
language plpgsql
security definer
set search_path=public
as $$
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin') then
    raise exception 'ADMIN_REQUIRED';
  end if;
  return query
  select e.id,e.title,e.starts_at,
         count(f.id)::bigint,
         round(avg(f.score)::numeric,2),
         count(*) filter(where f.from_other_city is true)::bigint,
         count(*) filter(where f.would_return is true)::bigint
  from public.events e
  left join public.event_feedback f on f.event_id=e.id
  group by e.id,e.title,e.starts_at
  having count(f.id)>0
  order by e.starts_at desc nulls last;
end;
$$;

create or replace function public.admin_event_feedback_summary(target_event uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare result jsonb;
begin
  if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin') then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select jsonb_build_object(
    'response_count', count(*),
    'avg_score', round(avg(score)::numeric,2),
    'would_return_yes', count(*) filter(where would_return is true),
    'first_time_yes', count(*) filter(where first_time is true),
    'tourists', count(*) filter(where from_other_city is true),
    'avg_nights', round(avg(nights) filter(where nights is not null)::numeric,2),
    'age_range', coalesce((select jsonb_object_agg(k,c) from (select coalesce(age_range,'Não informado') k,count(*) c from public.event_feedback where event_id=target_event group by 1 order by c desc) s),'{}'::jsonb),
    'city', coalesce((select jsonb_object_agg(k,c) from (select coalesce(city,'Não informado') k,count(*) c from public.event_feedback where event_id=target_event group by 1 order by c desc) s),'{}'::jsonb),
    'occupation', coalesce((select jsonb_object_agg(k,c) from (select coalesce(occupation,'Não informado') k,count(*) c from public.event_feedback where event_id=target_event group by 1 order by c desc) s),'{}'::jsonb),
    'income_range', coalesce((select jsonb_object_agg(k,c) from (select coalesce(income_range,'Não informado') k,count(*) c from public.event_feedback where event_id=target_event group by 1 order by c desc) s),'{}'::jsonb),
    'main_interest', coalesce((select jsonb_object_agg(k,c) from (select coalesce(main_interest,'Não informado') k,count(*) c from public.event_feedback where event_id=target_event group by 1 order by c desc) s),'{}'::jsonb),
    'monthly_geek_spend', coalesce((select jsonb_object_agg(k,c) from (select coalesce(monthly_geek_spend,'Não informado') k,count(*) c from public.event_feedback where event_id=target_event group by 1 order by c desc) s),'{}'::jsonb),
    'discovery_channel', coalesce((select jsonb_object_agg(k,c) from (select coalesce(discovery_channel,'Não informado') k,count(*) c from public.event_feedback where event_id=target_event group by 1 order by c desc) s),'{}'::jsonb),
    'reason', coalesce((select jsonb_object_agg(k,c) from (select coalesce(reason,'Não informado') k,count(*) c from public.event_feedback where event_id=target_event group by 1 order by c desc) s),'{}'::jsonb),
    'came_with', coalesce((select jsonb_object_agg(k,c) from (select coalesce(came_with,'Não informado') k,count(*) c from public.event_feedback where event_id=target_event group by 1 order by c desc) s),'{}'::jsonb),
    'time_at_event', coalesce((select jsonb_object_agg(k,c) from (select coalesce(time_at_event,'Não informado') k,count(*) c from public.event_feedback where event_id=target_event group by 1 order by c desc) s),'{}'::jsonb),
    'longest_area', coalesce((select jsonb_object_agg(k,c) from (select coalesce(longest_area,'Não informado') k,count(*) c from public.event_feedback where event_id=target_event group by 1 order by c desc) s),'{}'::jsonb),
    'event_spend', coalesce((select jsonb_object_agg(k,c) from (select coalesce(event_spend,'Não informado') k,count(*) c from public.event_feedback where event_id=target_event group by 1 order by c desc) s),'{}'::jsonb),
    'score', coalesce((select jsonb_object_agg(k,c) from (select coalesce(score::text,'Não informado') k,count(*) c from public.event_feedback where event_id=target_event group by 1 order by score nulls last) s),'{}'::jsonb),
    'interests', coalesce((select jsonb_object_agg(k,c) from (select x k,count(*) c from public.event_feedback f cross join lateral unnest(coalesce(f.interests,array[]::text[])) x where f.event_id=target_event group by x order by c desc) s),'{}'::jsonb),
    'areas_visited', coalesce((select jsonb_object_agg(k,c) from (select x k,count(*) c from public.event_feedback f cross join lateral unnest(coalesce(f.areas_visited,array[]::text[])) x where f.event_id=target_event group by x order by c desc) s),'{}'::jsonb),
    'spend_categories', coalesce((select jsonb_object_agg(k,c) from (select x k,count(*) c from public.event_feedback f cross join lateral unnest(coalesce(f.spend_categories,array[]::text[])) x where f.event_id=target_event group by x order by c desc) s),'{}'::jsonb)
  )
  into result
  from public.event_feedback
  where event_id=target_event;

  return coalesce(result,'{}'::jsonb);
end;
$$;

revoke all on function public.admin_event_feedback_overview() from public;
revoke all on function public.admin_event_feedback_summary(uuid) from public;
grant execute on function public.admin_event_feedback_overview() to authenticated;
grant execute on function public.admin_event_feedback_summary(uuid) to authenticated;
