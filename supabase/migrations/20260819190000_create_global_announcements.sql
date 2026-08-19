-- =============================================================================
-- Global Announcements
-- Admin-created broadcast messages shown on the /feed social landing page.
-- NEW FILE ONLY — do not edit prior migrations.
-- =============================================================================

begin;

create table if not exists public.global_announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null default '',
  emoji       text not null default '📢',
  pinned      boolean not null default false,
  author_id   uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists global_announcements_created_idx
  on public.global_announcements (created_at desc);

create index if not exists global_announcements_pinned_idx
  on public.global_announcements (pinned, created_at desc);

comment on table public.global_announcements is
  'Platform-wide announcements broadcast by admins; shown on the /feed page.';

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.global_announcements enable row level security;

drop policy if exists global_announcements_select_all  on public.global_announcements;
drop policy if exists global_announcements_insert_admin on public.global_announcements;
drop policy if exists global_announcements_update_admin on public.global_announcements;
drop policy if exists global_announcements_delete_admin on public.global_announcements;

-- Any authenticated user may read announcements.
create policy global_announcements_select_all on public.global_announcements
  for select to authenticated
  using (true);

-- Only admins (role = 'ADMIN') may write.
create policy global_announcements_insert_admin on public.global_announcements
  for insert to authenticated
  with check (public.current_user_is_admin());

create policy global_announcements_update_admin on public.global_announcements
  for update to authenticated
  using  (public.current_user_is_admin())
  with check (public.current_user_is_admin());

create policy global_announcements_delete_admin on public.global_announcements
  for delete to authenticated
  using (public.current_user_is_admin());

grant select on public.global_announcements to authenticated, anon;
grant insert, update, delete on public.global_announcements to authenticated;
grant all on public.global_announcements to service_role;

commit;
