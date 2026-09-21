alter table public.premium_requests
  add column if not exists payment_reference text,
  add column if not exists payment_provider text,
  add column if not exists payment_id text,
  add column if not exists payment_status text,
  add column if not exists payment_updated_at timestamptz;

alter table public.boost_requests
  add column if not exists payment_reference text,
  add column if not exists payment_provider text,
  add column if not exists payment_id text,
  add column if not exists payment_status text,
  add column if not exists payment_updated_at timestamptz;

create index if not exists premium_requests_payment_id_idx
  on public.premium_requests(payment_id)
  where payment_id is not null;

create index if not exists boost_requests_payment_id_idx
  on public.boost_requests(payment_id)
  where payment_id is not null;