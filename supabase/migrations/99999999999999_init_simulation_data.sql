-- Core single-player simulation engine tables (entities, loans, fraud flags).
-- Forward-only. Complements ai_dataset_registry / legacy sim_* tables.
-- Prerequisite: public.current_user_is_admin() exists.

begin;

-- ---------------------------------------------------------------------------
-- sim_entities — synthetic businesses & individuals (bot NPCs)
-- ---------------------------------------------------------------------------
create table if not exists public.sim_entities (
  id uuid primary key default gen_random_uuid(),
  external_key text not null unique,
  name text not null,
  entity_type text not null default 'individual'
    check (entity_type in ('individual', 'business')),
  esg_score numeric(8,3),
  credit_rating text,
  geography text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sim_entities_esg_score_idx on public.sim_entities (esg_score desc nulls last);
create index if not exists sim_entities_credit_rating_idx on public.sim_entities (credit_rating);
create index if not exists sim_entities_type_idx on public.sim_entities (entity_type);
create index if not exists sim_entities_name_trgm_idx on public.sim_entities (name);

-- ---------------------------------------------------------------------------
-- sim_commercial_loans — bot loan book (linked to entities)
-- ---------------------------------------------------------------------------
create table if not exists public.sim_commercial_loans (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references public.sim_entities (id) on delete set null,
  external_key text not null unique,
  loan_amount numeric(16,2) not null default 0,
  interest_rate numeric(8,4),
  default_risk numeric(6,3) not null default 0,
  loan_status text,
  purpose text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sim_commercial_loans_entity_id_idx on public.sim_commercial_loans (entity_id);
create index if not exists sim_commercial_loans_default_risk_idx on public.sim_commercial_loans (default_risk desc);

-- ---------------------------------------------------------------------------
-- sim_fraud_flags — high-risk transaction parameters (fraud bot layer)
-- ---------------------------------------------------------------------------
create table if not exists public.sim_fraud_flags (
  id uuid primary key default gen_random_uuid(),
  external_key text not null unique,
  entity_id uuid references public.sim_entities (id) on delete set null,
  amount numeric(14,2),
  is_fraud boolean not null default false,
  risk_score numeric(8,4) not null default 0,
  feature_vector jsonb not null default '{}'::jsonb,
  source_dataset text not null default 'credit_card_fraud_detection',
  created_at timestamptz not null default now()
);

create index if not exists sim_fraud_flags_is_fraud_idx on public.sim_fraud_flags (is_fraud) where is_fraud = true;
create index if not exists sim_fraud_flags_risk_score_idx on public.sim_fraud_flags (risk_score desc);

-- ---------------------------------------------------------------------------
-- Macro market index (us_commercial_industrial_loans — economy stress, not entity loans)
-- ---------------------------------------------------------------------------
create table if not exists public.sim_macro_market_index (
  id uuid primary key default gen_random_uuid(),
  record_date date not null unique,
  bus_loans_index numeric(14,4) not null,
  created_at timestamptz not null default now()
);
create index if not exists sim_macro_market_index_date_idx on public.sim_macro_market_index (record_date desc);

-- ---------------------------------------------------------------------------
-- RLS — admin read-only for authenticated; service_role for seed scripts
-- ---------------------------------------------------------------------------
alter table public.sim_entities enable row level security;
alter table public.sim_commercial_loans enable row level security;
alter table public.sim_fraud_flags enable row level security;
alter table public.sim_macro_market_index enable row level security;

drop policy if exists sim_entities_admin_select on public.sim_entities;
create policy sim_entities_admin_select
  on public.sim_entities for select to authenticated
  using (public.current_user_is_admin());

drop policy if exists sim_commercial_loans_admin_select on public.sim_commercial_loans;
create policy sim_commercial_loans_admin_select
  on public.sim_commercial_loans for select to authenticated
  using (public.current_user_is_admin());

drop policy if exists sim_fraud_flags_admin_select on public.sim_fraud_flags;
create policy sim_fraud_flags_admin_select
  on public.sim_fraud_flags for select to authenticated
  using (public.current_user_is_admin());

drop policy if exists sim_macro_market_index_admin_select on public.sim_macro_market_index;
create policy sim_macro_market_index_admin_select
  on public.sim_macro_market_index for select to authenticated
  using (public.current_user_is_admin());

grant select on public.sim_entities to authenticated;
grant select on public.sim_commercial_loans to authenticated;
grant select on public.sim_fraud_flags to authenticated;
grant select on public.sim_macro_market_index to authenticated;

grant all on public.sim_entities to service_role;
grant all on public.sim_commercial_loans to service_role;
grant all on public.sim_fraud_flags to service_role;
grant all on public.sim_macro_market_index to service_role;

commit;
