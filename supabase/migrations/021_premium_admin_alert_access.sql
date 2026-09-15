do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='premium_alert_log' and policyname='premium alert admin read') then
  create policy "premium alert admin read" on public.premium_alert_log for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
 end if;
end $$;