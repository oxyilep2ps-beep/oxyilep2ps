-- Denormalized questionnaire columns so Yes/No answers survive even if kyc_data
-- is partially wiped by a stub trigger. Document URL columns re-asserted.
-- NEW FILE ONLY — do not edit prior migrations.

begin;

-- Document URL columns (canonical names used by the Next.js app)
alter table public.profiles
  add column if not exists proof_of_identity_url text,
  add column if not exists liveness_video_url text,
  add column if not exists proof_of_address_url text,
  add column if not exists income_verification_url text,
  add column if not exists kyc_data jsonb not null default '{}'::jsonb,
  add column if not exists fca_test_answers jsonb default '{}'::jsonb;

-- Flat questionnaire answers (Yes / No) — admin fallbacks when kyc_data is empty
alter table public.profiles
  add column if not exists is_uk_resident text,
  add column if not exists understands_p2p_risk text,
  add column if not exists marketing_consent text;

comment on column public.profiles.is_uk_resident is
  'Onboarding Yes/No: Are you a UK resident?';
comment on column public.profiles.understands_p2p_risk is
  'Onboarding Yes/No: Do you understand P2P lending carries risk?';
comment on column public.profiles.marketing_consent is
  'Onboarding Yes/No: May we email you about launch updates?';

commit;
