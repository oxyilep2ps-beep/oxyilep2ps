-- Ensure signup trigger never leaves a stub profile that wipes KYC document paths
-- after a successful registerWithDocs upsert. Also re-assert KYC URL columns exist.
-- NEW FILE ONLY — do not edit prior migrations.

begin;

-- Re-assert document URL columns (safe if already applied)
alter table public.profiles
  add column if not exists proof_of_identity_url text,
  add column if not exists liveness_video_url text,
  add column if not exists proof_of_address_url text,
  add column if not exists income_verification_url text,
  add column if not exists fca_test_answers jsonb default '{}'::jsonb,
  add column if not exists kyc_data jsonb not null default '{}'::jsonb;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb;
  granted_role text;
  is_admin boolean;
  resolved_role public.profile_role;
  resolved_status public.profile_status;
  full_name text;
  postal text;
  kyc jsonb;
  account_role text;
  expected_rate numeric;
begin
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

  select pa.role into granted_role
  from public.platform_access pa
  where lower(pa.email) = lower(new.email)
  limit 1;

  select exists (
    select 1 from public.admin_allowlist a
    where lower(a.email) = lower(new.email)
  ) into is_admin;

  account_role := lower(coalesce(meta->>'account_role', meta->>'role', ''));

  if granted_role is not null then
    resolved_role := granted_role::public.profile_role;
    resolved_status := 'APPROVED'::public.profile_status;
  elsif is_admin then
    resolved_role := 'ADMIN'::public.profile_role;
    resolved_status := 'APPROVED'::public.profile_status;
  else
    if account_role = 'borrower' or upper(coalesce(meta->>'role', '')) = 'BORROWER' then
      resolved_role := 'BORROWER'::public.profile_role;
    elsif upper(coalesce(meta->>'role', '')) = 'INVESTOR' or account_role in ('lender', 'investor') then
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
    split_part(new.email, '@', 1)
  );

  postal := nullif(upper(trim(coalesce(meta->>'postal_code', ''))), '');

  if meta ? 'kyc_data' and jsonb_typeof(meta->'kyc_data') = 'object' then
    kyc := meta->'kyc_data';
  else
    kyc := jsonb_build_object(
      'accountRole', case
        when resolved_role = 'BORROWER'::public.profile_role then 'borrower'
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

  insert into public.profiles (
    id,
    email,
    full_legal_name,
    role,
    status,
    postal_code,
    expected_interest_rate,
    kyc_data
  )
  values (
    new.id,
    new.email,
    full_name,
    resolved_role,
    resolved_status,
    postal,
    expected_rate,
    coalesce(kyc, '{}'::jsonb)
  )
  on conflict (id) do update set
    email = excluded.email,
    full_legal_name = case
      when nullif(trim(excluded.full_legal_name), '') is not null then excluded.full_legal_name
      else public.profiles.full_legal_name
    end,
    postal_code = coalesce(excluded.postal_code, public.profiles.postal_code),
    expected_interest_rate = coalesce(excluded.expected_interest_rate, public.profiles.expected_interest_rate),
    -- NEVER overwrite a richer KYC payload that already has document paths / answers
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
    -- Preserve document URL columns — trigger never writes these; registerWithDocs owns them
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
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

comment on function public.handle_new_user() is
  'Creates profiles from auth.users; never wipes KYC document paths already saved by registerWithDocs.';

commit;
