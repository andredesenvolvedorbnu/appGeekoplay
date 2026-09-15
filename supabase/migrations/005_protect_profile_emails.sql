create or replace function public.admin_list_profiles()
returns table (
  id uuid,
  display_name text,
  email text,
  role text,
  level integer,
  xp integer,
  is_pro boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  return query
  select p.id,p.display_name,p.email,p.role,p.level,p.xp,p.is_pro,p.created_at
  from public.profiles p
  order by p.created_at desc
  limit 500;
end;
$$;

revoke all on function public.admin_list_profiles() from public;
grant execute on function public.admin_list_profiles() to authenticated;

revoke select on public.profiles from anon, authenticated;
grant select (
  id,username,display_name,bio,avatar_url,cover_url,city,favorite_categories,
  role,is_pro,xp,level,created_at,updated_at
) on public.profiles to anon, authenticated;
