-- Finalize the simulated transfer after all four serial steps are confirmed.
-- Run after account_activity_transfers.sql.

alter table public.demo_transfer_requests
  add column if not exists recipient_details jsonb,
  add column if not exists reference_code text,
  add column if not exists sent_at timestamptz;

alter table public.demo_transfer_requests
  drop constraint if exists demo_transfer_requests_status_check;
alter table public.demo_transfer_requests
  add constraint demo_transfer_requests_status_check
  check (status in ('preview', 'processing', 'sent'));

alter table public.account_activity
  drop constraint if exists account_activity_event_type_check;
alter table public.account_activity
  add constraint account_activity_event_type_check
  check (event_type in (
    'account_created', 'signed_in', 'signed_out', 'application_submitted',
    'application_status_changed', 'recipient_saved', 'recipient_deleted', 'transfer_previewed', 'transfer_processing',
    'transfer_checkpoint_matched', 'transfer_checkpoint_failed', 'transfer_sent'
  ));

create unique index if not exists demo_transfer_requests_reference_code_idx
  on public.demo_transfer_requests (reference_code)
  where reference_code is not null;

create or replace function public.set_first_demo_serial_display()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.sequence = 1 then
    new.name := 'Payment Authorization Code';
    new.description := 'Simulation-only authorization checkpoint. No fee or payment is required to receive or enter a demo code. Real banks do not ask customers to purchase verification codes.';
  end if;
  return new;
end;
$$;

update public.transfer_demo_serials
  set name = 'Payment Authorization Code',
      description = 'Simulation-only authorization checkpoint. No fee or payment is required to receive or enter a demo code. Real banks do not ask customers to purchase verification codes.'
  where sequence = 1;

create or replace function public.complete_demo_transfer(p_demo_transfer_id uuid)
returns table (reference_code text, sent_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_transfer public.demo_transfer_requests%rowtype;
  confirmed_serial_count integer;
  new_reference text;
  completed_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required.';
  end if;

  select request.*
    into target_transfer
    from public.demo_transfer_requests as request
    where request.id = p_demo_transfer_id
      and request.user_id = auth.uid()
    for update;
  if not found then
    raise exception 'The simulated transfer could not be found for this account.';
  end if;

  if target_transfer.status = 'sent' and target_transfer.reference_code is not null then
    return query select target_transfer.reference_code, target_transfer.sent_at;
    return;
  end if;
  if target_transfer.status <> 'processing' then
    raise exception 'Only a transfer in processing can be marked sent.';
  end if;

  perform serial.id
    from public.transfer_demo_serials as serial
    where serial.application_id = target_transfer.application_id
      and serial.processing_transfer_id = target_transfer.id
      and serial.sequence between 1 and 4
    for update;

  select count(*)
    into confirmed_serial_count
    from public.transfer_demo_serials as serial
    where serial.application_id = target_transfer.application_id
      and serial.processing_transfer_id = target_transfer.id
      and serial.sequence between 1 and 4
      and serial.matched_at is not null;

  if confirmed_serial_count <> 4 then
    raise exception 'All four serial steps must be confirmed before completing this transfer.';
  end if;

  new_reference := 'TR-' || upper(encode(extensions.gen_random_bytes(8), 'hex'));
  completed_at := clock_timestamp();
  update public.demo_transfer_requests as request
    set status = 'sent',
        reference_code = new_reference,
        sent_at = completed_at
    where request.id = target_transfer.id;

  insert into public.account_activity (user_id, event_type, summary)
  values (
    auth.uid(),
    'transfer_sent',
    'A simulated transfer of J$' || to_char(target_transfer.amount, 'FM999999999999990.00') ||
      ' was marked sent. No real funds moved. Reference: ' || new_reference || '.'
  );

  return query select new_reference, completed_at;
end;
$$;

revoke all on function public.complete_demo_transfer(uuid) from public, anon;
grant execute on function public.complete_demo_transfer(uuid) to authenticated;
