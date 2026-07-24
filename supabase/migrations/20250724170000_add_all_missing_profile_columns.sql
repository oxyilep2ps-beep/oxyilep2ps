-- =============================================================================
-- Catch-up migration: ensure ALL profile columns used by the Next.js app exist.
-- Safe to re-run: every statement uses IF NOT EXISTS / drop-if-exists patterns.
-- DO NOT edit prior migration files — apply this on Supabase instead.
-- =============================================================================

begin;

-- Core identity / KYC document paths (onboarding + admin pending reviews)
alter table public.profiles
  add column if not exists postal_code text,
  add column if not exists fca_test_answers jsonb default '{}'::jsonb,
  add column if not exists proof_of_identity_url text,
  add column if not exists liveness_video_url text,
  add column if not exists proof_of_address_url text,
  add column if not exists income_verification_url text;

-- Borrower bank payout details
alter table public.profiles
  add column if not exists borrower_sort_code text,
  add column if not exists borrower_account_number text;

-- Social / public profile fields
alter table public.profiles
  add column if not exists username text,
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists cover_url text;

-- Platform access gate (suspend / unsuspend)
alter table public.profiles
  add column if not exists account_status varchar(20) not null default 'active';

alter table public.profiles
  drop constraint if exists profiles_account_status_check;

alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('active', 'suspended'));

-- Lending / collateral fields written during apply-loan + admin views
alter table public.profiles
  add column if not exists target_amount numeric not null default 0,
  add column if not exists expected_interest_rate numeric not null default 0,
  add column if not exists collateral_type text,
  add column if not exists collateral_value numeric not null default 0,
  add column if not exists collateral_description text,
  add column if not exists collateral_proof_url text;

-- Fraud / compliance flag used by admin fraud tools
alter table public.profiles
  add column if not exists kyc_flagged boolean not null default false;

-- Ensure JSONB KYC blob + review metadata exist (master schema may already have these)
alter table public.profiles
  add column if not exists kyc_data jsonb not null default '{}'::jsonb,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Helpful indexes (idempotent)
create index if not exists profiles_account_status_idx
  on public.profiles (account_status);

create index if not exists profiles_kyc_flagged_idx
  on public.profiles (kyc_flagged)
  where kyc_flagged = true;

create index if not exists profiles_target_amount_idx
  on public.profiles (target_amount);

create index if not exists profiles_expected_interest_rate_idx
  on public.profiles (expected_interest_rate);

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null and username <> '';

comment on column public.profiles.proof_of_identity_url is
  'Storage path (or URL) for ID proof uploaded during onboarding.';
comment on column public.profiles.liveness_video_url is
  'Storage path for liveness / selfie video uploaded during onboarding.';
comment on column public.profiles.proof_of_address_url is
  'Storage path for address proof uploaded during onboarding.';
comment on column public.profiles.income_verification_url is
  'Storage path for borrower income verification document (optional).';
comment on column public.profiles.account_status is
  'Platform access gate: active | suspended. Independent of KYC approval status.';
comment on column public.profiles.kyc_flagged is
  'Admin fraud flag; true surfaces the profile in fraud tooling.';

-- Note: rejection_reason is stored on public.application_rejections, not profiles.
-- Ensure that archive table exists for reject-applicant flows.
create table if not exists public.application_rejections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text not null,
  full_legal_name text,
  role text,
  rejection_reason text,
  kyc_data jsonb,
  rejected_at timestamptz not null default now(),
  rejected_by text
);

alter table public.application_rejections
  add column if not exists user_id uuid,
  add column if not exists email text,
  add column if not exists full_legal_name text,
  add column if not exists role text,
  add column if not exists rejection_reason text,
  add column if not exists kyc_data jsonb,
  add column if not exists rejected_at timestamptz not null default now(),
  add column if not exists rejected_by text;

create index if not exists application_rejections_rejected_at_idx
  on public.application_rejections (rejected_at desc);

commit;
