alter table public.boxes add column if not exists target_date date;
alter table public.goals add column if not exists due_date date;

drop trigger if exists box_movements_auto_complete_goals on public.box_movements;

update public.goals
set box_id = null,
    target_amount = null,
    auto_complete = false
where box_id is not null
   or target_amount is not null
   or auto_complete is distinct from false;
