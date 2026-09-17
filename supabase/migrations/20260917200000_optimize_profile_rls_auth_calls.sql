alter policy "profiles insert own" on public.profiles
with check (
  ((select auth.uid()) = id)
  and (
    (select public.is_admin())
    or (
      role = 'user'::text
      and is_pro = false
      and xp = 0
      and level = 1
    )
  )
);

alter policy "profiles update own or admin" on public.profiles
using (((select auth.uid()) = id) or (select public.is_admin()))
with check (((select auth.uid()) = id) or (select public.is_admin()));
