-- Ensure KYC storage bucket exists with admin-readable RLS for private documents.
-- Bucket id remains `kyc-documents` (existing app code). Also create `documents` alias bucket.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kyc-documents',
  'kyc-documents',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Authenticated users can upload into their own folder on both buckets
drop policy if exists "kyc_documents_user_insert" on storage.objects;
create policy "kyc_documents_user_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('kyc-documents', 'documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "kyc_documents_user_update" on storage.objects;
create policy "kyc_documents_user_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('kyc-documents', 'documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('kyc-documents', 'documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "kyc_documents_user_select_own" on storage.objects;
create policy "kyc_documents_user_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id in ('kyc-documents', 'documents')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins / allowlisted employees can read all KYC docs
drop policy if exists "kyc_documents_admin_select" on storage.objects;
create policy "kyc_documents_admin_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id in ('kyc-documents', 'documents')
    and (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'ADMIN'::public.profile_role
      )
      or exists (
        select 1 from public.admin_allowlist a
        where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
      or exists (
        select 1 from public.allowed_employees e
        where lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          and e.role in ('admin', 'hr')
      )
    )
  );

drop policy if exists "kyc_documents_admin_delete" on storage.objects;
create policy "kyc_documents_admin_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('kyc-documents', 'documents')
    and (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'ADMIN'::public.profile_role
      )
      or exists (
        select 1 from public.admin_allowlist a
        where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
    )
  );

commit;
