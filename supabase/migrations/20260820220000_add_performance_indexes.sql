-- Performance indexes for Global Feed + Chat Inbox.
-- NEW FILE ONLY — do not edit prior migrations.
-- Matches live schema (global_posts, messages sender/receiver, etc.).

begin;

-- Feed: newest posts first (user-facing name idx_posts_created_at)
create index if not exists idx_posts_created_at
  on public.global_posts (created_at desc);

create index if not exists idx_global_posts_author_created
  on public.global_posts (author_id, created_at desc);

-- Direct messages: conversation thread lookups (no chat_id column in schema)
create index if not exists idx_messages_chat_id_created_at
  on public.messages (sender_id, receiver_id, created_at desc);

create index if not exists idx_messages_receiver_sender_created
  on public.messages (receiver_id, sender_id, created_at desc);

create index if not exists idx_messages_receiver_unread
  on public.messages (receiver_id, is_read, created_at desc);

-- Likes
create index if not exists idx_post_likes_post_id
  on public.post_likes (post_id);

create index if not exists idx_post_likes_user_post
  on public.post_likes (user_id, post_id);

-- Connections / friend graph
create index if not exists idx_user_connections_users
  on public.user_connections (requester_id, receiver_id);

create index if not exists idx_user_connections_receiver_status
  on public.user_connections (receiver_id, status);

create index if not exists idx_user_connections_requester_status
  on public.user_connections (requester_id, status);

-- Notifications badge / list
create index if not exists idx_notifications_user_is_read
  on public.notifications (user_id, is_read);

create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

-- Group chat + announcement likes (feed/chat hot paths)
create index if not exists idx_chat_group_messages_group_created
  on public.chat_group_messages (group_id, created_at desc);

create index if not exists idx_announcement_likes_announcement
  on public.announcement_likes (announcement_id);

create index if not exists idx_announcements_created
  on public.announcements (created_at desc);

commit;
