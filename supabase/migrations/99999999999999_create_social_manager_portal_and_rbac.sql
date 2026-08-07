-- Social Manager Portal RBAC + social_campaigns.
-- Forward-only. Does NOT modify prior migration files.
--
-- PREREQUISITE: Run and commit
--   99999999999998_add_social_manager_enum_value.sql
-- first. New enum labels cannot be referenced in the same transaction (55P04).

begin;

-- ---------------------------------------------------------------------------
-- 1. platform_access + allowed_employees — allow social_manager
-- ---------------------------------------------------------------------------
alter table public.platform_access
  drop constraint if exists platform_access_role_check;

alter table public.platform_access
  add constraint platform_access_role_check
  check (role in ('ADMIN', 'HR', 'BLOGGER', 'SOCIAL_MANAGER'));

alter table public.allowed_employees
  drop constraint if exists allowed_employees_role_check;

alter table public.allowed_employees
  add constraint allowed_employees_role_check
  check (role in ('admin', 'hr', 'blogger', 'social_manager'));

-- ---------------------------------------------------------------------------
-- 2. Helper: admin or social manager
-- ---------------------------------------------------------------------------
create or replace function public.current_user_is_social_manager()
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
      and p.role = 'SOCIAL_MANAGER'::public.profile_role
  );
$$;

create or replace function public.current_user_is_admin_or_social_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_user_is_admin()
    or public.current_user_is_social_manager();
$$;

-- ---------------------------------------------------------------------------
-- 3. social_campaigns
-- ---------------------------------------------------------------------------
create table if not exists public.social_campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_name varchar not null,
  title varchar not null,
  caption text not null,
  image_url text not null default '',
  channels jsonb not null default '{"linkedin": true, "instagram": false}'::jsonb,
  status varchar not null default 'draft'
    check (status in ('draft', 'pending_approval', 'approved', 'rejected', 'published')),
  scheduled_for timestamptz null,
  rejection_reason text null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.social_campaigns is
  'Social Manager Portal campaigns — draft/submit; Admin approves & syndicates via Make.com.';

create index if not exists social_campaigns_status_idx on public.social_campaigns (status);
create index if not exists social_campaigns_created_by_idx on public.social_campaigns (created_by);
create index if not exists social_campaigns_created_at_idx on public.social_campaigns (created_at desc);
create index if not exists social_campaigns_scheduled_for_idx on public.social_campaigns (scheduled_for);

create or replace function public.set_social_campaigns_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists social_campaigns_set_updated_at on public.social_campaigns;
create trigger social_campaigns_set_updated_at
  before update on public.social_campaigns
  for each row execute function public.set_social_campaigns_updated_at();

