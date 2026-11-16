-- Allow admins to delete an application and its application-linked records.
-- The applicant's Supabase Auth account and account activity are not deleted.

create or replace function public.admin_delete_loan_application(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
    or (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception using errcode = '42501', message = 'Admin access required.';
  end if;

  delete from public.loan_applications
    where id = p_application_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Loan application not found.';
  end if;
end;
$$;

revoke all on function public.admin_delete_loan_application(uuid) from public, anon;
grant execute on function public.admin_delete_loan_application(uuid) to authenticated;
