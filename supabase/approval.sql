-- Run after schema.sql and admin.sql to support approved loan balances and admin decisions.
alter table public.loan_applications
  add column if not exists approved_amount numeric(12, 2);

alter table public.loan_applications
  drop constraint if exists loan_applications_approved_amount_check;

alter table public.loan_applications
  add constraint loan_applications_approved_amount_check
  check (approved_amount is null or approved_amount between 0.01 and amount);

revoke update on table public.loan_applications from authenticated;
grant update (status, approved_amount) on table public.loan_applications to authenticated;

drop policy if exists "Admins can update application decisions" on public.loan_applications;
create policy "Admins can update application decisions"
  on public.loan_applications
  for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
