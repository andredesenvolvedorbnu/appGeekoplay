create or replace function public.get_push_vapid_private()
returns text
language sql
stable
security definer
set search_path = public, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name='push_vapid_private'
  limit 1;
$$;
revoke all on function public.get_push_vapid_private() from public,anon,authenticated;
grant execute on function public.get_push_vapid_private() to service_role;