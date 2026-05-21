-- Oxyile Phase 2 Schema Migration
-- Adds social profile metadata, realtime chat, and handshake agreement pipeline.

begin;

alter table if exists public.profiles
  add column if not exists username text unique,
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists cover_url text;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_sender_created_idx on public.messages (sender_id, created_at desc);
create index if not exists messages_recipient_created_idx on public.messages (recipient_id, created_at desc);

alter table public.messages enable row level security;

drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own"
  on public.messages
  for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own"
  on public.messages
  for insert
  with check (auth.uid() = sender_id);

create table if not exists public.agreements (
  id uuid primary key default gen_random_uuid(),
  lender_id uuid not null references auth.users(id) on delete cascade,
  borrower_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  interest_rate numeric(6,2) not null check (interest_rate >= 0),
  duration_months integer not null check (duration_months > 0),
  status text not null default 'PENDING' check (status in ('PENDING', 'SIGNED', 'ACTIVE')),
  lender_approved_at timestamptz,
  borrower_approved_at timestamptz,
  polygon_tx_hash text,
  gocardless_mandate_id text,
  lender_wallet text,
  borrower_wallet text,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agreements_lender_created_idx on public.agreements (lender_id, created_at desc);
create index if not exists agreements_borrower_created_idx on public.agreements (borrower_id, created_at desc);
create index if not exists agreements_status_idx on public.agreements (status);

alter table public.agreements enable row level security;

drop policy if exists "agreements_select_own" on public.agreements;
create policy "agreements_select_own"
  on public.agreements
  for select
  using (auth.uid() = lender_id or auth.uid() = borrower_id);

drop policy if exists "agreements_insert_own" on public.agreements;
create policy "agreements_insert_own"
  on public.agreements
  for insert
  with check (auth.uid() = lender_id or auth.uid() = borrower_id);

drop policy if exists "agreements_update_own" on public.agreements;
create policy "agreements_update_own"
  on public.agreements
  for update
  using (auth.uid() = lender_id or auth.uid() = borrower_id)
  with check (auth.uid() = lender_id or auth.uid() = borrower_id);

commit;
