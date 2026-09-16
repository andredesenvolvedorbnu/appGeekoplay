create or replace function public.update_my_profile_media(p_kind text, p_url text)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid := auth.uid();
  bucket text;
  expected text;
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_kind not in ('avatar','cover') then raise exception 'INVALID_KIND'; end if;
  bucket := case when p_kind='avatar' then 'avatars' else 'covers' end;
  expected := '/storage/v1/object/public/'||bucket||'/'||uid::text||'/';
  if p_url is null or position(expected in p_url)=0 then raise exception 'INVALID_MEDIA_URL'; end if;

  if p_kind='avatar' then
    update public.profiles set avatar_url=p_url, updated_at=now() where id=uid;
  else
    update public.profiles set cover_url=p_url, updated_at=now() where id=uid;
  end if;

  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
end;
$$;

grant execute on function public.update_my_profile_media(text,text) to authenticated;
