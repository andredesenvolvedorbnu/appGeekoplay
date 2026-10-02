create or replace function public.cleanup_expired_transient_data()
returns jsonb
language plpgsql
security definer
set search_path to 'public','storage'
as $function$
declare
  pulse_count integer:=0;
  notification_count integer:=0;
  ad_event_count integer:=0;
begin
  insert into public.storage_cleanup_candidates(bucket,object_path,reason,expected_size)
  select 'pulses', split_part(p.image_url,'/storage/v1/object/public/pulses/',2), 'expired_pulse', o_size
  from public.pulses p
  left join lateral (
    select (o.metadata->>'size')::bigint as o_size
    from storage.objects o
    where o.bucket_id='pulses' and o.name=split_part(p.image_url,'/storage/v1/object/public/pulses/',2)
    limit 1
  ) s on true
  where p.expires_at<=now() and p.image_url like '%/storage/v1/object/public/pulses/%'
  on conflict(bucket,object_path) do nothing;

  delete from public.pulses where expires_at<=now();
  get diagnostics pulse_count=row_count;

  insert into public.storage_cleanup_candidates(bucket,object_path,reason,expected_size)
  select 'posts',o.name,'orphan_post_media',(o.metadata->>'size')::bigint
  from storage.objects o
  where o.bucket_id='posts'
    and o.created_at < now()-interval '1 day'
    and not exists(select 1 from public.posts p where coalesce(p.image_url,'') like '%'||o.name or coalesce(p.video_url,'') like '%'||o.name or coalesce(p.card_data::text,'') like '%'||o.name)
    and not exists(select 1 from public.post_media pm where coalesce(pm.url,'') like '%'||o.name or coalesce(pm.storage_path,'')=o.name)
  on conflict(bucket,object_path) do nothing;

  insert into public.storage_cleanup_candidates(bucket,object_path,reason,expected_size)
  select 'avatars',o.name,'orphan_avatar',(o.metadata->>'size')::bigint
  from storage.objects o
  where o.bucket_id='avatars'
    and o.created_at < now()-interval '7 days'
    and not exists(select 1 from public.profiles p where coalesce(p.avatar_url,'') like '%'||o.name)
  on conflict(bucket,object_path) do nothing;

  insert into public.storage_cleanup_candidates(bucket,object_path,reason,expected_size)
  select 'covers',o.name,'orphan_profile_cover',(o.metadata->>'size')::bigint
  from storage.objects o
  where o.bucket_id='covers'
    and o.created_at < now()-interval '7 days'
    and not exists(select 1 from public.profiles p where coalesce(p.cover_url,'') like '%'||o.name)
  on conflict(bucket,object_path) do nothing;

  insert into public.storage_cleanup_candidates(bucket,object_path,reason,expected_size)
  select 'ads',o.name,'orphan_ad_media',(o.metadata->>'size')::bigint
  from storage.objects o
  where o.bucket_id='ads'
    and o.created_at < now()-interval '7 days'
    and not exists(select 1 from public.ads a where coalesce(a.image_url,'') like '%'||o.name)
  on conflict(bucket,object_path) do nothing;

  delete from public.notifications
  where is_read=true and created_at < now()-interval '180 days';
  get diagnostics notification_count=row_count;

  delete from public.ad_events
  where created_at < now()-interval '180 days';
  get diagnostics ad_event_count=row_count;

  return jsonb_build_object(
    'expired_pulses_deleted',pulse_count,
    'old_read_notifications_deleted',notification_count,
    'old_ad_events_deleted',ad_event_count,
    'queued_storage_candidates',(select count(*) from public.storage_cleanup_candidates where processed_at is null)
  );
end;
$function$;
