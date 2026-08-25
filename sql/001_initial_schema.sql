begin;
create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'JuHelo',
  currency text not null default 'BRL',
  invite_code text not null unique default upper(encode(gen_random_bytes(6),'hex')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'member' check(role in('owner','member')),
  joined_at timestamptz not null default now(),
  unique(household_id,user_id)
);

create table if not exists public.boxes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) check(target_amount is null or target_amount>0),
  icon text,
  is_archived boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recurring_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  description text not null,
  amount numeric(14,2) not null check(amount>0),
  start_month date not null check(extract(day from start_month)=1),
  end_month date check(end_month is null or extract(day from end_month)=1),
  is_active boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(end_month is null or end_month>=start_month)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  direction text not null check(direction in('income','expense')),
  kind text not null default 'regular' check(kind in('regular','recurring','box_contribution')),
  description text not null,
  amount numeric(14,2) not null check(amount>0),
  month date not null check(extract(day from month)=1),
  box_id uuid references public.boxes(id) on delete restrict,
  recurring_plan_id uuid references public.recurring_plans(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(recurring_plan_id,month),
  check(kind<>'box_contribution' or(direction='expense' and box_id is not null)),
  check(kind<>'recurring' or(direction='expense' and recurring_plan_id is not null))
);

create table if not exists public.box_movements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  box_id uuid not null references public.boxes(id) on delete cascade,
  movement_type text not null check(movement_type in('deposit','withdrawal','adjustment_in','adjustment_out')),
  amount numeric(14,2) not null check(amount>0),
  month date not null check(extract(day from month)=1),
  description text,
  linked_transaction_id uuid unique references public.transactions(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  notes text,
  box_id uuid references public.boxes(id) on delete set null,
  target_amount numeric(14,2) check(target_amount is null or target_amount>0),
  auto_complete boolean not null default true,
  is_completed boolean not null default false,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,display_name,avatar_url) values(new.id,coalesce(new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'full_name'),new.raw_user_meta_data->>'avatar_url') on conflict(id) do nothing;
 return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_household_member(p_household_id uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.household_members where household_id=p_household_id and user_id=auth.uid())
$$;

create or replace function public.shares_household(p_user_id uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.household_members a join public.household_members b on a.household_id=b.household_id where a.user_id=auth.uid() and b.user_id=p_user_id)
$$;

create or replace function public.limit_household_members() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if (select count(*) from public.household_members where household_id=new.household_id)>=2 then raise exception 'Este JuHelo já possui dois membros.'; end if;
 return new;
end $$;
drop trigger if exists household_members_limit on public.household_members;
create trigger household_members_limit before insert on public.household_members for each row execute function public.limit_household_members();

create or replace function public.create_household(p_name text default 'JuHelo') returns uuid language plpgsql security definer set search_path=public as $$
declare hid uuid;
begin
 if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;
 if exists(select 1 from public.household_members where user_id=auth.uid()) then raise exception 'Esta conta já pertence a um JuHelo.'; end if;
 insert into public.households(name,created_by) values(coalesce(nullif(trim(p_name),''),'JuHelo'),auth.uid()) returning id into hid;
 insert into public.household_members(household_id,user_id,role) values(hid,auth.uid(),'owner');
 return hid;
end $$;

create or replace function public.join_household(p_invite_code text) returns uuid language plpgsql security definer set search_path=public as $$
declare hid uuid;
begin
 if auth.uid() is null then raise exception 'Usuário não autenticado.'; end if;
 if exists(select 1 from public.household_members where user_id=auth.uid()) then raise exception 'Esta conta já pertence a um JuHelo.'; end if;
 select id into hid from public.households where invite_code=upper(trim(p_invite_code)) limit 1;
 if hid is null then raise exception 'Código de convite inválido.'; end if;
 perform pg_advisory_xact_lock(hashtext(hid::text));
 if (select count(*) from public.household_members where household_id=hid)>=2 then raise exception 'Este JuHelo já possui dois membros.'; end if;
 insert into public.household_members(household_id,user_id,role) values(hid,auth.uid(),'member');
 return hid;
end $$;

create or replace function public.ensure_recurring_for_month(p_household_id uuid,p_month date) returns integer language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 if not public.is_household_member(p_household_id) then raise exception 'Sem permissão.'; end if;
 insert into public.transactions(household_id,direction,kind,description,amount,month,recurring_plan_id,created_by)
 select household_id,'expense','recurring',description,amount,p_month,id,auth.uid() from public.recurring_plans
 where household_id=p_household_id and is_active=true and start_month<=p_month and(end_month is null or end_month>=p_month)
 on conflict(recurring_plan_id,month) do nothing;
 get diagnostics n=row_count; return n;
end $$;

create or replace function public.create_recurring_expense(p_household_id uuid,p_description text,p_amount numeric,p_start_month date,p_end_month date default null) returns uuid language plpgsql security definer set search_path=public as $$
declare rid uuid;
begin
 if not public.is_household_member(p_household_id) then raise exception 'Sem permissão.'; end if;
 insert into public.recurring_plans(household_id,description,amount,start_month,end_month,created_by) values(p_household_id,trim(p_description),p_amount,p_start_month,p_end_month,auth.uid()) returning id into rid;
 perform public.ensure_recurring_for_month(p_household_id,p_start_month); return rid;
end $$;

