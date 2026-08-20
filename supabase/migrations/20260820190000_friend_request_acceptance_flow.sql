-- Friend-request acceptance + notification type expansion.
-- NEW FILE ONLY — do not edit prior migrations.

begin;

-- Ensure connection status contract exists.
alter table public.user_connections
  add column if not exists status text not null default 'pending';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_connections_status_check'
      and conrelid = 'public.user_connections'::regclass
  ) then
    alter table public.user_connections
      add constraint user_connections_status_check
      check (status in ('pending', 'accepted', 'blocked'));
  end if;
exception
  when duplicate_object then null;
end $$;

create index if not exists user_connections_status_idx
  on public.user_connections (status);

-- Expand notification types for acceptance feedback.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('friend_request', 'friend_accepted', 'like', 'message', 'system'));

commit;
