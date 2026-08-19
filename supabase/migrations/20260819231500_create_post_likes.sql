-- Global post likes for social feed engagement.
create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.global_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists post_likes_post_idx on public.post_likes(post_id);
create index if not exists post_likes_user_idx on public.post_likes(user_id);

alter table public.post_likes enable row level security;

drop policy if exists "post_likes_select_participants" on public.post_likes;
create policy "post_likes_select_participants"
  on public.post_likes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_connections c
      where c.status = 'accepted'
        and (
          (c.requester_id = auth.uid() and c.receiver_id = post_likes.user_id)
          or
          (c.receiver_id = auth.uid() and c.requester_id = post_likes.user_id)
        )
    )
    or post_likes.user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'ADMIN'
    )
  );

drop policy if exists "post_likes_insert_own" on public.post_likes;
create policy "post_likes_insert_own"
  on public.post_likes
  for insert
  to authenticated
  with check (
    post_likes.user_id = auth.uid()
  );

drop policy if exists "post_likes_delete_own_or_admin" on public.post_likes;
create policy "post_likes_delete_own_or_admin"
  on public.post_likes
  for delete
  to authenticated
  using (
    post_likes.user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'ADMIN'
    )
  );

grant select, insert, delete on public.post_likes to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'post_likes'
  ) then
    alter publication supabase_realtime add table public.post_likes;
  end if;
end $$;
