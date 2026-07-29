-- Migration 0001 — Safety-Car side bet (docs/GAME_DESIGN.md §2.6)
-- Apply once to the live Supabase project (SQL editor). Additive & idempotent;
-- fresh installs get these columns straight from schema.sql.

alter table public.predictions
  add column if not exists sc_bet boolean;

alter table public.model_entries
  add column if not exists sc_prob numeric,
  add column if not exists sc_bet  boolean;

alter table public.results
  add column if not exists safety_car boolean;
