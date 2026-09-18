-- Push notifications: only connection/relevance driven events are eligible.
create extension if not exists pg_net;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

create table if not exists public.push_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default true,
  messages boolean not null default true,
  interactions boolean not null default true,
  follows boolean not null default true,
  communities boolean not null default true,
  events boolean not null default true,
  party_finder boolean not null default true,
  invites boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
alter table public.push_preferences enable row level security;

drop policy if exists "push subscriptions own read" on public.push_subscriptions;
create policy "push subscriptions own read" on public.push_subscriptions
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "push subscriptions own insert" on public.push_subscriptions;
create policy "push subscriptions own insert" on public.push_subscriptions
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "push subscriptions own update" on public.push_subscriptions;
create policy "push subscriptions own update" on public.push_subscriptions
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "push subscriptions own delete" on public.push_subscriptions;
create policy "push subscriptions own delete" on public.push_subscriptions
for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "push preferences own read" on public.push_preferences;
create policy "push preferences own read" on public.push_preferences
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "push preferences own insert" on public.push_preferences;
create policy "push preferences own insert" on public.push_preferences
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "push preferences own update" on public.push_preferences;
create policy "push preferences own update" on public.push_preferences
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select,insert,update,delete on public.push_subscriptions to authenticated;
grant select,insert,update on public.push_preferences to authenticated;

create or replace function public.get_push_public_key()
returns text
language sql
stable
security definer
set search_path = public, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name='push_vapid_public'
  limit 1;
$$;
revoke all on function public.get_push_public_key() from public,anon;
grant execute on function public.get_push_public_key() to authenticated,service_role;

create or replace function public.get_push_dispatch_secret()
returns text
language sql
stable
security definer
set search_path = public, vault
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name='push_dispatch_secret'
  limit 1;
$$;
revoke all on function public.get_push_dispatch_secret() from public,anon,authenticated;
grant execute on function public.get_push_dispatch_secret() to service_role;

create or replace function public.notify_community_member_join()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare community_name text;
begin
  select name into community_name from public.communities where id=new.community_id;

  insert into public.notifications(user_id,actor_id,type,title,body,entity_type,entity_id)
  select cm.user_id,new.user_id,'community_join','Novo geek na sua comunidade',
         coalesce(community_name,'Uma comunidade que você participa'),
         'community',new.community_id
  from public.community_members cm
  where cm.community_id=new.community_id
    and cm.user_id<>new.user_id
    and not exists (
      select 1 from public.notifications n
      where n.user_id=cm.user_id and n.actor_id=new.user_id and n.type='community_join'
        and n.entity_id=new.community_id and n.created_at>now()-interval '10 minutes'
    );

  return new;
end;
$$;

drop trigger if exists trg_notify_community_member_join on public.community_members;
create trigger trg_notify_community_member_join
after insert on public.community_members
for each row execute function public.notify_community_member_join();

create or replace function public.notify_party_member_join()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare owner_id uuid; game_name text;
begin
  select author_id,game into owner_id,game_name
  from public.party_finder_posts where id=new.party_id;

  if owner_id is not null and owner_id<>new.user_id then
    insert into public.notifications(user_id,actor_id,type,title,body,entity_type,entity_id)
    values(owner_id,new.user_id,'party_join','Alguém entrou na sua Party',
           coalesce(game_name,'Party Finder'),'party',new.party_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_party_member_join on public.party_finder_members;
create trigger trg_notify_party_member_join
after insert on public.party_finder_members
for each row execute function public.notify_party_member_join();

create or replace function public.dispatch_relevant_push()
returns trigger
language plpgsql
security definer
set search_path=public,vault,net
as $$
declare dispatch_secret text;
begin
  if new.type not in ('like','comment','message','follow','event_same','event_friend_going','community_join','party_join','invite') then
    return new;
  end if;

  select decrypted_secret into dispatch_secret
  from vault.decrypted_secrets
  where name='push_dispatch_secret'
  limit 1;

  if dispatch_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://telavlbwfkpwnndhhkfu.supabase.co/functions/v1/push-notification',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-push-secret',dispatch_secret
    ),
    body := jsonb_build_object('notification_id',new.id),
    timeout_milliseconds := 2000
  );

  return new;
end;
$$;

drop trigger if exists trg_dispatch_relevant_push on public.notifications;
create trigger trg_dispatch_relevant_push
after insert on public.notifications
for each row execute function public.dispatch_relevant_push();

-- Remove duplicate legacy Party Finder triggers now superseded by the current integrity triggers.
drop trigger if exists party_finder_join_guard on public.party_finder_members;
drop trigger if exists party_finder_auto_close on public.party_finder_members;
