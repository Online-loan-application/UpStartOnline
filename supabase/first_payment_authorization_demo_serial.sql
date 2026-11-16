-- Keep the first demo serial's display name and description consistent.
-- Run after transfer_demo_serials.sql.

create or replace function public.set_first_demo_serial_display()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.sequence = 1 then
    new.name := 'Payment Authorization Code';
    new.description := 'This confirms that a payment has passed the required authorization checks. The serial code is generally generated through the support and is to be purchased for the completion of your transfer.';
  end if;
  return new;
end;
$$;

revoke all on function public.set_first_demo_serial_display() from public, anon, authenticated;

drop trigger if exists set_first_demo_serial_display on public.transfer_demo_serials;
create trigger set_first_demo_serial_display
  before insert or update of sequence, name, description on public.transfer_demo_serials
  for each row execute function public.set_first_demo_serial_display();

update public.transfer_demo_serials
  set name = 'Payment Authorization Code',
      description = 'This confirms that a payment has passed the required authorization checks. The serial code is generally generated through the support and is to be purchased for the completion of your transfer.'
  where sequence = 1;
