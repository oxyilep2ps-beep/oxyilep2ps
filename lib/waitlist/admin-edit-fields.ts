import { STRATEGIC_QUESTIONS } from '@/lib/questionnaire/strategic-questions';

export const WAITLIST_INCOME_SOURCE_OPTIONS = [
  'Salary / Employment',
  'Business Profits / Self-Employed',
  'Real Estate / Rental Income',
  'Investments / Dividends',
  'Pension / Retirement Funds',
  'Savings',
  'Trust Fund / Inheritance',
  'Cryptocurrency Trading',
  'Other',
] as const;

export const WAITLIST_INCOME_BRACKET_OPTIONS = [
  'Below £30,000',
  '£30,000 - £60,000',
  '£60,000 - £100,000',
  '£100,000+',
] as const;

export const WAITLIST_LOAN_REASON_OPTIONS = [
  'Business',
  'Personal',
  'Debt Consolidation',
  'Education',
  'Other',
] as const;

export type WaitlistRole = 'investor' | 'borrower';
export type WaitlistAdminStatus = 'pending' | 'approved' | 'rejected';

export const WAITLIST_STRATEGIC_FIELDS = STRATEGIC_QUESTIONS.map((q) => ({
  key: q.label,
  label: q.label,
}));

/** Internal questionnaire keys managed by admin UI — not shown as duplicate fields. */
export const WAITLIST_INTERNAL_QA_KEYS = new Set(['_waitlist_status', '_user_type']);

export function qaString(
  answers: Record<string, string | boolean>,
  key: string,
  fallback = ''
): string {
  const value = answers[key];
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function readWaitlistStatus(answers: Record<string, string | boolean>): WaitlistAdminStatus {
  const stored = answers._waitlist_status;
  if (stored === 'approved' || stored === 'rejected' || stored === 'pending') return stored;
  return 'pending';
}

export function readWaitlistRole(role: string): WaitlistRole {
  return role === 'investor' ? 'investor' : 'borrower';
}
