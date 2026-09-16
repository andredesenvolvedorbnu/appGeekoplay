-- SECURITY DEFINER functions inherit their creator's privileges. PostgreSQL
-- grants EXECUTE to PUBLIC by default, so explicitly close every privileged
-- function and reopen only the RPC surface used by the authenticated app.
do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef
  loop
    execute format('revoke all on function %s from public, anon, authenticated',fn.signature);
  end loop;
end;
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.profile_self_update_allowed(uuid,text,text,boolean,integer,integer) to authenticated;
grant execute on function public.update_my_profile_media(text,text) to authenticated;

grant execute on function public.admin_list_profiles() to authenticated;
grant execute on function public.admin_set_user_role(uuid,text) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
grant execute on function public.admin_refresh_geek_news() to authenticated;
grant execute on function public.process_premium_lifecycle() to authenticated;

grant execute on function public.register_daily_login() to authenticated;
grant execute on function public.weekly_geek_ranking() to authenticated;
grant execute on function public.claim_daily_mission(text) to authenticated;
grant execute on function public.sync_user_achievements(uuid) to authenticated;
grant execute on function public.refresh_my_pro_status() to authenticated;
grant execute on function public.request_premium() to authenticated;
grant execute on function public.request_premium(uuid) to authenticated;
grant execute on function public.request_boost(uuid,integer) to authenticated;
