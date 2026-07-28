-- =============================================================================
-- Blog rejection feedback + inline images (CMS blogs + SEO blog_posts)
-- NEW FILE ONLY — do not edit prior migrations.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. public.blogs (Editorial CMS — pending approval workflow)
-- ---------------------------------------------------------------------------
alter table public.blogs
  add column if not exists admin_feedback text,
  add column if not exists rejection_reason varchar(64),
  add column if not exists inline_images jsonb not null default '[]'::jsonb;

comment on column public.blogs.admin_feedback is
  'Rich admin notes / changes requested when a post is rejected.';
comment on column public.blogs.rejection_reason is
  'Short rejection category: Plagiarism | Formatting | Poor SEO | Tone | Other.';
comment on column public.blogs.inline_images is
  'JSON array of inline body image URLs embedded in content.';

-- ---------------------------------------------------------------------------
-- 2. public.blog_posts (SEO Content Engine drafts)
-- ---------------------------------------------------------------------------
alter table public.blog_posts
  add column if not exists admin_feedback text,
  add column if not exists rejection_reason varchar(64),
  add column if not exists inline_images jsonb not null default '[]'::jsonb;

comment on column public.blog_posts.admin_feedback is
  'Admin change requests for SEO drafts escalated to review.';
comment on column public.blog_posts.rejection_reason is
  'Short rejection category for SEO drafts.';
comment on column public.blog_posts.inline_images is
  'JSON array of inline body image URLs for SEO drafts.';

-- ---------------------------------------------------------------------------
-- 3. Storage: blog-inline bucket for in-body images
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-inline',
  'blog-inline',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists blog_inline_public_read on storage.objects;
create policy blog_inline_public_read
  on storage.objects for select
  using (bucket_id = 'blog-inline');

drop policy if exists blog_inline_auth_upload on storage.objects;
create policy blog_inline_auth_upload
  on storage.objects for insert to authenticated
  with check (bucket_id = 'blog-inline');

drop policy if exists blog_inline_auth_update on storage.objects;
create policy blog_inline_auth_update
  on storage.objects for update to authenticated
  using (bucket_id = 'blog-inline')
  with check (bucket_id = 'blog-inline');

drop policy if exists blog_inline_auth_delete on storage.objects;
create policy blog_inline_auth_delete
  on storage.objects for delete to authenticated
  using (bucket_id = 'blog-inline');

commit;
