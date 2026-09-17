-- Prevent regular client sessions from manually running the global Premium lifecycle job.
-- The scheduled pg_cron job continues to execute as the database service user.
revoke execute on function public.process_premium_lifecycle() from anon, authenticated;
