create table if not exists public.user_daily_activity (
  user_id uuid not null references public.profiles(id) on delete cascade,
  activity_date date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  posts_count integer not null default 0,
  comments_count integer not null default 0,
  likes_count integer not null default 0,
  events_count integer not null default 0,
  logged_in boolean not null default false,
  claimed_missions text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key(user_id,activity_date)
);

alter table public.user_daily_activity enable row level security;
drop policy if exists "daily activity own read" on public.user_daily_activity;
create policy "daily activity own read" on public.user_daily_activity for select using (auth.uid()=user_id);
grant select on public.user_daily_activity to authenticated;

create or replace function public.bump_daily_activity(target_user uuid, activity_kind text)
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.user_daily_activity(user_id,activity_date,posts_count,comments_count,likes_count,events_count)
  values(target_user,(now() at time zone 'America/Sao_Paulo')::date,case when activity_kind='post' then 1 else 0 end,case when activity_kind='comment' then 1 else 0 end,case when activity_kind='like' then 1 else 0 end,case when activity_kind='event' then 1 else 0 end)
  on conflict(user_id,activity_date) do update set
    posts_count=public.user_daily_activity.posts_count+case when activity_kind='post' then 1 else 0 end,
    comments_count=public.user_daily_activity.comments_count+case when activity_kind='comment' then 1 else 0 end,
    likes_count=public.user_daily_activity.likes_count+case when activity_kind='like' then 1 else 0 end,
    events_count=public.user_daily_activity.events_count+case when activity_kind='event' then 1 else 0 end,
    updated_at=now();
end;$$;

create or replace function public.track_daily_activity_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_table_name='posts' then perform public.bump_daily_activity(new.author_id,'post');
  elsif tg_table_name='comments' then perform public.bump_daily_activity(new.author_id,'comment');
  elsif tg_table_name='likes' then perform public.bump_daily_activity(new.user_id,'like');
  elsif tg_table_name='event_attendees' and new.status in ('going','confirmed') then perform public.bump_daily_activity(new.user_id,'event');
  end if;
  return new;
end;$$;

drop trigger if exists trg_daily_activity_posts on public.posts;
create trigger trg_daily_activity_posts after insert on public.posts for each row execute function public.track_daily_activity_trigger();
drop trigger if exists trg_daily_activity_comments on public.comments;
create trigger trg_daily_activity_comments after insert on public.comments for each row execute function public.track_daily_activity_trigger();
drop trigger if exists trg_daily_activity_likes on public.likes;
create trigger trg_daily_activity_likes after insert on public.likes for each row execute function public.track_daily_activity_trigger();
drop trigger if exists trg_daily_activity_events on public.event_attendees;
create trigger trg_daily_activity_events after insert on public.event_attendees for each row execute function public.track_daily_activity_trigger();

create or replace function public.register_daily_login()
returns integer language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); today date:=(now() at time zone 'America/Sao_Paulo')::date; streak integer:=0; d date;
begin
  if uid is null then raise exception 'Sessão inválida'; end if;
  insert into public.user_daily_activity(user_id,activity_date,logged_in) values(uid,today,true)
  on conflict(user_id,activity_date) do update set logged_in=true,updated_at=now();
  d:=today;
  loop
    exit when not exists(select 1 from public.user_daily_activity where user_id=uid and activity_date=d and logged_in=true);
    streak:=streak+1; d:=d-1;
  end loop;
  return streak;
end;$$;
revoke all on function public.register_daily_login() from public;
grant execute on function public.register_daily_login() to authenticated;

create or replace function public.claim_daily_mission(mission_key text)
returns integer language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); today date:=(now() at time zone 'America/Sao_Paulo')::date; row_data public.user_daily_activity%rowtype; reward integer:=0;
begin
 if uid is null then raise exception 'Sessão inválida'; end if;
 select * into row_data from public.user_daily_activity where user_id=uid and activity_date=today for update;
 if not found then raise exception 'MISSÃO_INCOMPLETA'; end if;
 if mission_key=any(row_data.claimed_missions) then raise exception 'MISSÃO_JÁ_RESGATADA'; end if;
 case mission_key
  when 'post_1' then if row_data.posts_count<1 then raise exception 'MISSÃO_INCOMPLETA'; end if; reward:=10;
  when 'comments_3' then if row_data.comments_count<3 then raise exception 'MISSÃO_INCOMPLETA'; end if; reward:=15;
  when 'likes_5' then if row_data.likes_count<5 then raise exception 'MISSÃO_INCOMPLETA'; end if; reward:=10;
  when 'event_1' then if row_data.events_count<1 then raise exception 'MISSÃO_INCOMPLETA'; end if; reward:=20;
  else raise exception 'MISSÃO_INVÁLIDA';
 end case;
 update public.user_daily_activity set claimed_missions=array_append(claimed_missions,mission_key),updated_at=now() where user_id=uid and activity_date=today;
 perform public.add_xp(uid,reward);
 return reward;
end;$$;
revoke all on function public.claim_daily_mission(text) from public;
grant execute on function public.claim_daily_mission(text) to authenticated;

create or replace function public.weekly_geek_ranking()
returns table(user_id uuid,display_name text,username text,avatar_url text,level integer,weekly_score bigint)
language sql security definer set search_path=public stable as $$
 select p.id,p.display_name,p.username,p.avatar_url,p.level,coalesce(sum(a.posts_count*20+a.comments_count*10+a.likes_count*2+a.events_count*15),0)::bigint weekly_score
 from public.profiles p
 left join public.user_daily_activity a on a.user_id=p.id and a.activity_date>=((now() at time zone 'America/Sao_Paulo')::date-6)
 group by p.id,p.display_name,p.username,p.avatar_url,p.level
 order by weekly_score desc,p.xp desc
 limit 20;
$$;
grant execute on function public.weekly_geek_ranking() to authenticated;
