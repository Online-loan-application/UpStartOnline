-- Run after schema.sql to grant read-only application access to server-managed admins.
-- Set app_metadata.role = 'admin' using a trusted Supabase admin interface.
-- Never grant this role from browser code or user-editable user_metadata.

grant select on table public.loan_applications to authenticated;

drop policy if exists "Admins can read all applications" on public.loan_applications;
create policy "Admins can read all applications"
  on public.loan_applications
  for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
