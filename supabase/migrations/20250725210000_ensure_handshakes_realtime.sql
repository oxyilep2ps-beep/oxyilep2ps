-- Ensure handshakes UPDATE events reach chat clients (guarantor_status, mandate, etc.)
-- Idempotent — safe if an earlier realtime migration already ran.

begin;

alter table public.handshakes replica identity full;

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
