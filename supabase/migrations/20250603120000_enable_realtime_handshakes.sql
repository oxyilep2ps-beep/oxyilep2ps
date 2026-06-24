-- Oxyile Phase 23: Enable Supabase Realtime for handshake status sync (chat UI)
-- Run in Supabase SQL Editor or via supabase db push

begin;

-- Ensure UPDATE payloads include all columns for client state merges
alter table public.handshakes replica identity full;

-- Add handshakes to the default realtime publication (idempotent)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'handshakes'
  ) then
    alter publication supabase_realtime add table public.handshakes;
  end if;
end $$;

commit;
