create or replace function public.refresh_geek_news()
returns integer
language plpgsql
security definer
set search_path = public, extensions, cron
as $$
declare
  source_row record;
  response_content text;
  feed_doc xml;
  item xml;
  item_title text;
  item_link text;
  item_description text;
  item_source text;
  item_date text;
  parsed_date timestamptz;
  inserted_count integer := 0;
  item_count integer;
  full_query text;
begin
  for source_row in
    select * from public.news_sources
    where active=true
    order by priority asc, created_at asc
  loop
    item_count := 0;
    begin
      full_query := source_row.search_query
        || case
             when nullif(trim(coalesce(source_row.domain,'')),'') is not null
             then ' site:' || trim(source_row.domain)
             else ''
           end;

      select content into response_content
      from extensions.http_get(
        'https://news.google.com/rss/search?q=' || replace(replace(full_query,' ','%20'),'&','%26') || '&hl=pt-BR&gl=BR&ceid=BR:pt-419'
      );

      feed_doc := response_content::xml;

      foreach item in array xpath('//item', feed_doc)
      loop
        exit when item_count >= 12;
        item_count := item_count + 1;
        item_title := nullif(trim(both '"' from coalesce((xpath('string(/item/title)',item))[1]::text,'')), '');
        item_link := nullif(trim(both '"' from coalesce((xpath('string(/item/link)',item))[1]::text,'')), '');
        item_description := nullif(trim(both '"' from coalesce((xpath('string(/item/description)',item))[1]::text,'')), '');
        item_source := nullif(trim(both '"' from coalesce((xpath('string(/item/source)',item))[1]::text,'')), '');
        item_date := nullif(trim(both '"' from coalesce((xpath('string(/item/pubDate)',item))[1]::text,'')), '');
        parsed_date := case when item_date is not null then item_date::timestamptz else now() end;

        if item_title is not null
          and item_link is not null
          and parsed_date >= now() - interval '21 days'
          and not exists(select 1 from public.news n where n.source_url=item_link)
        then
          insert into public.news(
            title,summary,image_url,source_name,source_url,category,published_at,active,created_by
          ) values (
            left(item_title,500),
            left(nullif(trim(regexp_replace(regexp_replace(coalesce(item_description,''),'<[^>]*>','','g'),'&[^;]+;',' ','g')),''),1500),
            null,
            left(coalesce(item_source,source_row.name,'Google Notícias'),160),
            item_link,
            source_row.category,
            parsed_date,
            true,
            null
          );
          inserted_count := inserted_count + 1;
        end if;
      end loop;
    exception when others then
      raise warning 'Falha ao atualizar fonte %: %', source_row.name, sqlerrm;
    end;
  end loop;

  delete from public.news
  where created_by is null
    and coalesce(published_at,created_at) < now() - interval '30 days';

  delete from public.news n
  using (
    select id,
           row_number() over(
             partition by category
             order by coalesce(published_at,created_at) desc
           ) rn
    from public.news
    where created_by is null
  ) ranked
  where n.id=ranked.id
    and ranked.rn>40;

  return inserted_count;
end;
$$;

revoke all on function public.refresh_geek_news() from public, anon, authenticated;
grant execute on function public.refresh_geek_news() to postgres, service_role;
