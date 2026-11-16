-- Run after schema.sql, admin.sql, and approval.sql.
-- An approved loan's balance is always its full requested loan amount.
create or replace function public.sync_approved_loan_amount()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'approved' then
    new.approved_amount := new.amount;
  else
    new.approved_amount := null;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_approved_loan_amount on public.loan_applications;
create trigger sync_approved_loan_amount
  before insert or update of status, amount, approved_amount
  on public.loan_applications
  for each row
  execute function public.sync_approved_loan_amount();

update public.loan_applications
set status = status;

alter table public.loan_applications
  drop constraint if exists loan_applications_approved_amount_matches_status;

alter table public.loan_applications
  add constraint loan_applications_approved_amount_matches_status
  check (
    (status = 'approved' and approved_amount = amount)
    or (status <> 'approved' and approved_amount is null)
  );
