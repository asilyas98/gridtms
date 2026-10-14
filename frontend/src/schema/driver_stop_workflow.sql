-- GridTMS per-stop Driver Cockpit workflow.
-- Safe to run more than once in the Supabase SQL Editor.

alter table public.tms_loads
  add column if not exists stops jsonb not null default '[]'::jsonb;

create index if not exists tms_loads_driver_sent_idx
  on public.tms_loads (owner_id, driver_id, sent_to_app);
