-- =============================================================================
-- job_postings.working_model (Remote | On-site | Hybrid)
-- job_applications.ai_match_score for resume-vs-JD ATS matching
-- Dual-writes working_model ↔ location so older careers queries still work.
-- NEW FILE ONLY — do not edit prior migrations.
-- =============================================================================

begin;

alter table public.job_postings
  add column if not exists working_model text;

update public.job_postings
set working_model = case
  when coalesce(working_model, '') in ('Remote', 'On-site', 'Hybrid') then working_model
  when lower(coalesce(location, '')) like '%on-site%'
    or lower(coalesce(location, '')) like '%onsite%'
    or lower(coalesce(location, '')) like '%office%' then 'On-site'
  when lower(coalesce(location, '')) like '%hybrid%' then 'Hybrid'
  when lower(coalesce(location, '')) like '%remote%' then 'Remote'
  else 'Hybrid'
end
where working_model is null
   or working_model not in ('Remote', 'On-site', 'Hybrid');

update public.job_postings
set location = working_model
where working_model in ('Remote', 'On-site', 'Hybrid')
  and coalesce(location, '') is distinct from working_model;

alter table public.job_postings
  alter column working_model set default 'Hybrid';

alter table public.job_postings drop constraint if exists job_postings_working_model_check;
alter table public.job_postings
  add constraint job_postings_working_model_check
  check (working_model in ('Remote', 'On-site', 'Hybrid'));

comment on column public.job_postings.working_model is
  'Working model for the role: Remote, On-site, or Hybrid. location is dual-written to the same value.';

alter table public.job_applications
  add column if not exists ai_match_score integer not null default 0;

alter table public.job_applications drop constraint if exists job_applications_ai_match_score_check;
alter table public.job_applications
  add constraint job_applications_ai_match_score_check
  check (ai_match_score between 0 and 100);

comment on column public.job_applications.ai_match_score is
  '0–100 ATS match from resume text vs job description and match keywords.';

create or replace function public.sync_job_posting_compat_columns()
returns trigger
language plpgsql
as $$
begin
  new.salary_min := coalesce(new.salary_min, new.salary_min_gbp);
  new.salary_max := coalesce(new.salary_max, new.salary_max_gbp);
  new.salary_min_gbp := coalesce(new.salary_min_gbp, new.salary_min);
  new.salary_max_gbp := coalesce(new.salary_max_gbp, new.salary_max);

  new.compliance_responsibilities := coalesce(
    nullif(new.compliance_responsibilities, ''),
    new.responsibilities,
    ''
  );
  new.responsibilities := coalesce(
    nullif(new.responsibilities, ''),
    new.compliance_responsibilities,
    ''
  );
  new.ai_keywords := coalesce(nullif(new.ai_keywords, ''), new.ai_match_keywords, '');
  new.ai_match_keywords := coalesce(nullif(new.ai_match_keywords, ''), new.ai_keywords, '');

  if new.is_published is true then
    new.publish_to_careers := true;
    if new.status is null or new.status = 'draft' then
      new.status := 'open';
    end if;
  end if;

  new.duration_months := coalesce(new.duration_months, new.unpaid_months);
  new.unpaid_months := coalesce(new.unpaid_months, new.duration_months);

  new.working_model := coalesce(nullif(btrim(new.working_model), ''), nullif(btrim(new.location), ''), 'Hybrid');
  if lower(new.working_model) like '%on-site%' or lower(new.working_model) like '%onsite%' then
    new.working_model := 'On-site';
  elsif lower(new.working_model) like '%hybrid%' then
    new.working_model := 'Hybrid';
  elsif lower(new.working_model) like '%remote%' then
    new.working_model := 'Remote';
  elsif new.working_model not in ('Remote', 'On-site', 'Hybrid') then
    new.working_model := 'Hybrid';
  end if;
  new.location := new.working_model;

  return new;
end;
$$;

commit;
