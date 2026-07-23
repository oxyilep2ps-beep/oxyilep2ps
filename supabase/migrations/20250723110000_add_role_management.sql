-- =============================================================================
-- Dynamic Access Management (RBAC) — platform_access grants
-- Preserves hardcoded/seeded Admin + staff emails; enables pre-auth role grants.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. platform_access — email → elevated role (pre-auth safe)
-- ---------------------------------------------------------------------------
create table if not exists public.platform_access (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null,
  granted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_access_email_unique unique (email),
  constraint platform_access_role_check check (role in ('ADMIN', 'HR', 'BLOGGER'))
);

create index if not exists platform_access_role_idx on public.platform_access (role);
create index if not exists platform_access_email_lower_idx on public.platform_access (lower(email));

comment on table public.platform_access is
  'Elevated platform roles by email. Applied on signup via handle_new_user and by admin Access Management.';

-- Keep emails normalized
create or replace function public.platform_access_normalize_email()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(trim(new.email));
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists platform_access_normalize_email on public.platform_access;
create trigger platform_access_normalize_email
  before insert or update on public.platform_access
  for each row
  execute function public.platform_access_normalize_email();

-- ---------------------------------------------------------------------------
-- 2. Seed protected elevated emails (MUST NEVER be lost)
-- ---------------------------------------------------------------------------
insert into public.admin_allowlist (email)
values
  ('showlittlemercy@gmail.com'),
  ('preet.datta@oxyile.com')
on conflict (email) do nothing;

insert into public.platform_access (email, role)
values
  ('showlittlemercy@gmail.com', 'ADMIN'),
  ('preet.datta@oxyile.com', 'ADMIN'),
  ('careers.oxyile@gmail.com', 'HR'),
  ('blogger.oxyile@gmail.com', 'BLOGGER')
on conflict (email) do update
set
  role = excluded.role,
  updated_at = now();

-- Sync existing profiles for seeded emails
update public.profiles p
set
  role = pa.role::public.profile_role,
  status = 'APPROVED'::public.profile_status,
  updated_at = now()
from public.platform_access pa
where lower(p.email) = lower(pa.email)
  and p.role::text is distinct from pa.role;

-- ---------------------------------------------------------------------------
-- 3. handle_new_user — apply platform_access / admin_allowlist on signup
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
  is_admin boolean;
  resolved_role public.profile_role;
  resolved_status public.profile_status;
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

  if granted_role is not null then
    resolved_role := granted_role::public.profile_role;
    resolved_status := 'APPROVED'::public.profile_status;
  elsif is_admin then
    resolved_role := 'ADMIN'::public.profile_role;
    resolved_status := 'APPROVED'::public.profile_status;
  else
    -- Only allow BORROWER/INVESTOR from metadata for self-serve signup
    if upper(coalesce(meta->>'role', '')) = 'BORROWER' then
      resolved_role := 'BORROWER'::public.profile_role;
    else
      resolved_role := 'INVESTOR'::public.profile_role;
    end if;
    resolved_status := 'PENDING'::public.profile_status;
  end if;

  insert into public.profiles (id, email, full_legal_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(meta->>'full_legal_name', split_part(new.email, '@', 1)),
    resolved_role,
    resolved_status
  )
  on conflict (id) do update set
    email = excluded.email,
    role = case
      when excluded.role in ('ADMIN'::public.profile_role, 'HR'::public.profile_role, 'BLOGGER'::public.profile_role)
        then excluded.role
      else public.profiles.role
    end,
    status = case
      when excluded.role in ('ADMIN'::public.profile_role, 'HR'::public.profile_role, 'BLOGGER'::public.profile_role)
        then 'APPROVED'::public.profile_status
      else public.profiles.status
    end,
    updated_at = now();

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. RLS — service role / admin-only reads via security definer helpers
-- ---------------------------------------------------------------------------
alter table public.platform_access enable row level security;

drop policy if exists platform_access_admin_select on public.platform_access;
create policy platform_access_admin_select
  on public.platform_access
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'ADMIN'::public.profile_role
    )
    or exists (
      select 1 from public.admin_allowlist a
      where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- Mutations go through service-role server actions (no direct client writes)
drop policy if exists platform_access_no_client_write on public.platform_access;

grant select on public.platform_access to authenticated;
grant all on public.platform_access to service_role;

commit;
