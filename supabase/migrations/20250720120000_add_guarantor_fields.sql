begin;

alter table public.handshakes
  add column if not exists guarantor_email varchar(320),
  add column if not exists guarantor_user_id uuid,
  add column if not exists guarantor_status varchar(20) not null default 'none',
  add column if not exists guarantor_mandate_id varchar(80);

do $$
begin
  alter table public.handshakes
    add constraint handshakes_guarantor_status_check
    check (guarantor_status in ('none', 'invited', 'accepted', 'rejected'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.handshakes
    add constraint handshakes_guarantor_user_id_fkey
    foreign key (guarantor_user_id) references public.profiles(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

comment on column public.handshakes.guarantor_email is
  'Optional guarantor/co-signer email invited for the loan application.';
comment on column public.handshakes.guarantor_user_id is
  'Linked authenticated guarantor profile if they create an account.';
comment on column public.handshakes.guarantor_status is
  'Guarantor lifecycle: none | invited | accepted | rejected';
comment on column public.handshakes.guarantor_mandate_id is
  'GoCardless mandate ID used for guarantor backup direct debit fallback.';

create table if not exists public.guarantor_payment_events (
  id uuid primary key default gen_random_uuid(),
  handshake_id uuid not null references public.handshakes(id) on delete cascade,
  original_payment_id varchar(120),
  guarantor_payment_id varchar(120),
  amount_gbp numeric(14, 2) not null default 0,
  status varchar(40) not null default 'pending',
  trigger_reason text not null default 'Guarantor Triggered Payment',
  metadata jsonb not null default '{}'::jsonb,
  triggered_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists guarantor_payment_events_handshake_id_idx
  on public.guarantor_payment_events (handshake_id, triggered_at desc);

comment on table public.guarantor_payment_events is
  'Audit log for guarantor fallback payments triggered after borrower EMI failure.';

commit;