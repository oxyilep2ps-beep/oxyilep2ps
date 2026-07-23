-- Align guarantor_status check with the app lifecycle used by invite + GoCardless flows.
-- Older phase scripts used pending/verified/signed; runtime code uses invited/accepted/rejected.

begin;

alter table public.handshakes
  drop constraint if exists handshakes_guarantor_status_check;

update public.handshakes
set guarantor_status = case lower(coalesce(guarantor_status, 'none'))
  when 'pending' then 'invited'
  when 'verified' then 'accepted'
  when 'signed' then 'accepted'
  when 'invited' then 'invited'
  when 'accepted' then 'accepted'
  when 'rejected' then 'rejected'
  else 'none'
end
where guarantor_status is distinct from case lower(coalesce(guarantor_status, 'none'))
  when 'pending' then 'invited'
  when 'verified' then 'accepted'
  when 'signed' then 'accepted'
  when 'invited' then 'invited'
  when 'accepted' then 'accepted'
  when 'rejected' then 'rejected'
  else 'none'
end;

alter table public.handshakes
  add constraint handshakes_guarantor_status_check
  check (guarantor_status in ('none', 'invited', 'accepted', 'rejected'));

commit;
