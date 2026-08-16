-- =============================================================================
-- job_postings.duration_months — generic internship duration (not "unpaid")
-- Dual-writes with unpaid_months so older app code keeps working.
-- NEW FILE ONLY — do not edit prior migrations.
-- =============================================================================

begin;

alter table public.job_postings
  add column if not exists duration_months integer;

update public.job_postings
set duration_months = unpaid_months
where duration_months is null and unpaid_months is not null;

alter table public.job_postings drop constraint if exists job_postings_duration_months_check;
alter table public.job_postings
  add constraint job_postings_duration_months_check
  check (duration_months is null or duration_months >= 0);

comment on column public.job_postings.duration_months is
  'Internship or intern-to-full-time duration in months. Public copy uses "Internship for N months" (never "Unpaid").';

-- Stop wiping duration when intern-to-FT is off. Keep unpaid_months in sync.
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

  return new;
end;
$$;

commit;
