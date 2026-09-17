drop policy if exists "market update own" on public.market_items;

create policy "market update own or admin" on public.market_items
for update
using (((select auth.uid()) = seller_id) or (select public.is_admin()))
with check (((select auth.uid()) = seller_id) or (select public.is_admin()));
