-- Allow empty title/caption for Stories + canonical media_type: post | reel | story.
-- Forward-only. Does NOT modify prior migration files.

begin;

-- 1) Stories may omit title/caption
alter table public.social_campaigns
  alter column title drop not null,
  alter column title set default '',
  alter column caption drop not null,
  alter column caption set default '';

update public.social_campaigns
set title = coalesce(title, ''),
    caption = coalesce(caption, '')
where title is null or caption is null;

-- 2) Normalize legacy media_type values, then tighten check constraint
alter table public.social_campaigns
  drop constraint if exists social_campaigns_media_type_check;

update public.social_campaigns
set media_type = case
  when media_type in ('image', 'post') then 'post'
  when media_type in ('video', 'reel') then 'reel'
  when media_type = 'story' then 'story'
  else 'post'
end;

alter table public.social_campaigns
  alter column media_type set default 'post';

alter table public.social_campaigns
  add constraint social_campaigns_media_type_check
  check (media_type in ('post', 'reel', 'story'));

-- 3) Allow video uploads in social-media storage bucket
update storage.buckets
set
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime'
  ],
  file_size_limit = 52428800 -- 50MB for reels/stories
where id = 'social-media';

commit;
