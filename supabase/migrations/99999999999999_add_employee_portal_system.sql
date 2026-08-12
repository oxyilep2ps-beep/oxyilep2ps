-- Employee Portal + Admin Employee Management (tasks, reports, leaves, assets, gamification).
-- Prerequisite: 99999999999995_add_employee_enum_value.sql must be committed first.
-- Forward-only. Does NOT modify prior migration files.

begin;

-- ---------------------------------------------------------------------------
-- 1) RBAC — allow EMPLOYEE / employee in platform_access + allowed_employees
-- ---------------------------------------------------------------------------
alter table public.platform_access
  drop constraint if exists platform_access_role_check;

alter table public.platform_access
  add constraint platform_access_role_check
  check (role in ('ADMIN', 'HR', 'BLOGGER', 'SOCIAL_MANAGER', 'EMPLOYEE'));

alter table public.allowed_employees
  drop constraint if exists allowed_employees_role_check;

alter table public.allowed_employees
  add constraint allowed_employees_role_check
  check (role in ('admin', 'hr', 'blogger', 'social_manager', 'employee'));

create or replace function public.current_user_is_employee()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'EMPLOYEE'::public.profile_role
  );
$$;

create or replace function public.current_user_is_admin_or_employee()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_admin()
    or public.current_user_is_employee();
$$;

