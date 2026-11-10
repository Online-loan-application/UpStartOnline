create table if not exists public.loan_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  address text not null,
  parish text not null,
  amount numeric(12, 2) not null check (amount between 100000 and 5000000),
  term integer not null check (term in (24, 36, 48, 60)),
  purpose text not null,
  employment text not null,
  bank text not null,
  monthly_income numeric(12, 2) not null check (monthly_income >= 0),
  pay_date date not null,
  status text not null default 'pending' check (status in ('pending', 'under_review', 'approved', 'rejected')),
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.loan_applications enable row level security;

drop policy if exists "Applicants can submit their own applications" on public.loan_applications;
create policy "Applicants can submit their own applications"
  on public.loan_applications for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "Applicants can read their own applications" on public.loan_applications;
create policy "Applicants can read their own applications"
  on public.loan_applications for select to authenticated
  using (auth.uid() = user_id);

revoke all on public.loan_applications from anon, authenticated;
grant select, insert on public.loan_applications to authenticated;