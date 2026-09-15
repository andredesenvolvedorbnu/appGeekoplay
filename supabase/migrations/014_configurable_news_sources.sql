create table if not exists public.news_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  domain text,
  search_query text not null check (char_length(search_query) between 2 and 240),
  category text not null,
  priority integer not null default 100 check (priority between 1 and 1000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists news_sources_unique_rule_idx
  on public.news_sources(lower(name),lower(coalesce(domain,'')),lower(search_query),lower(category));

alter table public.news_sources enable row level security;

drop policy if exists "news sources admin read" on public.news_sources;
create policy "news sources admin read" on public.news_sources for select using (public.is_admin());
drop policy if exists "news sources admin insert" on public.news_sources;
create policy "news sources admin insert" on public.news_sources for insert with check (public.is_admin());
drop policy if exists "news sources admin update" on public.news_sources;
create policy "news sources admin update" on public.news_sources for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "news sources admin delete" on public.news_sources;
create policy "news sources admin delete" on public.news_sources for delete using (public.is_admin());

grant select,insert,update,delete on public.news_sources to authenticated;

insert into public.news_sources(name,domain,search_query,category,priority,active)
values
 ('Games — busca geral',null,'games videogames PlayStation Xbox Nintendo PC Brasil','Games',10,true),
 ('Anime — busca geral',null,'anime manga Brasil','Anime',20,true),
 ('HQs & Comics — busca geral',null,'Marvel DC quadrinhos comics Brasil','HQs & Comics',30,true),
 ('Filmes — busca geral',null,'filmes cultura pop cinema Brasil','Filmes',40,true),
 ('Séries — busca geral',null,'series streaming cultura pop Brasil','Séries',50,true),
 ('Cosplay — busca geral',null,'cosplay eventos geek Brasil','Cosplay',60,true),
 ('K-Pop — busca geral',null,'k-pop Brasil entretenimento','K-Pop',70,true),
 ('RPG — busca geral',null,'RPG Dungeons Dragons tabletop Brasil','RPG',80,true),
 ('Tecnologia — busca geral',null,'tecnologia IA gadgets Brasil','Tecnologia',90,true),
 ('Colecionáveis — busca geral',null,'colecionaveis action figures cards geek Brasil','Colecionáveis',100,true)
on conflict do nothing;

create or replace function public.admin_refresh_geek_news()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  return public.refresh_geek_news();
end;
$$;

revoke all on function public.admin_refresh_geek_news() from public;
grant execute on function public.admin_refresh_geek_news() to authenticated;
