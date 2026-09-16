create or replace function public.notify_followed_users_same_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  attendee_name text;
  event_title text;
begin
  if new.status <> 'going' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'going' then
    return new;
  end if;

  select coalesce(nullif(p.display_name, ''), nullif(p.username, ''), 'Um geek')
    into attendee_name
  from public.profiles p
  where p.id = new.user_id;

  select e.title
    into event_title
  from public.events e
  where e.id = new.event_id;

  insert into public.notifications (
    user_id,
    actor_id,
    type,
    title,
    body,
    entity_type,
    entity_id
  )
  select
    ea.user_id,
    new.user_id,
    'event_friend_going',
    attendee_name || ' também vai a este evento',
    coalesce(event_title, 'Evento GeekoPlay'),
    'event',
    new.event_id
  from public.event_attendees ea
  join public.follows f
    on f.follower_id = ea.user_id
   and f.following_id = new.user_id
  where ea.event_id = new.event_id
    and ea.status = 'going'
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

  return new;
end;
$$;

drop trigger if exists trg_notify_followed_users_same_event on public.event_attendees;
create trigger trg_notify_followed_users_same_event
after insert or update of status on public.event_attendees
for each row
execute function public.notify_followed_users_same_event();
