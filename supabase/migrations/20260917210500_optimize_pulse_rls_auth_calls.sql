alter policy "pulses create own" on public.pulses with check ((select auth.uid()) = author_id);
alter policy "pulses delete own" on public.pulses using (((select auth.uid()) = author_id) or (select public.is_admin()));
