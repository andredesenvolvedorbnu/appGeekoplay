drop policy if exists "pulses public read active" on public.pulses;

create policy "pulses read active own or admin"
on public.pulses
for select
using (
  expires_at > now()
  or author_id = (select auth.uid())
  or is_admin()
);
