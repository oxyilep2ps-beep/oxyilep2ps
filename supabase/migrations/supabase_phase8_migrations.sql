-- =============================================================================
-- Oxyile Phase 8 — CMS blog status model, cover_image_url, reference seeds
-- Run after phase7. Do not edit prior migration files.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. cover_image_url + sync from legacy cover_image
-- -----------------------------------------------------------------------------
ALTER TABLE public.blogs
  ADD COLUMN IF NOT EXISTS cover_image_url text;

UPDATE public.blogs
SET cover_image_url = cover_image
WHERE cover_image_url IS NULL AND cover_image IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. Status → text with strict CMS states (avoids enum 55P04 in one transaction)
-- Must drop ALL RLS policies on blogs first (they reference the status column).
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'blogs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.blogs', pol.policyname);
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.blogs_status_idx;

-- Migrate legacy blog_status enum → text status (idempotent for retries)
DO $$
BEGIN
  -- Case A: legacy enum column still present
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blogs'
      AND column_name = 'status' AND udt_name = 'blog_status'
  ) THEN
    ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS status_cms text;

    UPDATE public.blogs
    SET status_cms = CASE
      WHEN status::text IN ('pending', 'PENDING_APPROVAL') THEN 'PENDING_APPROVAL'
      WHEN status::text IN ('approved', 'PUBLISHED') THEN 'PUBLISHED'
      WHEN status::text IN ('rejected', 'REJECTED') THEN 'REJECTED'
      WHEN status::text = 'DRAFT' THEN 'DRAFT'
      ELSE 'DRAFT'
    END
    WHERE status_cms IS NULL;

    ALTER TABLE public.blogs DROP COLUMN status;
    ALTER TABLE public.blogs RENAME COLUMN status_cms TO status;
  END IF;

  -- Case B: partial run left status_cms without status
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blogs' AND column_name = 'status_cms'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blogs' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.blogs RENAME COLUMN status_cms TO status;
  END IF;
END $$;

ALTER TABLE public.blogs
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'DRAFT';

ALTER TABLE public.blogs DROP CONSTRAINT IF EXISTS blogs_status_check;
ALTER TABLE public.blogs
  ADD CONSTRAINT blogs_status_check
  CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED'));

CREATE INDEX IF NOT EXISTS blogs_status_cms_idx ON public.blogs (status, created_at DESC);

-- -----------------------------------------------------------------------------
-- 3. Blogger helper + RLS refresh
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_is_blogger()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text = 'BLOGGER'
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_blogger() TO authenticated;

DROP POLICY IF EXISTS "blogs_select_approved_public" ON public.blogs;
CREATE POLICY "blogs_select_published_public"
  ON public.blogs FOR SELECT TO anon, authenticated
  USING (status = 'PUBLISHED');

DROP POLICY IF EXISTS "blogs_select_hr_admin" ON public.blogs;
CREATE POLICY "blogs_select_staff"
  ON public.blogs FOR SELECT TO authenticated
  USING (
    public.current_user_is_admin()
    OR public.current_user_is_hr()
    OR public.current_user_is_blogger()
  );

DROP POLICY IF EXISTS "blogs_insert_hr" ON public.blogs;
CREATE POLICY "blogs_insert_blogger"
  ON public.blogs FOR INSERT TO authenticated
  WITH CHECK (
    (public.current_user_is_blogger() AND author_id = auth.uid())
    OR public.current_user_is_admin()
  );

DROP POLICY IF EXISTS "blogs_update_hr_admin" ON public.blogs;
CREATE POLICY "blogs_update_staff"
  ON public.blogs FOR UPDATE TO authenticated
  USING (
    public.current_user_is_admin()
    OR (public.current_user_is_blogger() AND author_id = auth.uid())
  )
  WITH CHECK (
    public.current_user_is_admin()
    OR (public.current_user_is_blogger() AND author_id = auth.uid())
  );

DROP POLICY IF EXISTS "blogs_delete_admin" ON public.blogs;
CREATE POLICY "blogs_delete_admin"
  ON public.blogs FOR DELETE TO authenticated
  USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "blogs_delete_blogger_own" ON public.blogs;
CREATE POLICY "blogs_delete_blogger_own"
  ON public.blogs FOR DELETE TO authenticated
  USING (public.current_user_is_blogger() AND author_id = auth.uid());

DROP POLICY IF EXISTS "blog_covers_insert_hr" ON storage.objects;
CREATE POLICY "blog_covers_insert_staff"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'blog-covers'
    AND (public.current_user_is_blogger() OR public.current_user_is_hr() OR public.current_user_is_admin())
  );

