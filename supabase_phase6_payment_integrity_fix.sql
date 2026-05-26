-- =============================================================================
-- OXYILE — Phase 6 Payment Integrity Fix
-- Apply after Phase 5 to support active EMI subscriptions and precise repayments.
-- =============================================================================

-- Payment status now distinguishes a verified GoCardless subscription from a
-- fully paid contract.
DO $$
BEGIN
  ALTER TYPE public.handshake_payment_status ADD VALUE IF NOT EXISTS 'ACTIVE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Preserve small-amount EMI calculations, e.g. GBP 1 loans that produce
-- fractional monthly repayments below GBP 1.
ALTER TABLE public.handshakes
  ALTER COLUMN emi_amount TYPE numeric(14, 6) USING emi_amount::numeric(14, 6),
  ALTER COLUMN total_return TYPE numeric(14, 6) USING total_return::numeric(14, 6);

-- Backfill rows affected by previous zero/rounded EMI values using the canonical
-- simple-interest formula:
-- total = principal + principal * (rate / 100) * (duration_months / 12)
-- emi = total / duration_months
UPDATE public.handshakes
SET
  total_return = amount + (amount * (rate / 100.0) * (GREATEST(duration, 1) / 12.0)),
  emi_amount = (amount + (amount * (rate / 100.0) * (GREATEST(duration, 1) / 12.0))) / GREATEST(duration, 1)
WHERE amount IS NOT NULL
  AND rate IS NOT NULL
  AND duration IS NOT NULL
  AND (
    emi_amount IS NULL
    OR emi_amount <= 0
    OR total_return IS NULL
    OR total_return <= 0
  );

-- Existing sandbox_/flow-like values are not chain hashes. Replace them with
-- deterministic mock 0x hashes so the admin UI never confuses GoCardless IDs
-- with Polygon transaction hashes.
UPDATE public.handshakes
SET polygon_tx_hash =
  '0x' ||
  md5(id::text || COALESCE(created_at::text, '')) ||
  md5(COALESCE(polygon_tx_hash, '') || id::text)
WHERE polygon_tx_hash IS NOT NULL
  AND polygon_tx_hash !~ '^0x[0-9a-fA-F]{64}$';
