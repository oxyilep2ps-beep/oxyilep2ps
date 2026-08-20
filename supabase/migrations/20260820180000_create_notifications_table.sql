-- In-app social notifications (friend requests, likes, messages, etc.)
-- NEW FILE ONLY — do not edit prior migrations.

begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  link_id uuid null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint notifications_type_check check (
    type in ('friend_request', 'like', 'message', 'system')
  )
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id)
  where is_read = false;

create index if not exists notifications_actor_idx
  on public.notifications (actor_id);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Inserts are performed by trusted server actions (service role) or security definer helpers.
grant select, update, delete on public.notifications to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

comment on table public.notifications is
  'In-app notifications for the recipient (user_id). actor_id is who triggered the event.';

commit;
