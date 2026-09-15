create table if not exists public.news_likes (
  news_id uuid not null references public.news(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(news_id,user_id)
);

alter table public.news_likes enable row level security;

drop policy if exists "news likes public read" on public.news_likes;
create policy "news likes public read"
  on public.news_likes for select using (true);

drop policy if exists "news likes create own" on public.news_likes;
create policy "news likes create own"
  on public.news_likes for insert with check (auth.uid()=user_id);

drop policy if exists "news likes delete own" on public.news_likes;
create policy "news likes delete own"
  on public.news_likes for delete using (auth.uid()=user_id);

grant select on public.news_likes to anon, authenticated;
grant insert,delete on public.news_likes to authenticated;

create index if not exists news_likes_news_idx on public.news_likes(news_id);
