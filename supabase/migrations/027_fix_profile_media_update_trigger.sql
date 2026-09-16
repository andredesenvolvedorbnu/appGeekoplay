drop trigger if exists trg_auto_achievements on public.profiles;

-- XP/level achievement synchronization remains covered by trg_sync_achievements_profile.
-- Avatar, cover and other ordinary profile edits do not affect achievement progress,
-- so they must not execute the full achievement synchronization routine.