-- ---------------------------------------------------------------------------
-- 2) Core tables
-- ---------------------------------------------------------------------------
create table if not exists public.employee_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  department text not null default '',
  designation text not null default '',
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  joining_date date,
  skills text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_tasks (
  id uuid primary key default gen_random_uuid(),
  assigned_to uuid not null references auth.users (id) on delete cascade,
  assigned_by uuid references auth.users (id) on delete set null,
  title text not null,
  description text not null default '',
  due_date date,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_tasks_assigned_to_idx
  on public.employee_tasks (assigned_to, status);
create index if not exists employee_tasks_due_date_idx
  on public.employee_tasks (due_date);

create table if not exists public.employee_daily_reports (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references auth.users (id) on delete cascade,
  report_date date not null default (current_date),
  what_i_did_today text not null default '',
  blockers text not null default '',
  hours_logged numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (employee_id, report_date)
);

create table if not exists public.employee_leaves (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references auth.users (id) on delete cascade,
  leave_type text not null default 'annual'
    check (leave_type in ('annual', 'sick', 'unpaid', 'compassionate', 'other')),
  start_date date not null,
  end_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  admin_remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_assets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references auth.users (id) on delete cascade,
  asset_name text not null,
  serial_number text,
  assigned_date date not null default (current_date),
  status text not null default 'assigned'
    check (status in ('assigned', 'returned', 'lost')),
  created_at timestamptz not null default now()
);

create table if not exists public.company_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.employee_gamification (
  employee_id uuid primary key references auth.users (id) on delete cascade,
  oxy_coins int not null default 0,
  total_points int not null default 0,
  badge_level text not null default 'Bronze',
  updated_at timestamptz not null default now()
);

-- Placeholder hooks for the 30+ enterprise modules (minimal schema, expandable later)
create table if not exists public.employee_module_events (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references auth.users (id) on delete cascade,
  module_key text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists employee_module_events_key_idx
  on public.employee_module_events (module_key, created_at desc);

-- ---------------------------------------------------------------------------
-- 3) RLS
-- ---------------------------------------------------------------------------
alter table public.employee_profiles enable row level security;
alter table public.employee_tasks enable row level security;
alter table public.employee_daily_reports enable row level security;
alter table public.employee_leaves enable row level security;
alter table public.employee_assets enable row level security;
alter table public.company_announcements enable row level security;
alter table public.employee_gamification enable row level security;
alter table public.employee_module_events enable row level security;

-- Profiles
drop policy if exists employee_profiles_self_select on public.employee_profiles;
create policy employee_profiles_self_select
  on public.employee_profiles for select to authenticated
  using (id = auth.uid() or public.current_user_is_admin());

drop policy if exists employee_profiles_self_update on public.employee_profiles;
create policy employee_profiles_self_update
  on public.employee_profiles for update to authenticated
  using (id = auth.uid() or public.current_user_is_admin())
  with check (id = auth.uid() or public.current_user_is_admin());

drop policy if exists employee_profiles_admin_write on public.employee_profiles;
create policy employee_profiles_admin_write
  on public.employee_profiles for insert to authenticated
  with check (public.current_user_is_admin() or id = auth.uid());

drop policy if exists employee_profiles_admin_delete on public.employee_profiles;
create policy employee_profiles_admin_delete
  on public.employee_profiles for delete to authenticated
  using (public.current_user_is_admin());

-- Tasks
drop policy if exists employee_tasks_select on public.employee_tasks;
create policy employee_tasks_select
  on public.employee_tasks for select to authenticated
  using (assigned_to = auth.uid() or assigned_by = auth.uid() or public.current_user_is_admin());

drop policy if exists employee_tasks_insert on public.employee_tasks;
create policy employee_tasks_insert
  on public.employee_tasks for insert to authenticated
  with check (public.current_user_is_admin());

drop policy if exists employee_tasks_update on public.employee_tasks;
create policy employee_tasks_update
  on public.employee_tasks for update to authenticated
  using (assigned_to = auth.uid() or public.current_user_is_admin())
  with check (assigned_to = auth.uid() or public.current_user_is_admin());

drop policy if exists employee_tasks_delete on public.employee_tasks;
create policy employee_tasks_delete
  on public.employee_tasks for delete to authenticated
  using (public.current_user_is_admin());

-- Daily reports
drop policy if exists employee_daily_reports_select on public.employee_daily_reports;
create policy employee_daily_reports_select
  on public.employee_daily_reports for select to authenticated
  using (employee_id = auth.uid() or public.current_user_is_admin());

drop policy if exists employee_daily_reports_insert on public.employee_daily_reports;
create policy employee_daily_reports_insert
  on public.employee_daily_reports for insert to authenticated
  with check (employee_id = auth.uid() or public.current_user_is_admin());

drop policy if exists employee_daily_reports_update on public.employee_daily_reports;
create policy employee_daily_reports_update
  on public.employee_daily_reports for update to authenticated
  using (employee_id = auth.uid() or public.current_user_is_admin())
  with check (employee_id = auth.uid() or public.current_user_is_admin());

-- Leaves
drop policy if exists employee_leaves_select on public.employee_leaves;
create policy employee_leaves_select
  on public.employee_leaves for select to authenticated
  using (employee_id = auth.uid() or public.current_user_is_admin());

drop policy if exists employee_leaves_insert on public.employee_leaves;
create policy employee_leaves_insert
  on public.employee_leaves for insert to authenticated
  with check (employee_id = auth.uid() or public.current_user_is_admin());

drop policy if exists employee_leaves_update on public.employee_leaves;
create policy employee_leaves_update
  on public.employee_leaves for update to authenticated
  using (public.current_user_is_admin() or employee_id = auth.uid())
  with check (public.current_user_is_admin() or employee_id = auth.uid());

-- Assets
drop policy if exists employee_assets_select on public.employee_assets;
create policy employee_assets_select
  on public.employee_assets for select to authenticated
  using (employee_id = auth.uid() or public.current_user_is_admin());

drop policy if exists employee_assets_admin_write on public.employee_assets;
create policy employee_assets_admin_write
  on public.employee_assets for all to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- Announcements
drop policy if exists company_announcements_select on public.company_announcements;
create policy company_announcements_select
  on public.company_announcements for select to authenticated
  using (public.current_user_is_admin_or_employee() or public.current_user_is_admin());

drop policy if exists company_announcements_admin_write on public.company_announcements;
create policy company_announcements_admin_write
  on public.company_announcements for all to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- Gamification
drop policy if exists employee_gamification_select on public.employee_gamification;
create policy employee_gamification_select
  on public.employee_gamification for select to authenticated
  using (employee_id = auth.uid() or public.current_user_is_admin());

drop policy if exists employee_gamification_admin_write on public.employee_gamification;
create policy employee_gamification_admin_write
  on public.employee_gamification for all to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- Module events (placeholders)
drop policy if exists employee_module_events_select on public.employee_module_events;
create policy employee_module_events_select
  on public.employee_module_events for select to authenticated
  using (employee_id = auth.uid() or public.current_user_is_admin() or employee_id is null);

drop policy if exists employee_module_events_insert on public.employee_module_events;
create policy employee_module_events_insert
  on public.employee_module_events for insert to authenticated
  with check (employee_id = auth.uid() or public.current_user_is_admin() or employee_id is null);

grant select, insert, update, delete on public.employee_profiles to authenticated;
grant select, insert, update, delete on public.employee_tasks to authenticated;
grant select, insert, update, delete on public.employee_daily_reports to authenticated;
grant select, insert, update, delete on public.employee_leaves to authenticated;
grant select, insert, update, delete on public.employee_assets to authenticated;
grant select, insert, update, delete on public.company_announcements to authenticated;
grant select, insert, update, delete on public.employee_gamification to authenticated;
grant select, insert, update, delete on public.employee_module_events to authenticated;

grant all on public.employee_profiles to service_role;
grant all on public.employee_tasks to service_role;
grant all on public.employee_daily_reports to service_role;
grant all on public.employee_leaves to service_role;
grant all on public.employee_assets to service_role;
grant all on public.company_announcements to service_role;
grant all on public.employee_gamification to service_role;
grant all on public.employee_module_events to service_role;

-- ---------------------------------------------------------------------------
-- 4) handle_new_user — recognise EMPLOYEE / employee (full body, keeps prior fields)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb;
  granted_role text;
  employee_dir_role text;
  is_admin boolean;
  resolved_role public.profile_role;
  resolved_status public.profile_status;
  full_name text;
  postal text;
  kyc jsonb;
  account_role text;
  meta_role text;
  expected_rate numeric;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

  select pa.role into granted_role
  from public.platform_access pa
  where lower(pa.email) = lower(new.email)
  limit 1;

  begin
    select e.role into employee_dir_role
    from public.allowed_employees e
    where lower(e.email) = lower(new.email)
    limit 1;
  exception
    when undefined_table then
      employee_dir_role := null;
  end;

  select exists (
    select 1 from public.admin_allowlist a
    where lower(a.email) = lower(new.email)
  ) into is_admin;

  account_role := lower(coalesce(meta->>'account_role', meta->>'role', ''));
  meta_role := upper(trim(coalesce(meta->>'role', '')));

  if granted_role is not null and upper(granted_role) in ('ADMIN', 'HR', 'BLOGGER', 'SOCIAL_MANAGER', 'EMPLOYEE') then
    resolved_role := upper(granted_role)::public.profile_role;
    resolved_status := 'APPROVED'::public.profile_status;
  elsif employee_dir_role is not null then
    resolved_role := case lower(employee_dir_role)
      when 'admin' then 'ADMIN'::public.profile_role
      when 'hr' then 'HR'::public.profile_role
      when 'blogger' then 'BLOGGER'::public.profile_role
      when 'social_manager' then 'SOCIAL_MANAGER'::public.profile_role
      when 'employee' then 'EMPLOYEE'::public.profile_role
      else 'EMPLOYEE'::public.profile_role
    end;
    resolved_status := 'APPROVED'::public.profile_status;
  elsif is_admin then
    resolved_role := 'ADMIN'::public.profile_role;
    resolved_status := 'APPROVED'::public.profile_status;
  elsif meta_role in ('ADMIN', 'HR', 'BLOGGER', 'SOCIAL_MANAGER', 'EMPLOYEE')
     or account_role in ('admin', 'hr', 'blogger', 'social_manager', 'employee')
     or coalesce(meta->>'staff_employee', '') in ('true', '1') then
    resolved_role := case
      when meta_role = 'HR' or account_role = 'hr' then 'HR'::public.profile_role
      when meta_role = 'BLOGGER' or account_role = 'blogger' then 'BLOGGER'::public.profile_role
      when meta_role = 'SOCIAL_MANAGER' or account_role = 'social_manager' then 'SOCIAL_MANAGER'::public.profile_role
      when meta_role = 'EMPLOYEE' or account_role = 'employee' then 'EMPLOYEE'::public.profile_role
      else 'ADMIN'::public.profile_role
    end;
    resolved_status := 'APPROVED'::public.profile_status;
  else
    if account_role = 'borrower' or meta_role = 'BORROWER' then
      resolved_role := 'BORROWER'::public.profile_role;
    elsif meta_role = 'INVESTOR' or account_role in ('lender', 'investor') then
      resolved_role := 'INVESTOR'::public.profile_role;
    else
      resolved_role := 'INVESTOR'::public.profile_role;
    end if;
    resolved_status := 'PENDING'::public.profile_status;
  end if;

  full_name := coalesce(
    nullif(trim(meta->>'full_legal_name'), ''),
    nullif(trim(meta->>'legal_name'), ''),
    nullif(trim(meta->>'name'), ''),
    split_part(new.email, '@', 1),
    'User'
  );

  postal := nullif(upper(trim(coalesce(meta->>'postal_code', ''))), '');

  if meta ? 'kyc_data' and jsonb_typeof(meta->'kyc_data') = 'object' then
    kyc := meta->'kyc_data';
  else
    kyc := jsonb_build_object(
      'accountRole', case
        when resolved_role = 'BORROWER'::public.profile_role then 'borrower'
        when resolved_role in (
          'ADMIN'::public.profile_role,
          'HR'::public.profile_role,
          'BLOGGER'::public.profile_role,
          'SOCIAL_MANAGER'::public.profile_role,
          'EMPLOYEE'::public.profile_role
        ) then 'staff'
        else 'lender'
      end,
      'basic', jsonb_build_object(
        'ukPhone', coalesce(meta->>'uk_phone', meta->>'phone', ''),
        'postalCode', coalesce(meta->>'postal_code', ''),
        'dateOfBirth', coalesce(meta->>'date_of_birth', meta->>'dob', ''),
        'currentAddress', coalesce(meta->>'current_address', meta->>'address', ''),
        'addressHistory3Years', coalesce(meta->>'address_history_3_years', '')
      ),
      'identityMeta', jsonb_build_object(
        'proofOfIdentityType', coalesce(meta->>'proof_of_identity_type', ''),
        'hasProofOfIdentity', false,
        'hasLivenessVideo', false,
        'hasProofOfAddress', false
      ),
      'questionnaireAnswers', '{}'::jsonb,
      'submittedAt', timezone('utc', now())
    );
  end if;

  begin
    expected_rate := nullif(meta->>'expected_interest_rate', '')::numeric;
  exception
    when others then
      expected_rate := null;
  end;

  insert into public.profiles (
    id, email, full_legal_name, role, status, postal_code,
    expected_interest_rate, target_amount, collateral_value, kyc_data, account_status
  )
  values (
    new.id, new.email, full_name, resolved_role, resolved_status, postal,
    coalesce(expected_rate, 0), 0, 0, coalesce(kyc, '{}'::jsonb), 'active'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_legal_name = case
      when nullif(trim(excluded.full_legal_name), '') is not null then excluded.full_legal_name
      else public.profiles.full_legal_name
    end,
    postal_code = coalesce(excluded.postal_code, public.profiles.postal_code),
    expected_interest_rate = coalesce(
      nullif(excluded.expected_interest_rate, 0),
      public.profiles.expected_interest_rate,
      0
    ),
    kyc_data = case
      when public.profiles.kyc_data is not null and public.profiles.kyc_data <> '{}'::jsonb
        then public.profiles.kyc_data
      when excluded.kyc_data is not null and excluded.kyc_data <> '{}'::jsonb then excluded.kyc_data
      else public.profiles.kyc_data
    end,
    role = case
      when excluded.role in (
        'ADMIN'::public.profile_role, 'HR'::public.profile_role,
        'BLOGGER'::public.profile_role, 'SOCIAL_MANAGER'::public.profile_role,
        'EMPLOYEE'::public.profile_role
      ) then excluded.role
      when public.profiles.role in (
        'ADMIN'::public.profile_role, 'HR'::public.profile_role,
        'BLOGGER'::public.profile_role, 'SOCIAL_MANAGER'::public.profile_role,
        'EMPLOYEE'::public.profile_role
      ) then public.profiles.role
      else excluded.role
    end,
    status = case
      when excluded.role in (
        'ADMIN'::public.profile_role, 'HR'::public.profile_role,
        'BLOGGER'::public.profile_role, 'SOCIAL_MANAGER'::public.profile_role,
        'EMPLOYEE'::public.profile_role
      ) then 'APPROVED'::public.profile_status
      when public.profiles.role in (
        'ADMIN'::public.profile_role, 'HR'::public.profile_role,
        'BLOGGER'::public.profile_role, 'SOCIAL_MANAGER'::public.profile_role,
        'EMPLOYEE'::public.profile_role
      ) then public.profiles.status
      else excluded.status
    end,
    updated_at = now();

  return new;
exception
  when others then
    raise exception 'handle_new_user failed for %: % (SQLSTATE %)',
      coalesce(new.email, new.id::text),
      sqlerrm,
      sqlstate;
end;
$$;

commit;
