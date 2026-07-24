-- =============================================================================
-- Guarantor columns (idempotent) + allowed_employees employee directory
-- DO NOT edit prior migration files — this is additive only.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Handshakes — guarantor / co-applicant fields (per-loan)
-- ---------------------------------------------------------------------------
alter table public.handshakes
  add column if not exists guarantor_email varchar(320),
  add column if not exists guarantor_user_id uuid,
  add column if not exists guarantor_status varchar(20) not null default 'none',
  add column if not exists guarantor_mandate_id varchar(80);

-- Soft FK to auth.users (profiles may lag); prefer profiles when present.
do $$
begin
  alter table public.handshakes
    add constraint handshakes_guarantor_user_id_auth_fkey
    foreign key (guarantor_user_id) references auth.users (id) on delete set null;
exception
  when duplicate_object then null;
  when undefined_table then null;
end $$;

-- Expand status check: support legacy invited/rejected + epic statuses pending/accepted.
alter table public.handshakes
  drop constraint if exists handshakes_guarantor_status_check;

alter table public.handshakes
  add constraint handshakes_guarantor_status_check
  check (
    guarantor_status in ('none', 'pending', 'invited', 'accepted', 'rejected')
  );

comment on column public.handshakes.guarantor_email is
  'Optional guarantor/co-applicant email for this loan (not a user-level field).';
comment on column public.handshakes.guarantor_user_id is
  'Auth user id of the guarantor once linked (nullable until they accept / have an account).';
comment on column public.handshakes.guarantor_status is
  'Guarantor lifecycle: none | pending | invited | accepted | rejected';
comment on column public.handshakes.guarantor_mandate_id is
  'GoCardless mandate id used for guarantor Direct Debit fallback.';

create index if not exists handshakes_guarantor_email_idx
  on public.handshakes (lower(guarantor_email))
  where guarantor_email is not null;

create index if not exists handshakes_guarantor_status_idx
  on public.handshakes (guarantor_status);

-- ---------------------------------------------------------------------------
-- 2. allowed_employees — strict employee directory for staff signup / revoke
-- ---------------------------------------------------------------------------
create table if not exists public.allowed_employees (
  email varchar(320) primary key,
  role varchar(20) not null,
  created_at timestamptz not null default now(),
  constraint allowed_employees_role_check check (role in ('admin', 'hr', 'blogger'))
);

create index if not exists allowed_employees_role_idx
  on public.allowed_employees (role);

comment on table public.allowed_employees is
  'Allowlist of employee emails permitted to use /employee/signup and staff portals. Revoke deletes the row.';

-- Normalize email on write
create or replace function public.allowed_employees_normalize_email()
returns trigger
language plpgsql
as $$
begin
  new.email := lower(trim(new.email));
  new.role := lower(trim(new.role));
  return new;
end;
$$;

drop trigger if exists allowed_employees_normalize_email on public.allowed_employees;
create trigger allowed_employees_normalize_email
  before insert or update on public.allowed_employees
  for each row
  execute function public.allowed_employees_normalize_email();

-- Seed protected staff (must never be lost) + sync from platform_access if present
insert into public.allowed_employees (email, role)
values
  ('showlittlemercy@gmail.com', 'admin'),
  ('preet.datta@oxyile.com', 'admin'),
  ('careers.oxyile@gmail.com', 'hr'),
  ('blogger.oxyile@gmail.com', 'blogger')
on conflict (email) do update set role = excluded.role;

insert into public.allowed_employees (email, role)
select
  lower(pa.email),
  case upper(pa.role)
    when 'ADMIN' then 'admin'
    when 'HR' then 'hr'
    when 'BLOGGER' then 'blogger'
    else lower(pa.role)
  end
from public.platform_access pa
where upper(pa.role) in ('ADMIN', 'HR', 'BLOGGER')
on conflict (email) do update set role = excluded.role;

alter table public.allowed_employees enable row level security;

drop policy if exists allowed_employees_self_select on public.allowed_employees;
create policy allowed_employees_self_select
  on public.allowed_employees
  for select
  to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists allowed_employees_admin_select on public.allowed_employees;
create policy allowed_employees_admin_select
  on public.allowed_employees
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

grant select on public.allowed_employees to authenticated;
grant all on public.allowed_employees to service_role;

commit;
