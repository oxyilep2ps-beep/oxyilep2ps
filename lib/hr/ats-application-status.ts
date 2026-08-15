export const ATS_APPLICATION_STATUSES = ['New', 'Reviewed', 'Interview', 'Rejected'] as const;
export type AtsApplicationStatus = (typeof ATS_APPLICATION_STATUSES)[number];

export const ATS_STATUS_META: Record<
  AtsApplicationStatus,
  { label: string; hint: string; className: string }
> = {
  New: {
    label: 'New',
    hint: 'Fresh application',
    className: 'border-neutral-600 bg-neutral-900 text-neutral-200',
  },
  Reviewed: {
    label: 'Reviewed (Seen)',
    hint: 'Resume reviewed',
    className: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
  },
  Interview: {
    label: 'Interview',
    hint: 'Check out for interview',
    className: 'border-[#F97316]/50 bg-[#F97316]/15 text-[#F97316]',
  },
  Rejected: {
    label: 'Rejected',
    hint: 'Not moving forward',
    className: 'border-red-500/40 bg-red-500/15 text-red-300',
  },
};

export function normalizeAtsStatus(raw: string | null | undefined): AtsApplicationStatus {
  const s = (raw ?? '').trim();
  if (s === 'Reviewed' || s === 'REVIEWED' || s === 'Reviewing' || s === 'Seen') return 'Reviewed';
  if (s === 'Interview') return 'Interview';
  if (s === 'Rejected' || s === 'REJECTED') return 'Rejected';
  return 'New';
}

export const INTERVIEW_EMAIL_TEMPLATE =
  'We loved your profile and would like to invite you for an interview. Please let us know your availability for a quick introductory call next week.';

export const REJECTION_EMAIL_TEMPLATE =
  'Thank you for applying to Oxyile. Unfortunately, we are moving forward with other candidates at this time. We will keep your resume on file for future roles.';
