-- Social media syndication fields for Make.com LinkedIn / Instagram sharing.
-- Forward-only. Does not modify prior migration files.
-- Applied when an Admin approves & publishes (not on blogger draft save).

begin;

-- ---------------------------------------------------------------------------
-- public.blog_posts (SEO Content Engine)
-- ---------------------------------------------------------------------------
alter table public.blog_posts
  add column if not exists cover_image_alt varchar null,
  add column if not exists social_caption text null,
  add column if not exists auto_share_socials boolean not null default true,
  add column if not exists social_share_status varchar not null default 'pending';

comment on column public.blog_posts.cover_image_alt is
  'SEO alt text for the cover image used in social syndication payloads.';
comment on column public.blog_posts.social_caption is
  'Optional short LinkedIn / Instagram caption. Falls back to meta description or title.';
comment on column public.blog_posts.auto_share_socials is
  'When true, Admin Approve & Publish may trigger Make.com LinkedIn/Instagram syndication.';
comment on column public.blog_posts.social_share_status is
  'Syndication tracker: pending | shared | failed.';

-- Backfill cover_image_alt from legacy cover_alt_text where present
update public.blog_posts
set cover_image_alt = cover_alt_text
where cover_image_alt is null
  and cover_alt_text is not null
  and btrim(cover_alt_text) <> '';

-- ---------------------------------------------------------------------------
-- public.blogs (Editorial CMS — Admin Approve & Publish path)
-- Mirror columns so the primary CMS approval flow can persist & syndicate.
-- ---------------------------------------------------------------------------
alter table public.blogs
  add column if not exists cover_image_alt varchar null,
  add column if not exists social_caption text null,
  add column if not exists auto_share_socials boolean not null default true,
  add column if not exists social_share_status varchar not null default 'pending';

comment on column public.blogs.cover_image_alt is
  'SEO alt text for the cover image used in social syndication payloads.';
comment on column public.blogs.social_caption is
  'Optional short LinkedIn / Instagram caption authored in Blog Studio.';
comment on column public.blogs.auto_share_socials is
  'When true, Admin Approve & Publish triggers Make.com LinkedIn/Instagram syndication.';
comment on column public.blogs.social_share_status is
  'Syndication tracker: pending | shared | failed.';

commit;
