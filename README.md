# UpStartOnline

UpStart Jamaica's loan application website.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set the Supabase project URL and anon key.
3. Run `npm run dev`.

## Supabase setup

Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor to create the `loan_applications` table and its row-level security policies. Add the local and deployed application URLs to the Supabase Auth redirect URL allowlist. The browser client uses only the public anon key; never put a service-role key in the frontend.

Build the production site with `npm run build`.