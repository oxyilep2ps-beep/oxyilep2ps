-- =============================================================================
-- OXYILE — Fix: "infinite recursion detected in policy for relation profiles"
-- Run this ENTIRE file in Supabase SQL Editor (new file — does not edit master schema).
--
-- Cause: RLS policies on `profiles` queried `profiles` again inside USING (...),
-- which re-triggered the same policies forever.
-- Fix: SECURITY DEFINER helper functions bypass RLS for role/status checks.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper functions (bypass RLS — no recursion)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'ADMIN'
  )
  OR EXISTS (
    SELECT 1
    FROM public.admin_allowlist a
    INNER JOIN public.profiles p ON lower(p.email) = lower(a.email)
    WHERE p.id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_approved_member()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND status = 'APPROVED'
      AND role IN ('INVESTOR', 'BORROWER')
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_approved_member() TO authenticated;

-- -----------------------------------------------------------------------------
-- profiles — drop recursive policies and replace
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Approved users discover approved profiles" ON public.profiles;

-- Own row (login, dashboard layout, settings)
CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Approved members can browse other approved investors/borrowers (discovery feed)
CREATE POLICY "Approved users discover approved profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.current_user_is_approved_member()
    AND status = 'APPROVED'
    AND role IN ('INVESTOR', 'BORROWER')
    AND id <> auth.uid()
  );

-- Admin overrides (no subquery on profiles inside policy)
CREATE POLICY "Admins read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

CREATE POLICY "Admins update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "Admins delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.current_user_is_admin());

-- -----------------------------------------------------------------------------
-- storage.objects — fix admin KYC policies that also queried profiles recursively
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins read all KYC files" ON storage.objects;
CREATE POLICY "Admins read all KYC files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND public.current_user_is_admin()
  );

DROP POLICY IF EXISTS "Admins delete KYC files" ON storage.objects;
CREATE POLICY "Admins delete KYC files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND public.current_user_is_admin()
  );

-- =============================================================================
-- After running: restart `npm run dev`, hard-refresh browser, sign in again.
-- =============================================================================
