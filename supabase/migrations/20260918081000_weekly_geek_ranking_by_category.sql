
create or replace function public.weekly_geek_ranking_by_category(category_filter text)
returns table(
  user_id uuid,
  display_name text,
  username text,
  avatar_url text,
  level integer,
  weekly_score bigint
)
language sql
stable
security definer
set search_path = public
as $$
with cutoff as (
  select now() - interval '7 days' as since
),
scores as (
  select p.author_id as user_id, count(*)::bigint * 20 as score
  from public.posts p, cutoff c
  where p.created_at >= c.since
    and lower(coalesce(p.category,'')) = lower(category_filter)
  group by p.author_id

  union all

  select cmt.author_id as user_id, count(*)::bigint * 10 as score
  from public.comments cmt
  join public.posts p on p.id = cmt.post_id
  cross join cutoff c
  where cmt.created_at >= c.since
    and lower(coalesce(p.category,'')) = lower(category_filter)
  group by cmt.author_id

  union all

  select l.user_id, count(*)::bigint * 2 as score
  from public.likes l
  join public.posts p on p.id = l.post_id
  cross join cutoff c
  where l.created_at >= c.since
    and lower(coalesce(p.category,'')) = lower(category_filter)
  group by l.user_id

  union all

  select ea.user_id, count(*)::bigint * 15 as score
  from public.event_attendees ea
  join public.events e on e.id = ea.event_id
  cross join cutoff c
  where ea.created_at >= c.since
    and ea.status in ('going','confirmed')
    and lower(coalesce(e.category,'')) = lower(category_filter)
  group by ea.user_id
),
totals as (
  select user_id, sum(score)::bigint as weekly_score
  from scores
  group by user_id
)
select
  p.id,
  p.display_name,
  p.username,
  p.avatar_url,
  p.level,
  t.weekly_score
from totals t
join public.profiles p on p.id = t.user_id
where t.weekly_score > 0
order by t.weekly_score desc, p.xp desc
limit 20;
$$;

revoke all on function public.weekly_geek_ranking_by_category(text) from public, anon;
grant execute on function public.weekly_geek_ranking_by_category(text) to authenticated, service_role;
