-- =============================================================================
-- Oxyile Phase 13 — Redundant Loan Limit Cleanup
-- Run after Phase 12 migrations. Do not modify older migration files.
-- =============================================================================

-- Remove legacy borrower limit columns if they exist.
-- Keep target_amount as the single active numeric amount field.

ALTER TABLE public.waitlist
  DROP COLUMN IF EXISTS desired_loan_limit,
  DROP COLUMN IF EXISTS loan_limit;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS desired_loan_limit,
  DROP COLUMN IF EXISTS loan_limit;
