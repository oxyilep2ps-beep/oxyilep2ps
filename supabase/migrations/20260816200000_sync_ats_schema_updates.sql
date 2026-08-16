-- =============================================================================
-- ATS schema sync: intern-to-FT job fields, applications pipeline, resumes bucket
-- NEW FILE ONLY — do not edit prior migrations.
-- Idempotent ALTERs so live DBs catch up even if earlier ATS files were skipped.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- job_postings: intern-to-full-time compensation fields
-- ---------------------------------------------------------------------------
create table if not exists public.job_postings (
  id uuid primary key default gen_random_uuid(),
  title text,
  is_intern_to_fulltime boolean not null default false,
  unpaid_months integer,
  salary_min numeric(12, 2),
  salary_max numeric(12, 2),
  created_at timestamptz not null default now()
);

alter table public.job_postings
  add column if not exists is_intern_to_fulltime boolean not null default false,
  add column if not exists unpaid_months integer,
  add column if not exists salary_min numeric(12, 2),
  add column if not exists salary_max numeric(12, 2);

alter table public.job_postings drop constraint if exists job_postings_unpaid_months_check;
alter table public.job_postings
  add constraint job_postings_unpaid_months_check
  check (unpaid_months is null or unpaid_months >= 0);

-- ---------------------------------------------------------------------------
-- job_applications: public /careers + ATS inbox
-- ---------------------------------------------------------------------------
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.job_postings (id) on delete cascade,
  candidate_name text,
  candidate_email text,
  resume_url text,
  status text not null default 'New',
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
    select 1 from pg_constraint where conname = 'job_applications_job_id_fkey'
  ) then
    alter table public.job_applications
      add constraint job_applications_job_id_fkey
      foreign key (job_id) references public.job_postings (id) on delete cascade;
  end if;
exception
  when duplicate_object then null;
end $$;

-- Pipeline: New, Consider, Interview, Rejected (+ legacy strings already in the wild)
alter table public.job_applications drop constraint if exists job_applications_status_check;
alter table public.job_applications
  alter column status set default 'New';

alter table public.job_applications
  add constraint job_applications_status_check
  check (
    status in (
      'New',
      'Consider',
      'Interview',
      'Rejected',
      'Applied',
      'Reviewed',
      'Reviewing',
      'Hired',
      'PENDING',
      'REVIEWED',
      'REJECTED',
      'HIRED',
      'Seen'
    )
  );

update public.job_applications
set status = case
  when status in ('PENDING', 'Applied') then 'New'
  when status in ('REVIEWED', 'Reviewing', 'Reviewed', 'Seen') then 'Consider'
  when status in ('REJECTED') then 'Rejected'
  when status in ('HIRED') then 'Hired'
  else status
end
where status in (
  'PENDING', 'Applied', 'REVIEWED', 'Reviewing', 'Reviewed', 'Seen', 'REJECTED', 'HIRED'
);

create index if not exists job_applications_job_id_idx on public.job_applications (job_id);
create index if not exists job_applications_status_idx on public.job_applications (status);
create index if not exists job_applications_created_idx on public.job_applications (created_at desc);

-- HR/admin must be able to delete postings and ATS rows (ATS inbox + job list)
alter table public.job_postings enable row level security;
alter table public.job_applications enable row level security;

drop policy if exists job_postings_staff_delete on public.job_postings;
create policy job_postings_staff_delete on public.job_postings
  for delete to authenticated
  using (public.current_user_is_admin() or public.current_user_is_hr());

drop policy if exists job_applications_staff_delete on public.job_applications;
create policy job_applications_staff_delete on public.job_applications
  for delete to authenticated
  using (public.current_user_is_admin() or public.current_user_is_hr());

grant select, insert, update, delete on public.job_postings to authenticated;
grant select, insert, update, delete on public.job_applications to authenticated;
grant all on public.job_postings to service_role;
grant all on public.job_applications to service_role;

-- ---------------------------------------------------------------------------
-- Storage: resumes bucket (PDF / DOC / DOCX, 5MB)
-- If this insert is blocked, create a public bucket named "resumes" in
-- Supabase Dashboard → Storage, then re-run the policy section below.
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
  file_size_limit = coalesce(excluded.file_size_limit, 5242880);

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

drop policy if exists "resumes_staff_delete" on storage.objects;
create policy "resumes_staff_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'resumes'
    and (public.current_user_is_admin() or public.current_user_is_hr())
  );

commit;
