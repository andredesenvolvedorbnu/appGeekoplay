-- Permite que o fluxo interno de aprovação de pagamentos altere apenas os
-- campos privilegiados de impulsionamento durante a mesma transação.
create or replace function public.protect_post_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_admin()
     and coalesce(current_setting('app.allow_post_privileged_update', true),'') <> 'on' then
    if tg_op='INSERT' then
      new.is_boosted:=false;
      new.boosted_until:=null;
    else
      new.is_boosted:=old.is_boosted;
      new.boosted_until:=old.boosted_until;
      new.author_id:=old.author_id;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_post_privileged_fields() from public,anon,authenticated;

-- Mantém o Premium e o boost pagos como já funcionavam, mas autoriza o trigger
-- interno a aplicar o destaque mesmo quando a confirmação vem da service role.
create or replace function public.apply_monetization_approval()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare base_start timestamptz;
begin
  if old.status is distinct from new.status and new.status='approved' then
    new.reviewed_at=now();
    new.reviewed_by=auth.uid();

    if tg_table_name='premium_requests' then
      select greatest(now(),coalesce(pro_expires_at,now()))
      into base_start
      from public.profiles
      where id=new.user_id;

      new.starts_at=base_start;
      new.expires_at=base_start + make_interval(days=>coalesce(new.duration_days,30));

      update public.profiles
      set is_pro=true,
          pro_started_at=coalesce(pro_started_at,now()),
          pro_expires_at=new.expires_at,
          updated_at=now()
      where id=new.user_id;
    elsif tg_table_name='boost_requests' then
      perform set_config('app.allow_post_privileged_update','on',true);

      update public.posts
      set is_boosted=true,
          boosted_until=greatest(coalesce(boosted_until,now()),now()) + make_interval(days=>new.days),
          updated_at=now()
      where id=new.post_id;
    end if;
  elsif old.status is distinct from new.status and new.status='rejected' then
    new.reviewed_at=now();
    new.reviewed_by=auth.uid();
  end if;

  return new;
end;
$$;

revoke all on function public.apply_monetization_approval() from public,anon,authenticated;

-- Concessão promocional de XP para parcerias. O valor é somado ao progresso
-- existente; o crescimento automático do aplicativo continua inalterado.
create or replace function public.admin_grant_xp(target_user uuid,xp_amount integer)
returns table(new_xp integer,new_level integer)
language plpgsql
security invoker
set search_path=public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  if target_user is null or xp_amount is null or xp_amount < 1 or xp_amount > 100000 then
    raise exception 'Informe uma quantidade de XP entre 1 e 100000';
  end if;

  return query
  update public.profiles as profile
  set xp=greatest(0,profile.xp+xp_amount),
      level=least(10,greatest(1,1+floor((greatest(0,profile.xp+xp_amount))::numeric/500)::integer)),
      updated_at=now()
  where profile.id=target_user
  returning profile.xp,profile.level;

  if not found then
    raise exception 'Usuário não encontrado';
  end if;
end;
$$;

revoke all on function public.admin_grant_xp(uuid,integer) from public,anon;
grant execute on function public.admin_grant_xp(uuid,integer) to authenticated;

-- Impulsionamento cortesia para ações com influenciadores. Não cria pedido de
-- pagamento nem entra no cálculo de receita do painel.
create or replace function public.admin_promote_post(target_post uuid,boost_days integer)
returns table(post_id uuid,active_until timestamptz)
language plpgsql
security invoker
set search_path=public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Acesso negado';
  end if;

  if target_post is null or boost_days is null or boost_days < 1 or boost_days > 365 then
    raise exception 'Informe uma duração entre 1 e 365 dias';
  end if;

  perform set_config('app.allow_post_privileged_update','on',true);

  return query
  update public.posts as post
  set is_boosted=true,
      boosted_until=greatest(coalesce(post.boosted_until,now()),now()) + make_interval(days=>boost_days),
      updated_at=now()
  where post.id=target_post
  returning post.id,post.boosted_until;

  if not found then
    raise exception 'Publicação não encontrada';
  end if;
end;
$$;

revoke all on function public.admin_promote_post(uuid,integer) from public,anon;
grant execute on function public.admin_promote_post(uuid,integer) to authenticated;
