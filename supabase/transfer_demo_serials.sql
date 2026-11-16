-- Demo-only serial challenges. Run after schema.sql, admin.sql, approval.sql, and approved_balance.sql.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.transfer_demo_serials (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.loan_applications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  sequence smallint not null check (sequence between 1 and 4),
  name text not null check (length(trim(name)) between 1 and 80),
  description text not null check (length(trim(description)) between 1 and 500),
  reason text not null check (length(trim(reason)) between 1 and 300),
  amount numeric(12, 2) not null check (amount > 0),
  code_hash text check (code_hash ~ '^[0-9a-f]{64}$'),
  code_value text check (code_value ~ '^[A-Z0-9]{12}$'),
  matched_at timestamptz,
  unlock_at timestamptz,
  created_at timestamptz not null default now(),
  unique (application_id, sequence),
  check ((matched_at is null and unlock_at is null) or (matched_at is not null and unlock_at is not null))
);

alter table public.transfer_demo_serials
  alter column code_hash drop not null;
alter table public.transfer_demo_serials
  add column if not exists code_value text;
alter table public.transfer_demo_serials
  drop constraint if exists transfer_demo_serials_code_value_check;
alter table public.transfer_demo_serials
  add constraint transfer_demo_serials_code_value_check
  check (code_value is null or code_value ~ '^[A-Z0-9]{12}$');
alter table public.transfer_demo_serials
  alter column amount drop not null;
alter table public.transfer_demo_serials
  drop constraint if exists transfer_demo_serials_amount_check;
alter table public.transfer_demo_serials
  add constraint transfer_demo_serials_amount_check check (amount is null or amount >= 0);
alter table public.transfer_demo_serials
  drop constraint if exists transfer_demo_serials_code_hash_check;
alter table public.transfer_demo_serials
  add constraint transfer_demo_serials_code_hash_check check (code_hash is null or code_hash ~ '^[0-9a-f]{64}$');

alter table public.transfer_demo_serials enable row level security;
revoke all on public.transfer_demo_serials from public, anon, authenticated;
grant select (id, application_id, user_id, sequence, name, description, reason, amount, matched_at, unlock_at, created_at)
  on public.transfer_demo_serials to authenticated;

drop policy if exists "Users can read their demo serial metadata" on public.transfer_demo_serials;
create policy "Users can read their demo serial metadata"
  on public.transfer_demo_serials
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admins can read demo serial metadata" on public.transfer_demo_serials;
create policy "Admins can read demo serial metadata"
  on public.transfer_demo_serials
  for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop function if exists public.admin_create_transfer_demo_serial(uuid, smallint, text, text, text, numeric, text);

