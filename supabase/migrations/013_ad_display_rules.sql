alter table public.ads
  add column if not exists display_seconds integer not null default 0
  check(display_seconds>=0 and display_seconds<=300);

alter table public.monetization_settings
  add column if not exists ad_navigation_interval integer not null default 3
  check(ad_navigation_interval>=1 and ad_navigation_interval<=100);

alter table public.monetization_settings
  add column if not exists ad_min_interval_minutes integer not null default 30
  check(ad_min_interval_minutes>=0 and ad_min_interval_minutes<=10080);
