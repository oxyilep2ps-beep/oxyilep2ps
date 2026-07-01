-- JIT investor funding timestamp on handshakes
alter table public.handshakes
  add column if not exists funded_at timestamptz;

comment on column public.handshakes.funded_at is
  'UTC timestamp when the investor completed GoCardless escrow funding (JIT flow).';
