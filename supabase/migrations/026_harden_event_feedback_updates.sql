drop policy if exists "feedback update own" on public.event_feedback;

create policy "feedback update own after event"
on public.event_feedback
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.event_attendees ea
    where ea.event_id = event_feedback.event_id
      and ea.user_id = auth.uid()
      and ea.status in ('going','confirmed')
  )
  and exists (
    select 1 from public.events e
    where e.id = event_feedback.event_id
      and coalesce(e.ends_at, e.starts_at) <= now()
  )
);

create or replace function public.guard_event_feedback_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'Não é permitido alterar o usuário da avaliação.';
    end if;
    if new.event_id is distinct from old.event_id then
      raise exception 'Não é permitido mover a avaliação para outro evento.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_event_feedback_identity_trigger on public.event_feedback;
create trigger guard_event_feedback_identity_trigger
before update on public.event_feedback
for each row execute function public.guard_event_feedback_identity();
