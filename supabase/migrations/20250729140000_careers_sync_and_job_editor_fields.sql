-- =============================================================================
-- Careers sync + enterprise job editor fields (UK FinTech HR)
-- NEW FILE ONLY — do not edit prior migrations.
-- =============================================================================

begin;

-- Job posting enrichments for public /careers + AI matcher
alter table public.job_postings
  add column if not exists publish_to_careers boolean not null default true,
  add column if not exists responsibilities text not null default '',
  add column if not exists ai_match_keywords text not null default '';

comment on column public.job_postings.publish_to_careers is
  'When true and status=open, listing appears on public /careers.';
comment on column public.job_postings.responsibilities is
  'Key responsibilities & FCA/UK regulatory compliance requirements.';
comment on column public.job_postings.ai_match_keywords is
  'Comma-separated skills used by ATS auto-matcher.';

-- Allow fixed_term employment type
alter table public.job_postings drop constraint if exists job_postings_employment_type_check;
alter table public.job_postings
  add constraint job_postings_employment_type_check
  check (employment_type in ('full_time', 'contractor', 'intern', 'part_time', 'fixed_term'));

-- Applicant LinkedIn from public apply form
alter table public.job_applicants
  add column if not exists linkedin_url text;

-- HR portal configuration (corporate settings — no SQL exposed in UI)
create table if not exists public.hr_portal_settings (
  id text primary key default 'default',
  company_legal_entity text not null default 'Oxyile Ltd (UK FinTech Lender)',
  default_currency text not null default 'GBP',
  public_careers_sync boolean not null default true,
  ats_email_notifications boolean not null default true,
  default_dbs_level text not null default 'standard'
    check (default_dbs_level in ('basic', 'standard', 'enhanced')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.hr_portal_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.hr_portal_settings enable row level security;

drop policy if exists hr_portal_settings_auth_all on public.hr_portal_settings;
create policy hr_portal_settings_auth_all on public.hr_portal_settings
  for all to authenticated using (true) with check (true);

drop policy if exists hr_portal_settings_anon_read on public.hr_portal_settings;
create policy hr_portal_settings_anon_read on public.hr_portal_settings
  for select to anon using (true);

-- Public careers: open + publish flag (budget optional once open)
drop policy if exists hr_job_postings_public_read on public.job_postings;
create policy hr_job_postings_public_read on public.job_postings
  for select to anon
  using (status = 'open' and publish_to_careers = true);

commit;
