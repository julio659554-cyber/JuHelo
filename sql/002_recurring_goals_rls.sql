-- ============================================================
-- JuHelo
-- MIGRATION 002 — recorrências, metas automáticas e RLS compartilhado
-- Rode APÓS sql/001_initial_schema.sql
-- ============================================================

begin;

create table if not exists public.recurring_exceptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  recurring_plan_id uuid not null references public.recurring_plans(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  exception_type text not null default 'skip' check (exception_type in ('skip')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  unique (recurring_plan_id, month)
);

create index if not exists idx_recurring_exceptions_household_month
  on public.recurring_exceptions(household_id, month);

alter table public.recurring_exceptions enable row level security;

drop policy if exists recurring_exceptions_select on public.recurring_exceptions;
create policy recurring_exceptions_select on public.recurring_exceptions for select to authenticated
using (public.is_household_member(household_id));

drop policy if exists recurring_exceptions_insert on public.recurring_exceptions;
create policy recurring_exceptions_insert on public.recurring_exceptions for insert to authenticated
with check (public.is_household_member(household_id) and created_by = auth.uid());

drop policy if exists recurring_exceptions_delete on public.recurring_exceptions;
create policy recurring_exceptions_delete on public.recurring_exceptions for delete to authenticated
using (public.is_household_member(household_id));

grant select, insert, delete on public.recurring_exceptions to authenticated;

create or replace function public.validate_transaction_links()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.box_id is not null and not exists (
    select 1 from public.boxes b where b.id = new.box_id and b.household_id = new.household_id
  ) then
    raise exception 'A caixinha não pertence a este JuHelo.';
  end if;
  if new.recurring_plan_id is not null and not exists (
    select 1 from public.recurring_plans rp where rp.id = new.recurring_plan_id and rp.household_id = new.household_id
  ) then
    raise exception 'O gasto fixo não pertence a este JuHelo.';
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_validate_links on public.transactions;
create trigger transactions_validate_links before insert or update on public.transactions
for each row execute function public.validate_transaction_links();

create or replace function public.validate_goal_box()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.box_id is not null and not exists (
    select 1 from public.boxes b where b.id = new.box_id and b.household_id = new.household_id
  ) then
    raise exception 'A caixinha da meta não pertence a este JuHelo.';
  end if;
  return new;
end;
$$;

drop trigger if exists goals_validate_box on public.goals;
create trigger goals_validate_box before insert or update on public.goals
for each row execute function public.validate_goal_box();

drop policy if exists boxes_all on public.boxes;
drop policy if exists boxes_select_member on public.boxes;
drop policy if exists boxes_insert_member on public.boxes;
drop policy if exists boxes_update_member on public.boxes;
drop policy if exists boxes_delete_member on public.boxes;

create policy boxes_select_member on public.boxes for select to authenticated
using (public.is_household_member(household_id));
create policy boxes_insert_member on public.boxes for insert to authenticated
with check (public.is_household_member(household_id) and created_by = auth.uid());
create policy boxes_update_member on public.boxes for update to authenticated
using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy boxes_delete_member on public.boxes for delete to authenticated
using (public.is_household_member(household_id));

create or replace function public.ensure_recurring_for_month(p_household_id uuid, p_month date)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_household_member(p_household_id) then raise exception 'Sem permissão.'; end if;
  if p_month is null or extract(day from p_month) <> 1 then raise exception 'Mês inválido.'; end if;

  insert into public.transactions(household_id,direction,kind,description,amount,month,recurring_plan_id,created_by)
  select rp.household_id,'expense','recurring',rp.description,rp.amount,p_month,rp.id,auth.uid()
  from public.recurring_plans rp
  where rp.household_id = p_household_id
    and rp.is_active = true
    and rp.start_month <= p_month
    and (rp.end_month is null or rp.end_month >= p_month)
    and not exists (
      select 1 from public.recurring_exceptions re
      where re.recurring_plan_id = rp.id and re.month = p_month and re.exception_type = 'skip'
    )
  on conflict (recurring_plan_id, month) do nothing;

  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.edit_recurring_expense(
  p_transaction_id uuid, p_scope text, p_description text, p_amount numeric
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  tx public.transactions%rowtype;
  plan public.recurring_plans%rowtype;
  new_plan_id uuid;
  old_end date;
  previous_month date;
begin
  select * into tx from public.transactions where id = p_transaction_id;
  if tx.id is null or tx.recurring_plan_id is null then raise exception 'Gasto fixo não encontrado.'; end if;
  if not public.is_household_member(tx.household_id) then raise exception 'Sem permissão.'; end if;
  if p_scope not in ('this_month','future','all') then raise exception 'Escopo inválido.'; end if;
  if coalesce(trim(p_description),'') = '' then raise exception 'Descrição obrigatória.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'O valor precisa ser maior que zero.'; end if;

  select * into plan from public.recurring_plans where id = tx.recurring_plan_id;

  if p_scope = 'this_month' then
    update public.transactions
    set description = trim(p_description), amount = p_amount, updated_by = auth.uid(), updated_at = now()
    where id = tx.id;
    return plan.id;
  end if;

  if p_scope = 'all' then
    update public.recurring_plans set description = trim(p_description), amount = p_amount, updated_at = now()
    where id = plan.id;
    update public.transactions
    set description = trim(p_description), amount = p_amount, updated_by = auth.uid(), updated_at = now()
    where recurring_plan_id = plan.id;
    return plan.id;
  end if;

  if tx.month = plan.start_month then
    update public.recurring_plans set description = trim(p_description), amount = p_amount, updated_at = now()
    where id = plan.id;
    update public.transactions
    set description = trim(p_description), amount = p_amount, updated_by = auth.uid(), updated_at = now()
    where recurring_plan_id = plan.id and month >= tx.month;
    return plan.id;
  end if;

  old_end := plan.end_month;
  previous_month := (tx.month - interval '1 month')::date;
  update public.recurring_plans set end_month = previous_month, updated_at = now() where id = plan.id;
  delete from public.transactions where recurring_plan_id = plan.id and month >= tx.month;
  delete from public.recurring_exceptions where recurring_plan_id = plan.id and month >= tx.month;

  insert into public.recurring_plans(household_id,description,amount,start_month,end_month,is_active,created_by)
  values(plan.household_id,trim(p_description),p_amount,tx.month,old_end,true,auth.uid())
  returning id into new_plan_id;

  perform public.ensure_recurring_for_month(plan.household_id, tx.month);
  return new_plan_id;
end;
$$;

create or replace function public.delete_recurring_expense(p_transaction_id uuid, p_scope text)
returns void language plpgsql security definer set search_path = public as $$
declare
  tx public.transactions%rowtype;
  plan public.recurring_plans%rowtype;
  previous_month date;
begin
  select * into tx from public.transactions where id = p_transaction_id;
  if tx.id is null or tx.recurring_plan_id is null then raise exception 'Gasto fixo não encontrado.'; end if;
  if not public.is_household_member(tx.household_id) then raise exception 'Sem permissão.'; end if;
  if p_scope not in ('this_month','future','all') then raise exception 'Escopo inválido.'; end if;

  select * into plan from public.recurring_plans where id = tx.recurring_plan_id;

  if p_scope = 'this_month' then
    insert into public.recurring_exceptions(household_id,recurring_plan_id,month,exception_type,created_by)
    values(tx.household_id,tx.recurring_plan_id,tx.month,'skip',auth.uid())
    on conflict (recurring_plan_id, month) do update set exception_type = 'skip';
    delete from public.transactions where id = tx.id;
    return;
  end if;

  if p_scope = 'all' then
    delete from public.recurring_plans where id = plan.id;
    return;
  end if;

  if tx.month = plan.start_month then
    delete from public.recurring_plans where id = plan.id;
    return;
  end if;

  previous_month := (tx.month - interval '1 month')::date;
  update public.recurring_plans set end_month = previous_month, updated_at = now() where id = plan.id;
  delete from public.transactions where recurring_plan_id = plan.id and month >= tx.month;
  delete from public.recurring_exceptions where recurring_plan_id = plan.id and month >= tx.month;
end;
$$;

create or replace function public.auto_complete_goals_for_box()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target_box uuid;
  current_balance numeric(14,2);
begin
  if tg_op = 'DELETE' then target_box := old.box_id; else target_box := new.box_id; end if;

  select coalesce(sum(case
    when movement_type in ('deposit','adjustment_in') then amount
    when movement_type in ('withdrawal','adjustment_out') then -amount
    else 0 end),0)::numeric(14,2)
  into current_balance
  from public.box_movements where box_id = target_box;

  update public.goals
  set is_completed = true, completed_at = coalesce(completed_at, now()), updated_at = now()
  where box_id = target_box and auto_complete = true and is_completed = false
    and target_amount is not null and current_balance >= target_amount;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists box_movements_auto_complete_goals on public.box_movements;
create trigger box_movements_auto_complete_goals
after insert or update or delete on public.box_movements
for each row execute function public.auto_complete_goals_for_box();

revoke all on function public.edit_recurring_expense(uuid,text,text,numeric) from public;
revoke all on function public.delete_recurring_expense(uuid,text) from public;
grant execute on function public.edit_recurring_expense(uuid,text,text,numeric) to authenticated;
grant execute on function public.delete_recurring_expense(uuid,text) to authenticated;

commit;
