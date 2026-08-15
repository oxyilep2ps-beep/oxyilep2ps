-- =============================================================================
-- Public job applications + resumes storage
-- NEW FILE ONLY — do not edit prior migrations.
-- job_applications already exists (phase 3). CREATE IF NOT EXISTS is a no-op
-- on live DBs; ALTER adds job_id / candidate_* columns, expanded status, RLS.
-- =============================================================================

begin;

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.job_postings (id) on delete cascade,
  candidate_name text,
  candidate_email text,
  resume_url text,
  status text not null default 'Applied',
  created_at timestamptz not null default now()
);

alter table public.job_applications
  add column if not exists job_id uuid,
  add column if not exists candidate_name text,
  add column if not exists candidate_email text,
  add column if not exists resume_url text,
  add column if not exists status text,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'job_applications_job_id_fkey'
  ) then
    alter table public.job_applications
      add constraint job_applications_job_id_fkey
      foreign key (job_id) references public.job_postings (id) on delete cascade;
  end if;
exception
  when duplicate_object then null;
end $$;

-- Widen status to the ATS-facing set while keeping legacy PENDING/REVIEWED rows
alter table public.job_applications drop constraint if exists job_applications_status_check;
alter table public.job_applications
  alter column status set default 'Applied';

alter table public.job_applications
  add constraint job_applications_status_check
  check (
    status in (
      'Applied',
      'Reviewing',
      'Interview',
      'Rejected',
      'Hired',
      'PENDING',
      'REVIEWED',
      'REJECTED',
      'HIRED'
    )
  );

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'job_applications' and column_name = 'full_name'
  ) then
    update public.job_applications
    set
      candidate_name = coalesce(nullif(candidate_name, ''), full_name, 'Unknown'),
      candidate_email = coalesce(nullif(candidate_email, ''), email),
      status = case
        when status in ('Applied', 'Reviewing', 'Interview', 'Rejected', 'Hired') then status
        when status = 'PENDING' then 'Applied'
        when status = 'REVIEWED' then 'Reviewing'
        when status = 'REJECTED' then 'Rejected'
        when status = 'HIRED' then 'Hired'
        else coalesce(nullif(status, ''), 'Applied')
      end;
  else
    update public.job_applications
    set status = coalesce(nullif(status, ''), 'Applied')
    where status is null or status = '';
  end if;
end $$;

create index if not exists job_applications_job_id_idx on public.job_applications (job_id);
create index if not exists job_applications_status_idx on public.job_applications (status);
create index if not exists job_applications_created_idx on public.job_applications (created_at desc);

comment on table public.job_applications is
  'Public /careers applications. resume_url stores the Supabase Storage path or public URL in the resumes bucket.';
comment on column public.job_applications.resume_url is
  'Supabase Storage file path or public URL from the resumes bucket.';

-- ---------------------------------------------------------------------------
-- RLS — public INSERT; admins/HR SELECT + UPDATE
-- ---------------------------------------------------------------------------
alter table public.job_applications enable row level security;

drop policy if exists "job_applications_admin_all" on public.job_applications;
drop policy if exists job_applications_public_insert on public.job_applications;
drop policy if exists "job_applications_public_insert" on public.job_applications;
drop policy if exists job_applications_staff_select on public.job_applications;
drop policy if exists job_applications_staff_update on public.job_applications;

create policy job_applications_public_insert on public.job_applications
  for insert to anon, authenticated
  with check (true);

create policy job_applications_staff_select on public.job_applications
  for select to authenticated
  using (public.current_user_is_admin() or public.current_user_is_hr());

create policy job_applications_staff_update on public.job_applications
  for update to authenticated
  using (public.current_user_is_admin() or public.current_user_is_hr())
  with check (public.current_user_is_admin() or public.current_user_is_hr());

grant insert on public.job_applications to anon, authenticated;
grant select, update on public.job_applications to authenticated;
grant all on public.job_applications to service_role;

-- ---------------------------------------------------------------------------
-- Storage bucket: resumes
-- If this insert is blocked by Dashboard-only APIs, create a public bucket
-- named "resumes" in Supabase → Storage, then re-run the policy section.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  true,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = true,
  file_size_limit = coalesce(storage.buckets.file_size_limit, 5242880);

drop policy if exists "resumes_public_read" on storage.objects;
create policy "resumes_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'resumes');

drop policy if exists "resumes_anon_upload" on storage.objects;
create policy "resumes_anon_upload"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'resumes');

commit;
