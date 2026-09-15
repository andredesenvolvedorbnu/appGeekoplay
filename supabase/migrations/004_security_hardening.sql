create or replace function public.profile_self_update_allowed(
  target_id uuid,
  new_email text,
  new_role text,
  new_is_pro boolean,
  new_xp integer,
  new_level integer
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = target_id
      and target_id = auth.uid()
      and p.email is not distinct from new_email
      and p.role is not distinct from new_role
      and p.is_pro is not distinct from new_is_pro
      and p.xp is not distinct from new_xp
      and p.level is not distinct from new_level
  );
$$;

revoke all on function public.profile_self_update_allowed(uuid,text,text,boolean,integer,integer) from public;
grant execute on function public.profile_self_update_allowed(uuid,text,text,boolean,integer,integer) to authenticated;

drop policy if exists "profiles update own or admin" on public.profiles;
create policy "profiles update own or admin"
on public.profiles
for update
using ((auth.uid() = id) or public.is_admin())
with check (
  public.is_admin()
  or (
    auth.uid() = id
    and public.profile_self_update_allowed(id,email,role,is_pro,xp,level)
  )
);

drop policy if exists "community members join self" on public.community_members;
create policy "community members join self"
on public.community_members
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.communities c
    where c.id = community_id
      and (c.visibility = 'public' or c.owner_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "feedback create own" on public.event_feedback;
create policy "feedback create own"
on public.event_feedback
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.event_attendees ea
    where ea.event_id = event_feedback.event_id
      and ea.user_id = auth.uid()
      and ea.status in ('going','confirmed')
  )
  and exists (
    select 1
    from public.events e
    where e.id = event_feedback.event_id
      and coalesce(e.ends_at,e.starts_at) <= now()
  )
);
