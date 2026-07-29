-- =============================================================================
-- Enterprise HRMS & ATS suite (UK FinTech)
-- NEW FILE ONLY — do not edit prior migrations.
-- All monetary columns are GBP (£).
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Helpers: updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. job_postings
-- ---------------------------------------------------------------------------
create table if not exists public.job_postings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department text not null default 'Operations',
  salary_range_gbp text,
  salary_min_gbp numeric(12, 2),
  salary_max_gbp numeric(12, 2),
  status text not null default 'open'
    check (status in ('draft', 'open', 'paused', 'closed', 'filled')),
  requirements text not null default '',
  description text not null default '',
  location text default 'United Kingdom (Remote/Hybrid)',
  employment_type text default 'full_time'
    check (employment_type in ('full_time', 'contractor', 'intern', 'part_time')),
  budget_approved boolean not null default false,
  headcount_requested integer not null default 1,
  source_budget_gbp numeric(12, 2),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_postings_status_idx on public.job_postings (status);
create index if not exists job_postings_department_idx on public.job_postings (department);

drop trigger if exists job_postings_set_updated_at on public.job_postings;
create trigger job_postings_set_updated_at
  before update on public.job_postings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. job_applicants (ATS pipeline)
-- ---------------------------------------------------------------------------
create table if not exists public.job_applicants (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.job_postings (id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  resume_url text,
  ai_match_score integer not null default 0 check (ai_match_score between 0 and 100),
  stage text not null default 'applied'
    check (stage in ('applied', 'shortlisted', 'interview', 'offer', 'hired', 'rejected')),
  background_check_status text not null default 'not_started'
    check (background_check_status in ('not_started', 'in_progress', 'clear', 'flagged', 'dbs_pending', 'dbs_clear')),
  notes text,
  source text default 'direct'
    check (source in ('linkedin', 'direct', 'referral', 'agency', 'careers_page', 'other')),
  referred_by uuid references auth.users (id) on delete set null,
  interview_at timestamptz,
  interview_notes text,
  scorecard_json jsonb not null default '{}'::jsonb,
  offer_letter_html text,
  offer_salary_gbp numeric(12, 2),
  in_talent_pool boolean not null default false,
  duplicate_flag boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists job_applicants_job_id_idx on public.job_applicants (job_id);
create index if not exists job_applicants_stage_idx on public.job_applicants (stage);
create index if not exists job_applicants_email_idx on public.job_applicants (lower(email));
create index if not exists job_applicants_talent_pool_idx on public.job_applicants (in_talent_pool)
  where in_talent_pool = true;

drop trigger if exists job_applicants_set_updated_at on public.job_applicants;
create trigger job_applicants_set_updated_at
  before update on public.job_applicants
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. employee_hr_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.employee_hr_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  department text not null default 'Operations',
  designation text not null default 'Associate',
  employment_type text not null default 'full_time'
    check (employment_type in ('full_time', 'contractor', 'intern', 'part_time')),
  salary_basic_gbp numeric(12, 2) not null default 0,
  salary_hra_gbp numeric(12, 2) not null default 0,
  salary_pension_gbp numeric(12, 2) not null default 0,
  ni_contribution numeric(12, 2) not null default 0,
  kpi_score numeric(5, 2) not null default 0,
  probation_status text not null default 'active'
    check (probation_status in ('not_started', 'active', 'extended', 'passed', 'failed')),
  probation_start_date date,
  probation_end_date date,
  fca_compliance_trained boolean not null default false,
  fca_trained_at timestamptz,
  nda_signed boolean not null default false,
  nda_signed_at timestamptz,
  policy_ack_json jsonb not null default '{}'::jsonb,
  start_date date,
  birthday date,
  manager_id uuid references auth.users (id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'on_leave', 'offboarding', 'terminated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_hr_profiles_department_idx on public.employee_hr_profiles (department);
create index if not exists employee_hr_profiles_status_idx on public.employee_hr_profiles (status);

drop trigger if exists employee_hr_profiles_set_updated_at on public.employee_hr_profiles;
create trigger employee_hr_profiles_set_updated_at
  before update on public.employee_hr_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. leave_requests
-- ---------------------------------------------------------------------------
create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employee_hr_profiles (id) on delete cascade,
  leave_type text not null
    check (leave_type in ('sick', 'casual', 'annual', 'unpaid', 'parental', 'compassionate')),
  start_date date not null,
  end_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reason text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists leave_requests_employee_idx on public.leave_requests (employee_id);
create index if not exists leave_requests_status_idx on public.leave_requests (status);

-- ---------------------------------------------------------------------------
-- 5. expense_claims
-- ---------------------------------------------------------------------------
create table if not exists public.expense_claims (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employee_hr_profiles (id) on delete cascade,
  amount_gbp numeric(12, 2) not null check (amount_gbp >= 0),
  category text not null default 'travel'
    check (category in ('travel', 'software', 'meals', 'equipment', 'training', 'other')),
  receipt_url text,
  description text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'paid')),
  requires_exec_signoff boolean not null default false,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists expense_claims_employee_idx on public.expense_claims (employee_id);
create index if not exists expense_claims_status_idx on public.expense_claims (status);

-- ---------------------------------------------------------------------------
-- 6. hr_audit_logs
-- ---------------------------------------------------------------------------
create table if not exists public.hr_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action_type text not null,
  performed_by uuid references auth.users (id) on delete set null,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists hr_audit_logs_created_at_idx on public.hr_audit_logs (created_at desc);
create index if not exists hr_audit_logs_action_idx on public.hr_audit_logs (action_type);

-- ---------------------------------------------------------------------------
-- Supporting tables (features 11–40)
-- ---------------------------------------------------------------------------
create table if not exists public.hr_attendance_logs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employee_hr_profiles (id) on delete cascade,
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  ip_address text,
  location_tag text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.hr_overtime_logs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employee_hr_profiles (id) on delete cascade,
  work_date date not null,
  hours numeric(5, 2) not null check (hours > 0),
  manager_signed_off boolean not null default false,
  signed_off_by uuid references auth.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.hr_asset_allocations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employee_hr_profiles (id) on delete cascade,
  asset_type text not null
    check (asset_type in ('laptop', 'security_key', 'test_device', 'phone', 'access_card', 'other')),
  asset_label text not null,
  serial_number text,
  allocated_at date not null default current_date,
  returned_at date,
  status text not null default 'allocated'
    check (status in ('allocated', 'returned', 'lost', 'retired')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.hr_access_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employee_hr_profiles (id) on delete set null,
  request_type text not null check (request_type in ('grant', 'revoke')),
  platform_role text not null default 'ADMIN',
  reason text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'done')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.hr_kpi_goals (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employee_hr_profiles (id) on delete cascade,
  quarter text not null,
  title text not null,
  description text,
  progress_pct integer not null default 0 check (progress_pct between 0 and 100),
  status text not null default 'active'
    check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.hr_peer_feedback (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employee_hr_profiles (id) on delete cascade,
  from_name text not null,
  rating integer not null default 3 check (rating between 1 and 5),
  feedback text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.hr_grievances (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body text not null,
  is_anonymous boolean not null default true,
  status text not null default 'open'
    check (status in ('open', 'investigating', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.hr_offboarding (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employee_hr_profiles (id) on delete cascade,
  last_working_day date,
  access_revoked boolean not null default false,
  assets_collected boolean not null default false,
  exit_interview_notes text,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.hr_headcount_requests (
  id uuid primary key default gen_random_uuid(),
  job_posting_id uuid references public.job_postings (id) on delete set null,
  title text not null,
  department text not null,
  salary_budget_gbp numeric(12, 2) not null,
  justification text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  requested_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.hr_referral_bonuses (
  id uuid primary key default gen_random_uuid(),
  referrer_employee_id uuid references public.employee_hr_profiles (id) on delete set null,
  applicant_id uuid references public.job_applicants (id) on delete set null,
  amount_gbp numeric(12, 2) not null default 500,
  status text not null default 'pending'
    check (status in ('pending', 'payable', 'paid', 'cancelled')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.job_postings enable row level security;
alter table public.job_applicants enable row level security;
alter table public.employee_hr_profiles enable row level security;
alter table public.leave_requests enable row level security;
alter table public.expense_claims enable row level security;
alter table public.hr_audit_logs enable row level security;
alter table public.hr_attendance_logs enable row level security;
alter table public.hr_overtime_logs enable row level security;
alter table public.hr_asset_allocations enable row level security;
alter table public.hr_access_requests enable row level security;
alter table public.hr_kpi_goals enable row level security;
alter table public.hr_peer_feedback enable row level security;
alter table public.hr_grievances enable row level security;
alter table public.hr_offboarding enable row level security;
alter table public.hr_headcount_requests enable row level security;
alter table public.hr_referral_bonuses enable row level security;

-- Authenticated staff can read/write via app (server actions use admin client for HR).
-- Policies allow authenticated users; assertHrOrAdmin enforces portal access at app layer.

drop policy if exists hr_job_postings_auth_all on public.job_postings;
create policy hr_job_postings_auth_all on public.job_postings
  for all to authenticated using (true) with check (true);

drop policy if exists hr_job_applicants_auth_all on public.job_applicants;
create policy hr_job_applicants_auth_all on public.job_applicants
  for all to authenticated using (true) with check (true);

drop policy if exists hr_employee_profiles_auth_all on public.employee_hr_profiles;
create policy hr_employee_profiles_auth_all on public.employee_hr_profiles
  for all to authenticated using (true) with check (true);

drop policy if exists hr_leave_requests_auth_all on public.leave_requests;
create policy hr_leave_requests_auth_all on public.leave_requests
  for all to authenticated using (true) with check (true);

drop policy if exists hr_expense_claims_auth_all on public.expense_claims;
create policy hr_expense_claims_auth_all on public.expense_claims
  for all to authenticated using (true) with check (true);

drop policy if exists hr_audit_logs_auth_select on public.hr_audit_logs;
create policy hr_audit_logs_auth_select on public.hr_audit_logs
  for select to authenticated using (true);

drop policy if exists hr_audit_logs_auth_insert on public.hr_audit_logs;
create policy hr_audit_logs_auth_insert on public.hr_audit_logs
  for insert to authenticated with check (true);

drop policy if exists hr_attendance_auth_all on public.hr_attendance_logs;
create policy hr_attendance_auth_all on public.hr_attendance_logs
  for all to authenticated using (true) with check (true);

drop policy if exists hr_overtime_auth_all on public.hr_overtime_logs;
create policy hr_overtime_auth_all on public.hr_overtime_logs
  for all to authenticated using (true) with check (true);

drop policy if exists hr_assets_auth_all on public.hr_asset_allocations;
create policy hr_assets_auth_all on public.hr_asset_allocations
  for all to authenticated using (true) with check (true);

drop policy if exists hr_access_req_auth_all on public.hr_access_requests;
create policy hr_access_req_auth_all on public.hr_access_requests
  for all to authenticated using (true) with check (true);

drop policy if exists hr_kpi_auth_all on public.hr_kpi_goals;
create policy hr_kpi_auth_all on public.hr_kpi_goals
  for all to authenticated using (true) with check (true);

drop policy if exists hr_peer_auth_all on public.hr_peer_feedback;
create policy hr_peer_auth_all on public.hr_peer_feedback
  for all to authenticated using (true) with check (true);

drop policy if exists hr_grievances_auth_all on public.hr_grievances;
create policy hr_grievances_auth_all on public.hr_grievances
  for all to authenticated using (true) with check (true);

drop policy if exists hr_offboarding_auth_all on public.hr_offboarding;
create policy hr_offboarding_auth_all on public.hr_offboarding
  for all to authenticated using (true) with check (true);

drop policy if exists hr_headcount_auth_all on public.hr_headcount_requests;
create policy hr_headcount_auth_all on public.hr_headcount_requests
  for all to authenticated using (true) with check (true);

drop policy if exists hr_referral_auth_all on public.hr_referral_bonuses;
create policy hr_referral_auth_all on public.hr_referral_bonuses
  for all to authenticated using (true) with check (true);

-- Public read of open job postings (careers page)
drop policy if exists hr_job_postings_public_read on public.job_postings;
create policy hr_job_postings_public_read on public.job_postings
  for select to anon using (status = 'open' and budget_approved = true);

comment on table public.job_postings is 'ATS job requisitions with GBP salary bands.';
comment on table public.job_applicants is 'Applicant tracking pipeline stages for UK FinTech hiring.';
comment on table public.employee_hr_profiles is 'HRMS employee records — salary & NI in GBP.';
comment on table public.leave_requests is 'UK leave management (sick/casual/annual).';
comment on table public.expense_claims is 'Expense reimbursement claims in GBP.';
comment on table public.hr_audit_logs is 'Immutable-style audit trail for regulatory export.';

commit;
