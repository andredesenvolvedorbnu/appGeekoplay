revoke all on function public.notify_followed_users_same_event() from public, anon, authenticated;
grant execute on function public.notify_followed_users_same_event() to service_role;
