-- Ensure realtime delivery for notifications + messages (badge/chat live sync).
-- NEW FILE ONLY — do not edit prior migrations.

begin;

-- Filtered UPDATE events need full old row (is_read transitions).
alter table if exists public.notifications replica identity full;
alter table if exists public.messages replica identity full;

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

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'handshakes'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'handshakes'
  ) then
    alter publication supabase_realtime add table public.handshakes;
  end if;
end $$;

-- Keep handshakes on full replica identity for escrow/status live updates.
alter table if exists public.handshakes replica identity full;

commit;
