-- Likes for legacy Platform Announcements (feed fallback posts).
-- NEW FILE ONLY — do not edit prior migrations.

begin;

create table if not exists public.announcement_likes (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (announcement_id, user_id)
);

create index if not exists announcement_likes_announcement_idx
  on public.announcement_likes (announcement_id);

create index if not exists announcement_likes_user_idx
  on public.announcement_likes (user_id);

alter table public.announcement_likes enable row level security;

drop policy if exists "announcement_likes_select_authenticated" on public.announcement_likes;
create policy "announcement_likes_select_authenticated"
  on public.announcement_likes
  for select
  to authenticated
  using (true);

drop policy if exists "announcement_likes_insert_own" on public.announcement_likes;
create policy "announcement_likes_insert_own"
  on public.announcement_likes
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "announcement_likes_delete_own" on public.announcement_likes;
create policy "announcement_likes_delete_own"
  on public.announcement_likes
  for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on public.announcement_likes to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'announcement_likes'
  ) then
    alter publication supabase_realtime add table public.announcement_likes;
  end if;
end $$;

commit;