-- Notify admins when submitted for approval (reuse admin_notifications + social_post entity_type for badges)
create or replace function public.trg_social_campaigns_pending_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending_approval'
     and (tg_op = 'INSERT' or coalesce(old.status, '') is distinct from new.status) then
    if exists (
      select 1 from pg_proc where proname = 'enqueue_admin_notification'
    ) then
      perform public.enqueue_admin_notification(
        'social_post',
        new.id,
        coalesce(nullif(btrim(new.campaign_name), ''), nullif(btrim(new.title), ''), 'Social campaign'),
        'New Submission: ' || coalesce(nullif(btrim(new.campaign_name), ''), nullif(btrim(new.title), ''), 'Social campaign')
          || ' requires your verification.'
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists social_campaigns_pending_notify on public.social_campaigns;
create trigger social_campaigns_pending_notify
  after insert or update of status on public.social_campaigns
  for each row execute function public.trg_social_campaigns_pending_notify();

-- ---------------------------------------------------------------------------
-- 4. RLS — admin + social_manager full R/W
-- ---------------------------------------------------------------------------
alter table public.social_campaigns enable row level security;

drop policy if exists social_campaigns_select_staff on public.social_campaigns;
create policy social_campaigns_select_staff on public.social_campaigns
  for select to authenticated
  using (public.current_user_is_admin_or_social_manager());

drop policy if exists social_campaigns_insert_staff on public.social_campaigns;
create policy social_campaigns_insert_staff on public.social_campaigns
  for insert to authenticated
  with check (public.current_user_is_admin_or_social_manager());

drop policy if exists social_campaigns_update_staff on public.social_campaigns;
create policy social_campaigns_update_staff on public.social_campaigns
  for update to authenticated
  using (public.current_user_is_admin_or_social_manager())
  with check (public.current_user_is_admin_or_social_manager());

drop policy if exists social_campaigns_delete_staff on public.social_campaigns;
create policy social_campaigns_delete_staff on public.social_campaigns
  for delete to authenticated
  using (public.current_user_is_admin_or_social_manager());

grant select, insert, update, delete on public.social_campaigns to authenticated;
grant all on public.social_campaigns to service_role;

-- ---------------------------------------------------------------------------
-- 5. handle_new_user — recognise SOCIAL_MANAGER / social_manager
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

  if granted_role is not null and upper(granted_role) in ('ADMIN', 'HR', 'BLOGGER', 'SOCIAL_MANAGER') then
    resolved_role := upper(granted_role)::public.profile_role;
    resolved_status := 'APPROVED'::public.profile_status;
  elsif employee_dir_role is not null then
    resolved_role := case lower(employee_dir_role)
      when 'admin' then 'ADMIN'::public.profile_role
      when 'hr' then 'HR'::public.profile_role
      when 'blogger' then 'BLOGGER'::public.profile_role
      when 'social_manager' then 'SOCIAL_MANAGER'::public.profile_role
      else 'ADMIN'::public.profile_role
    end;
    resolved_status := 'APPROVED'::public.profile_status;
  elsif is_admin then
    resolved_role := 'ADMIN'::public.profile_role;
    resolved_status := 'APPROVED'::public.profile_status;
  elsif meta_role in ('ADMIN', 'HR', 'BLOGGER', 'SOCIAL_MANAGER')
     or account_role in ('admin', 'hr', 'blogger', 'social_manager')
     or coalesce(meta->>'staff_employee', '') in ('true', '1') then
    resolved_role := case
      when meta_role = 'HR' or account_role = 'hr' then 'HR'::public.profile_role
      when meta_role = 'BLOGGER' or account_role = 'blogger' then 'BLOGGER'::public.profile_role
      when meta_role = 'SOCIAL_MANAGER' or account_role = 'social_manager' then 'SOCIAL_MANAGER'::public.profile_role
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
          'SOCIAL_MANAGER'::public.profile_role
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
        'BLOGGER'::public.profile_role, 'SOCIAL_MANAGER'::public.profile_role
      ) then excluded.role
      when public.profiles.role in (
        'ADMIN'::public.profile_role, 'HR'::public.profile_role,
        'BLOGGER'::public.profile_role, 'SOCIAL_MANAGER'::public.profile_role
      ) then public.profiles.role
      else excluded.role
    end,
    status = case
      when excluded.role in (
        'ADMIN'::public.profile_role, 'HR'::public.profile_role,
        'BLOGGER'::public.profile_role, 'SOCIAL_MANAGER'::public.profile_role
      ) then 'APPROVED'::public.profile_status
      when public.profiles.role in (
        'ADMIN'::public.profile_role, 'HR'::public.profile_role,
        'BLOGGER'::public.profile_role, 'SOCIAL_MANAGER'::public.profile_role
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

-- ---------------------------------------------------------------------------
-- 6. Realtime (optional)
-- ---------------------------------------------------------------------------
alter table public.social_campaigns replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'social_campaigns'
    ) then
      alter publication supabase_realtime add table public.social_campaigns;
    end if;
  end if;
exception
  when others then
    raise notice 'Could not add social_campaigns to supabase_realtime: %', sqlerrm;
end $$;

commit;
