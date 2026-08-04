-- =============================================================================
-- OXYILE — Phase 6 Migrations (Applications Hub, Waitlist, HR Blogs, Support,
-- Oliver AI Training, Site Theme Animations)
-- Paste into Supabase SQL Editor. Do NOT edit prior migration files.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. HR role on profiles
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TYPE public.profile_role ADD VALUE IF NOT EXISTS 'HR';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Super-HR test account marker
-- NOTE: We avoid writing the new enum value in this same transaction to prevent
-- "unsafe use of new value" errors. App-layer auth already force-assigns HR.
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role":"HR","super_hr":true}'::jsonb
WHERE lower(email) = 'flacmily@gmail.com';

-- -----------------------------------------------------------------------------
-- 2. Waitlist
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  postal_code text,
  role text NOT NULL CHECK (role IN ('borrower', 'investor')),
  questionnaire_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  waitlist_rank bigint GENERATED ALWAYS AS IDENTITY,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_unique_idx ON public.waitlist (lower(email));
CREATE INDEX IF NOT EXISTS waitlist_role_idx ON public.waitlist (role);
CREATE INDEX IF NOT EXISTS waitlist_rank_idx ON public.waitlist (waitlist_rank);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waitlist_insert_public" ON public.waitlist;
CREATE POLICY "waitlist_insert_public"
  ON public.waitlist FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "waitlist_select_admin" ON public.waitlist;
CREATE POLICY "waitlist_select_admin"
  ON public.waitlist FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

-- -----------------------------------------------------------------------------
-- 3. Application rejections archive (for Admin Applications > Rejected tab)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.application_rejections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  full_legal_name text,
  role text,
  rejection_reason text,
  kyc_data jsonb,
  rejected_at timestamptz NOT NULL DEFAULT now(),
  rejected_by text
);

ALTER TABLE public.application_rejections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "application_rejections_admin" ON public.application_rejections;
CREATE POLICY "application_rejections_admin"
  ON public.application_rejections FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- -----------------------------------------------------------------------------
-- 4. HR / Admin blogs
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.blog_status AS ENUM ('pending', 'approved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.blogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content text NOT NULL DEFAULT '',
  cover_image text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.blog_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS blogs_status_idx ON public.blogs (status, created_at DESC);

ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_is_hr()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text = 'HR'
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_hr() TO authenticated;

DROP POLICY IF EXISTS "blogs_select_approved_public" ON public.blogs;
CREATE POLICY "blogs_select_approved_public"
  ON public.blogs FOR SELECT TO anon, authenticated
  USING (status = 'approved'::public.blog_status);

DROP POLICY IF EXISTS "blogs_select_hr_admin" ON public.blogs;
CREATE POLICY "blogs_select_hr_admin"
  ON public.blogs FOR SELECT TO authenticated
  USING (public.current_user_is_admin() OR public.current_user_is_hr());

DROP POLICY IF EXISTS "blogs_insert_hr" ON public.blogs;
CREATE POLICY "blogs_insert_hr"
  ON public.blogs FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_hr() AND author_id = auth.uid());

DROP POLICY IF EXISTS "blogs_update_hr_admin" ON public.blogs;
CREATE POLICY "blogs_update_hr_admin"
  ON public.blogs FOR UPDATE TO authenticated
  USING (public.current_user_is_admin() OR (public.current_user_is_hr() AND author_id = auth.uid()))
  WITH CHECK (public.current_user_is_admin() OR (public.current_user_is_hr() AND author_id = auth.uid()));

-- Blog cover images bucket (create in Dashboard if policy fails)
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-covers', 'blog-covers', true)
ON CONFLICT (id) DO NOTHING;

-- HR blog cover uploads (authenticated HR/Admin)
DROP POLICY IF EXISTS "blog_covers_insert_hr" ON storage.objects;
CREATE POLICY "blog_covers_insert_hr"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'blog-covers'
    AND (public.current_user_is_hr() OR public.current_user_is_admin())
  );

DROP POLICY IF EXISTS "blog_covers_select_public" ON storage.objects;
CREATE POLICY "blog_covers_select_public"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'blog-covers');

-- -----------------------------------------------------------------------------
-- 5. Contact & complaints
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'replied', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_insert_public" ON public.contact_messages;
CREATE POLICY "contact_insert_public"
  ON public.contact_messages FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "contact_admin" ON public.contact_messages;
CREATE POLICY "contact_admin"
  ON public.contact_messages FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "complaints_insert_public" ON public.complaints;
CREATE POLICY "complaints_insert_public"
  ON public.complaints FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "complaints_admin" ON public.complaints;
CREATE POLICY "complaints_admin"
  ON public.complaints FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- -----------------------------------------------------------------------------
-- 6. Oliver AI dynamic knowledge base
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bot_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_string text NOT NULL,
  answer_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bot_knowledge_keywords_idx ON public.bot_knowledge USING gin (to_tsvector('english', keyword_string));

ALTER TABLE public.bot_knowledge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bot_knowledge_select_public" ON public.bot_knowledge;
CREATE POLICY "bot_knowledge_select_public"
  ON public.bot_knowledge FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "bot_knowledge_admin" ON public.bot_knowledge;
CREATE POLICY "bot_knowledge_admin"
  ON public.bot_knowledge FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- -----------------------------------------------------------------------------
-- 7. Site theme / monthly animation settings
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.site_animation_theme AS ENUM (
    'auto', 'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.site_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_animation public.site_animation_theme NOT NULL DEFAULT 'auto',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.site_settings (id, current_animation)
VALUES (1, 'auto')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_select_public" ON public.site_settings;
CREATE POLICY "site_settings_select_public"
  ON public.site_settings FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "site_settings_admin" ON public.site_settings;
CREATE POLICY "site_settings_admin"
  ON public.site_settings FOR UPDATE TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());
