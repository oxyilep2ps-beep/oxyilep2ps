-- =============================================================================
-- OXYILE — Admin review workflow, RLS, and KYC storage policies
-- Run this as a standalone SQL script in Supabase.
-- =============================================================================

-- Keep the existing admin allowlist table as the source of truth for email-based access.

-- Helper: identify a dashboard admin either by role or allowlisted email.
CREATE OR REPLACE FUNCTION public.is_admin_actor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'ADMIN'
    )
    OR EXISTS (
      SELECT 1
      FROM public.admin_allowlist a
      WHERE lower(a.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    );
$$;

-- -----------------------------------------------------------------------------
-- Profiles: enable RLS and grant users/admins the minimum required access
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin_actor());

DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
CREATE POLICY "Admins update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_actor())
  WITH CHECK (public.is_admin_actor());

DROP POLICY IF EXISTS "Admins delete all profiles" ON public.profiles;
CREATE POLICY "Admins delete all profiles"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin_actor());

-- -----------------------------------------------------------------------------
-- KYC documents stored in the private storage bucket
-- -----------------------------------------------------------------------------
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users upload own KYC folder" ON storage.objects;
CREATE POLICY "Users upload own KYC folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users read own KYC files" ON storage.objects;
CREATE POLICY "Users read own KYC files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Admins read all KYC files" ON storage.objects;
CREATE POLICY "Admins read all KYC files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND public.is_admin_actor()
  );

DROP POLICY IF EXISTS "Admins delete all KYC files" ON storage.objects;
CREATE POLICY "Admins delete all KYC files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND public.is_admin_actor()
  );

-- Notes:
-- 1. The dashboard queries `public.profiles` for status = 'PENDING' / 'APPROVED'.
-- 2. `profiles.kyc_data` remains JSONB; the KYC documents themselves live in `storage.objects`.
-- 3. Keep `public.admin_allowlist` aligned with your ADMIN_EMAIL env values.
