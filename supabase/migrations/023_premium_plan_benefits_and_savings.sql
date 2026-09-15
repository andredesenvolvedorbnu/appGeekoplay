alter table public.premium_plans add column if not exists billing_months integer;
update public.premium_plans set billing_months = case lower(name) when 'trimestral' then 3 when 'semestral' then 6 when 'anual' then 12 else greatest(1, round(duration_days/30.0)::integer) end where billing_months is null;
alter table public.premium_plans alter column billing_months set not null;

alter table public.premium_benefits add column if not exists description text;

create table if not exists public.premium_plan_benefits (
  plan_id uuid not null references public.premium_plans(id) on delete cascade,
  benefit_id uuid not null references public.premium_benefits(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (plan_id, benefit_id)
);

alter table public.premium_plan_benefits enable row level security;

drop policy if exists premium_plan_benefits_read on public.premium_plan_benefits;
create policy premium_plan_benefits_read on public.premium_plan_benefits for select to authenticated using (true);

drop policy if exists premium_plan_benefits_admin_all on public.premium_plan_benefits;
create policy premium_plan_benefits_admin_all on public.premium_plan_benefits for all to authenticated using (is_admin()) with check (is_admin());

update public.premium_benefits set description = case title
 when 'Selo PRO visível no perfil' then 'Identificação PRO no perfil do Geek.'
 when 'Destaque de identidade dentro da comunidade' then 'Mais destaque visual para a identidade PRO.'
 when 'Experiência sem anúncios enquanto a regra estiver ativa' then 'Sem anúncios enquanto a configuração PRO estiver habilitada.'
 when 'Acesso a vantagens e recursos Premium futuros' then 'Acesso às vantagens PRO liberadas pela plataforma.'
 else description end
where description is null;

insert into public.premium_benefits(title,description,is_active,sort_order)
select 'Economia maior no período','Valor proporcional menor do que manter renovações trimestrais.',true,50
where not exists (select 1 from public.premium_benefits where title='Economia maior no período');

insert into public.premium_benefits(title,description,is_active,sort_order)
select 'Maior economia entre os planos PRO','Melhor custo proporcional entre os planos disponíveis.',true,60
where not exists (select 1 from public.premium_benefits where title='Maior economia entre os planos PRO');

insert into public.premium_plan_benefits(plan_id,benefit_id,sort_order)
select p.id,b.id,b.sort_order
from public.premium_plans p cross join public.premium_benefits b
where b.title in ('Selo PRO visível no perfil','Destaque de identidade dentro da comunidade','Experiência sem anúncios enquanto a regra estiver ativa','Acesso a vantagens e recursos Premium futuros')
on conflict do nothing;

insert into public.premium_plan_benefits(plan_id,benefit_id,sort_order)
select p.id,b.id,b.sort_order
from public.premium_plans p cross join public.premium_benefits b
where lower(p.name) in ('semestral','anual') and b.title='Economia maior no período'
on conflict do nothing;

insert into public.premium_plan_benefits(plan_id,benefit_id,sort_order)
select p.id,b.id,b.sort_order
from public.premium_plans p cross join public.premium_benefits b
where lower(p.name)='anual' and b.title='Maior economia entre os planos PRO'
on conflict do nothing;
