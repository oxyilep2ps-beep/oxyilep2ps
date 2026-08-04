-- =============================================================================
-- Oxyile Phase 21 — Web3 Fallback Queue, Guarantors, Payment Mapping & Escrow
-- Run after Phase 20 migrations. Do not modify older migration files.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Web3 transaction retry queue (Polygon resilience)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.web3_tx_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handshake_id uuid NOT NULL REFERENCES public.handshakes (id) ON DELETE CASCADE,
  action_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT web3_tx_queue_status_check CHECK (
    status IN ('pending', 'processing', 'completed', 'failed')
  ),
  CONSTRAINT web3_tx_queue_action_type_check CHECK (
    action_type IN ('MINT_CONTRACT', 'UPDATE_EMI_PAID')
  )
);

CREATE INDEX IF NOT EXISTS web3_tx_queue_pending_idx
  ON public.web3_tx_queue (created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS web3_tx_queue_handshake_idx
  ON public.web3_tx_queue (handshake_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 2. Handshakes — external IDs, Polygon tx hash, guarantor tracking
-- -----------------------------------------------------------------------------
ALTER TABLE public.handshakes
  ADD COLUMN IF NOT EXISTS tx_hash text,
  ADD COLUMN IF NOT EXISTS payment_id text,
  ADD COLUMN IF NOT EXISTS guarantor_email text,
  ADD COLUMN IF NOT EXISTS guarantor_status text NOT NULL DEFAULT 'none';

ALTER TABLE public.handshakes
  DROP CONSTRAINT IF EXISTS handshakes_guarantor_status_check;

ALTER TABLE public.handshakes
  ADD CONSTRAINT handshakes_guarantor_status_check CHECK (
    guarantor_status IN ('none', 'pending', 'verified', 'signed')
  );

CREATE INDEX IF NOT EXISTS handshakes_payment_id_idx
  ON public.handshakes (payment_id)
  WHERE payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS handshakes_tx_hash_idx
  ON public.handshakes (tx_hash)
  WHERE tx_hash IS NOT NULL;

-- Backfill tx_hash from legacy polygon_tx_hash where available
UPDATE public.handshakes
SET tx_hash = polygon_tx_hash
WHERE tx_hash IS NULL AND polygon_tx_hash IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. RLS — queue is service-role only (no authenticated client policies)
-- -----------------------------------------------------------------------------
ALTER TABLE public.web3_tx_queue ENABLE ROW LEVEL SECURITY;
