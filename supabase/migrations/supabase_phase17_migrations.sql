-- =============================================================================
-- Oxyile Phase 17 — Borrower Collateral Tracking
-- Run after Phase 16 migrations. Do not modify older migration files.
--
-- NOTE: Do NOT run ALTER TABLE on storage.objects in the SQL Editor — it will
-- fail with "must be owner of table objects". RLS is already enabled on Storage.
-- If bucket/policy statements below fail, create the bucket in Dashboard →
-- Storage → New bucket: id = collateral_documents, Public = OFF, then skip
-- the storage section. API uploads use the service role and bypass RLS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Schema (safe to run in SQL Editor)
-- -----------------------------------------------------------------------------

ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS collateral_type text,
  ADD COLUMN IF NOT EXISTS collateral_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS collateral_description text,
  ADD COLUMN IF NOT EXISTS collateral_proof_url text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS collateral_type text,
  ADD COLUMN IF NOT EXISTS collateral_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS collateral_description text,
  ADD COLUMN IF NOT EXISTS collateral_proof_url text;

CREATE INDEX IF NOT EXISTS waitlist_collateral_type_idx
  ON public.waitlist (collateral_type)
  WHERE collateral_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_collateral_type_idx
  ON public.profiles (collateral_type)
  WHERE collateral_type IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. Storage bucket (optional — skip if INSERT fails; create via Dashboard)
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'collateral_documents',
  'collateral_documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. Storage policies (optional — service-role API uploads work without these)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "collateral_service_upload" ON storage.objects;
CREATE POLICY "collateral_service_upload"
  ON storage.objects FOR INSERT
  TO authenticated, anon
  WITH CHECK (bucket_id = 'collateral_documents');

DROP POLICY IF EXISTS "collateral_admin_read" ON storage.objects;
CREATE POLICY "collateral_admin_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'collateral_documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "collateral_owner_read" ON storage.objects;
CREATE POLICY "collateral_owner_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'collateral_documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