create or replace function public.admin_generate_transfer_demo_serials(
  p_application_id uuid,
  p_serial_codes text[]
)
returns table (stage_sequence smallint, id uuid, amount numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
begin
  if (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Admin access required.';
  end if;
  if coalesce(cardinality(p_serial_codes), 0) <> 4 then
    raise exception 'Exactly four demo serial codes are required.';
  end if;
  if exists (
    select 1
      from unnest(p_serial_codes) as codes(code)
      where upper(trim(coalesce(codes.code, ''))) !~ '^[A-Z0-9]{12}$'
  ) then
    raise exception 'Each demo serial code must contain exactly 12 letters or numbers.';
  end if;
  if (select count(distinct upper(trim(code))) from unnest(p_serial_codes) as codes(code)) <> 4 then
    raise exception 'All four demo serial codes must be different.';
  end if;

  select application.user_id
    into target_user_id
    from public.loan_applications as application
    where application.id = p_application_id;

  if target_user_id is null then
    raise exception 'The selected application was not found.';
  end if;

  return query
    insert into public.transfer_demo_serials (
      application_id, user_id, sequence, name, description, reason, code_hash, code_value, matched_at, unlock_at
    )
    select
      p_application_id,
      target_user_id,
      codes.sequence::smallint,
      case
        when codes.sequence = 1 then 'Payment Authorization Code'
        when codes.sequence = 2 then 'Bank Authentication and Verification (Demo)'
        else 'Demo serial ' || codes.sequence
      end,
      case
        when codes.sequence = 1 then 'This confirms that a payment has passed the required authorization checks. It is generally generated through the bank''s payment system rather than purchased by the customer.'
        when codes.sequence = 2 then 'Simulation-only verification step. No fee or payment is required to receive or enter a demo code. Real banks do not ask customers to purchase verification codes. If you have concerns about an actual charge, contact your bank through its official support channels.'
        else 'Demonstration checkpoint ' || codes.sequence
      end,
      'Demo stage ' || codes.sequence,
      encode(extensions.digest(upper(trim(codes.code)), 'sha256'), 'hex'),
      upper(trim(codes.code)),
      null,
      null
    from unnest(p_serial_codes) with ordinality as codes(code, sequence)
    on conflict (application_id, sequence) do update
      set name = excluded.name,
          description = excluded.description,
          reason = excluded.reason,
          code_hash = excluded.code_hash,
          code_value = excluded.code_value,
          matched_at = null,
          unlock_at = null
    returning transfer_demo_serials.sequence, transfer_demo_serials.id, transfer_demo_serials.amount;
end;
$$;

create or replace function public.admin_set_transfer_demo_serial_amount(
  p_application_id uuid,
  p_sequence smallint,
  p_amount numeric
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_amount numeric;
begin
  if (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Admin access required.';
  end if;
  if p_sequence is null or p_sequence not between 1 and 4 then
    raise exception 'Serial sequence must be between 1 and 4.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Demo amount must be greater than zero.';
  end if;

  update public.transfer_demo_serials
    set amount = p_amount
    where application_id = p_application_id
      and sequence = p_sequence
  returning amount into saved_amount;

  if not found then
    raise exception 'Generate all four demo serials before setting amounts.';
  end if;

  return saved_amount;
end;
$$;

create or replace function public.admin_reset_transfer_demo_serials(p_application_id uuid)
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
        unlock_at = null
    where application_id = p_application_id;

  if not found then
    raise exception 'No demo serials were found for the selected application.';
  end if;
end;
$$;

create or replace function public.admin_get_transfer_demo_serials(p_application_id uuid)
returns table (
  id uuid,
  application_id uuid,
  sequence smallint,
  name text,
  description text,
  reason text,
  amount numeric,
  matched_at timestamptz,
  unlock_at timestamptz,
  code_generated boolean,
  code_value text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (auth.jwt() -> 'app_metadata' ->> 'role') is distinct from 'admin' then
    raise exception 'Admin access required.';
  end if;

  return query
    select serial.id, serial.application_id, serial.sequence, serial.name, serial.description,
           serial.reason, serial.amount, serial.matched_at, serial.unlock_at,
           serial.code_hash is not null, serial.code_value
      from public.transfer_demo_serials as serial
      where serial.application_id = p_application_id
      order by serial.sequence;
end;
$$;

drop function if exists public.get_transfer_demo_serials(uuid);
create function public.get_transfer_demo_serials(p_application_id uuid)
returns table (
  id uuid,
  application_id uuid,
  sequence smallint,
  name text,
  description text,
  reason text,
  amount numeric,
  matched_at timestamptz,
  unlock_at timestamptz,
  code_generated boolean,
  server_now timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in is required.';
  end if;

  if not exists (
    select 1
      from public.loan_applications as application
      where application.id = p_application_id
        and application.user_id = auth.uid()
  ) then
    raise exception 'The selected application was not found for this account.';
  end if;

  return query
    select serial.id, serial.application_id, serial.sequence, serial.name, serial.description,
           serial.reason, serial.amount, serial.matched_at, serial.unlock_at,
           serial.code_hash is not null, clock_timestamp()
      from public.transfer_demo_serials as serial
      where serial.application_id = p_application_id
        and serial.user_id = auth.uid()
      order by serial.sequence;
end;
$$;

create or replace function public.match_transfer_demo_serial(p_serial_id uuid, p_serial_code text)
returns table (code_matches boolean, matched_at timestamptz, unlock_at timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_serial public.transfer_demo_serials%rowtype;
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

  if not found then
    return query select false, null::timestamptz, null::timestamptz;
    return;
  end if;

  if target_serial.code_hash is null then
    raise exception 'The administrator must generate this demo serial first.';
  end if;

  if target_serial.amount is null or target_serial.amount <= 0 then
    raise exception 'The administrator must set this demo step amount first.';
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
    return query select false, target_serial.matched_at, target_serial.unlock_at;
    return;
  end if;

  if target_serial.matched_at is null then
    matched_time := clock_timestamp();
    unlock_time := matched_time + interval '30 minutes';
    update public.transfer_demo_serials
      set matched_at = matched_time,
          unlock_at = unlock_time
      where id = target_serial.id;
  else
    matched_time := target_serial.matched_at;
    unlock_time := target_serial.unlock_at;
  end if;

  return query select true, matched_time, unlock_time;
end;
$$;

revoke all on function public.admin_generate_transfer_demo_serials(uuid, text[]) from public, anon;
revoke all on function public.admin_set_transfer_demo_serial_amount(uuid, smallint, numeric) from public, anon;
revoke all on function public.admin_reset_transfer_demo_serials(uuid) from public, anon;
revoke all on function public.admin_get_transfer_demo_serials(uuid) from public, anon;
revoke all on function public.get_transfer_demo_serials(uuid) from public, anon;
revoke all on function public.match_transfer_demo_serial(uuid, text) from public, anon;
grant execute on function public.admin_generate_transfer_demo_serials(uuid, text[]) to authenticated;
grant execute on function public.admin_set_transfer_demo_serial_amount(uuid, smallint, numeric) to authenticated;
grant execute on function public.admin_reset_transfer_demo_serials(uuid) to authenticated;
grant execute on function public.admin_get_transfer_demo_serials(uuid) to authenticated;
grant execute on function public.get_transfer_demo_serials(uuid) to authenticated;
grant execute on function public.match_transfer_demo_serial(uuid, text) to authenticated;
