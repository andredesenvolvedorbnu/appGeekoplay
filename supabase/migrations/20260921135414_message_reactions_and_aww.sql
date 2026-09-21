alter table public.comment_reactions
  drop constraint if exists comment_reactions_reaction_check;

alter table public.comment_reactions
  add constraint comment_reactions_reaction_check
  check (reaction = any (array['gg'::text,'hype'::text,'op'::text,'lore'::text,'f'::text,'aww'::text]));

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction = any (array['gg'::text,'hype'::text,'op'::text,'lore'::text,'f'::text,'aww'::text])),
  created_at timestamptz not null default now(),
  primary key (message_id,user_id,reaction)
);

create index if not exists message_reactions_message_id_idx on public.message_reactions(message_id);
create index if not exists message_reactions_user_id_idx on public.message_reactions(user_id);

alter table public.message_reactions enable row level security;
grant select,insert,delete on table public.message_reactions to authenticated;

drop policy if exists "message reactions participants read" on public.message_reactions;
create policy "message reactions participants read"
on public.message_reactions for select to authenticated
using (
  exists (
    select 1 from public.messages m
    where m.id=message_id
      and ((select auth.uid())=m.sender_id or (select auth.uid())=m.recipient_id)
  )
);

drop policy if exists "message reactions create own as participant" on public.message_reactions;
create policy "message reactions create own as participant"
on public.message_reactions for insert to authenticated
with check (
  (select auth.uid())=user_id
  and exists (
    select 1 from public.messages m
    where m.id=message_id
      and ((select auth.uid())=m.sender_id or (select auth.uid())=m.recipient_id)
  )
);

drop policy if exists "message reactions delete own" on public.message_reactions;
create policy "message reactions delete own"
on public.message_reactions for delete to authenticated
using ((select auth.uid())=user_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='message_reactions'
  ) then
    alter publication supabase_realtime add table public.message_reactions;
  end if;
end
$$;
