-- Authenticated members must be able to read profile rows.
-- RLS remains authoritative for which rows are visible.
grant select on table public.profiles to authenticated;
