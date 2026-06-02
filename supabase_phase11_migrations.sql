-- =============================================================================
-- Oxyile Phase 11 — God Mode Command Center
-- Run AFTER all prior phase migrations. Do not edit earlier migration files.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Admin audit trail
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email text NOT NULL,
  action_description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_at_idx
  ON public.admin_audit_logs (created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_logs_select_admin" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_select_admin"
  ON public.admin_audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "admin_audit_logs_insert_service" ON public.admin_audit_logs;
CREATE POLICY "admin_audit_logs_insert_service"
  ON public.admin_audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- -----------------------------------------------------------------------------
-- 2. Platform settings (emergency kill switch)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  emergency_kill_switch_active boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_settings (id, emergency_kill_switch_active)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_settings_select_authenticated" ON public.platform_settings;
CREATE POLICY "platform_settings_select_authenticated"
  ON public.platform_settings FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "platform_settings_update_admin" ON public.platform_settings;
CREATE POLICY "platform_settings_update_admin"
  ON public.platform_settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- -----------------------------------------------------------------------------
-- 3. Complaints SLA deadline (24h from creation)
-- -----------------------------------------------------------------------------
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS sla_deadline timestamptz;

UPDATE public.complaints
SET sla_deadline = created_at + interval '24 hours'
WHERE sla_deadline IS NULL;

-- -----------------------------------------------------------------------------
-- 4. KYC fraud sentinel flag on profiles
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_flagged boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_kyc_flagged_idx
  ON public.profiles (kyc_flagged)
  WHERE kyc_flagged = true;
