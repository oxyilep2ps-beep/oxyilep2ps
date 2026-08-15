-- =============================================================================
-- ATS application pipeline statuses: New, Reviewed, Interview, Rejected
-- NEW FILE ONLY — do not edit prior migrations.
-- =============================================================================

begin;

alter table public.job_applications drop constraint if exists job_applications_status_check;

alter table public.job_applications
  add constraint job_applications_status_check
  check (
    status in (
      'New',
      'Reviewed',
      'Interview',
      'Rejected',
      'Applied',
      'Reviewing',
      'Hired',
      'PENDING',
      'REVIEWED',
      'REJECTED',
      'HIRED'
    )
  );

update public.job_applications
set status = case
  when status in ('PENDING', 'Applied') then 'New'
  when status in ('REVIEWED', 'Reviewing') then 'Reviewed'
  when status in ('REJECTED') then 'Rejected'
  when status in ('HIRED') then 'Hired'
  else status
end
where status in ('PENDING', 'Applied', 'REVIEWED', 'Reviewing', 'REJECTED', 'HIRED');

commit;
