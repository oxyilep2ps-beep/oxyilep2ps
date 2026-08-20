-- Decouple system roles from P2P financial capabilities.
-- NEW FILE ONLY — do not edit prior migrations.

begin;

alter table public.profiles
  add column if not exists is_investor boolean not null default false;

alter table public.profiles
  add column if not exists is_borrower boolean not null default false;

comment on column public.profiles.is_investor is
  'Financial capability: user may act as lender/investor in P2P handshakes (independent of system role).';

comment on column public.profiles.is_borrower is
  'Financial capability: user may act as borrower in P2P handshakes (independent of system role).';

-- Backfill from legacy single-role column + KYC accountRole when present.
update public.profiles
set is_investor = true
where role::text in ('INVESTOR', 'investor')
   or coalesce(kyc_data->>'accountRole', '') = 'lender';

update public.profiles
set is_borrower = true
where role::text in ('BORROWER', 'borrower')
   or coalesce(kyc_data->>'accountRole', '') = 'borrower';

-- Admins who already use View As into financial portals get both capabilities
-- so handshake chat validation works without forcing a role change.
update public.profiles
set
  is_investor = true,
  is_borrower = true
where role::text in ('ADMIN', 'admin');

create index if not exists profiles_is_investor_idx
  on public.profiles (is_investor)
  where is_investor = true;

create index if not exists profiles_is_borrower_idx
  on public.profiles (is_borrower)
  where is_borrower = true;

commit;
