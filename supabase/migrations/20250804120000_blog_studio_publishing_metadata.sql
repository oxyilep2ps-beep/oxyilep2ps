-- Blog Studio publishing metadata + historical backdating support
-- Forward-only. Does not modify prior migration files.

begin;

-- ---------------------------------------------------------------------------
-- public.blog_posts (SEO Content Engine)
-- ---------------------------------------------------------------------------
alter table public.blog_posts
  add column if not exists category text not null default 'FinTech',
  add column if not exists tags text[] not null default '{}',
  add column if not exists share_linkedin boolean not null default false,
  add column if not exists share_instagram boolean not null default false;

comment on column public.blog_posts.category is
  'Editorial category for single-page Blog Studio publishing settings.';
comment on column public.blog_posts.tags is
  'Free-form tags selected in Blog Studio.';
comment on column public.blog_posts.share_linkedin is
  'When true, admin publish may trigger LinkedIn syndication via Make.com.';
comment on column public.blog_posts.share_instagram is
  'When true, admin publish may trigger Instagram syndication via Make.com.';

create index if not exists blog_posts_published_at_idx
  on public.blog_posts (published_at desc nulls last);

create index if not exists blog_posts_created_at_idx
  on public.blog_posts (created_at desc);

-- ---------------------------------------------------------------------------
-- public.blogs (Editorial CMS)
-- ---------------------------------------------------------------------------
alter table public.blogs
  add column if not exists published_at timestamptz,
  add column if not exists category text not null default 'FinTech',
  add column if not exists tags text[] not null default '{}',
  add column if not exists share_linkedin boolean not null default false,
  add column if not exists share_instagram boolean not null default false,
  add column if not exists meta_description text not null default '',
  add column if not exists focus_keyword text not null default '';

comment on column public.blogs.published_at is
  'Public chronology timestamp. May be backdated for historical posts.';
comment on column public.blogs.category is
  'Editorial category from the single-page Blog Studio.';
comment on column public.blogs.meta_description is
  'On-page SEO meta description authored in Blog Studio.';
comment on column public.blogs.focus_keyword is
  'Primary SEO focus keyword authored in Blog Studio.';

create index if not exists blogs_published_at_idx
  on public.blogs (published_at desc nulls last);

create index if not exists blogs_created_at_idx
  on public.blogs (created_at desc);

-- Backfill published chronology for already-live CMS posts
update public.blogs
set published_at = coalesce(approved_at, created_at)
where upper(status::text) = 'PUBLISHED'
  and published_at is null;

commit;
