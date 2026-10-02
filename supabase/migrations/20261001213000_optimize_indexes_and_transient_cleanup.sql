-- Performance and transient-data cleanup for GeekoPlay.
-- Keeps existing user content intact while removing expired ephemeral rows
-- and queueing unreferenced Storage files for safe API-side deletion.

create index if not exists collection_item_likes_user_id_idx on public.collection_item_likes(user_id);
create index if not exists collection_mentions_actor_id_idx on public.collection_mentions(actor_id);
create index if not exists collection_mentions_mentioned_user_id_idx on public.collection_mentions(mentioned_user_id);
create index if not exists community_posts_author_id_idx on public.community_posts(author_id);
create index if not exists geek_quiz_answers_question_id_idx on public.geek_quiz_answers(question_id);
create index if not exists geek_quiz_run_questions_question_id_idx on public.geek_quiz_run_questions(question_id);
create index if not exists moderation_appeals_reviewed_by_idx on public.moderation_appeals(reviewed_by);
create index if not exists moderation_appeals_user_id_idx on public.moderation_appeals(user_id);
create index if not exists moderation_cases_reviewed_by_idx on public.moderation_cases(reviewed_by);
create index if not exists user_status_notices_user_id_idx on public.user_status_notices(user_id);

create table if not exists public.storage_cleanup_candidates(
  id bigserial primary key,
  bucket text not null,
  object_path text not null,
  reason text not null,
  expected_size bigint,
  queued_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(bucket,object_path)
);

alter table public.storage_cleanup_candidates enable row level security;
revoke all on public.storage_cleanup_candidates from anon, authenticated;

create or replace function public.cleanup_expired_transient_data()
returns jsonb
language plpgsql
security definer
set search_path=public,storage
as $$
declare pulse_count integer:=0;
begin
  insert into public.storage_cleanup_candidates(bucket,object_path,reason,expected_size)
  select 'pulses', split_part(p.image_url,'/storage/v1/object/public/pulses/',2), 'expired_pulse', o_size
  from public.pulses p
  left join lateral (
    select (o.metadata->>'size')::bigint as o_size
    from storage.objects o
    where o.bucket_id='pulses'
      and o.name=split_part(p.image_url,'/storage/v1/object/public/pulses/',2)
    limit 1
  ) s on true
  where p.expires_at<=now()
    and p.image_url like '%/storage/v1/object/public/pulses/%'
  on conflict(bucket,object_path) do nothing;

  delete from public.pulses where expires_at<=now();
  get diagnostics pulse_count=row_count;

  insert into public.storage_cleanup_candidates(bucket,object_path,reason,expected_size)
  select 'posts',o.name,'orphan_post_media',(o.metadata->>'size')::bigint
  from storage.objects o
  where o.bucket_id='posts'
    and o.created_at < now()-interval '1 day'
    and not exists(
      select 1 from public.posts p
      where coalesce(p.image_url,'') like '%'||o.name
         or coalesce(p.video_url,'') like '%'||o.name
         or coalesce(p.card_data::text,'') like '%'||o.name
    )
    and not exists(
      select 1 from public.post_media pm
      where coalesce(pm.url,'') like '%'||o.name
         or coalesce(pm.storage_path,'')=o.name
    )
  on conflict(bucket,object_path) do nothing;

  return jsonb_build_object(
    'expired_pulses_deleted',pulse_count,
    'queued_storage_candidates',(select count(*) from public.storage_cleanup_candidates where processed_at is null)
  );
end;
$$;

revoke all on function public.cleanup_expired_transient_data() from public,anon,authenticated;
grant execute on function public.cleanup_expired_transient_data() to service_role;

do $$
declare jid bigint;
begin
  select jobid into jid from cron.job where jobname='geekoplay-transient-cleanup' limit 1;
  if jid is not null then perform cron.unschedule(jid); end if;
end $$;

select cron.schedule(
  'geekoplay-transient-cleanup',
  '25 4 * * *',
  'select public.cleanup_expired_transient_data();'
);
