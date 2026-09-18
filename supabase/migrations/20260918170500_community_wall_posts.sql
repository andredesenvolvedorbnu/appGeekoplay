create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists community_posts_community_created_idx
  on public.community_posts(community_id, created_at desc);

alter table public.community_posts enable row level security;

drop policy if exists "community posts member read" on public.community_posts;
create policy "community posts member read"
on public.community_posts for select to authenticated
using (
  exists (
    select 1 from public.communities c
    where c.id=community_posts.community_id
      and (
        c.visibility='public'
        or c.owner_id=(select auth.uid())
        or exists (
          select 1 from public.community_members m
          where m.community_id=c.id and m.user_id=(select auth.uid())
        )
      )
  )
);

drop policy if exists "community posts member insert" on public.community_posts;
create policy "community posts member insert"
on public.community_posts for insert to authenticated
with check (
  author_id=(select auth.uid())
  and exists (
    select 1 from public.communities c
    where c.id=community_posts.community_id
      and (
        c.owner_id=(select auth.uid())
        or exists (
          select 1 from public.community_members m
          where m.community_id=c.id and m.user_id=(select auth.uid())
        )
      )
  )
);

drop policy if exists "community posts own owner admin delete" on public.community_posts;
create policy "community posts own owner admin delete"
on public.community_posts for delete to authenticated
using (
  author_id=(select auth.uid())
  or exists (
    select 1 from public.communities c
    where c.id=community_posts.community_id and c.owner_id=(select auth.uid())
  )
  or public.is_admin()
);

grant select,insert,delete on public.community_posts to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='community_posts'
  ) then
    alter publication supabase_realtime add table public.community_posts;
  end if;
end $$;