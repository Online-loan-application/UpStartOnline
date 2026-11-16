-- Set safe, simulation-only display text for the second demo serial.
-- Run after transfer_demo_serials.sql.

create or replace function public.set_second_demo_serial_display()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.sequence = 2 then
    new.name := 'Bank Authentication and Verification (Demo)';
    new.description := 'Simulation-only verification step. No fee or payment is required to receive or enter a demo code. Real banks do not ask customers to purchase verification codes. If you have concerns about an actual charge, contact your bank through its official support channels.';
  end if;
  return new;
end;
$$;

revoke all on function public.set_second_demo_serial_display() from public, anon, authenticated;

drop trigger if exists set_second_demo_serial_display on public.transfer_demo_serials;
create trigger set_second_demo_serial_display
  before insert or update of sequence, name, description on public.transfer_demo_serials
  for each row execute function public.set_second_demo_serial_display();

update public.transfer_demo_serials
  set name = 'Bank Authentication and Verification (Demo)',
      description = 'Simulation-only verification step. No fee or payment is required to receive or enter a demo code. Real banks do not ask customers to purchase verification codes. If you have concerns about an actual charge, contact your bank through its official support channels.'
  where sequence = 2;
