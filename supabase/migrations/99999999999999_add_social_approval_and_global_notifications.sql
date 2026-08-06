-- Social Studio approval workflow + global admin notification engine.
-- Forward-only. Does NOT modify prior migration files.

begin;

-- ---------------------------------------------------------------------------
-- 1. social_posts
-- ---------------------------------------------------------------------------
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  title varchar not null,
  caption text not null,
  image_url text not null default '',
  channels jsonb not null default '{"linkedin": true, "instagram": false}'::jsonb,
  status varchar not null default 'draft'
    check (status in ('draft', 'pending_approval', 'approved', 'rejected', 'published')),
  rejection_reason text null,
  submitted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.social_posts is
  'Social Media Studio drafts — writers submit for admin approval; admins approve/publish or reject.';

create index if not exists social_posts_status_idx on public.social_posts (status);
create index if not exists social_posts_submitted_by_idx on public.social_posts (submitted_by);
create index if not exists social_posts_created_at_idx on public.social_posts (created_at desc);

create or replace function public.set_social_posts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists social_posts_set_updated_at on public.social_posts;
create trigger social_posts_set_updated_at
  before update on public.social_posts
  for each row execute function public.set_social_posts_updated_at();

-- ---------------------------------------------------------------------------
-- 2. admin_notifications (badge + slide-in alerts)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  entity_type varchar not null
    check (entity_type in ('blog_post', 'social_post', 'resume_submission')),
  entity_id uuid not null,
  title varchar not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.admin_notifications is
  'Centralised admin badge counts and slide-in verification alerts.';

create index if not exists admin_notifications_unread_idx
  on public.admin_notifications (is_read, created_at desc)
  where is_read = false;

create index if not exists admin_notifications_entity_idx
  on public.admin_notifications (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- 3. Auto-notify helpers
-- ---------------------------------------------------------------------------
create or replace function public.enqueue_admin_notification(
  p_entity_type varchar,
  p_entity_id uuid,
  p_title varchar,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_notifications (entity_type, entity_id, title, message, is_read)
  values (p_entity_type, p_entity_id, p_title, p_message, false);
end;
$$;

create or replace function public.trg_social_posts_pending_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending_approval'
     and (tg_op = 'INSERT' or coalesce(old.status, '') is distinct from new.status) then
    perform public.enqueue_admin_notification(
      'social_post',
      new.id,
      coalesce(nullif(btrim(new.title), ''), 'Social campaign'),
      'New Submission: ' || coalesce(nullif(btrim(new.title), ''), 'Social campaign') || ' requires your verification.'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists social_posts_pending_notify on public.social_posts;
create trigger social_posts_pending_notify
  after insert or update of status on public.social_posts
  for each row execute function public.trg_social_posts_pending_notify();

create or replace function public.trg_blogs_pending_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if upper(new.status::text) in ('PENDING_APPROVAL', 'PENDING')
     and (tg_op = 'INSERT' or upper(coalesce(old.status::text, '')) is distinct from upper(new.status::text)) then
    perform public.enqueue_admin_notification(
      'blog_post',
      new.id,
      coalesce(nullif(btrim(new.title), ''), 'Blog post'),
      'New Submission: ' || coalesce(nullif(btrim(new.title), ''), 'Blog post') || ' requires your verification.'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists blogs_pending_notify on public.blogs;
create trigger blogs_pending_notify
  after insert or update of status on public.blogs
  for each row execute function public.trg_blogs_pending_notify();

create or replace function public.trg_job_applicants_new_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stage = 'applied'
     and (tg_op = 'INSERT' or coalesce(old.stage, '') is distinct from new.stage) then
    perform public.enqueue_admin_notification(
      'resume_submission',
      new.id,
      coalesce(nullif(btrim(new.full_name), ''), 'New applicant'),
      'New Submission: ' || coalesce(nullif(btrim(new.full_name), ''), 'Applicant') || ' resume requires your verification.'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists job_applicants_new_notify on public.job_applicants;
create trigger job_applicants_new_notify
  after insert or update of stage on public.job_applicants
  for each row execute function public.trg_job_applicants_new_notify();

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
alter table public.social_posts enable row level security;
alter table public.admin_notifications enable row level security;

drop policy if exists social_posts_select_own_or_admin on public.social_posts;
create policy social_posts_select_own_or_admin on public.social_posts
  for select to authenticated
  using (
    submitted_by = auth.uid()
    or public.current_user_is_admin()
  );

drop policy if exists social_posts_insert_own on public.social_posts;
create policy social_posts_insert_own on public.social_posts
  for insert to authenticated
  with check (
    submitted_by = auth.uid()
    or public.current_user_is_admin()
  );

drop policy if exists social_posts_update_own_or_admin on public.social_posts;
create policy social_posts_update_own_or_admin on public.social_posts
  for update to authenticated
  using (
    submitted_by = auth.uid()
    or public.current_user_is_admin()
  )
  with check (
    submitted_by = auth.uid()
    or public.current_user_is_admin()
  );

drop policy if exists social_posts_delete_own_or_admin on public.social_posts;
create policy social_posts_delete_own_or_admin on public.social_posts
  for delete to authenticated
  using (
    submitted_by = auth.uid()
    or public.current_user_is_admin()
  );

drop policy if exists admin_notifications_admin_all on public.admin_notifications;
create policy admin_notifications_admin_all on public.admin_notifications
  for all to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- Service role / security definer inserts still work for notification enqueue.

-- ---------------------------------------------------------------------------
-- 5. Realtime publication (badge + slide-in toasts)
-- ---------------------------------------------------------------------------
alter table public.admin_notifications replica identity full;
alter table public.social_posts replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'admin_notifications'
    ) then
      alter publication supabase_realtime add table public.admin_notifications;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'social_posts'
    ) then
      alter publication supabase_realtime add table public.social_posts;
    end if;
  else
    raise notice 'supabase_realtime publication not found — enable Realtime manually in Supabase Dashboard.';
  end if;
end $$;

commit;
