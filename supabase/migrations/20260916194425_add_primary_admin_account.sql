-- Keep the product owner's current account and the admin accounts documented for
-- GeekoPlay protected, while every other registration remains a regular user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, display_name, role)
  values (
    new.id,
    new.email,
    null,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'geek'), '@', 1)),
    case when lower(coalesce(new.email,'')) in (
      'andresantos.deco@gmail.com',
      'andresantos.deco2022@gmail.com',
      'ingressoblu@gmail.com',
      'contato.geekoplay@gmail.com'
    ) then 'admin' else 'user' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

update public.profiles p
   set role='admin',updated_at=now()
  from auth.users u
 where u.id=p.id
   and lower(coalesce(u.email,'')) in (
    'andresantos.deco@gmail.com',
    'andresantos.deco2022@gmail.com',
    'ingressoblu@gmail.com',
    'contato.geekoplay@gmail.com'
   );

create or replace function public.admin_delete_user(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_email text;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  if target_user = auth.uid() then
    raise exception 'Você não pode excluir sua própria conta administrativa';
  end if;

  select lower(coalesce(u.email,p.email,''))
    into target_email
    from public.profiles p
    left join auth.users u on u.id=p.id
   where p.id=target_user;

  if target_email in (
    'andresantos.deco@gmail.com',
    'andresantos.deco2022@gmail.com',
    'ingressoblu@gmail.com',
    'contato.geekoplay@gmail.com'
  ) then
    raise exception 'Esta conta administrativa protegida não pode ser excluída';
  end if;

  delete from auth.users where id=target_user;
  if not found then raise exception 'Usuário não encontrado'; end if;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public,anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;
