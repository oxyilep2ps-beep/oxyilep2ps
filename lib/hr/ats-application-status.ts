export const ATS_APPLICATION_STATUSES = ['New', 'Consider', 'Interview', 'Rejected'] as const;
export type AtsApplicationStatus = (typeof ATS_APPLICATION_STATUSES)[number];

export type AtsPipelineTab = 'all' | 'new' | 'consider' | 'interview' | 'rejected';

export const ATS_PIPELINE_TABS: {
  id: AtsPipelineTab;
  label: string;
}[] = [
  { id: 'all', label: 'All Resumes' },
  { id: 'new', label: 'New' },
  { id: 'consider', label: 'Can Consider' },
  { id: 'interview', label: 'For Interview' },
  { id: 'rejected', label: 'Rejected' },
];

export const ATS_STATUS_META: Record<
  AtsApplicationStatus,
  { label: string; hint: string; className: string }
> = {
  New: {
    label: 'New',
    hint: 'Fresh application',
    className: 'border-neutral-600 bg-neutral-900 text-neutral-200',
  },
  Consider: {
    label: 'Consider',
    hint: 'Worth a closer look',
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
  if (s === 'Consider' || s === 'Reviewed' || s === 'REVIEWED' || s === 'Reviewing' || s === 'Seen') {
    return 'Consider';
  }
  if (s === 'Interview') return 'Interview';
  if (s === 'Rejected' || s === 'REJECTED') return 'Rejected';
  return 'New';
}

export function matchesAtsTab(raw: string | null | undefined, tab: AtsPipelineTab): boolean {
  const s = (raw ?? '').trim();
  if (tab === 'all') return true;
  if (tab === 'new') return s === 'New' || s === 'Applied' || s === 'PENDING' || s === '';
  if (tab === 'consider') {
    return s === 'Consider' || s === 'Reviewed' || s === 'REVIEWED' || s === 'Reviewing' || s === 'Seen';
  }
  if (tab === 'interview') return s === 'Interview';
  return s === 'Rejected' || s === 'REJECTED';
}

export const INTERVIEW_EMAIL_TEMPLATE =
  'We loved your profile and would like to invite you for an interview. Please let us know your availability for a quick introductory call next week.';

export const REJECTION_EMAIL_TEMPLATE =
  'Hi there,\n\nThank you for taking the time to apply to Oxyile. We truly appreciate your interest in joining our team.\n\nAfter careful consideration, we have decided to move forward with other candidates for this particular role. The competition was incredibly strong, and this was a difficult decision.\n\nWe would love to stay connected! We frequently have new openings, so please keep an eye on the Oxyile Careers page and feel free to apply again in the future.\n\nWishing you the best of luck in your career journey.\n\nBest regards,\nThe Oxyile Team';
