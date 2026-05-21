-- =============================================================================
-- OXYILE — Dashboard Social Schema (NEW FILE — do not edit supabase_master_schema.sql)
-- Run in Supabase SQL Editor after master + phase2 migrations.
-- Idempotent: safe to re-run.
-- =============================================================================

-- Profile social columns (if phase2 not applied yet)
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS cover_url text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL AND username <> '';

-- -----------------------------------------------------------------------------
-- Storage: avatars & covers (public read for profile discovery UI)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'avatars',
    'avatars',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'covers',
    'covers',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Users upload only into their own folder: {user_id}/...
DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "covers_insert_own" ON storage.objects;
CREATE POLICY "covers_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "covers_update_own" ON storage.objects;
CREATE POLICY "covers_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "covers_select_public" ON storage.objects;
CREATE POLICY "covers_select_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'covers');

-- -----------------------------------------------------------------------------
-- RLS: let approved users discover other approved profiles (feed fallback)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Approved users discover approved profiles" ON public.profiles;
CREATE POLICY "Approved users discover approved profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    status = 'APPROVED'
    AND role IN ('INVESTOR', 'BORROWER')
    AND EXISTS (
      SELECT 1 FROM public.profiles me
      WHERE me.id = auth.uid()
        AND me.status = 'APPROVED'
        AND me.role IN ('INVESTOR', 'BORROWER')
    )
  );

COMMENT ON COLUMN public.profiles.username IS 'Unique handle, e.g. preet_invests (stored without @)';
COMMENT ON COLUMN public.profiles.avatar_url IS 'Public URL to avatars bucket object';
COMMENT ON COLUMN public.profiles.cover_url IS 'Public URL to covers bucket object';
