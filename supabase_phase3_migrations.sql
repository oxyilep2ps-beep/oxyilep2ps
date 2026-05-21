-- =============================================================================
-- OXYILE — Phase 3 Migrations (Careers, Admin Chat, Handshake Payments)
-- Paste into Supabase SQL Editor. Do NOT edit prior migration files.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Careers — job applications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  role_applied text NOT NULL,
  resume_url text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REVIEWED', 'REJECTED', 'HIRED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_applications_created_idx ON public.job_applications (created_at DESC);
CREATE INDEX IF NOT EXISTS job_applications_status_idx ON public.job_applications (status);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_applications_admin_all" ON public.job_applications;
CREATE POLICY "job_applications_admin_all"
  ON public.job_applications
  FOR ALL
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "job_applications_public_insert" ON public.job_applications;
CREATE POLICY "job_applications_public_insert"
  ON public.job_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 2. Admin global chat
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_email text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_messages_created_idx ON public.admin_messages (created_at ASC);

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_messages_select_admin" ON public.admin_messages;
CREATE POLICY "admin_messages_select_admin"
  ON public.admin_messages
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "admin_messages_insert_admin" ON public.admin_messages;
CREATE POLICY "admin_messages_insert_admin"
  ON public.admin_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_admin());

-- -----------------------------------------------------------------------------
-- 3. Profiles — ensure ADMIN role + promote jay.bonde@oxyile.com
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.profile_role AS ENUM ('ADMIN', 'INVESTOR', 'BORROWER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO public.admin_allowlist (email)
VALUES ('jay.bonde@oxyile.com')
ON CONFLICT (email) DO NOTHING;

UPDATE public.profiles
SET role = 'ADMIN', status = 'APPROVED', updated_at = now()
WHERE lower(email) = 'jay.bonde@oxyile.com';

UPDATE auth.users u
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role":"ADMIN"}'::jsonb
FROM public.profiles p
WHERE p.id = u.id AND lower(p.email) = 'jay.bonde@oxyile.com';

-- -----------------------------------------------------------------------------
-- 4. Handshakes — payment tracking & EMI fields
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.handshake_payment_status AS ENUM ('PENDING', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.handshakes
  ADD COLUMN IF NOT EXISTS payment_status public.handshake_payment_status NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS emi_amount numeric(14, 2),
  ADD COLUMN IF NOT EXISTS total_return numeric(14, 2);

-- -----------------------------------------------------------------------------
-- 5. Storage bucket for resumes (create in Dashboard if insert fails)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "resumes_public_read" ON storage.objects;
CREATE POLICY "resumes_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resumes');

DROP POLICY IF EXISTS "resumes_anon_upload" ON storage.objects;
CREATE POLICY "resumes_anon_upload"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'resumes');

-- -----------------------------------------------------------------------------
-- 6. Realtime (enable in Dashboard → Replication if this block errors)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Add admin_messages to supabase_realtime manually if needed.';
END $$;
