-- =============================================================================
-- OXYILE — Phase 2 Migrations (Compliance, Social, Handshakes)
-- Paste into Supabase SQL Editor. Idempotent where possible. Do NOT auto-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Compliance — profiles
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS borrower_sort_code text,
  ADD COLUMN IF NOT EXISTS borrower_account_number text;

COMMENT ON COLUMN public.profiles.postal_code IS 'UK postal code — required for all users at signup';
COMMENT ON COLUMN public.profiles.borrower_sort_code IS 'Borrower payout bank sort code (UK)';
COMMENT ON COLUMN public.profiles.borrower_account_number IS 'Borrower payout bank account number (UK)';

-- -----------------------------------------------------------------------------
-- 2. Announcements
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  admin_author uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcements_created_idx
  ON public.announcements (created_at DESC);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_select_approved" ON public.announcements;
CREATE POLICY "announcements_select_approved"
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_approved_member());

DROP POLICY IF EXISTS "announcements_admin_insert" ON public.announcements;
CREATE POLICY "announcements_admin_insert"
  ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "announcements_admin_update" ON public.announcements;
CREATE POLICY "announcements_admin_update"
  ON public.announcements
  FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "announcements_admin_delete" ON public.announcements;
CREATE POLICY "announcements_admin_delete"
  ON public.announcements
  FOR DELETE
  TO authenticated
  USING (public.current_user_is_admin());

-- -----------------------------------------------------------------------------
-- 3. Chat social status — messages read tracking
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN is_read boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'read_at'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN read_at timestamptz;
  END IF;
END $$;

ALTER TABLE public.messages ALTER COLUMN is_read SET DEFAULT false;

-- Receiver can mark inbound messages as read
DROP POLICY IF EXISTS "messages_update_mark_read" ON public.messages;
CREATE POLICY "messages_update_mark_read"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 4. User presence (online / offline)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.presence_status AS ENUM ('online', 'offline');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  status public.presence_status NOT NULL DEFAULT 'offline',
  last_seen timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "presence_select_authenticated" ON public.user_presence;
CREATE POLICY "presence_select_authenticated"
  ON public.user_presence
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "presence_upsert_own" ON public.user_presence;
CREATE POLICY "presence_upsert_own"
  ON public.user_presence
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 5. Handshakes (Polygon on-chain agreement records)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.handshake_status AS ENUM ('PENDING', 'ACTIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.handshakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  borrower_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  rate numeric(6, 3) NOT NULL CHECK (rate >= 0),
  duration integer NOT NULL CHECK (duration > 0),
  polygon_tx_hash text,
  status public.handshake_status NOT NULL DEFAULT 'PENDING',
  lender_approved_at timestamptz,
  borrower_approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz
);

CREATE INDEX IF NOT EXISTS handshakes_lender_idx ON public.handshakes (lender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS handshakes_borrower_idx ON public.handshakes (borrower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS handshakes_status_idx ON public.handshakes (status);

ALTER TABLE public.handshakes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "handshakes_select_parties" ON public.handshakes;
CREATE POLICY "handshakes_select_parties"
  ON public.handshakes
  FOR SELECT
  TO authenticated
  USING (lender_id = auth.uid() OR borrower_id = auth.uid());

DROP POLICY IF EXISTS "handshakes_insert_parties" ON public.handshakes;
CREATE POLICY "handshakes_insert_parties"
  ON public.handshakes
  FOR INSERT
  TO authenticated
  WITH CHECK (lender_id = auth.uid() OR borrower_id = auth.uid());

DROP POLICY IF EXISTS "handshakes_update_parties" ON public.handshakes;
CREATE POLICY "handshakes_update_parties"
  ON public.handshakes
  FOR UPDATE
  TO authenticated
  USING (lender_id = auth.uid() OR borrower_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 6. Realtime publication (enable in Dashboard → Database → Replication too)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'handshakes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.handshakes;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'supabase_realtime publication not found — enable Realtime manually in Supabase Dashboard.';
END $$;

-- -----------------------------------------------------------------------------
-- 7. Seed sample announcement (optional — remove if not wanted)
-- -----------------------------------------------------------------------------
INSERT INTO public.announcements (title, content, admin_author)
SELECT
  'Welcome to Oxyile Phase 2',
  'Realtime chat, handshakes, and compliance upgrades are live. Complete your profile postal code and bank details if you are a borrower.',
  (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM public.announcements LIMIT 1);
