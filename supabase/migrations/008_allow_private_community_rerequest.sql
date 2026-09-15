drop policy if exists "join requests user renew own" on public.community_join_requests;
create policy "join requests user renew own"
on public.community_join_requests
for update
using (
  auth.uid() = user_id
  and status = 'rejected'
)
with check (
  auth.uid() = user_id
  and status = 'pending'
  and exists (
    select 1 from public.communities c
    where c.id = community_id and c.visibility = 'private' and c.owner_id <> auth.uid()
  )
  and not exists (
    select 1 from public.community_members cm
    where cm.community_id = community_join_requests.community_id and cm.user_id = auth.uid()
  )
);

create or replace function public.notify_community_join_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_uuid uuid;
  community_name text;
begin
  select c.owner_id,c.name into owner_uuid,community_name
  from public.communities c where c.id = new.community_id;

  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and old.status = 'rejected' and new.status = 'pending') then
    insert into public.notifications(user_id,actor_id,type,title,body,entity_type,entity_id)
    values (
      owner_uuid,
      new.user_id,
      'community_join_request',
      'Nova solicitação de entrada',
      'Alguém quer entrar em ' || coalesce(community_name,'sua comunidade') || '.',
      'community',
      new.community_id
    );
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status in ('approved','rejected') then
    insert into public.notifications(user_id,actor_id,type,title,body,entity_type,entity_id)
    values (
      new.user_id,
      new.reviewed_by,
      case when new.status='approved' then 'community_join_approved' else 'community_join_rejected' end,
      case when new.status='approved' then 'Entrada aprovada' else 'Solicitação não aprovada' end,
      case when new.status='approved'
        then 'Você agora faz parte de ' || coalesce(community_name,'uma comunidade') || '.'
        else 'Sua solicitação para entrar em ' || coalesce(community_name,'uma comunidade') || ' não foi aprovada.'
      end,
      'community',
      new.community_id
    );
  end if;

  return new;
end;
$$;
