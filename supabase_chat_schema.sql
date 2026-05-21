-- =============================================================================
-- OXYILE — Real-time Chat Schema (NEW FILE)
-- Run in Supabase SQL Editor. Idempotent where possible.
-- Does not modify supabase_master_schema.sql or other migration files.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Migrate legacy `messages` table (phase2 used recipient_id + body)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'messages'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'recipient_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'receiver_id'
    ) THEN
      ALTER TABLE public.messages RENAME COLUMN recipient_id TO receiver_id;
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'body'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'content'
    ) THEN
      ALTER TABLE public.messages RENAME COLUMN body TO content;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'is_read'
    ) THEN
      ALTER TABLE public.messages ADD COLUMN is_read boolean NOT NULL DEFAULT false;
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Create table (fresh install or after migration)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Backfill NOT NULL columns if table existed empty
ALTER TABLE public.messages
  ALTER COLUMN is_read SET DEFAULT false;

CREATE INDEX IF NOT EXISTS messages_sender_created_idx
  ON public.messages (sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_receiver_created_idx
  ON public.messages (receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_receiver_unread_idx
  ON public.messages (receiver_id, is_read)
  WHERE is_read = false;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_own" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can read messages if they are the sender or the receiver" ON public.messages;

CREATE POLICY "Users can insert their own messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can read messages if they are the sender or the receiver"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Optional: allow receiver to mark messages as read
DROP POLICY IF EXISTS "Users can update read state on received messages" ON public.messages;
CREATE POLICY "Users can update read state on received messages"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- -----------------------------------------------------------------------------
-- Realtime (enable in Supabase Dashboard → Database → Replication if needed)
-- Add `messages` to supabase_realtime publication:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
-- =============================================================================
