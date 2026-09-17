-- Keep the newer automatic achievement triggers and remove older duplicates
-- that caused the same expensive achievement sync to run twice per action.
drop trigger if exists trg_sync_achievements on public.posts;
drop trigger if exists trg_sync_achievements on public.comments;
drop trigger if exists trg_sync_achievements on public.event_attendees;
drop trigger if exists trg_sync_achievements on public.event_feedback;
drop trigger if exists trg_sync_achievements on public.community_members;
drop trigger if exists trg_sync_achievements on public.collection_items;
drop trigger if exists trg_sync_achievements on public.follows;
drop trigger if exists trg_sync_achievements on public.likes;
