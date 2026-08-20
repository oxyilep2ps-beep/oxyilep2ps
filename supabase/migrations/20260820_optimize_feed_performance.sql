-- Feed / social performance indexes.
-- NEW FILE ONLY — do not edit prior migrations.
-- Schema uses public.global_posts (not posts); indexes below target live tables.

begin;

-- Indexes for Posts & Feed Optimization (global_posts = feed table)
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.global_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.global_posts (author_id);

-- Indexes for Connections & Social Layer
CREATE INDEX IF NOT EXISTS idx_user_connections_status ON public.user_connections (status);
CREATE INDEX IF NOT EXISTS idx_user_connections_combo ON public.user_connections (requester_id, receiver_id);

-- Indexes for Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

-- Hot-path extras for chat + likes (same migration, no schema changes)
CREATE INDEX IF NOT EXISTS idx_messages_pair_created
  ON public.messages (sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_pair_created_rev
  ON public.messages (receiver_id, sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_user
  ON public.post_likes (post_id, user_id);

commit;
