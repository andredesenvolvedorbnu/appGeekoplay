create or replace function public.expire_pro_subscriptions()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare affected integer;
begin
  update public.profiles
  set is_pro=false, updated_at=now()
  where is_pro=true and pro_expires_at is not null and pro_expires_at<=now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.expire_pro_subscriptions() from public, anon, authenticated;
grant execute on function public.expire_pro_subscriptions() to service_role, postgres;

do $$
declare jid bigint;
begin
  select jobid into jid from cron.job where jobname='expire-geekoplay-pro' limit 1;
  if jid is not null then perform cron.unschedule(jid); end if;
  perform cron.schedule('expire-geekoplay-pro','17 * * * *','select public.expire_pro_subscriptions();');
end $$;
