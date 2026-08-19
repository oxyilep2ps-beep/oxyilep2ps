-- =============================================================================
-- User Connections / Friendships
-- Allows any authenticated user to send, accept, or block a connection request.
-- NEW FILE ONLY — do not edit prior migrations.
-- =============================================================================

begin;

create table if not exists public.user_connections (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references auth.users (id) on delete cascade,
  receiver_id   uuid not null references auth.users (id) on delete cascade,
  status        text not null default 'pending'
                  check (status in ('pending', 'accepted', 'blocked')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Prevent duplicate connection pairs (order-independent enforced by app layer)
  constraint user_connections_unique_pair unique (requester_id, receiver_id)
);

create index if not exists user_connections_requester_idx on public.user_connections (requester_id);
create index if not exists user_connections_receiver_idx  on public.user_connections (receiver_id);
create index if not exists user_connections_status_idx    on public.user_connections (status);

comment on table public.user_connections is
  'Directional connection requests between platform users (pending → accepted / blocked).';

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.user_connections enable row level security;

drop policy if exists user_connections_select  on public.user_connections;
drop policy if exists user_connections_insert  on public.user_connections;
drop policy if exists user_connections_update  on public.user_connections;
drop policy if exists user_connections_delete  on public.user_connections;

-- A user may see any row where they are the requester OR the receiver.
create policy user_connections_select on public.user_connections
  for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = receiver_id);

-- Only the requester can insert (send a request).
create policy user_connections_insert on public.user_connections
  for insert to authenticated
  with check (auth.uid() = requester_id);

-- The receiver may update the row (accept / block); requester may also update
-- their own row (e.g. cancel a pending request by setting status = 'blocked').
create policy user_connections_update on public.user_connections
  for update to authenticated
  using (auth.uid() = requester_id or auth.uid() = receiver_id);

-- Either party may delete the connection (unfriend / withdraw request).
create policy user_connections_delete on public.user_connections
  for delete to authenticated
  using (auth.uid() = requester_id or auth.uid() = receiver_id);

grant select, insert, update, delete on public.user_connections to authenticated;
grant all on public.user_connections to service_role;

-- ── Realtime ──────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.user_connections;

commit;
