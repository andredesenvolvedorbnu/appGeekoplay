create table public.moderation_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_type text not null check (content_type in ('post','comment')),
  parent_id uuid null,
  content_text text null,
  content_category text null,
  media_kind text not null default 'none' check (media_kind in ('none','image','video')),
  fingerprint text not null,
  decision text not null check (decision in ('blocked','pending_review','approved','rejected')),
  detected_categories text[] not null default '{}'::text[],
  rule_summary text null,
  model_summary text null,
  evidence_preview text null,
  model_name text null,
  reviewed_by uuid null references public.profiles(id) on delete set null,
  reviewed_at timestamptz null,
  admin_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index moderation_cases_user_fingerprint_idx on public.moderation_cases(user_id,content_type,fingerprint,created_at desc);
create index moderation_cases_decision_created_idx on public.moderation_cases(decision,created_at desc);
alter table public.moderation_cases enable row level security;
grant select,insert,update on table public.moderation_cases to authenticated;

create policy "moderation cases read own or admin" on public.moderation_cases for select to authenticated
using ((select auth.uid())=user_id or (select public.is_admin()));
create policy "moderation cases create own" on public.moderation_cases for insert to authenticated
with check ((select auth.uid())=user_id);
create policy "moderation cases admin update" on public.moderation_cases for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

create table public.moderation_appeals (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.moderation_cases(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(message) between 5 and 2000),
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  reviewed_by uuid null references public.profiles(id) on delete set null,
  reviewed_at timestamptz null,
  admin_response text null,
  created_at timestamptz not null default now()
);

create unique index moderation_appeals_one_pending_idx on public.moderation_appeals(case_id,user_id) where status='pending';
create index moderation_appeals_status_created_idx on public.moderation_appeals(status,created_at desc);
alter table public.moderation_appeals enable row level security;
grant select,insert,update on table public.moderation_appeals to authenticated;

create policy "moderation appeals read own or admin" on public.moderation_appeals for select to authenticated
using ((select auth.uid())=user_id or (select public.is_admin()));
create policy "moderation appeals create own" on public.moderation_appeals for insert to authenticated
with check ((select auth.uid())=user_id and exists (
  select 1 from public.moderation_cases c where c.id=case_id and c.user_id=(select auth.uid())
  and c.decision in ('blocked','pending_review','rejected')
));
create policy "moderation appeals admin update" on public.moderation_appeals for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

create or replace function public.notify_admins_moderation_case()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.notifications(user_id,actor_id,type,title,body,entity_type,entity_id)
  select p.id,new.user_id,'moderation_auto',
    case when new.decision='blocked' then 'Publicação bloqueada automaticamente' else 'Conteúdo aguardando revisão' end,
    coalesce(new.rule_summary,'Um conteúdo foi sinalizado pela moderação automática.'),
    'moderation_case',new.id
  from public.profiles p where p.role='admin';
  return new;
end;
$$;
revoke all on function public.notify_admins_moderation_case() from public,anon,authenticated;
create trigger trg_notify_admins_moderation_case after insert on public.moderation_cases
for each row execute function public.notify_admins_moderation_case();

create or replace function public.notify_admins_moderation_appeal()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.notifications(user_id,actor_id,type,title,body,entity_type,entity_id)
  select p.id,new.user_id,'moderation_appeal','Nova contestação de moderação',
    'Um usuário contestou uma decisão automática e aguarda revisão.','moderation_case',new.case_id
  from public.profiles p where p.role='admin';
  return new;
end;
$$;
revoke all on function public.notify_admins_moderation_appeal() from public,anon,authenticated;
create trigger trg_notify_admins_moderation_appeal after insert on public.moderation_appeals
for each row execute function public.notify_admins_moderation_appeal();

create or replace function public.admin_review_moderation_case(target_case uuid,new_decision text,review_note text default null)
returns void language plpgsql security invoker set search_path=public as $$
declare target_user uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Acesso negado'; end if;
  if new_decision not in ('approved','rejected') then raise exception 'Decisão inválida'; end if;
  update public.moderation_cases set decision=new_decision,reviewed_by=auth.uid(),reviewed_at=now(),
    admin_note=nullif(trim(review_note),''),updated_at=now()
  where id=target_case returning user_id into target_user;
  if target_user is null then raise exception 'Caso não encontrado'; end if;
  insert into public.notifications(user_id,actor_id,type,title,body,entity_type,entity_id)
  values(target_user,auth.uid(),'moderation_result',
    case when new_decision='approved' then 'Conteúdo liberado após revisão' else 'Bloqueio mantido após revisão' end,
    case when new_decision='approved'
      then 'A revisão foi concluída. Você pode tentar publicar novamente o mesmo conteúdo.'
      else 'A equipe revisou o caso e manteve a restrição conforme as Diretrizes da Comunidade.' end,
    'moderation_case',target_case);
end;
$$;
revoke all on function public.admin_review_moderation_case(uuid,text,text) from public,anon;
grant execute on function public.admin_review_moderation_case(uuid,text,text) to authenticated;

create or replace function public.admin_review_moderation_appeal(target_appeal uuid,new_status text,response_note text default null)
returns void language plpgsql security invoker set search_path=public as $$
declare target_case uuid; declare target_user uuid;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Acesso negado'; end if;
  if new_status not in ('accepted','rejected') then raise exception 'Status inválido'; end if;
  update public.moderation_appeals set status=new_status,reviewed_by=auth.uid(),reviewed_at=now(),
    admin_response=nullif(trim(response_note),'')
  where id=target_appeal and status='pending' returning case_id,user_id into target_case,target_user;
  if target_case is null then raise exception 'Contestação não encontrada ou já revisada'; end if;
  update public.moderation_cases set decision=case when new_status='accepted' then 'approved' else 'rejected' end,
    reviewed_by=auth.uid(),reviewed_at=now(),admin_note=nullif(trim(response_note),''),updated_at=now()
  where id=target_case;
  insert into public.notifications(user_id,actor_id,type,title,body,entity_type,entity_id)
  values(target_user,auth.uid(),'moderation_appeal_result',
    case when new_status='accepted' then 'Contestação aceita' else 'Contestação revisada' end,
    case when new_status='accepted'
      then 'Sua contestação foi aceita. Você pode tentar publicar novamente o mesmo conteúdo.'
      else 'Sua contestação foi analisada e o bloqueio foi mantido.' end,
    'moderation_case',target_case);
end;
$$;
revoke all on function public.admin_review_moderation_appeal(uuid,text,text) from public,anon;
grant execute on function public.admin_review_moderation_appeal(uuid,text,text) to authenticated;

alter publication supabase_realtime add table public.moderation_cases;
alter publication supabase_realtime add table public.moderation_appeals;
