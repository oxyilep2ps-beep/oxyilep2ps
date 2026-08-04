-- =============================================================================
-- Oxyile Phase 7 — Profile KYC columns, BLOGGER role, complaints screenshots
-- Run after phase6. Do not edit prior migration files.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. BLOGGER role
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TYPE public.profile_role ADD VALUE IF NOT EXISTS 'BLOGGER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 2. profiles — dedicated KYC / FCA columns
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS fca_test_answers jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS proof_of_identity_url text,
  ADD COLUMN IF NOT EXISTS liveness_video_url text,
  ADD COLUMN IF NOT EXISTS proof_of_address_url text;

COMMENT ON COLUMN public.profiles.fca_test_answers IS
  'FCA appropriateness test: { "question text": "Yes"|"No", ... }';

-- -----------------------------------------------------------------------------
-- 3. complaints — screenshot support (table may exist from phase6)
-- -----------------------------------------------------------------------------
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS screenshot_url text,
  ADD COLUMN IF NOT EXISTS issue_description text;

-- Backfill issue_description from legacy description column when present
UPDATE public.complaints
SET issue_description = description
WHERE issue_description IS NULL AND description IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. Storage bucket for complaint screenshots
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-screenshots', 'complaint-screenshots', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "complaint_screenshots_public_read" ON storage.objects;
CREATE POLICY "complaint_screenshots_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'complaint-screenshots');

DROP POLICY IF EXISTS "complaint_screenshots_anon_insert" ON storage.objects;
CREATE POLICY "complaint_screenshots_anon_insert"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'complaint-screenshots');

-- -----------------------------------------------------------------------------
-- 5. Staff auth metadata (safe in same transaction — no enum cast)
-- Profile role promotion uses enum literals; run supabase_phase7_staff_bootstrap.sql next.
-- -----------------------------------------------------------------------------
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role":"HR","staff_hr":true}'::jsonb
WHERE lower(email) = 'careers.oxyile@gmail.com';

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role":"BLOGGER","staff_blogger":true}'::jsonb
WHERE lower(email) = 'blogger.oxyile@gmail.com';
