create or replace function public.admin_set_user_role(target_user uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  if new_role not in ('user','admin') then
    raise exception 'Função inválida';
  end if;

  if target_user = auth.uid() and new_role <> 'admin' then
    raise exception 'Você não pode remover seu próprio acesso administrativo';
  end if;

  update public.profiles
     set role = new_role,
         updated_at = now()
   where id = target_user;

  if not found then
    raise exception 'Usuário não encontrado';
  end if;
end;
$$;

revoke all on function public.admin_set_user_role(uuid,text) from public;
grant execute on function public.admin_set_user_role(uuid,text) to authenticated;

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

  select lower(coalesce(email,''))
    into target_email
    from public.profiles
   where id = target_user;

  if target_email in ('andresantos.deco@gmail.com','contato.geekoplay@gmail.com') then
    raise exception 'Esta conta administrativa protegida não pode ser excluída';
  end if;

  delete from auth.users where id = target_user;

  if not found then
    raise exception 'Usuário não encontrado';
  end if;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;