-- -----------------------------------------------------------------------------
-- 4. Reference seed blogs (82 writing prompts, status DRAFT, null author)
-- -----------------------------------------------------------------------------
INSERT INTO public.blogs (title, slug, content, cover_image_url, author_id, status)
SELECT
  t.title,
  'ref-' || lower(regexp_replace(t.title, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(t.title), 1, 8),
  '<p><strong>Oxyile reference prompt.</strong> Expand this into a full article for the Oxyile blog: '
    || t.title
    || '. Cover UK P2P lending, compliance, and platform value.</p>',
  NULL,
  NULL,
  'DRAFT'
FROM (
  VALUES
    ('The Future of P2P Lending in the UK'),
    ('How to Manage Investment Risks in 2026'),
    ('GoCardless vs Traditional Banking for Borrowers'),
    ('Understanding EMI Schedules on Oxyile'),
    ('Smart Contracts on Polygon: A Borrower Guide'),
    ('Building a Diversified P2P Portfolio'),
    ('UK FCA Appropriateness Tests Explained'),
    ('Why Transparency Matters in Peer-to-Peer Finance'),
    ('Fixed vs Variable Returns: What Investors Should Know'),
    ('Credit Risk Scoring for Modern Lenders'),
    ('How Oxyile Verifies Borrower Profiles'),
    ('The Role of KYC in Fintech Trust'),
    ('Open Banking and Faster Loan Approvals'),
    ('Debt Consolidation Through P2P Platforms'),
    ('Small Business Loans Without High Street Banks'),
    ('Investor Liquidity: Myths and Realities'),
    ('Tax Implications for UK P2P Investors'),
    ('Automating Repayments with Direct Debit Mandates'),
    ('What Happens When a Borrower Misses an EMI'),
    ('Oxyile Handshake Flow Step by Step'),
    ('Comparing APR vs Flat Interest Rates'),
    ('Green Finance Trends in Alternative Lending'),
    ('Women in Fintech Leadership'),
    ('Cybersecurity Best Practices for Lenders'),
    ('How to Read a Loan Agreement Digital Contract'),
    ('Blockchain Audit Trails for Loan Contracts'),
    ('Customer Support and Complaints in Fintech'),
    ('Scaling a Marketplace Lending Platform'),
    ('Regulatory Updates for UK P2P 2026'),
    ('Borrower Stories: Funding Growth Capital'),
    ('Investor Stories: Passive Income Strategies'),
    ('The Psychology of Lending Decisions'),
    ('Data Privacy in Financial Onboarding'),
    ('Mobile-First Lending UX Patterns'),
    ('Using AI for Fraud Detection in Lending'),
    ('Stress Testing Your Investment Portfolio'),
    ('How Inflation Affects Loan Demand'),
    ('Secondary Markets for Private Loans'),
    ('Institutional Capital in P2P Lending'),
    ('Retail Investor Education Programs'),
    ('Loan Pricing Models Explained'),
    ('Collateral vs Unsecured P2P Loans'),
    ('Building Trust with Liveness Verification'),
    ('Address Verification in AML Workflows'),
    ('Source of Funds Declarations Guide'),
    ('High Net Worth Investor Categories'),
    ('Restricted Investor Rules in the UK'),
    ('Cooling Off Periods and Withdrawals'),
    ('Platform Fees vs Net Returns'),
    ('Referral Programs in Fintech Growth'),
    ('Content Marketing for Lending Brands'),
    ('SEO for Financial Services Blogs'),
    ('Writing Compliant Fintech Copy'),
    ('Video KYC: Pros and Cons'),
    ('Partnership Banking APIs Overview'),
    ('Webhook Reliability for Payment Providers'),
    ('Reconciliation for Subscription EMIs'),
    ('Mandate Cancellation Handling'),
    ('Chargeback vs Direct Debit Disputes'),
    ('Sandbox Testing GoCardless Flows'),
    ('Polygon Amoy Testnet for Developers'),
    ('Gas Fees and Contract Minting Costs'),
    ('Wallet Security for Admin Operations'),
    ('Incident Response for Payment Outages'),
    ('SLA Design for Support Teams'),
    ('OKRs for a Lending Product Team'),
    ('Hiring Compliance Analysts'),
    ('HR Tech Stack for Fintech Startups'),
    ('Careers in Risk and Underwriting'),
    ('Learning Paths for Junior Analysts'),
    ('Community Building for Investors'),
    ('Webinars That Convert Borrowers'),
    ('Email Nurture for Waitlist Users'),
    ('Push Notifications Without Spam'),
    ('Accessibility in Financial Apps'),
    ('Design Systems for Glassmorphism UI'),
    ('A/B Testing Loan Calculator CTAs'),
    ('Churn Reduction for Approved Users'),
    ('Net Promoter Score in Lending'),
    ('Case Study: £50k Business Loan'),
    ('Case Study: First-Time Investor'),
    ('Glossary of P2P Lending Terms')
) AS t(title)
ON CONFLICT (slug) DO NOTHING;
