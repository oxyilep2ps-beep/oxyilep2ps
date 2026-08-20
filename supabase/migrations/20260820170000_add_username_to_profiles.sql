-- Username auto-generation + uniqueness for social profiles.
-- NEW FILE ONLY — do not edit prior migrations.

begin;

-- Ensure column exists (idempotent; older migrations may already have added it).
alter table public.profiles
  add column if not exists username text;

-- Unique case-insensitive username (empty/null allowed until backfill).
drop index if exists public.profiles_username_unique_idx;
create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null and btrim(username) <> '';

create index if not exists profiles_username_trgm_idx
  on public.profiles (username);

create index if not exists profiles_full_legal_name_idx
  on public.profiles (full_legal_name);

-- ---------------------------------------------------------------------------
-- Helpers: slugify name + allocate unique username (base + 3 digits, retry)
-- ---------------------------------------------------------------------------
create or replace function public.slugify_username_base(raw_name text)
returns text
language plpgsql
immutable
as $$
declare
  base text;
begin
  base := lower(coalesce(raw_name, ''));
  base := regexp_replace(base, '[^a-z0-9]', '', 'g');
  if base is null or base = '' or char_length(base) < 2 then
    base := 'user';
  end if;
  -- Leave room for 3-digit suffix (max handle length ~30).
  return left(base, 27);
end;
$$;

create or replace function public.allocate_unique_username(raw_name text, exclude_id uuid default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  digits integer;
  attempt integer := 0;
begin
  base := public.slugify_username_base(raw_name);

  loop
    attempt := attempt + 1;
    if attempt <= 40 then
      digits := 100 + floor(random() * 900)::integer; -- 100–999
      candidate := base || digits::text;
    else
      -- Exhausted short suffixes — widen entropy.
      candidate := base || lpad((floor(random() * 1000000))::integer::text, 6, '0');
    end if;

    if not exists (
      select 1
      from public.profiles p
      where lower(p.username) = lower(candidate)
        and (exclude_id is null or p.id is distinct from exclude_id)
    ) then
      return candidate;
    end if;

    if attempt >= 80 then
      candidate := 'user' || replace(gen_random_uuid()::text, '-', '');
      return left(candidate, 30);
    end if;
  end loop;
end;
$$;

create or replace function public.ensure_profile_username()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.username is not null and btrim(new.username) <> '' then
    new.username := lower(regexp_replace(btrim(new.username), '^@+', ''));
    return new;
  end if;

  new.username := public.allocate_unique_username(
    coalesce(nullif(btrim(new.full_legal_name), ''), split_part(coalesce(new.email, 'user@oxyile'), '@', 1), 'user'),
    new.id
  );
  return new;
end;
$$;

drop trigger if exists trg_profiles_ensure_username on public.profiles;
create trigger trg_profiles_ensure_username
  before insert or update of username, full_legal_name
  on public.profiles
  for each row
  execute function public.ensure_profile_username();

-- Backfill existing rows with null/blank usernames.
do $$
declare
  r record;
  next_name text;
begin
  for r in
    select id, full_legal_name, email
    from public.profiles
    where username is null or btrim(username) = ''
  loop
    next_name := public.allocate_unique_username(
      coalesce(nullif(btrim(r.full_legal_name), ''), split_part(coalesce(r.email, 'user@oxyile'), '@', 1), 'user'),
      r.id
    );
    update public.profiles
      set username = next_name, updated_at = now()
      where id = r.id;
  end loop;
end $$;

comment on function public.allocate_unique_username(text, uuid) is
  'Builds username from full name (lowercase, no spaces) + 3 digits; retries until unique.';
comment on function public.ensure_profile_username() is
  'BEFORE INSERT/UPDATE trigger: auto-fills profiles.username when missing.';

commit;
