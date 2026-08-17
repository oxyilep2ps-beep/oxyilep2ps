-- =============================================================================
-- Dedicated ATS scoring columns on applications (and kanban dual-write).
-- NEW FILE ONLY — do not edit prior migrations.
-- =============================================================================

begin;

alter table public.job_applications
  add column if not exists ats_score integer;

alter table public.job_applications
  add column if not exists ats_reasoning text;

alter table public.job_applications
  alter column ats_score set default 0;

update public.job_applications
set ats_score = 0
where ats_score is null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'job_applications'
      and column_name = 'ats_reason'
  ) then
    update public.job_applications
    set ats_reasoning = ats_reason
    where coalesce(nullif(trim(ats_reasoning), ''), '') = ''
      and coalesce(nullif(trim(ats_reason), ''), '') <> '';
  end if;
end $$;

alter table public.job_applications drop constraint if exists job_applications_ats_score_check;
alter table public.job_applications
  add constraint job_applications_ats_score_check
  check (ats_score is null or ats_score between 0 and 100);

comment on column public.job_applications.ats_score is
  '0–100 ATS match of extracted resume text vs job keywords / description.';
comment on column public.job_applications.ats_reasoning is
  'Human-readable ATS explanation, e.g. Strong match. Found: React, Next.js.';

alter table public.job_applicants
  add column if not exists ats_score integer;

alter table public.job_applicants
  add column if not exists ats_reasoning text;

alter table public.job_applicants
  alter column ats_score set default 0;

update public.job_applicants
set ats_score = 0
where ats_score is null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'job_applicants'
      and column_name = 'ats_reason'
  ) then
    update public.job_applicants
    set ats_reasoning = ats_reason
    where coalesce(nullif(trim(ats_reasoning), ''), '') = ''
      and coalesce(nullif(trim(ats_reason), ''), '') <> '';
  end if;
end $$;

alter table public.job_applicants drop constraint if exists job_applicants_ats_score_check;
alter table public.job_applicants
  add constraint job_applicants_ats_score_check
  check (ats_score is null or ats_score between 0 and 100);

commit;
