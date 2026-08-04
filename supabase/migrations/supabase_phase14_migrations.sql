-- =============================================================================
-- Oxyile Phase 14 — Expected Interest Rate
-- Run after Phase 13 migrations. Do not modify older migration files.
-- =============================================================================

ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS expected_interest_rate numeric NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expected_interest_rate numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS waitlist_expected_interest_rate_idx
  ON public.waitlist (expected_interest_rate);

CREATE INDEX IF NOT EXISTS profiles_expected_interest_rate_idx
  ON public.profiles (expected_interest_rate);
