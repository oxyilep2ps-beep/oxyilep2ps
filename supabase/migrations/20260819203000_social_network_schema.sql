-- =============================================================================
-- Social Network Core Schema
-- Global feed posts + strict friend requests + user group chats
-- =============================================================================

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- Global Posts (Instagram-style feed)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.global_posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references auth.users (id) on delete cascade,
  content    text not null,
  media_url  text,
  created_at timestamptz not null default now()
);

create index if not exists global_posts_created_idx on public.global_posts (created_at desc);
create index if not exists global_posts_author_idx on public.global_posts (author_id);

alter table public.global_posts enable row level security;

drop policy if exists global_posts_select on public.global_posts;
drop policy if exists global_posts_insert on public.global_posts;
drop policy if exists global_posts_update on public.global_posts;
drop policy if exists global_posts_delete on public.global_posts;

create policy global_posts_select on public.global_posts
  for select to authenticated
  using (true);

create policy global_posts_insert on public.global_posts
  for insert to authenticated
  with check (auth.uid() = author_id);

create policy global_posts_update on public.global_posts
  for update to authenticated
  using (auth.uid() = author_id or public.current_user_is_admin())
  with check (auth.uid() = author_id or public.current_user_is_admin());

create policy global_posts_delete on public.global_posts
  for delete to authenticated
  using (auth.uid() = author_id or public.current_user_is_admin());

grant select, insert, update, delete on public.global_posts to authenticated;
grant all on public.global_posts to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'global_posts'
  ) then
    alter publication supabase_realtime add table public.global_posts;
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Strict Friend Requests
-- Keep single directional row; application logic enforces pair uniqueness
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.user_connections (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  receiver_id  uuid not null references auth.users (id) on delete cascade,
  status       text not null default 'pending'
    check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now()
);

create index if not exists user_connections_requester_idx on public.user_connections (requester_id);
create index if not exists user_connections_receiver_idx on public.user_connections (receiver_id);
create index if not exists user_connections_status_idx on public.user_connections (status);

alter table public.user_connections enable row level security;

drop policy if exists user_connections_select on public.user_connections;
drop policy if exists user_connections_insert on public.user_connections;
drop policy if exists user_connections_update on public.user_connections;
drop policy if exists user_connections_delete on public.user_connections;

create policy user_connections_select on public.user_connections
  for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = receiver_id);

create policy user_connections_insert on public.user_connections
  for insert to authenticated
  with check (auth.uid() = requester_id and requester_id <> receiver_id);

create policy user_connections_update on public.user_connections
  for update to authenticated
  using (auth.uid() = requester_id or auth.uid() = receiver_id)
  with check (auth.uid() = requester_id or auth.uid() = receiver_id);

create policy user_connections_delete on public.user_connections
  for delete to authenticated
  using (auth.uid() = requester_id or auth.uid() = receiver_id);

grant select, insert, update, delete on public.user_connections to authenticated;
grant all on public.user_connections to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_connections'
  ) then
    alter publication supabase_realtime add table public.user_connections;
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- User Group Chats
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.chat_groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_group_members (
  group_id   uuid not null references public.chat_groups (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Support group messaging in the new UI.
create table if not exists public.chat_group_messages (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.chat_groups (id) on delete cascade,
  sender_id  uuid not null references auth.users (id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_group_members_user_idx on public.chat_group_members (user_id);
create index if not exists chat_group_messages_group_idx on public.chat_group_messages (group_id, created_at);

alter table public.chat_groups enable row level security;
alter table public.chat_group_members enable row level security;
alter table public.chat_group_messages enable row level security;

drop policy if exists chat_groups_select on public.chat_groups;
drop policy if exists chat_groups_insert on public.chat_groups;
drop policy if exists chat_groups_update on public.chat_groups;
drop policy if exists chat_groups_delete on public.chat_groups;

drop policy if exists chat_group_members_select on public.chat_group_members;
drop policy if exists chat_group_members_insert on public.chat_group_members;
drop policy if exists chat_group_members_delete on public.chat_group_members;

drop policy if exists chat_group_messages_select on public.chat_group_messages;
drop policy if exists chat_group_messages_insert on public.chat_group_messages;
drop policy if exists chat_group_messages_delete on public.chat_group_messages;

create policy chat_groups_select on public.chat_groups
  for select to authenticated
  using (
    exists (
      select 1
      from public.chat_group_members m
      where m.group_id = chat_groups.id and m.user_id = auth.uid()
    )
  );

create policy chat_groups_insert on public.chat_groups
  for insert to authenticated
  with check (created_by = auth.uid());

create policy chat_groups_update on public.chat_groups
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy chat_groups_delete on public.chat_groups
  for delete to authenticated
  using (created_by = auth.uid() or public.current_user_is_admin());

create policy chat_group_members_select on public.chat_group_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.chat_group_members me
      where me.group_id = chat_group_members.group_id and me.user_id = auth.uid()
    )
  );

create policy chat_group_members_insert on public.chat_group_members
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.chat_groups g
      where g.id = chat_group_members.group_id and g.created_by = auth.uid()
    )
  );

create policy chat_group_members_delete on public.chat_group_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.chat_groups g
      where g.id = chat_group_members.group_id and g.created_by = auth.uid()
    )
    or public.current_user_is_admin()
  );

create policy chat_group_messages_select on public.chat_group_messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.chat_group_members m
      where m.group_id = chat_group_messages.group_id and m.user_id = auth.uid()
    )
  );

create policy chat_group_messages_insert on public.chat_group_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.chat_group_members m
      where m.group_id = chat_group_messages.group_id and m.user_id = auth.uid()
    )
  );

create policy chat_group_messages_delete on public.chat_group_messages
  for delete to authenticated
  using (
    sender_id = auth.uid()
    or public.current_user_is_admin()
  );

grant select, insert, update, delete on public.chat_groups to authenticated;
grant select, insert, delete on public.chat_group_members to authenticated;
grant select, insert, delete on public.chat_group_messages to authenticated;
grant all on public.chat_groups, public.chat_group_members, public.chat_group_messages to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_group_messages'
  ) then
    alter publication supabase_realtime add table public.chat_group_messages;
  end if;
end;
$$;

commit;
