-- Return processing demo transfers to previews when an admin resets serials.
-- Run after transfer_demo_serials.sql and account_activity_transfers.sql.

create or replace function public.admin_reset_transfer_demo_serials_and_restart(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Admin access required.';
  end if;

  update public.transfer_demo_serials
    set code_hash = null,
        code_value = null,
        amount = 0,
        matched_at = null,
        unlock_at = null,
        processing_transfer_id = null
    where application_id = p_application_id;

  if not found then
    raise exception 'No demo serials were found for the selected application.';
  end if;

  update public.demo_transfer_requests
    set status = 'preview',
        processing_at = null
    where application_id = p_application_id
      and status = 'processing';
end;
$$;

revoke all on function public.admin_reset_transfer_demo_serials_and_restart(uuid) from public, anon;
grant execute on function public.admin_reset_transfer_demo_serials_and_restart(uuid) to authenticated;
