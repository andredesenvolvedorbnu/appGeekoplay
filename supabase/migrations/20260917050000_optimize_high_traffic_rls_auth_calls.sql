alter policy "posts create own" on public.posts with check ((select auth.uid()) = author_id);
alter policy "posts update own or admin" on public.posts using (((select auth.uid()) = author_id) or (select public.is_admin())) with check (((select auth.uid()) = author_id) or (select public.is_admin()));
alter policy "posts delete own or admin" on public.posts using (((select auth.uid()) = author_id) or (select public.is_admin()));

alter policy "likes create own" on public.likes with check ((select auth.uid()) = user_id);
alter policy "likes delete own" on public.likes using ((select auth.uid()) = user_id);

alter policy "comments create own" on public.comments with check ((select auth.uid()) = author_id);
alter policy "comments update own" on public.comments using ((select auth.uid()) = author_id) with check ((select auth.uid()) = author_id);
alter policy "comments delete own or admin" on public.comments using (((select auth.uid()) = author_id) or (select public.is_admin()));

alter policy "messages participants read" on public.messages using (((select auth.uid()) = sender_id) or ((select auth.uid()) = recipient_id));
alter policy "messages recipient mark read" on public.messages using ((select auth.uid()) = recipient_id) with check ((select auth.uid()) = recipient_id);
alter policy "messages sender create" on public.messages with check ((select auth.uid()) = sender_id);
alter policy "messages sender delete" on public.messages using ((select auth.uid()) = sender_id);

alter policy "notifications owner read" on public.notifications using ((select auth.uid()) = user_id);
alter policy "notifications owner update" on public.notifications using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "notifications owner delete" on public.notifications using ((select auth.uid()) = user_id);
alter policy "notifications admin insert" on public.notifications with check ((select public.is_admin()));

alter policy "event attendees create self" on public.event_attendees with check ((select auth.uid()) = user_id);
alter policy "event attendees update self" on public.event_attendees using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy "event attendees delete self" on public.event_attendees using ((select auth.uid()) = user_id);
