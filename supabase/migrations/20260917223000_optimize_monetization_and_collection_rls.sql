drop policy if exists "boost admin update" on public.boost_requests;
create policy "boost admin update" on public.boost_requests for update using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "boost own cancel" on public.boost_requests;
create policy "boost own cancel" on public.boost_requests for update using (((select auth.uid()) = user_id) and status = 'pending') with check (((select auth.uid()) = user_id) and status = 'cancelled');

drop policy if exists "boost own read" on public.boost_requests;
create policy "boost own read" on public.boost_requests for select using (((select auth.uid()) = user_id) or (select public.is_admin()));

drop policy if exists "premium admin update" on public.premium_requests;
create policy "premium admin update" on public.premium_requests for update using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "premium own cancel" on public.premium_requests;
create policy "premium own cancel" on public.premium_requests for update using (((select auth.uid()) = user_id) and status = 'pending') with check (((select auth.uid()) = user_id) and status = 'cancelled');

drop policy if exists "premium own read" on public.premium_requests;
create policy "premium own read" on public.premium_requests for select using (((select auth.uid()) = user_id) or (select public.is_admin()));

drop policy if exists "collection create own" on public.collection_items;
create policy "collection create own" on public.collection_items for insert with check ((select auth.uid()) = owner_id);

drop policy if exists "collection delete own" on public.collection_items;
create policy "collection delete own" on public.collection_items for delete using ((select auth.uid()) = owner_id);

drop policy if exists "collection update own" on public.collection_items;
create policy "collection update own" on public.collection_items for update using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
