-- =============================================================================
-- Oxyile Phase 12 — Waitlist + Profile Financial Fields
-- Run after Phase 11 migrations. Do not modify older migration files.
-- =============================================================================

-- Dedicated amount and borrower income fields for mathematical querying.

ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS target_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS borrower_source_of_income text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS borrower_source_of_income text;

CREATE INDEX IF NOT EXISTS waitlist_target_amount_idx
  ON public.waitlist (target_amount);

CREATE INDEX IF NOT EXISTS profiles_target_amount_idx
  ON public.profiles (target_amount);
