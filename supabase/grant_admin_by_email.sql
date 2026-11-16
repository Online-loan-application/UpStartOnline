-- Run in the Supabase SQL Editor as a trusted project administrator.
-- Replace the email below with the existing account that should receive admin access.
-- This updates server-managed app metadata, not user-editable user metadata.
do $$
declare
  target_email text := lower(trim('ADMIN_EMAIL_HERE'));
  updated_user_id uuid;
begin
  if target_email = '' or target_email = 'admin_email_here' or position('@' in target_email) = 0 then
    raise exception 'Replace ADMIN_EMAIL_HERE with the email address of an existing Supabase user.';
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
  where lower(email) = target_email
  returning id into updated_user_id;

  if updated_user_id is null then
    raise exception 'No Supabase user found for email %.', target_email;
  end if;

  raise notice 'Admin access granted to % (user ID %). Have the user sign out and back in to refresh their access token.', target_email, updated_user_id;
end
$$;
