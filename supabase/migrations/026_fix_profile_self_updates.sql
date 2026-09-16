-- Permite que o próprio usuário atualize seu perfil, incluindo avatar e capa.
-- Campos privilegiados continuam protegidos pelo trigger trg_protect_profile_privileged_fields,
-- que restaura role, is_pro, xp, level e email para usuários comuns.

drop policy if exists "profiles update own or admin" on public.profiles;

create policy "profiles update own or admin"
on public.profiles
for update
using ((auth.uid() = id) or public.is_admin())
with check ((auth.uid() = id) or public.is_admin());
