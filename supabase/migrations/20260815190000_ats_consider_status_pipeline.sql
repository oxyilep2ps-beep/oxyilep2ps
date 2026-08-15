-- =============================================================================
-- ATS pipeline: Consider replaces Reviewed. Keep New / Interview / Rejected.
-- NEW FILE ONLY — do not edit prior migrations.
-- =============================================================================

begin;

alter table public.job_applications drop constraint if exists job_applications_status_check;

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
      'HIRED'
    )
  );

alter table public.job_applications
  alter column status set default 'New';

update public.job_applications
set status = 'Consider'
where status in ('Reviewed', 'REVIEWED', 'Reviewing', 'Seen');

commit;
