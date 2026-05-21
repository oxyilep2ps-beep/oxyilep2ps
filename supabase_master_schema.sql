-- =============================================================================
-- OXYILE — Master Supabase Schema (idempotent)
-- Run entire file in Supabase SQL Editor. Safe to re-run when updated.
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.profile_role AS ENUM ('ADMIN', 'INVESTOR', 'BORROWER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.profile_status AS ENUM ('PENDING', 'APPROVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- Admin allowlist (update emails here or via SQL)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_allowlist (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.admin_allowlist (email)
VALUES
  ('showlittlemercy@gmail.com'),
  ('preet.datta@oxyile.com')
ON CONFLICT (email) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL,
  full_legal_name text NOT NULL DEFAULT '',
  role public.profile_role NOT NULL DEFAULT 'INVESTOR',
  status public.profile_status NOT NULL DEFAULT 'PENDING',
  kyc_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text
);

CREATE INDEX IF NOT EXISTS profiles_status_idx ON public.profiles (status);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);

-- -----------------------------------------------------------------------------
-- updated_at trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- New auth user → profile row
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  meta jsonb;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  SELECT EXISTS (
    SELECT 1 FROM public.admin_allowlist a
    WHERE lower(a.email) = lower(NEW.email)
  ) INTO is_admin;

  INSERT INTO public.profiles (id, email, full_legal_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(meta->>'full_legal_name', split_part(NEW.email, '@', 1)),
    CASE WHEN is_admin THEN 'ADMIN'::public.profile_role ELSE 'INVESTOR'::public.profile_role END,
    CASE WHEN is_admin THEN 'APPROVED'::public.profile_status ELSE 'PENDING'::public.profile_status END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- RLS — profiles
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;
CREATE POLICY "Admins update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Admins delete profiles" ON public.profiles;
CREATE POLICY "Admins delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- -----------------------------------------------------------------------------
-- Storage bucket: kyc-documents (private)
-- Run in SQL Editor; if bucket exists, this is a no-op via API note below.
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS
DROP POLICY IF EXISTS "Users upload own KYC folder" ON storage.objects;
CREATE POLICY "Users upload own KYC folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users read own KYC files" ON storage.objects;
CREATE POLICY "Users read own KYC files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Admins read all KYC files" ON storage.objects;
CREATE POLICY "Admins read all KYC files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "Admins delete KYC files" ON storage.objects;
CREATE POLICY "Admins delete KYC files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- -----------------------------------------------------------------------------
-- Helper: admin hard-delete user (profile + storage + auth user via Edge/Service)
-- Called from server with service role for auth.users delete.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_user_profile(target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = target_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- kyc_data JSONB shape (documentation — not enforced by DB)
-- -----------------------------------------------------------------------------
COMMENT ON COLUMN public.profiles.kyc_data IS
'SignUpWizard payload: accountRole, basic (name,email,phone,dob,addresses), identity.documents paths, lender|borrower fields.';

-- =============================================================================
-- POST-RUN CHECKLIST (Supabase Dashboard)
-- 1. Authentication → Email: enable Email provider
-- 2. Authentication → URL Configuration: Site URL + redirect URLs for /auth/callback
-- 3. Paste SUPABASE_SERVICE_ROLE_KEY into Next.js .env.local (server-only)
-- 4. Add ADMIN_EMAIL to .env.local to match admin_allowlist
-- =============================================================================
