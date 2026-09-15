-- GeekoPlay - schema inicial independente do Base44
-- Execute esta migration no Supabase SQL Editor ou via Supabase CLI.

create extension if not exists pgcrypto;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  username text unique,
  display_name text not null default 'Novo Geek',
  bio text,
  avatar_url text,
  cover_url text,
  city text,
  favorite_categories text[] not null default '{}',
  role text not null default 'user' check (role in ('user','admin','moderator')),
  is_pro boolean not null default false,
  xp integer not null default 0,
  level integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  image_url text,
  video_url text,
  category text,
  post_type text not null default 'post' check (post_type in ('post','card','event_share','recap')),
  card_data jsonb,
  is_boosted boolean not null default false,
  boosted_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text unique not null,
  description text,
  category text,
  cover_url text,
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('member','moderator','owner')),
  joined_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  category text,
  cover_url text,
  venue_name text,
  address text,
  city text,
  state text,
  is_online boolean not null default false,
  external_url text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_attendees (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'going' check (status in ('going','interested','not_going')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.pulses (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  caption text,
  fandom text,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

create table if not exists public.collection_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  image_url text,
  category text,
  item_type text,
  status text not null default 'owned' check (status in ('owned','wanted','trade')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  image_url text,
  source_name text,
  source_url text not null,
  category text,
  published_at timestamptz,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  cta_label text,
  cta_url text,
  ad_type text not null default 'promotion' check (ad_type in ('promotion','store','event','sponsored_post')),
  placement text not null default 'bottom_sheet' check (placement in ('bottom_sheet','banner','feed')),
  audience text not null default 'all' check (audience in ('all','non_pro','pro')),
  navigation_interval integer not null default 3 check (navigation_interval > 0),
  cooldown_minutes integer not null default 30 check (cooldown_minutes >= 0),
  max_impressions_per_user_day integer not null default 1 check (max_impressions_per_user_day > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.ad_events (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.ads(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('impression','click')),
  created_at timestamptz not null default now()
);

create table if not exists public.market_items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  image_urls text[] not null default '{}',
  price numeric(12,2) not null check (price >= 0),
  category text,
  item_condition text,
  city text,
  state text,
  whatsapp text,
  instagram text,
  status text not null default 'available' check (status in ('available','reserved','sold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  age_range text,
  city text,
  occupation text,
  income_range text,
  interests text[] not null default '{}',
  main_interest text,
  monthly_geek_spend text,
  first_time boolean,
  discovery_channel text,
  reason text,
  came_with text,
  time_at_event text,
  areas_visited text[] not null default '{}',
  longest_area text,
  event_spend text,
  spend_categories text[] not null default '{}',
  from_other_city boolean,
  nights integer,
  score integer check (score between 0 and 10),
  would_return boolean,
  improvement text,
  created_at timestamptz not null default now(),
  unique(event_id, user_id)
);

create table if not exists public.recaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  year integer not null,
  semester integer not null check (semester in (1,2)),
  media_urls text[] not null default '{}',
  stats jsonb not null default '{}'::jsonb,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, year, semester)
);

create table if not exists public.achievement_definitions (
  id text primary key,
  name text not null,
  description text not null,
  category text not null,
  icon text,
  target integer not null default 1
);

create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievement_definitions(id) on delete cascade,
  progress integer not null default 0,
  unlocked_at timestamptz,
  primary key (user_id, achievement_id)
);

-- Índices
create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_author_idx on public.posts(author_id, created_at desc);
create index if not exists posts_category_idx on public.posts(category, created_at desc);
create index if not exists messages_pair_idx on public.messages(sender_id, recipient_id, created_at desc);
create index if not exists notifications_user_idx on public.notifications(user_id, is_read, created_at desc);
create index if not exists events_starts_at_idx on public.events(starts_at);
create index if not exists market_status_idx on public.market_items(status, created_at desc);
create index if not exists news_category_idx on public.news(category, published_at desc);

-- Novo usuário => perfil automático. Os e-mails abaixo já nascem como administradores.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, display_name, role)
  values (
    new.id,
    new.email,
    null,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'geek'), '@', 1)),
    case when lower(coalesce(new.email,'')) in ('andresantos.deco@gmail.com','ingressoblu@gmail.com') then 'admin' else 'user' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- XP automático
