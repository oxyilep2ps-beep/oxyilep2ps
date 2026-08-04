-- =============================================================================
-- OXYILE — Phase 5 Migrations (Readable Transaction IDs)
-- Paste into Supabase SQL Editor after Phase 4.
-- =============================================================================

ALTER TABLE public.handshakes
  ADD COLUMN IF NOT EXISTS txn_id varchar(32);

CREATE UNIQUE INDEX IF NOT EXISTS handshakes_txn_id_unique_idx
  ON public.handshakes (txn_id)
  WHERE txn_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_oxy_txn_id()
RETURNS varchar
LANGUAGE plpgsql
AS $$
DECLARE
  candidate varchar(32);
BEGIN
  LOOP
    candidate := 'OXY-TXN-' || lpad(floor(random() * 1000000)::int::text, 6, '0');

    IF NOT EXISTS (
      SELECT 1
      FROM public.handshakes
      WHERE txn_id = candidate
    ) THEN
      RETURN candidate;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_handshake_txn_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'ACTIVE'::public.handshake_status AND NEW.txn_id IS NULL THEN
    NEW.txn_id := public.generate_oxy_txn_id();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_handshake_txn_id_before_write ON public.handshakes;
CREATE TRIGGER set_handshake_txn_id_before_write
  BEFORE INSERT OR UPDATE OF status, txn_id
  ON public.handshakes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_handshake_txn_id();

UPDATE public.handshakes
SET txn_id = public.generate_oxy_txn_id()
WHERE status = 'ACTIVE'::public.handshake_status
  AND txn_id IS NULL;
