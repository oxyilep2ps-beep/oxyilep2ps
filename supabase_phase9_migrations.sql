-- =============================================================================
-- Oxyile Phase 9 — Migrate legacy hardcoded public blogs into Supabase
-- Run after phase8. Do not edit prior migration files.
-- =============================================================================

INSERT INTO public.blogs (title, slug, content, cover_image_url, author_id, status, created_at, updated_at)
VALUES
  (
    'How P2P lending is reshaping UK borrowing',
    'p2p-lending-uk-borrowing',
    '<p>The UK P2P market has matured into a regulated alternative to traditional bank loans for many households and small businesses. Platforms like Oxyile focus on transparency: every handshake shows loan amount, rate, duration, EMI, and total return before either party approves.</p><p>Borrowers benefit from competitive pricing when their profile demonstrates stable income and responsible credit behaviour. Investors gain access to diversified exposure with contract records anchored on-chain for auditability.</p><p>Before you apply, gather proof of identity, address history, and (for borrowers) income verification. Our compliance team reviews each profile manually — quality over speed.</p><p>When both parties approve a handshake in chat, the contract moves to “Contract Approved — Money Pending” until fiat settlement clears. EMI schedules then follow the agreed monthly figure.</p>',
    NULL,
    NULL,
    'PUBLISHED',
    '2026-05-11T10:00:00Z',
    now()
  ),
  (
    'Market update: inflation, rates, and investor demand',
    'market-update-rates-2026',
    '<p>Base rates and inflation expectations continue to shape investor appetite for fixed-income style returns. P2P platforms price risk at the individual handshake level rather than a single pooled product rate.</p><p>Investors should stress-test portfolios across durations — shorter terms reduce rate risk; longer terms may offer higher headline yields if borrower quality supports it.</p><p>Oxyile publishes platform announcements in your dashboard hub so you are never surprised by policy or feature changes during active negotiations.</p>',
    NULL,
    NULL,
    'PUBLISHED',
    '2026-05-08T10:00:00Z',
    now()
  ),
  (
    'Building a balanced investor portfolio in 2026',
    'balanced-investor-portfolio-2026',
    '<p>Treat each handshake as a single position. Spread capital across multiple borrowers, sectors, and durations instead of concentrating on one high-yield opportunity.</p><p>Use the in-app chat to ask clarifying questions before approving terms. Good communication reduces disputes later.</p><p>Reinvest returns on a schedule rather than reactively — this smooths cash flow and avoids emotional timing.</p><p>Review published contract status inside your handshake cards once both sides have approved.</p>',
    NULL,
    NULL,
    'PUBLISHED',
    '2026-05-03T10:00:00Z',
    now()
  ),
  (
    'Why Web3 audit trails matter for P2P lending',
    'web3-audit-trail-p2p',
    '<p>Oxyile mints handshake metadata on Polygon Amoy after both parties approve and the borrower links a UK bank mandate. The hash becomes a tamper-evident reference for admins and counterparties.</p><p>Web3 here is an audit layer, not a replacement for regulated fiat movement. EMIs still flow through GoCardless Direct Debit.</p><p>Investors should still perform diligence in chat before approving terms shown on the handshake card.</p>',
    NULL,
    NULL,
    'PUBLISHED',
    '2026-04-28T10:00:00Z',
    now()
  ),
  (
    'GoCardless and automated EMI collections explained',
    'gocardless-emi-automation',
    '<p>After dual approval, borrowers complete a hosted GoCardless Billing Request Flow to authorise BACS Direct Debit.</p><p>When the mandate is active, Oxyile creates a subscription matching the EMI amount and loan duration shown on the handshake card.</p><p>Failed collections follow GoCardless retry rules; borrowers should keep sufficient funds and update bank details if needed.</p>',
    NULL,
    NULL,
    'PUBLISHED',
    '2026-04-25T10:00:00Z',
    now()
  ),
  (
    'Inside the Oxyile smart-contract handshake flow',
    'smart-contract-handshake-flow',
    '<p>Lenders and borrowers negotiate in real-time chat, then send a handshake card with amount, rate, duration, EMI, and total return.</p><p>Dual approval triggers borrower bank linking, Polygon mint, and subscription creation for recurring EMIs.</p><p>The card surfaces live status: Bank Linked, Smart Contract Minted, and Auto-EMI Active when all rails are green.</p>',
    NULL,
    NULL,
    'PUBLISHED',
    '2026-04-22T10:00:00Z',
    now()
  )
ON CONFLICT (slug) DO NOTHING;
