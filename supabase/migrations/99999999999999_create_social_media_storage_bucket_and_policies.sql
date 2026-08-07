-- Public social-media storage bucket + RLS policies for Social Manager Portal.
-- Forward-only. Does NOT modify prior migration files.
--
-- NOTE: Do NOT run `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY`.
-- In hosted Supabase, storage.objects is owned by supabase_storage_admin;
-- enabling RLS requires table ownership (ERROR 42501). RLS is already enabled
-- on storage.objects by default — only bucket + policies are needed.

-- 1. Create the public 'social-media' bucket if it doesn't already exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'social-media',
  'social-media',
  true,
  10485760, -- 10MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Policy: Anyone can view/read images (Make.com / LinkedIn / Instagram)
drop policy if exists "Public Read Access for Social Media Assets" on storage.objects;
create policy "Public Read Access for Social Media Assets"
  on storage.objects for select
  using (bucket_id = 'social-media');

-- 3. Policy: Authenticated users can upload/insert assets
drop policy if exists "Authenticated Users Can Upload Social Media Assets" on storage.objects;
create policy "Authenticated Users Can Upload Social Media Assets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'social-media');

-- 4. Policy: Authenticated users can update assets (needed for upsert)
drop policy if exists "Authenticated Users Can Update Social Media Assets" on storage.objects;
create policy "Authenticated Users Can Update Social Media Assets"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'social-media')
  with check (bucket_id = 'social-media');

-- 5. Policy: Authenticated users can delete assets
drop policy if exists "Authenticated Users Can Update Delete Social Media Assets" on storage.objects;
create policy "Authenticated Users Can Update Delete Social Media Assets"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'social-media');
