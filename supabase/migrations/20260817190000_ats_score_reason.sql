-- =============================================================================
-- ATS score + reason columns for applications and kanban applicants
-- Dual-writes ats_score with existing ai_match_score.
-- NEW FILE ONLY — do not edit prior migrations.
-- =============================================================================

begin;

alter table public.job_applications
  add column if not exists ats_score integer,
  add column if not exists ats_reason text;

alter table public.job_applications drop constraint if exists job_applications_ats_score_check;
alter table public.job_applications
  add constraint job_applications_ats_score_check
  check (ats_score is null or ats_score between 0 and 100);

update public.job_applications
set ats_score = ai_match_score
where ats_score is null and ai_match_score is not null;

alter table public.job_applicants
  add column if not exists ats_score integer,
  add column if not exists ats_reason text;

alter table public.job_applicants drop constraint if exists job_applicants_ats_score_check;
alter table public.job_applicants
  add constraint job_applicants_ats_score_check
  check (ats_score is null or ats_score between 0 and 100);

update public.job_applicants
set ats_score = ai_match_score
where ats_score is null and ai_match_score is not null;

comment on column public.job_applications.ats_score is
  '0–100 keyword match of extracted resume text vs job target keywords.';
comment on column public.job_applications.ats_reason is
  'Short human-readable ATS explanation, e.g. Strong match. Missing: Python, AWS.';

commit;