create or replace function public.add_xp(target_user uuid, amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set xp = greatest(0, xp + amount),
      level = least(10, greatest(1, 1 + floor((greatest(0, xp + amount))::numeric / 500)::int)),
      updated_at = now()
  where id = target_user;
end;
$$;

create or replace function public.xp_from_post() returns trigger language plpgsql security definer set search_path=public as $$ begin perform public.add_xp(new.author_id,20); return new; end; $$;
create or replace function public.xp_from_comment() returns trigger language plpgsql security definer set search_path=public as $$ begin perform public.add_xp(new.author_id,10); return new; end; $$;
create or replace function public.xp_from_like() returns trigger language plpgsql security definer set search_path=public as $$ begin perform public.add_xp(new.user_id,2); return new; end; $$;
create or replace function public.xp_from_event() returns trigger language plpgsql security definer set search_path=public as $$ begin perform public.add_xp(new.user_id,15); return new; end; $$;

drop trigger if exists trg_xp_post on public.posts; create trigger trg_xp_post after insert on public.posts for each row execute procedure public.xp_from_post();
drop trigger if exists trg_xp_comment on public.comments; create trigger trg_xp_comment after insert on public.comments for each row execute procedure public.xp_from_comment();
drop trigger if exists trg_xp_like on public.likes; create trigger trg_xp_like after insert on public.likes for each row execute procedure public.xp_from_like();
drop trigger if exists trg_xp_event on public.event_attendees; create trigger trg_xp_event after insert on public.event_attendees for each row execute procedure public.xp_from_event();

-- Notificações automáticas
create or replace function public.notify_like() returns trigger language plpgsql security definer set search_path=public as $$
declare owner_id uuid; begin
  select author_id into owner_id from public.posts where id = new.post_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications(user_id,actor_id,type,title,entity_type,entity_id)
    values(owner_id,new.user_id,'like','Alguém curtiu seu post','post',new.post_id);
  end if;
  return new;
end; $$;

create or replace function public.notify_comment() returns trigger language plpgsql security definer set search_path=public as $$
declare owner_id uuid; begin
  select author_id into owner_id from public.posts where id = new.post_id;
  if owner_id is not null and owner_id <> new.author_id then
    insert into public.notifications(user_id,actor_id,type,title,body,entity_type,entity_id)
    values(owner_id,new.author_id,'comment','Novo comentário',left(new.content,120),'post',new.post_id);
  end if;
  return new;
end; $$;

create or replace function public.notify_follow() returns trigger language plpgsql security definer set search_path=public as $$ begin
  insert into public.notifications(user_id,actor_id,type,title,entity_type,entity_id)
  values(new.following_id,new.follower_id,'follow','Alguém começou a seguir você','profile',new.follower_id);
  return new;
end; $$;

create or replace function public.notify_message() returns trigger language plpgsql security definer set search_path=public as $$ begin
  insert into public.notifications(user_id,actor_id,type,title,body,entity_type,entity_id)
  values(new.recipient_id,new.sender_id,'message','Nova mensagem',left(new.body,120),'message',new.id);
  return new;
end; $$;

drop trigger if exists trg_notify_like on public.likes; create trigger trg_notify_like after insert on public.likes for each row execute procedure public.notify_like();
drop trigger if exists trg_notify_comment on public.comments; create trigger trg_notify_comment after insert on public.comments for each row execute procedure public.notify_comment();
drop trigger if exists trg_notify_follow on public.follows; create trigger trg_notify_follow after insert on public.follows for each row execute procedure public.notify_follow();
drop trigger if exists trg_notify_message on public.messages; create trigger trg_notify_message after insert on public.messages for each row execute procedure public.notify_message();

-- RLS
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.events enable row level security;
alter table public.event_attendees enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.pulses enable row level security;
alter table public.collection_items enable row level security;
alter table public.news enable row level security;
alter table public.ads enable row level security;
alter table public.ad_events enable row level security;
alter table public.market_items enable row level security;
alter table public.event_feedback enable row level security;
alter table public.recaps enable row level security;
alter table public.achievement_definitions enable row level security;
alter table public.user_achievements enable row level security;

create policy "profiles public read" on public.profiles for select using (true);
create policy "profiles own update" on public.profiles for update using (auth.uid() = id or public.is_admin()) with check (auth.uid() = id or public.is_admin());

create policy "posts public read" on public.posts for select using (true);
create policy "posts own insert" on public.posts for insert with check (auth.uid() = author_id);
create policy "posts own update" on public.posts for update using (auth.uid() = author_id or public.is_admin()) with check (auth.uid() = author_id or public.is_admin());
create policy "posts own delete" on public.posts for delete using (auth.uid() = author_id or public.is_admin());

create policy "likes public read" on public.likes for select using (true);
create policy "likes own insert" on public.likes for insert with check (auth.uid() = user_id);
create policy "likes own delete" on public.likes for delete using (auth.uid() = user_id);

create policy "comments public read" on public.comments for select using (true);
create policy "comments own insert" on public.comments for insert with check (auth.uid() = author_id);
create policy "comments own update" on public.comments for update using (auth.uid() = author_id or public.is_admin());
create policy "comments own delete" on public.comments for delete using (auth.uid() = author_id or public.is_admin());

create policy "follows public read" on public.follows for select using (true);
create policy "follows own insert" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows own delete" on public.follows for delete using (auth.uid() = follower_id);

create policy "communities public read" on public.communities for select using (visibility='public' or owner_id=auth.uid() or public.is_admin());
create policy "communities create" on public.communities for insert with check (auth.uid() = owner_id);
create policy "communities owner write" on public.communities for update using (auth.uid()=owner_id or public.is_admin());
create policy "communities owner delete" on public.communities for delete using (auth.uid()=owner_id or public.is_admin());
create policy "community members read" on public.community_members for select using (true);
create policy "community members self join" on public.community_members for insert with check (auth.uid()=user_id);
create policy "community members self leave" on public.community_members for delete using (auth.uid()=user_id or public.is_admin());

create policy "events public read" on public.events for select using (true);
create policy "events admin insert" on public.events for insert with check (public.is_admin() and auth.uid()=created_by);
create policy "events admin update" on public.events for update using (public.is_admin());
create policy "events admin delete" on public.events for delete using (public.is_admin());
create policy "attendees public read" on public.event_attendees for select using (true);
create policy "attendees own insert" on public.event_attendees for insert with check (auth.uid()=user_id);
create policy "attendees own update" on public.event_attendees for update using (auth.uid()=user_id);
create policy "attendees own delete" on public.event_attendees for delete using (auth.uid()=user_id);

create policy "messages participants read" on public.messages for select using (auth.uid()=sender_id or auth.uid()=recipient_id);
create policy "messages sender insert" on public.messages for insert with check (auth.uid()=sender_id);
create policy "messages participants update" on public.messages for update using (auth.uid()=recipient_id or auth.uid()=sender_id);

create policy "notifications recipient read" on public.notifications for select using (auth.uid()=user_id);
create policy "notifications recipient update" on public.notifications for update using (auth.uid()=user_id);

create policy "pulses active read" on public.pulses for select using (expires_at > now());
create policy "pulses own insert" on public.pulses for insert with check (auth.uid()=author_id);
create policy "pulses own delete" on public.pulses for delete using (auth.uid()=author_id or public.is_admin());

create policy "collection public read" on public.collection_items for select using (true);
create policy "collection own insert" on public.collection_items for insert with check (auth.uid()=owner_id);
create policy "collection own update" on public.collection_items for update using (auth.uid()=owner_id);
create policy "collection own delete" on public.collection_items for delete using (auth.uid()=owner_id);

create policy "news public read" on public.news for select using (active=true or public.is_admin());
create policy "news admin insert" on public.news for insert with check (public.is_admin());
create policy "news admin update" on public.news for update using (public.is_admin());
create policy "news admin delete" on public.news for delete using (public.is_admin());

create policy "ads public read" on public.ads for select using (active=true or public.is_admin());
create policy "ads admin insert" on public.ads for insert with check (public.is_admin());
create policy "ads admin update" on public.ads for update using (public.is_admin());
create policy "ads admin delete" on public.ads for delete using (public.is_admin());
create policy "ad events insert" on public.ad_events for insert with check (auth.uid()=user_id or user_id is null);
create policy "ad events admin read" on public.ad_events for select using (public.is_admin());

create policy "market public read" on public.market_items for select using (true);
create policy "market own insert" on public.market_items for insert with check (auth.uid()=seller_id);
create policy "market own update" on public.market_items for update using (auth.uid()=seller_id or public.is_admin());
create policy "market own delete" on public.market_items for delete using (auth.uid()=seller_id or public.is_admin());

create policy "feedback own insert" on public.event_feedback for insert with check (auth.uid()=user_id);
create policy "feedback own read" on public.event_feedback for select using (auth.uid()=user_id or public.is_admin());
create policy "feedback admin delete" on public.event_feedback for delete using (public.is_admin());

create policy "recaps public read" on public.recaps for select using (true);
create policy "recaps own insert" on public.recaps for insert with check (auth.uid()=user_id);
create policy "recaps own update" on public.recaps for update using (auth.uid()=user_id);
create policy "recaps own delete" on public.recaps for delete using (auth.uid()=user_id);

create policy "achievements definitions read" on public.achievement_definitions for select using (true);
create policy "achievements admin write" on public.achievement_definitions for all using (public.is_admin()) with check (public.is_admin());
create policy "user achievements public read" on public.user_achievements for select using (true);
create policy "user achievements own write" on public.user_achievements for all using (auth.uid()=user_id or public.is_admin()) with check (auth.uid()=user_id or public.is_admin());

-- Storage buckets públicos para mídia social. O acesso de upload continua restrito a usuários autenticados.
insert into storage.buckets (id,name,public) values
  ('avatars','avatars',true),
  ('covers','covers',true),
  ('posts','posts',true),
  ('cards','cards',true),
  ('events','events',true),
  ('market','market',true)
on conflict (id) do nothing;

create policy "authenticated media upload" on storage.objects for insert to authenticated with check (bucket_id in ('avatars','covers','posts','cards','events','market'));
create policy "public media read" on storage.objects for select using (bucket_id in ('avatars','covers','posts','cards','events','market'));
create policy "owner media update" on storage.objects for update to authenticated using (owner_id = auth.uid()::text or public.is_admin());
create policy "owner media delete" on storage.objects for delete to authenticated using (owner_id = auth.uid()::text or public.is_admin());

-- Realtime para recursos que precisam atualização instantânea.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.posts;

-- Conquistas iniciais
insert into public.achievement_definitions(id,name,description,category,icon,target) values
('first_post','Primeiro Post','Publique seu primeiro conteúdo.','conteudo','✍️',1),
('social_10','Sociável','Receba 10 interações em suas publicações.','social','🤝',10),
('event_1','Eu Estava Lá','Confirme presença em um evento.','eventos','🎟️',1),
('event_10','Caçador de Eventos','Participe de 10 eventos.','eventos','🏆',10),
('community_5','Comunitário','Entre em 5 comunidades.','comunidade','💬',5),
('level_10','Deus Geek','Alcance o nível 10.','lendas','👑',10)
on conflict (id) do nothing;
