-- Pitch review compliance questions for waitlist onboarding.
-- Appends nullable text fields only; does not overwrite existing records.

begin;

alter table public.waitlist
  add column if not exists open_banking_consent text,
  add column if not exists co_applicant_willingness text,
  add column if not exists blockchain_importance text;

comment on column public.waitlist.open_banking_consent is
  'Pitch review question: comfort linking bank via Open Banking.';
comment on column public.waitlist.co_applicant_willingness is
  'Pitch review question: willingness to add trusted co-applicant.';
comment on column public.waitlist.blockchain_importance is
  'Pitch review question: importance of blockchain-backed transparency.';

commit;