create or replace function public.sync_box_deposit() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='DELETE' then delete from public.box_movements where linked_transaction_id=old.id; return old; end if;
 if tg_op='UPDATE' and old.kind='box_contribution' and new.kind<>'box_contribution' then delete from public.box_movements where linked_transaction_id=old.id; end if;
 if new.kind='box_contribution' then
  insert into public.box_movements(household_id,box_id,movement_type,amount,month,description,linked_transaction_id,created_by)
  values(new.household_id,new.box_id,'deposit',new.amount,new.month,new.description,new.id,new.created_by)
  on conflict(linked_transaction_id) do update set box_id=excluded.box_id,amount=excluded.amount,month=excluded.month,description=excluded.description,updated_at=now();
 end if;
 return new;
end $$;
drop trigger if exists transactions_sync_box on public.transactions;
create trigger transactions_sync_box after insert or update or delete on public.transactions for each row execute function public.sync_box_deposit();

create or replace function public.add_box_contribution(p_box_id uuid,p_amount numeric,p_month date,p_description text default null) returns uuid language plpgsql security definer set search_path=public as $$
declare b public.boxes%rowtype; tid uuid;
begin
 select * into b from public.boxes where id=p_box_id; if b.id is null or not public.is_household_member(b.household_id) then raise exception 'Sem permissão.'; end if;
 insert into public.transactions(household_id,direction,kind,description,amount,month,box_id,created_by) values(b.household_id,'expense','box_contribution',coalesce(nullif(trim(p_description),''),'Caixinha '||b.name),p_amount,p_month,p_box_id,auth.uid()) returning id into tid;
 return tid;
end $$;

create or replace function public.withdraw_from_box(p_box_id uuid,p_amount numeric,p_month date,p_description text default null) returns uuid language plpgsql security definer set search_path=public as $$
declare b public.boxes%rowtype; bal numeric; mid uuid;
begin
 select * into b from public.boxes where id=p_box_id; if b.id is null or not public.is_household_member(b.household_id) then raise exception 'Sem permissão.'; end if;
 select coalesce(sum(case when movement_type in('deposit','adjustment_in') then amount else -amount end),0) into bal from public.box_movements where box_id=p_box_id;
 if p_amount>bal then raise exception 'Saldo insuficiente na caixinha.'; end if;
 insert into public.box_movements(household_id,box_id,movement_type,amount,month,description,created_by) values(b.household_id,p_box_id,'withdrawal',p_amount,p_month,coalesce(nullif(trim(p_description),''),'Retirada da caixinha'),auth.uid()) returning id into mid;
 return mid;
end $$;

create or replace view public.monthly_summary with(security_invoker=true) as
select household_id,month,
 coalesce(sum(amount) filter(where direction='income'),0)::numeric(14,2) total_income,
 coalesce(sum(amount) filter(where direction='expense'),0)::numeric(14,2) total_expense,
 (coalesce(sum(amount) filter(where direction='income'),0)-coalesce(sum(amount) filter(where direction='expense'),0))::numeric(14,2) month_result
from public.transactions group by household_id,month;

create or replace view public.box_balances with(security_invoker=true) as
select b.id box_id,b.household_id,b.name,b.target_amount,b.icon,b.is_archived,
 coalesce(sum(case when m.movement_type in('deposit','adjustment_in') then m.amount else -m.amount end),0)::numeric(14,2) balance
from public.boxes b left join public.box_movements m on m.box_id=b.id group by b.id;

create index if not exists idx_transactions_household_month on public.transactions(household_id,month);
create index if not exists idx_boxes_household on public.boxes(household_id);
create index if not exists idx_goals_household on public.goals(household_id);
create index if not exists idx_recurring_household on public.recurring_plans(household_id);

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.boxes enable row level security;
alter table public.recurring_plans enable row level security;
alter table public.transactions enable row level security;
alter table public.box_movements enable row level security;
alter table public.goals enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using(id=auth.uid() or public.shares_household(id));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
drop policy if exists households_select on public.households;
create policy households_select on public.households for select to authenticated using(public.is_household_member(id));
drop policy if exists households_update on public.households;
create policy households_update on public.households for update to authenticated using(public.is_household_member(id)) with check(public.is_household_member(id));
drop policy if exists members_select on public.household_members;
create policy members_select on public.household_members for select to authenticated using(public.is_household_member(household_id));
drop policy if exists boxes_all on public.boxes;
create policy boxes_all on public.boxes for all to authenticated using(public.is_household_member(household_id)) with check(public.is_household_member(household_id) and created_by=auth.uid());
drop policy if exists recurring_all on public.recurring_plans;
create policy recurring_all on public.recurring_plans for all to authenticated using(public.is_household_member(household_id)) with check(public.is_household_member(household_id));
drop policy if exists transactions_all on public.transactions;
create policy transactions_all on public.transactions for all to authenticated using(public.is_household_member(household_id)) with check(public.is_household_member(household_id));
drop policy if exists goals_all on public.goals;
create policy goals_all on public.goals for all to authenticated using(public.is_household_member(household_id)) with check(public.is_household_member(household_id));
drop policy if exists box_movements_select on public.box_movements;
create policy box_movements_select on public.box_movements for select to authenticated using(public.is_household_member(household_id));

grant select,update on public.profiles to authenticated;
grant select,update on public.households to authenticated;
grant select on public.household_members to authenticated;
grant select,insert,update,delete on public.boxes,public.recurring_plans,public.transactions,public.goals to authenticated;
grant select on public.box_movements,public.monthly_summary,public.box_balances to authenticated;
grant execute on function public.create_household(text),public.join_household(text),public.ensure_recurring_for_month(uuid,date),public.create_recurring_expense(uuid,text,numeric,date,date),public.add_box_contribution(uuid,numeric,date,text),public.withdraw_from_box(uuid,numeric,date,text) to authenticated;

commit;
