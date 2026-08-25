-- JuHelo — Migration 005
-- Corrige bancos em que recurring_exceptions foi criada antes da coluna exception_type.

begin;

alter table public.recurring_exceptions
  add column if not exists exception_type text;

update public.recurring_exceptions
set exception_type = 'skip'
where exception_type is null;

alter table public.recurring_exceptions
  alter column exception_type set default 'skip',
  alter column exception_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recurring_exceptions_type_check'
      and conrelid = 'public.recurring_exceptions'::regclass
  ) then
    alter table public.recurring_exceptions
      add constraint recurring_exceptions_type_check
      check (exception_type in ('skip'));
  end if;
end $$;

commit;
