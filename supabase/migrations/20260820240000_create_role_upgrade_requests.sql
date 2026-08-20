-- Role upgrade requests (e.g. borrower → investor) for admin review.
-- NEW FILE ONLY — do not edit prior migrations.

begin;

create table if not exists public.role_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  requested_role text not null
    check (requested_role in ('investor', 'borrower')),
  documents jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  admin_note text null,
  reviewed_by uuid null references auth.users (id) on delete set null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists role_upgrade_requests_status_idx
  on public.role_upgrade_requests (status, created_at desc);

create index if not exists role_upgrade_requests_user_idx
  on public.role_upgrade_requests (user_id, created_at desc);

create index if not exists role_upgrade_requests_pending_user_role_idx
  on public.role_upgrade_requests (user_id, requested_role)
  where status = 'pending';

alter table public.role_upgrade_requests enable row level security;

drop policy if exists "role_upgrade_select_own" on public.role_upgrade_requests;
create policy "role_upgrade_select_own"
  on public.role_upgrade_requests
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "role_upgrade_insert_own" on public.role_upgrade_requests;
create policy "role_upgrade_insert_own"
  on public.role_upgrade_requests
  for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'pending');

-- Admin mutations use service role (server actions). Authenticated users cannot update status.
grant select, insert on public.role_upgrade_requests to authenticated;
grant all on public.role_upgrade_requests to service_role;

comment on table public.role_upgrade_requests is
  'Subsequent financial-role upgrade KYC requests awaiting admin verification.';

commit;
