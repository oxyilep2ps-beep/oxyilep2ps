-- =============================================================================
-- OXYILE — Phase 4 Migrations (Admin Social, GoCardless Mandates)
-- Paste into Supabase SQL Editor. Do NOT edit prior migration files.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Admin profiles (visible only to admins)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  cover_url text,
  bio text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_profiles_select_admin" ON public.admin_profiles;
CREATE POLICY "admin_profiles_select_admin"
  ON public.admin_profiles FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "admin_profiles_insert_admin" ON public.admin_profiles;
CREATE POLICY "admin_profiles_insert_admin"
  ON public.admin_profiles FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_admin() AND id = auth.uid());

DROP POLICY IF EXISTS "admin_profiles_update_admin" ON public.admin_profiles;
CREATE POLICY "admin_profiles_update_admin"
  ON public.admin_profiles FOR UPDATE TO authenticated
  USING (public.current_user_is_admin() AND id = auth.uid())
  WITH CHECK (public.current_user_is_admin() AND id = auth.uid());

-- -----------------------------------------------------------------------------
-- 2. Admin 1-on-1 chats
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_chats_no_self CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS admin_chats_pair_idx ON public.admin_chats (sender_id, receiver_id, created_at);
CREATE INDEX IF NOT EXISTS admin_chats_receiver_idx ON public.admin_chats (receiver_id, created_at);

ALTER TABLE public.admin_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_chats_select_admin" ON public.admin_chats;
CREATE POLICY "admin_chats_select_admin"
  ON public.admin_chats FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "admin_chats_insert_admin" ON public.admin_chats;
CREATE POLICY "admin_chats_insert_admin"
  ON public.admin_chats FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_admin() AND sender_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 3. Admin group chat (global room)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_group_messages_created_idx ON public.admin_group_messages (created_at ASC);

ALTER TABLE public.admin_group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_group_messages_select_admin" ON public.admin_group_messages;
CREATE POLICY "admin_group_messages_select_admin"
  ON public.admin_group_messages FOR SELECT TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "admin_group_messages_insert_admin" ON public.admin_group_messages;
CREATE POLICY "admin_group_messages_insert_admin"
  ON public.admin_group_messages FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_admin() AND sender_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 4. GoCardless mandates (per user)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gocardless_mandates (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mandate_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'failed')),
  handshake_id uuid REFERENCES public.handshakes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gocardless_mandates_mandate_idx ON public.gocardless_mandates (mandate_id);

ALTER TABLE public.gocardless_mandates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gocardless_mandates_select_own_or_admin" ON public.gocardless_mandates;
CREATE POLICY "gocardless_mandates_select_own_or_admin"
  ON public.gocardless_mandates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_admin());

DROP POLICY IF EXISTS "gocardless_mandates_insert_own" ON public.gocardless_mandates;
CREATE POLICY "gocardless_mandates_insert_own"
  ON public.gocardless_mandates FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "gocardless_mandates_update_own_or_admin" ON public.gocardless_mandates;
CREATE POLICY "gocardless_mandates_update_own_or_admin"
  ON public.gocardless_mandates FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_admin())
  WITH CHECK (user_id = auth.uid() OR public.current_user_is_admin());

-- Handshake payment rails metadata
ALTER TABLE public.handshakes
  ADD COLUMN IF NOT EXISTS gocardless_subscription_id text,
  ADD COLUMN IF NOT EXISTS auto_emi_active boolean NOT NULL DEFAULT false;

-- -----------------------------------------------------------------------------
-- 5. Realtime (enable in Dashboard → Replication if this block errors)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_chats;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Add admin_chats to supabase_realtime manually if needed.';
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_group_messages;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Add admin_group_messages to supabase_realtime manually if needed.';
END $$;
