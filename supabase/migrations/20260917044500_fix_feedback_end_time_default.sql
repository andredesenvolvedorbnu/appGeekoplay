create or replace function public.guard_event_feedback_after_end()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  event_end timestamptz;
begin
  if auth.uid() is null or auth.uid() <> new.user_id then
    raise exception 'AUTH_REQUIRED';
  end if;

  select coalesce(e.ends_at,e.starts_at + interval '24 hours')
    into event_end
  from public.events e
  where e.id=new.event_id;

  if event_end is null then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if event_end > now() then
    raise exception 'EVENT_NOT_ENDED';
  end if;

  if not exists(
    select 1
    from public.event_attendees a
    where a.event_id=new.event_id
      and a.user_id=new.user_id
      and a.status in ('going','confirmed')
  ) then
    raise exception 'ATTENDANCE_REQUIRED';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_event_feedback_after_end() from public,anon,authenticated;
