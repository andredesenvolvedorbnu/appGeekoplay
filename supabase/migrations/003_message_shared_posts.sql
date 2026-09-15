alter table public.messages
  add column if not exists shared_post_id uuid references public.posts(id) on delete set null;

create index if not exists messages_shared_post_id_idx
  on public.messages(shared_post_id)
  where shared_post_id is not null;
