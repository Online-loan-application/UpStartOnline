-- Saved recipients, account activity, and simulated transfer reservations.
-- Run after schema.sql, admin.sql, approval.sql, approved_balance.sql,
-- and transfer_demo_serials.sql.

create table if not exists public.saved_transfer_recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('local-bank', 'cash-app', 'paypal', 'other')),
  label text not null check (length(trim(label)) between 1 and 100),
  recipient_details jsonb not null check (
    jsonb_typeof(recipient_details) = 'object'
    and pg_catalog.octet_length(recipient_details::text) <= 5000
  ),
  created_at timestamptz not null default now()
);

alter table public.saved_transfer_recipients enable row level security;
revoke all on public.saved_transfer_recipients from anon, authenticated;
grant select, insert, delete on public.saved_transfer_recipients to authenticated;

drop policy if exists "Users manage their saved transfer recipients" on public.saved_transfer_recipients;
create policy "Users manage their saved transfer recipients"
  on public.saved_transfer_recipients
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.account_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (event_type in (
    'account_created', 'signed_in', 'signed_out', 'application_submitted',
    'application_status_changed', 'recipient_saved', 'recipient_deleted', 'transfer_previewed', 'transfer_processing',
    'transfer_checkpoint_matched', 'transfer_checkpoint_failed'
  )),
  summary text not null check (length(trim(summary)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists account_activity_user_created_idx
  on public.account_activity (user_id, created_at desc);
alter table public.account_activity enable row level security;
revoke all on public.account_activity from anon, authenticated;
grant select on public.account_activity to authenticated;

drop policy if exists "Users read their own account activity" on public.account_activity;
create policy "Users read their own account activity"
  on public.account_activity
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.record_new_account_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.account_activity (user_id, event_type, summary)
  values (new.id, 'account_created', 'Your Upstart account was created.');
  return new;
end;
$$;

drop trigger if exists auth_user_created_activity on auth.users;
create trigger auth_user_created_activity
  after insert on auth.users
  for each row execute function public.record_new_account_activity();

create or replace function public.log_account_activity(p_event_type text, p_summary text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  activity_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required to record account activity.';
  end if;
  if p_event_type not in ('signed_in', 'signed_out', 'recipient_saved', 'recipient_deleted') then
    raise exception 'This account activity type cannot be recorded by the client.';
  end if;
  if p_summary is null or length(trim(p_summary)) not between 1 and 500 then
    raise exception 'An activity summary of 1 to 500 characters is required.';
  end if;

  insert into public.account_activity (user_id, event_type, summary)
  values (auth.uid(), p_event_type, trim(p_summary))
  returning id into activity_id;
  return activity_id;
end;
$$;

create or replace function public.record_application_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.account_activity (user_id, event_type, summary)
    values (new.user_id, 'application_submitted', 'Loan application submitted for review.');
  elsif new.status is distinct from old.status then
    insert into public.account_activity (user_id, event_type, summary)
    values (new.user_id, 'application_status_changed', 'Application status updated to ' || replace(new.status, '_', ' ') || '.');
  end if;
  return new;
end;
$$;

drop trigger if exists loan_application_activity on public.loan_applications;
create trigger loan_application_activity
  after insert or update of status on public.loan_applications
  for each row execute function public.record_application_activity();

create table if not exists public.demo_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  application_id uuid not null references public.loan_applications (id) on delete cascade,
  provider text not null check (provider in ('local-bank', 'cash-app', 'paypal', 'other')),
  amount numeric(12, 2) not null check (amount > 0),
  status text not null default 'preview' check (status in ('preview', 'processing')),
  created_at timestamptz not null default now(),
  processing_at timestamptz
);

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

alter table public.transfer_demo_serials
  add column if not exists processing_transfer_id uuid
  references public.demo_transfer_requests (id) on delete set null;

create or replace function public.reset_demo_serial_progress_on_code_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.code_hash is distinct from old.code_hash then
    new.processing_transfer_id := null;
    new.matched_at := null;
    new.unlock_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists reset_demo_serial_progress_on_code_change on public.transfer_demo_serials;
create trigger reset_demo_serial_progress_on_code_change
  before update of code_hash on public.transfer_demo_serials
  for each row execute function public.reset_demo_serial_progress_on_code_change();

create index if not exists demo_transfer_requests_user_status_idx
  on public.demo_transfer_requests (user_id, status);
alter table public.demo_transfer_requests enable row level security;
revoke all on public.demo_transfer_requests from anon, authenticated;
grant select on public.demo_transfer_requests to authenticated;

drop policy if exists "Users read their own demo transfer requests" on public.demo_transfer_requests;
create policy "Users read their own demo transfer requests"
  on public.demo_transfer_requests
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.create_demo_transfer_preview(
  p_application_id uuid,
  p_provider text,
  p_amount numeric,
  p_recipient_details jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  transfer_id uuid;
  loan_amount numeric;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required.';
  end if;
  if p_provider is null or p_provider not in ('local-bank', 'cash-app', 'paypal', 'other') then
    raise exception 'Choose a supported demo transfer type.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'The demo transfer amount must be greater than zero.';
  end if;
  if p_recipient_details is null or jsonb_typeof(p_recipient_details) <> 'object'
    or pg_catalog.octet_length(p_recipient_details::text) > 5000 then
    raise exception 'Valid recipient details are required for the demo preview.';
  end if;

  select application.amount
    into loan_amount
    from public.loan_applications as application
    where application.id = p_application_id
      and application.user_id = auth.uid()
      and application.status = 'approved'
    for update;
  if not found then
    raise exception 'An approved loan application is required.';
  end if;

  if p_amount > loan_amount - coalesce((
    select sum(request.amount)
      from public.demo_transfer_requests as request
      where request.application_id = p_application_id
        and request.user_id = auth.uid()
        and request.status = 'processing'
  ), 0) then
    raise exception 'The demo transfer amount exceeds the available balance.';
  end if;

  insert into public.demo_transfer_requests (user_id, application_id, provider, amount)
  values (auth.uid(), p_application_id, p_provider, p_amount)
  returning id into transfer_id;

  insert into public.account_activity (user_id, event_type, summary)
  values (
    auth.uid(),
    'transfer_previewed',
    'A ' || p_provider || ' demo transfer preview for J$' || to_char(p_amount, 'FM999999999999990.00') || ' was created.'
  );

  return transfer_id;
end;
$$;

create or replace function public.get_demo_transfer_totals(p_application_id uuid)
returns table (processing_amount numeric, processing_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1
      from public.loan_applications as application
      where application.id = p_application_id
        and application.user_id = auth.uid()
  ) then
    raise exception 'The selected application was not found for this account.';
  end if;

  return query
    select coalesce(sum(request.amount), 0)::numeric, count(*)::bigint
      from public.demo_transfer_requests as request
      where request.application_id = p_application_id
        and request.user_id = auth.uid()
        and request.status = 'processing';
end;
$$;

create or replace function public.match_demo_transfer_serial(
  p_serial_id uuid,
  p_serial_code text,
  p_demo_transfer_id uuid
)
returns table (code_matches boolean, matched_at timestamptz, unlock_at timestamptz, transfer_status text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_serial public.transfer_demo_serials%rowtype;
  target_transfer public.demo_transfer_requests%rowtype;
  loan_amount numeric;
  matched_time timestamptz;
  unlock_time timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required.';
  end if;

  select candidate.*
    into target_serial
    from public.transfer_demo_serials as candidate
    where candidate.id = p_serial_id
      and candidate.user_id = auth.uid()
    for update;
  if not found or target_serial.code_hash is null then
    return query select false, null::timestamptz, null::timestamptz, null::text;
    return;
  end if;
  if target_serial.amount is null or target_serial.amount <= 0 then
    raise exception 'The administrator must set this demo step amount first.';
  end if;

  select request.*
    into target_transfer
    from public.demo_transfer_requests as request
    where request.id = p_demo_transfer_id
      and request.user_id = auth.uid()
      and request.application_id = target_serial.application_id
    for update;
  if not found then
    raise exception 'The demo transfer preview could not be found. Return to the transfer page and create a new preview.';
  end if;

  if target_serial.sequence = 1 then
    if target_serial.matched_at is not null then
      if target_transfer.status <> 'processing' or target_serial.processing_transfer_id <> target_transfer.id then
        raise exception 'This demo serial was already matched to a different transfer.';
      end if;
    elsif target_transfer.status <> 'preview' then
      raise exception 'This transfer preview has already been processed.';
    end if;
  elsif target_transfer.status <> 'processing' then
    raise exception 'Complete the first demo step to start processing this transfer.';
  elsif target_serial.processing_transfer_id is not null
    and target_serial.processing_transfer_id is distinct from target_transfer.id then
    raise exception 'This demo transfer does not match the first completed step.';
  end if;

  if target_serial.matched_at is null and exists (
    select 1
      from generate_series(1, target_serial.sequence - 1) as required(sequence)
      left join public.transfer_demo_serials as previous
        on previous.application_id = target_serial.application_id
        and previous.sequence = required.sequence
      where previous.id is null
        or previous.matched_at is null
        or previous.unlock_at > clock_timestamp()
  ) then
    raise exception 'The previous demo step must be completed and unlocked first.';
  end if;

  if encode(extensions.digest(upper(trim(coalesce(p_serial_code, ''))), 'sha256'), 'hex') <> target_serial.code_hash then
    insert into public.account_activity (user_id, event_type, summary)
    values (auth.uid(), 'transfer_checkpoint_failed', 'A demo serial did not match for checkpoint ' || target_serial.sequence || '.');
    return query select false, target_serial.matched_at, target_serial.unlock_at, target_transfer.status;
    return;
  end if;

  if target_serial.sequence = 1 and target_serial.matched_at is null then
    select application.amount
      into loan_amount
      from public.loan_applications as application
      where application.id = target_transfer.application_id
        and application.user_id = auth.uid()
        and application.status = 'approved'
      for update;
    if not found then
      raise exception 'An approved loan application is required.';
    end if;

    if target_transfer.amount > loan_amount - coalesce((
      select sum(request.amount)
        from public.demo_transfer_requests as request
        where request.application_id = target_transfer.application_id
          and request.user_id = auth.uid()
          and request.status = 'processing'
    ), 0) then
      raise exception 'The demo transfer amount now exceeds the available balance.';
    end if;

    update public.demo_transfer_requests
      set status = 'processing',
          processing_at = clock_timestamp()
      where id = target_transfer.id;
    update public.transfer_demo_serials
      set processing_transfer_id = target_transfer.id
      where id = target_serial.id;

    insert into public.account_activity (user_id, event_type, summary)
    values (
      auth.uid(),
      'transfer_processing',
      'A demo transfer of J$' || to_char(target_transfer.amount, 'FM999999999999990.00') || ' is now processing. No funds moved.'
    );
  end if;

  if target_serial.matched_at is null then
    matched_time := clock_timestamp();
    unlock_time := matched_time + interval '30 minutes';
    update public.transfer_demo_serials
      set matched_at = matched_time,
          unlock_at = unlock_time,
          processing_transfer_id = target_transfer.id
      where id = target_serial.id;

    insert into public.account_activity (user_id, event_type, summary)
    values (auth.uid(), 'transfer_checkpoint_matched', 'Demo transfer checkpoint ' || target_serial.sequence || ' matched.');
  else
    matched_time := target_serial.matched_at;
    unlock_time := target_serial.unlock_at;
  end if;

  return query select true, matched_time, unlock_time, 'processing'::text;
end;
$$;

revoke all on function public.log_account_activity(text, text) from public, anon;
revoke all on function public.record_new_account_activity() from public, anon, authenticated;
revoke all on function public.record_application_activity() from public, anon, authenticated;
revoke all on function public.create_demo_transfer_preview(uuid, text, numeric, jsonb) from public, anon;
revoke all on function public.get_demo_transfer_totals(uuid) from public, anon;
revoke all on function public.match_transfer_demo_serial(uuid, text) from public, anon, authenticated;
revoke all on function public.match_demo_transfer_serial(uuid, text, uuid) from public, anon;
grant execute on function public.log_account_activity(text, text) to authenticated;
grant execute on function public.create_demo_transfer_preview(uuid, text, numeric, jsonb) to authenticated;
grant execute on function public.get_demo_transfer_totals(uuid) to authenticated;
grant execute on function public.match_demo_transfer_serial(uuid, text, uuid) to authenticated;
