-- Achievement synchronization is maintained by database triggers.
-- Client sessions do not need permission to invoke it for arbitrary users.
revoke execute on function public.sync_user_achievements(uuid) from anon, authenticated;
