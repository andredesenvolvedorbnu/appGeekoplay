alter policy "follows create own" on public.follows with check ((select auth.uid()) = follower_id);
alter policy "follows delete own" on public.follows using ((select auth.uid()) = follower_id);

alter policy "news likes create own" on public.news_likes with check ((select auth.uid()) = user_id);
alter policy "news likes delete own" on public.news_likes using ((select auth.uid()) = user_id);

alter policy "communities create authenticated" on public.communities with check ((select auth.uid()) = owner_id);
alter policy "communities update owner or admin" on public.communities using (((select auth.uid()) = owner_id) or (select public.is_admin())) with check (((select auth.uid()) = owner_id) or (select public.is_admin()));
alter policy "communities delete owner or admin" on public.communities using (((select auth.uid()) = owner_id) or (select public.is_admin()));

alter policy "community members leave self" on public.community_members using (((select auth.uid()) = user_id) or (select public.is_admin()));
alter policy "community members join self" on public.community_members with check (
  ((select auth.uid()) = user_id)
  and exists (
    select 1 from public.communities c
    where c.id = community_members.community_id
      and (c.visibility = 'public' or c.owner_id = (select auth.uid()) or (select public.is_admin()))
  )
);
alter policy "community owner admin add members" on public.community_members with check (
  (select public.is_admin())
  or exists (
    select 1 from public.communities c
    where c.id = community_members.community_id
      and c.owner_id = (select auth.uid())
  )
);
