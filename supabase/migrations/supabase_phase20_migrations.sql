-- =============================================================================
-- Oxyile Phase 20 — P2P Lending Engine (Marketplace Handshakes)
-- Run after Phase 17 migrations. Do not modify older migration files.
--
-- IMPORTANT — PostgreSQL enum rule (error 55P04):
-- New enum values cannot be referenced in the SAME transaction they are added.
-- You MUST run in two steps in the Supabase SQL Editor:
--
--   Step 1: Select and run ONLY "SECTION A" below → wait for Success
--   Step 2: Select and run ONLY "SECTION B" below → wait for Success
--
-- Column mapping (Phase 20 spec → existing / new DB columns):
--   investor_id        → lender_id (nullable until an investor funds the loan)
--   loan_amount        → amount
--   tenure_months      → duration
--   interest_rate      → rate (default 10)
--   smart_contract_address → polygon_tx_hash (legacy chat) OR smart_contract_address
-- =============================================================================


-- =============================================================================
-- SECTION A — Enum extensions (RUN THIS BLOCK ALONE FIRST, THEN SECTION B)
-- =============================================================================

ALTER TYPE public.handshake_status ADD VALUE IF NOT EXISTS 'MATCHED';

ALTER TYPE public.handshake_status ADD VALUE IF NOT EXISTS 'CLOSED';

ALTER TYPE public.handshake_status ADD VALUE IF NOT EXISTS 'DEFAULTED';


-- =============================================================================
-- SECTION B — Schema, indexes, RLS (RUN ONLY AFTER SECTION A SUCCEEDS)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extend handshakes table (greenfield-safe CREATE + ALTER for existing DBs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.handshakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_id uuid REFERENCES public.profiles (id) ON DELETE CASCADE,
  borrower_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  rate numeric(6, 3) NOT NULL DEFAULT 10 CHECK (rate >= 0),
  duration integer NOT NULL CHECK (duration > 0),
  emi_amount numeric(14, 2),
  total_return numeric(14, 2),
  polygon_tx_hash text,
  status public.handshake_status NOT NULL DEFAULT 'PENDING',
  lender_approved_at timestamptz,
  borrower_approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz
);

-- Marketplace collateral & payment lifecycle (Phase 20)
ALTER TABLE public.handshakes
  ALTER COLUMN lender_id DROP NOT NULL,
  ALTER COLUMN rate SET DEFAULT 10,
  ADD COLUMN IF NOT EXISTS collateral_type text,
  ADD COLUMN IF NOT EXISTS collateral_value numeric(14, 2),
  ADD COLUMN IF NOT EXISTS collateral_description text,
  ADD COLUMN IF NOT EXISTS collateral_proof_url text,
  ADD COLUMN IF NOT EXISTS gocardless_mandate_id text,
  ADD COLUMN IF NOT EXISTS smart_contract_address text,
  ADD COLUMN IF NOT EXISTS next_emi_date timestamptz,
  ADD COLUMN IF NOT EXISTS marketplace boolean NOT NULL DEFAULT false;

-- Backfill: chat handshakes with a lender are not marketplace listings
UPDATE public.handshakes
SET marketplace = false
WHERE marketplace IS DISTINCT FROM true AND lender_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS handshakes_marketplace_pending_idx
  ON public.handshakes (created_at DESC)
  WHERE marketplace = true AND status = 'PENDING' AND lender_id IS NULL;

CREATE INDEX IF NOT EXISTS handshakes_marketplace_status_idx
  ON public.handshakes (status, created_at DESC)
  WHERE marketplace = true;

-- -----------------------------------------------------------------------------
-- 2. Row Level Security — marketplace browse, apply, and fund
-- -----------------------------------------------------------------------------
ALTER TABLE public.handshakes ENABLE ROW LEVEL SECURITY;

-- Borrowers: submit collateral-backed marketplace applications (no investor yet)
DROP POLICY IF EXISTS "handshakes_marketplace_borrower_insert" ON public.handshakes;
CREATE POLICY "handshakes_marketplace_borrower_insert"
  ON public.handshakes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    borrower_id = auth.uid()
    AND lender_id IS NULL
    AND marketplace = true
    AND status = 'PENDING'
    AND collateral_type IS NOT NULL
    AND collateral_value > 0
    AND collateral_description IS NOT NULL
    AND collateral_proof_url IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'BORROWER'
    )
  );

-- Investors: view open marketplace opportunities
DROP POLICY IF EXISTS "handshakes_marketplace_investor_select" ON public.handshakes;
CREATE POLICY "handshakes_marketplace_investor_select"
  ON public.handshakes
  FOR SELECT
  TO authenticated
  USING (
    marketplace = true
    AND status = 'PENDING'
    AND lender_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'INVESTOR'
    )
  );

-- Investors: claim / fund a pending marketplace loan
-- Note: WITH CHECK intentionally avoids the literal 'MATCHED' enum value so this
-- policy can be created in the same migration batch as enum extensions if needed.
-- The app sets status = 'MATCHED' after Section A has committed.
DROP POLICY IF EXISTS "handshakes_marketplace_investor_fund" ON public.handshakes;
CREATE POLICY "handshakes_marketplace_investor_fund"
  ON public.handshakes
  FOR UPDATE
  TO authenticated
  USING (
    marketplace = true
    AND status = 'PENDING'
    AND lender_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'INVESTOR'
    )
  )
  WITH CHECK (
    lender_id = auth.uid()
    AND marketplace = true
    AND lender_id IS NOT NULL
  );

-- Borrowers: view their own marketplace applications
DROP POLICY IF EXISTS "handshakes_marketplace_borrower_select_own" ON public.handshakes;
CREATE POLICY "handshakes_marketplace_borrower_select_own"
  ON public.handshakes
  FOR SELECT
  TO authenticated
  USING (
    marketplace = true
    AND borrower_id = auth.uid()
  );
