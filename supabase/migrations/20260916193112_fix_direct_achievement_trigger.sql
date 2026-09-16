-- A trigger record only exposes columns from its own table. The previous CASE
-- expression tried to resolve every NEW/OLD field and broke post creation by
-- reading NEW.user_id from public.posts, whose owner column is author_id.
create or replace function public.sync_achievements_for_direct_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare target uuid;
begin
  if tg_table_name='posts' then
    target := case when tg_op='DELETE' then old.author_id else new.author_id end;
  elsif tg_table_name='comments' then
    target := case when tg_op='DELETE' then old.author_id else new.author_id end;
  elsif tg_table_name='event_attendees' then
    target := case when tg_op='DELETE' then old.user_id else new.user_id end;
  elsif tg_table_name='event_feedback' then
    target := case when tg_op='DELETE' then old.user_id else new.user_id end;
  elsif tg_table_name='community_members' then
    target := case when tg_op='DELETE' then old.user_id else new.user_id end;
  elsif tg_table_name='collection_items' then
    target := case when tg_op='DELETE' then old.owner_id else new.owner_id end;
  elsif tg_table_name='profiles' then
    target := case when tg_op='DELETE' then old.id else new.id end;
  end if;
  if target is not null then perform public.sync_user_achievements(target); end if;
  return case when tg_op='DELETE' then old else new end;
end;
$$;

revoke all on function public.sync_achievements_for_direct_user() from public,anon,authenticated;
