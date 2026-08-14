-- Single-player bot simulation dataset schemas (curated subset only).
-- Forward-only migration. Prerequisite: admin RLS helpers exist.

begin;

-- ---------------------------------------------------------------------------
-- Registry (Admin dashboard + ingestion metadata)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_dataset_registry (
  slug text primary key,
  display_name text not null,
  source_file text not null default '',
  row_count int not null default 0,
  excel_file text,
  simulation_status text not null default 'pending_review'
    check (simulation_status in (
      'active_in_simulation',
      'training_ai_model',
      'discarded',
      'pending_review',
      'conversion_error'
    )),
  feature_mapping text not null default '',
  supabase_table text,
  truncated boolean not null default false,
  last_ingested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Bot economy tables (single-player simulation — no multiplayer network)
-- ---------------------------------------------------------------------------
create table if not exists public.sim_bot_loans (
  id uuid primary key default gen_random_uuid(),
  external_key text,
  borrower_name text not null,
  purpose text,
  loan_amount numeric(14,2) not null default 0,
  interest_rate numeric(8,4),
  status text,
  risk_indicator int,
  failure_score int,
  financial_strength_indicator text,
  years_of_credit_history int,
  delinquencies int,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sim_bot_loans_borrower_idx on public.sim_bot_loans (borrower_name);
create index if not exists sim_bot_loans_status_idx on public.sim_bot_loans (status);

create table if not exists public.sim_bot_directors (
  id uuid primary key default gen_random_uuid(),
  company_reg_number bigint,
  individual_id bigint,
  is_officer boolean default false,
  is_ubo boolean default false,
  disqual boolean default false,
  appointment date,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sim_bot_directors_company_idx on public.sim_bot_directors (company_reg_number);

create table if not exists public.sim_compliance_violations (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  penalty_amount text,
  agency text,
  primary_offense text,
  record_year int,
  hq_country text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sim_compliance_violations_company_idx on public.sim_compliance_violations (company_name);

create table if not exists public.sim_factoring_profiles (
  id uuid primary key default gen_random_uuid(),
  company_reg_number bigint,
  revenue_2019 numeric(16,2),
  factor_amount numeric(16,2),
  factor_percent numeric(8,2),
  factoring_type text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sim_npc_employee_profiles (
  id uuid primary key default gen_random_uuid(),
  employee_number int,
  department text,
  job_role text,
  attrition text,
  monthly_income numeric(12,2),
  overtime text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sim_esg_company_scores (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  country text,
  sector text,
  overall_rating text,
  overall_score numeric(6,2),
  environmental_score numeric(6,2),
  social_score numeric(6,2),
  governance_score numeric(6,2),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sim_esg_company_scores_name_idx on public.sim_esg_company_scores (company_name);

create table if not exists public.sim_fraud_feature_rows (
  id uuid primary key default gen_random_uuid(),
  amount numeric(14,2),
  is_fraud boolean not null default false,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sim_fraud_feature_rows_fraud_idx on public.sim_fraud_feature_rows (is_fraud);

create table if not exists public.sim_macro_bus_loans (
  id uuid primary key default gen_random_uuid(),
  record_date date not null,
  bus_loans_index numeric(14,4) not null,
  created_at timestamptz not null default now(),
  unique (record_date)
);

create table if not exists public.sim_individual_profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  geography text,
  postcode text,
  nationality text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sim_individual_profiles_postcode_idx on public.sim_individual_profiles (postcode);

create table if not exists public.sim_security_flow_events (
  id uuid primary key default gen_random_uuid(),
  src_ip text,
  dst_ip text,
  protocol text,
  service text,
  attack_label text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS — admin read; service_role full access for seed scripts
-- ---------------------------------------------------------------------------
alter table public.ai_dataset_registry enable row level security;
alter table public.sim_bot_loans enable row level security;
alter table public.sim_bot_directors enable row level security;
alter table public.sim_compliance_violations enable row level security;
alter table public.sim_factoring_profiles enable row level security;
alter table public.sim_npc_employee_profiles enable row level security;
alter table public.sim_esg_company_scores enable row level security;
alter table public.sim_fraud_feature_rows enable row level security;
alter table public.sim_macro_bus_loans enable row level security;
alter table public.sim_individual_profiles enable row level security;
alter table public.sim_security_flow_events enable row level security;

drop policy if exists ai_dataset_registry_admin_select on public.ai_dataset_registry;
create policy ai_dataset_registry_admin_select
  on public.ai_dataset_registry for select to authenticated
  using (public.current_user_is_admin());

drop policy if exists sim_bot_loans_admin_select on public.sim_bot_loans;
create policy sim_bot_loans_admin_select
  on public.sim_bot_loans for select to authenticated
  using (public.current_user_is_admin());

drop policy if exists sim_bot_directors_admin_select on public.sim_bot_directors;
create policy sim_bot_directors_admin_select
  on public.sim_bot_directors for select to authenticated
  using (public.current_user_is_admin());

drop policy if exists sim_compliance_violations_admin_select on public.sim_compliance_violations;
create policy sim_compliance_violations_admin_select
  on public.sim_compliance_violations for select to authenticated
  using (public.current_user_is_admin());

drop policy if exists sim_factoring_profiles_admin_select on public.sim_factoring_profiles;
create policy sim_factoring_profiles_admin_select
  on public.sim_factoring_profiles for select to authenticated
  using (public.current_user_is_admin());

drop policy if exists sim_npc_employee_profiles_admin_select on public.sim_npc_employee_profiles;
create policy sim_npc_employee_profiles_admin_select
  on public.sim_npc_employee_profiles for select to authenticated
  using (public.current_user_is_admin());

drop policy if exists sim_esg_company_scores_admin_select on public.sim_esg_company_scores;
create policy sim_esg_company_scores_admin_select
  on public.sim_esg_company_scores for select to authenticated
  using (public.current_user_is_admin());

drop policy if exists sim_fraud_feature_rows_admin_select on public.sim_fraud_feature_rows;
create policy sim_fraud_feature_rows_admin_select
  on public.sim_fraud_feature_rows for select to authenticated
  using (public.current_user_is_admin());

drop policy if exists sim_macro_bus_loans_admin_select on public.sim_macro_bus_loans;
create policy sim_macro_bus_loans_admin_select
  on public.sim_macro_bus_loans for select to authenticated
  using (public.current_user_is_admin());

drop policy if exists sim_individual_profiles_admin_select on public.sim_individual_profiles;
create policy sim_individual_profiles_admin_select
  on public.sim_individual_profiles for select to authenticated
  using (public.current_user_is_admin());

drop policy if exists sim_security_flow_events_admin_select on public.sim_security_flow_events;
create policy sim_security_flow_events_admin_select
  on public.sim_security_flow_events for select to authenticated
  using (public.current_user_is_admin());

grant select on public.ai_dataset_registry to authenticated;
grant select on public.sim_bot_loans to authenticated;
grant select on public.sim_bot_directors to authenticated;
grant select on public.sim_compliance_violations to authenticated;
grant select on public.sim_factoring_profiles to authenticated;
grant select on public.sim_npc_employee_profiles to authenticated;
grant select on public.sim_esg_company_scores to authenticated;
grant select on public.sim_fraud_feature_rows to authenticated;
grant select on public.sim_macro_bus_loans to authenticated;
grant select on public.sim_individual_profiles to authenticated;
grant select on public.sim_security_flow_events to authenticated;

grant all on public.ai_dataset_registry to service_role;
grant all on public.sim_bot_loans to service_role;
grant all on public.sim_bot_directors to service_role;
grant all on public.sim_compliance_violations to service_role;
grant all on public.sim_factoring_profiles to service_role;
grant all on public.sim_npc_employee_profiles to service_role;
grant all on public.sim_esg_company_scores to service_role;
grant all on public.sim_fraud_feature_rows to service_role;
grant all on public.sim_macro_bus_loans to service_role;
grant all on public.sim_individual_profiles to service_role;
grant all on public.sim_security_flow_events to service_role;

commit;
