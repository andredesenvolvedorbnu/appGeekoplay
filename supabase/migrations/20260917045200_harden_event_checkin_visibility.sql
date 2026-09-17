drop policy if exists "event checkins authenticated read" on public.event_checkins;

create policy "event checkins event participants read"
on public.event_checkins
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or public.is_admin()
  or exists (
    select 1
    from public.event_attendees viewer
    where viewer.event_id = event_checkins.event_id
      and viewer.user_id = (select auth.uid())
      and viewer.status in ('going','confirmed')
  )
);
