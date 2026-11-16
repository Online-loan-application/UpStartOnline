-- Demo previews intentionally do not store recipient details.
-- Run after account_activity_transfers.sql to repair existing installations.

do $$
begin
  if exists (
    select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'demo_transfer_requests'
        and column_name = 'recipient_details'
        and is_nullable = 'NO'
  ) then
    alter table public.demo_transfer_requests
      alter column recipient_details drop not null;
  end if;
end;
$$;
