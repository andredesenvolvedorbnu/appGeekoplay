create table if not exists public.premium_benefits (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.premium_benefits enable row level security;

drop policy if exists premium_benefits_read on public.premium_benefits;
create policy premium_benefits_read on public.premium_benefits
for select to authenticated
using (is_active = true or is_admin());

drop policy if exists premium_benefits_admin_all on public.premium_benefits;
create policy premium_benefits_admin_all on public.premium_benefits
for all to authenticated
using (is_admin())
with check (is_admin());

insert into public.premium_benefits(title,is_active,sort_order)
select 'Selo PRO visível no perfil',true,1
where not exists (select 1 from public.premium_benefits where title='Selo PRO visível no perfil');
insert into public.premium_benefits(title,is_active,sort_order)
select 'Destaque de identidade dentro da comunidade',true,2
where not exists (select 1 from public.premium_benefits where title='Destaque de identidade dentro da comunidade');
insert into public.premium_benefits(title,is_active,sort_order)
select 'Experiência sem anúncios enquanto a regra estiver ativa',true,3
where not exists (select 1 from public.premium_benefits where title='Experiência sem anúncios enquanto a regra estiver ativa');
insert into public.premium_benefits(title,is_active,sort_order)
select 'Acesso a vantagens e recursos Premium futuros',true,4
where not exists (select 1 from public.premium_benefits where title='Acesso a vantagens e recursos Premium futuros');
