-- Collateral verification tracking (manual admin review, AI-ready schema)
-- Do not edit prior migration files.

begin;

alter table public.handshakes
  add column if not exists collateral_status varchar(20) not null default 'pending',
  add column if not exists asset_declared_value numeric(14, 2) not null default 0,
  add column if not exists asset_approved_value numeric(14, 2) not null default 0,
  add column if not exists max_ltv_amount numeric(14, 2) not null default 0,
  add column if not exists collateral_docs_url text;

alter table public.handshakes
  drop constraint if exists handshakes_collateral_status_check;

alter table public.handshakes
  add constraint handshakes_collateral_status_check
  check (collateral_status in ('pending', 'verified', 'rejected'));

comment on column public.handshakes.collateral_status is
  'Admin collateral review: pending | verified | rejected';
comment on column public.handshakes.asset_declared_value is
  'Borrower-declared collateral market value (GBP)';
comment on column public.handshakes.asset_approved_value is
  'Admin-verified collateral market value (GBP)';
comment on column public.handshakes.max_ltv_amount is
  'Maximum loan principal at 70% LTV based on approved asset value';
comment on column public.handshakes.collateral_docs_url is
  'Storage path or URL for collateral proof documents';

-- Backfill declared value / docs from legacy collateral columns where present
update public.handshakes
set
  asset_declared_value = coalesce(nullif(asset_declared_value, 0), collateral_value, 0),
  collateral_docs_url = coalesce(collateral_docs_url, collateral_proof_url)
where marketplace is true
   or collateral_type is not null
   or collateral_proof_url is not null;

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
