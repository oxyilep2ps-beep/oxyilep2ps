-- Account lifecycle status for borrowers/investors (suspend without deleting).

begin;

alter table public.profiles
  add column if not exists account_status varchar(20) not null default 'active';

alter table public.profiles
  drop constraint if exists profiles_account_status_check;

alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('active', 'suspended'));

create index if not exists profiles_account_status_idx
  on public.profiles (account_status);

comment on column public.profiles.account_status is
  'Platform access gate: active | suspended. Suspended users are signed out by middleware.';

-- Optional income verification path column (mirrors other KYC URL columns)
alter table public.profiles
  add column if not exists income_verification_url text;

commit;
