-- =============================================================================
-- Admin ATS RLS: SELECT / UPDATE / DELETE for admin + HR on jobs & applications
-- NEW FILE ONLY — do not edit prior migrations.
-- Also enforces ON DELETE CASCADE from job_postings → job_applications.
-- =============================================================================

begin;

alter table public.job_postings enable row level security;
alter table public.job_applications enable row level security;

-- Recreate FK so deleting a posting removes linked applications
alter table public.job_applications drop constraint if exists job_applications_job_id_fkey;
alter table public.job_applications
  add constraint job_applications_job_id_fkey
  foreign key (job_id) references public.job_postings (id) on delete cascade;

-- job_postings: staff (admin role / HR) full mutating access
drop policy if exists job_postings_staff_select on public.job_postings;
drop policy if exists job_postings_staff_insert on public.job_postings;
drop policy if exists job_postings_staff_update on public.job_postings;
drop policy if exists job_postings_staff_delete on public.job_postings;
drop policy if exists job_postings_admin_select on public.job_postings;
drop policy if exists job_postings_admin_update on public.job_postings;
drop policy if exists job_postings_admin_delete on public.job_postings;

create policy job_postings_staff_select on public.job_postings
  for select to authenticated
  using (
    public.current_user_is_admin()
    or public.current_user_is_hr()
    or is_published = true
  );

create policy job_postings_staff_insert on public.job_postings
  for insert to authenticated
  with check (public.current_user_is_admin() or public.current_user_is_hr());

create policy job_postings_staff_update on public.job_postings
  for update to authenticated
  using (public.current_user_is_admin() or public.current_user_is_hr())
  with check (public.current_user_is_admin() or public.current_user_is_hr());

create policy job_postings_staff_delete on public.job_postings
  for delete to authenticated
  using (public.current_user_is_admin() or public.current_user_is_hr());

-- job_applications: admin + HR can read, change status, and delete
drop policy if exists job_applications_staff_select on public.job_applications;
drop policy if exists job_applications_staff_update on public.job_applications;
drop policy if exists job_applications_staff_delete on public.job_applications;
drop policy if exists job_applications_admin_select on public.job_applications;
drop policy if exists job_applications_admin_update on public.job_applications;
drop policy if exists job_applications_admin_delete on public.job_applications;

create policy job_applications_staff_select on public.job_applications
  for select to authenticated
  using (public.current_user_is_admin() or public.current_user_is_hr());

create policy job_applications_staff_update on public.job_applications
  for update to authenticated
  using (public.current_user_is_admin() or public.current_user_is_hr())
  with check (public.current_user_is_admin() or public.current_user_is_hr());

create policy job_applications_staff_delete on public.job_applications
  for delete to authenticated
  using (public.current_user_is_admin() or public.current_user_is_hr());

grant select, insert, update, delete on public.job_postings to authenticated;
grant select, insert, update, delete on public.job_applications to authenticated;
grant all on public.job_postings to service_role;
grant all on public.job_applications to service_role;

commit;
