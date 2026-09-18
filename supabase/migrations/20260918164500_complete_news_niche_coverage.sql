-- Ensure automatic news coverage for every public news niche.
insert into public.news_sources(name,domain,search_query,category,priority,active)
values
 ('Games — busca geral',null,'games videogames PlayStation Xbox Nintendo PC Brasil','Games',10,true),
 ('Anime — busca geral',null,'anime novidades lançamentos Brasil Japão','Anime',20,true),
 ('HQs & Comics — busca geral',null,'quadrinhos comics Marvel DC Brasil','HQs & Comics',30,true),
 ('Filmes — busca geral',null,'filmes cinema cultura pop lançamentos Brasil','Filmes',40,true),
 ('Séries — busca geral',null,'series streaming cultura pop lançamentos Brasil','Séries',50,true),
 ('Cosplay — busca geral',null,'cosplay concursos eventos cultura geek Brasil','Cosplay',60,true),
 ('Mangá — busca geral',null,'manga mangá lançamentos Brasil Japão','Mangá',65,true),
 ('K-Pop — busca geral',null,'k-pop idols comeback shows Brasil','K-Pop',70,true),
 ('RPG — busca geral',null,'RPG Dungeons Dragons tabletop jogos de mesa Brasil','RPG',80,true),
 ('Tecnologia — busca geral',null,'tecnologia gadgets inteligência artificial games Brasil','Tecnologia',90,true),
 ('Colecionáveis — busca geral',null,'colecionaveis colecionáveis action figures cards cultura geek Brasil','Colecionáveis',100,true)
on conflict do nothing;

-- Keep the automatic refresh on a predictable 4-hour cadence.
do $$
declare job_id bigint;
begin
  select jobid into job_id from cron.job where jobname='geekoplay-news-every-4h' limit 1;
  if job_id is not null then
    perform cron.unschedule(job_id);
  end if;
  perform cron.schedule(
    'geekoplay-news-every-4h',
    '15 */4 * * *',
    'select public.refresh_geek_news();'
  );
end $$;