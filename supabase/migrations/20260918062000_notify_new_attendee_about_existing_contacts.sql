
create or replace function public.notify_followed_users_same_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  event_title text;
begin
  if new.status <> 'going' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'going' then
    return new;
  end if;

  select e.title
    into event_title
  from public.events e
  where e.id = new.event_id;

  -- Existing attendees who follow the new attendee are notified.
  insert into public.notifications (
    user_id, actor_id, type, title, body, entity_type, entity_id
  )
  select
    ea.user_id,
    new.user_id,
    'event_friend_going',
    'Também vai ao mesmo evento',
    coalesce(event_title, 'Evento GeekoPlay'),
    'event',
    new.event_id
  from public.event_attendees ea
  join public.follows f
    on f.follower_id = ea.user_id
   and f.following_id = new.user_id
  where ea.event_id = new.event_id
    and ea.status in ('going','confirmed')
    and ea.user_id <> new.user_id
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = ea.user_id
        and n.actor_id = new.user_id
        and n.type = 'event_friend_going'
        and n.entity_type = 'event'
        and n.entity_id = new.event_id
    );

  -- The user who just confirmed attendance is also told when someone
  -- already in their network is going to the same event.
  insert into public.notifications (
    user_id, actor_id, type, title, body, entity_type, entity_id
  )
  select distinct
    new.user_id,
    ea.user_id,
    'event_same',
    'Alguém da sua rede também vai',
    coalesce(event_title, 'Evento GeekoPlay'),
    'event',
    new.event_id
  from public.event_attendees ea
  where ea.event_id = new.event_id
    and ea.status in ('going','confirmed')
    and ea.user_id <> new.user_id
    and exists (
      select 1
      from public.follows f
      where (f.follower_id = new.user_id and f.following_id = ea.user_id)
         or (f.following_id = new.user_id and f.follower_id = ea.user_id)
    )
    and not exists (
      select 1
      from public.notifications n
      where n.user_id = new.user_id
        and n.actor_id = ea.user_id
        and n.type = 'event_same'
        and n.entity_type = 'event'
        and n.entity_id = new.event_id
    );

  return new;
end;
$$;

revoke all on function public.notify_followed_users_same_event() from public, anon, authenticated;
grant execute on function public.notify_followed_users_same_event() to service_role;
