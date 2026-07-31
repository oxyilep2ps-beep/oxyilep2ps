-- Profile Live Financial Portfolio & Handshake Hub
-- Forward-only: does not alter prior migrations.
-- Adds guarantor SELECT access and a reusable relationship view for the profile hub.

-- ---------------------------------------------------------------------------
-- 1. Guarantor may read handshakes they are linked to (by user id or invite email)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'handshakes'
      and policyname = 'Guarantors can select linked handshakes'
  ) then
    create policy "Guarantors can select linked handshakes"
      on public.handshakes
      for select
      to authenticated
      using (
        guarantor_user_id = auth.uid()
        or (
          guarantor_email is not null
          and lower(guarantor_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. View: active / in-flight financial handshakes with party foreign keys
--    RLS on underlying handshakes still applies for security_invoker consumers.
-- ---------------------------------------------------------------------------
create or replace view public.profile_financial_handshakes_v
with (security_invoker = true)
as
select
  h.id,
  h.borrower_id,
  h.lender_id as investor_id,
  h.amount::numeric(14, 2) as loan_amount_gbp,
  h.rate::numeric(8, 4) as interest_rate_pct,
  h.duration::integer as tenure_months,
  h.emi_amount::numeric(14, 2) as emi_amount_gbp,
  h.total_return::numeric(14, 2) as total_return_gbp,
  upper(coalesce(h.status::text, 'PENDING')) as status,
  upper(coalesce(h.payment_status::text, 'PENDING')) as payment_status,
  h.guarantor_user_id,
  h.guarantor_email,
  lower(coalesce(h.guarantor_status, 'none')) as guarantor_status,
  h.guarantor_mandate_id,
  h.funded_at,
  h.created_at
from public.handshakes h
where upper(coalesce(h.status::text, 'PENDING')) in (
  'PENDING',
  'MATCHED',
  'FUNDED',
  'ACTIVE'
);

comment on view public.profile_financial_handshakes_v is
  'Active and in-flight P2P handshakes for the Profile Financial Portfolio hub (£ GBP fields).';

grant select on public.profile_financial_handshakes_v to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Helper: classify viewer relationship for a handshake row
-- ---------------------------------------------------------------------------
create or replace function public.profile_handshake_viewer_role(
  p_borrower_id uuid,
  p_investor_id uuid,
  p_guarantor_user_id uuid,
  p_guarantor_email text
)
returns text
language sql
stable
as $$
  select case
    when p_borrower_id = auth.uid() then 'borrower'
    when p_investor_id = auth.uid() then 'investor'
    when p_guarantor_user_id = auth.uid() then 'guarantor'
    when p_guarantor_email is not null
      and lower(p_guarantor_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      then 'guarantor'
    else 'none'
  end;
$$;

comment on function public.profile_handshake_viewer_role(uuid, uuid, uuid, text) is
  'Returns borrower | investor | guarantor | none for the authenticated viewer.';

grant execute on function public.profile_handshake_viewer_role(uuid, uuid, uuid, text) to authenticated;
