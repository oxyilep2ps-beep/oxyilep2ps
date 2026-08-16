-- =============================================================================
-- job_postings.what_you_will_gain — public /careers "What You'll Gain" copy
-- NEW FILE ONLY — do not edit prior migrations.
-- =============================================================================

begin;

alter table public.job_postings
  add column if not exists what_you_will_gain text;

comment on column public.job_postings.what_you_will_gain is
  'Optional public /careers copy for the What You''ll Gain section. When empty, unpaid roles use the default recognition / FT-path / hands-on template.';

commit;
