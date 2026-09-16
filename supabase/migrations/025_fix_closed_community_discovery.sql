drop policy if exists "communities public read" on public.communities;
create policy "communities discoverable read"
on public.communities
for select
to authenticated
using (true);
