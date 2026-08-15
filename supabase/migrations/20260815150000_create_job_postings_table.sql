-- =============================================================================
-- Job postings: intern-to-full-time compensation + publish flag
-- NEW FILE ONLY — do not edit prior migrations.
-- job_postings already exists (enterprise HR suite). CREATE IF NOT EXISTS is a
-- no-op on live DBs; ALTER adds the new startup-hiring columns + RLS.
-- =============================================================================

begin;

-- Fresh / empty projects only. Live DBs skip this (table already present).
create table if not exists public.job_postings (
  id uuid primary key default gen_random_uuid(),
  title text,
  department text,
  employment_type text,
  location text,
  is_intern_to_fulltime boolean not null default false,
  unpaid_months integer,
  salary_min numeric(12, 2),
  salary_max numeric(12, 2),
  description text,
  requirements text,
  compliance_responsibilities text,
  ai_keywords text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

-- Live schema from 20250729120000 / 20250729140000 — add missing columns only
alter table public.job_postings
  add column if not exists is_intern_to_fulltime boolean not null default false,
  add column if not exists unpaid_months integer,
  add column if not exists salary_min numeric(12, 2),
  add column if not exists salary_max numeric(12, 2),
  add column if not exists description text,
  add column if not exists requirements text,
  add column if not exists compliance_responsibilities text not null default '',
  add column if not exists ai_keywords text not null default '',
  add column if not exists is_published boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

alter table public.job_postings drop constraint if exists job_postings_unpaid_months_check;
alter table public.job_postings
  add constraint job_postings_unpaid_months_check
  check (unpaid_months is null or unpaid_months >= 0);

comment on column public.job_postings.is_intern_to_fulltime is
  'Startup hiring track: unpaid internship period before full-time salary.';
comment on column public.job_postings.unpaid_months is
  'Months unpaid before converting to the posted full-time salary band.';
comment on column public.job_postings.salary_min is
  'GBP salary band minimum (post-internship FT when intern track is on).';
comment on column public.job_postings.salary_max is
  'GBP salary band maximum.';
comment on column public.job_postings.is_published is
  'When true, listing is visible on public /careers.';

-- Backfill dual salary / copy columns from the older GBP schema (live DBs)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'job_postings' and column_name = 'salary_min_gbp'
  ) then
    update public.job_postings
    set
      salary_min = coalesce(salary_min, salary_min_gbp),
      salary_max = coalesce(salary_max, salary_max_gbp);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'job_postings' and column_name = 'responsibilities'
  ) then
    update public.job_postings
    set compliance_responsibilities = coalesce(nullif(compliance_responsibilities, ''), responsibilities, '');
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'job_postings' and column_name = 'ai_match_keywords'
  ) then
    update public.job_postings
    set ai_keywords = coalesce(nullif(ai_keywords, ''), ai_match_keywords, '');
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'job_postings' and column_name = 'status'
  ) then
    update public.job_postings
    set is_published = case
      when is_published then true
      when status = 'open' and coalesce(publish_to_careers, true) then true
      else false
    end;
  end if;
end $$;

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

  if new.is_intern_to_fulltime is false then
    new.unpaid_months := null;
  end if;

  return new;
end;
$$;

drop trigger if exists job_postings_sync_compat_columns on public.job_postings;
create trigger job_postings_sync_compat_columns
  before insert or update on public.job_postings
  for each row execute function public.sync_job_posting_compat_columns();

create index if not exists job_postings_is_published_idx
  on public.job_postings (is_published)
  where is_published = true;

-- ---------------------------------------------------------------------------
-- RLS — admins / HR write; public SELECT only when published
-- ---------------------------------------------------------------------------
alter table public.job_postings enable row level security;

drop policy if exists hr_job_postings_auth_all on public.job_postings;
drop policy if exists job_postings_admin_insert on public.job_postings;
drop policy if exists job_postings_admin_update on public.job_postings;
drop policy if exists job_postings_admin_select on public.job_postings;
drop policy if exists job_postings_staff_insert on public.job_postings;
drop policy if exists job_postings_staff_update on public.job_postings;
drop policy if exists job_postings_staff_select on public.job_postings;
drop policy if exists hr_job_postings_public_read on public.job_postings;

create policy job_postings_staff_insert on public.job_postings
  for insert to authenticated
  with check (public.current_user_is_admin() or public.current_user_is_hr());

create policy job_postings_staff_update on public.job_postings
  for update to authenticated
  using (public.current_user_is_admin() or public.current_user_is_hr())
  with check (public.current_user_is_admin() or public.current_user_is_hr());

create policy job_postings_staff_select on public.job_postings
  for select to authenticated
  using (
    public.current_user_is_admin()
    or public.current_user_is_hr()
    or is_published = true
  );

create policy hr_job_postings_public_read on public.job_postings
  for select to anon
  using (is_published = true);

grant select on public.job_postings to anon, authenticated;
grant insert, update on public.job_postings to authenticated;
grant all on public.job_postings to service_role;

commit;
