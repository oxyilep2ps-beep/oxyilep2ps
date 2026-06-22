-- =============================================================================
-- Oxyile Phase 22 — Newsletter Campaign Broadcast (Resend)
-- Run after Phase 21 migrations. Do not modify older migration files.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Newsletter campaigns audit log
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  html_content text NOT NULL,
  sent_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_campaigns_status_check CHECK (
    status IN ('sent', 'failed', 'queued')
  )
);

CREATE INDEX IF NOT EXISTS newsletter_campaigns_created_at_idx
  ON public.newsletter_campaigns (created_at DESC);

CREATE INDEX IF NOT EXISTS newsletter_campaigns_sent_by_idx
  ON public.newsletter_campaigns (sent_by, created_at DESC);

-- -----------------------------------------------------------------------------
-- 2. RLS — readable by admins; writes via service role API route
-- -----------------------------------------------------------------------------
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter_campaigns_admin_select" ON public.newsletter_campaigns;
CREATE POLICY "newsletter_campaigns_admin_select"
  ON public.newsletter_campaigns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );
