drop policy if exists "profiles update own or admin" on public.profiles;
create policy "profiles update own or admin" on public.profiles
for update
using ((auth.uid() = id) or public.is_admin())
with check ((auth.uid() = id) or public.is_admin());

-- Sensitive fields remain protected by trg_protect_profile_privileged_fields.
