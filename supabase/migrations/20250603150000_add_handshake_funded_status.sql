-- JIT P2P flow: investor funds escrow before borrower links bank
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'handshake_status'
      AND e.enumlabel = 'FUNDED'
  ) THEN
    ALTER TYPE public.handshake_status ADD VALUE 'FUNDED';
  END IF;
END $$;
