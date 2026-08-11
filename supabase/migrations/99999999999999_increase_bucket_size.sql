-- Increase social-media bucket to 2GB for Reels / Stories.
-- Forward-only. Does NOT modify prior migration files.

begin;

update storage.buckets
set
  file_size_limit = 2147483648, -- 2GB
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/x-m4v'
  ]
where id = 'social-media';

commit;
