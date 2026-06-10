-- Tracker — Phase 1 cloud persistence (single JSON document, no auth yet).
-- Run this once in your Supabase project: SQL Editor → paste → Run.

create table if not exists app_state (
  id text primary key,
  data jsonb,
  updated_at timestamptz default now()
);

alter table app_state enable row level security;

-- TEMPORARY open policy — fine for a private single-user tool with no auth.
-- Replace with auth-scoped policies (auth.uid()) once login is added.
drop policy if exists "open access" on app_state;
create policy "open access" on app_state
  for all
  using (true)
  with check (true);
