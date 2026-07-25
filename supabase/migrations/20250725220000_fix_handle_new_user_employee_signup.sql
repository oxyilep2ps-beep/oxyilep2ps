-- Fix auth signup trigger crashing with "Database error creating new user"
-- Root causes addressed:
-- 1) Explicit NULL into expected_interest_rate (NOT NULL) bypasses column default
-- 2) Staff / employee directory roles (allowed_employees + ADMIN/HR/BLOGGER metadata)
--    were not resolved, and unsafe enum casts could abort the auth.users insert
-- NEW FILE ONLY — do not edit prior migrations.

begin;

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

  -- Strict employee directory (admin / hr / blogger) — may exist before platform_access sync
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

  if granted_role is not null and upper(granted_role) in ('ADMIN', 'HR', 'BLOGGER') then
    resolved_role := upper(granted_role)::public.profile_role;
    resolved_status := 'APPROVED'::public.profile_status;
  elsif employee_dir_role is not null then
    resolved_role := case lower(employee_dir_role)
      when 'admin' then 'ADMIN'::public.profile_role
      when 'hr' then 'HR'::public.profile_role
      when 'blogger' then 'BLOGGER'::public.profile_role
      else 'ADMIN'::public.profile_role
    end;
    resolved_status := 'APPROVED'::public.profile_status;
  elsif is_admin then
    resolved_role := 'ADMIN'::public.profile_role;
    resolved_status := 'APPROVED'::public.profile_status;
  elsif meta_role in ('ADMIN', 'HR', 'BLOGGER')
     or account_role in ('admin', 'hr', 'blogger')
     or coalesce(meta->>'staff_employee', '') in ('true', '1') then
    resolved_role := case
      when meta_role = 'HR' or account_role = 'hr' then 'HR'::public.profile_role
      when meta_role = 'BLOGGER' or account_role = 'blogger' then 'BLOGGER'::public.profile_role
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
          'BLOGGER'::public.profile_role
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
      'questionnaireAnswers', jsonb_strip_nulls(jsonb_build_object(
        'Are you a UK resident?', nullif(meta->>'uk_resident', ''),
        'Do you understand P2P lending carries risk?', nullif(meta->>'understands_risk', ''),
        'May we email you about launch updates?', nullif(meta->>'marketing_consent', '')
      )),
      'submittedAt', timezone('utc', now())
    );
  end if;

  begin
    expected_rate := nullif(meta->>'expected_interest_rate', '')::numeric;
  exception
    when others then
      expected_rate := null;
  end;

  -- NEVER pass NULL into NOT NULL numeric columns — explicit NULL bypasses DEFAULT 0
  insert into public.profiles (
    id,
    email,
    full_legal_name,
    role,
    status,
    postal_code,
    expected_interest_rate,
    target_amount,
    collateral_value,
    kyc_data,
    account_status
  )
  values (
    new.id,
    new.email,
    full_name,
    resolved_role,
    resolved_status,
    postal,
    coalesce(expected_rate, 0),
    0,
    0,
    coalesce(kyc, '{}'::jsonb),
    'active'
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
      when public.profiles.kyc_data ? 'identity'
        or public.profiles.kyc_data ? 'borrower'
        or public.profiles.kyc_data ? 'lender'
        or public.profiles.kyc_data #>> '{identityMeta,idProofPath}' is not null
        or nullif(public.profiles.proof_of_identity_url, '') is not null
        or (
          jsonb_typeof(public.profiles.kyc_data->'questionnaireAnswers') = 'object'
          and public.profiles.kyc_data->'questionnaireAnswers' <> '{}'::jsonb
        )
        then public.profiles.kyc_data
      when excluded.kyc_data is not null and excluded.kyc_data <> '{}'::jsonb then excluded.kyc_data
      else public.profiles.kyc_data
    end,
    proof_of_identity_url = public.profiles.proof_of_identity_url,
    liveness_video_url = public.profiles.liveness_video_url,
    proof_of_address_url = public.profiles.proof_of_address_url,
    income_verification_url = public.profiles.income_verification_url,
    role = case
      when excluded.role in ('ADMIN'::public.profile_role, 'HR'::public.profile_role, 'BLOGGER'::public.profile_role)
        then excluded.role
      when public.profiles.role in ('ADMIN'::public.profile_role, 'HR'::public.profile_role, 'BLOGGER'::public.profile_role)
        then public.profiles.role
      else excluded.role
    end,
    status = case
      when excluded.role in ('ADMIN'::public.profile_role, 'HR'::public.profile_role, 'BLOGGER'::public.profile_role)
        then 'APPROVED'::public.profile_status
      when public.profiles.role in ('ADMIN'::public.profile_role, 'HR'::public.profile_role, 'BLOGGER'::public.profile_role)
        then public.profiles.status
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

comment on function public.handle_new_user() is
  'Creates profiles from auth.users; supports staff directory roles; never inserts NULL into NOT NULL numerics.';

commit;
