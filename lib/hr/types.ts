/** Enterprise HRMS / ATS types — all money in GBP. */

export const APPLICANT_STAGES = [
  'applied',
  'shortlisted',
  'interview',
  'offer',
  'hired',
  'rejected',
] as const;
export type ApplicantStage = (typeof APPLICANT_STAGES)[number];

export const BACKGROUND_STATUSES = [
  'not_started',
  'in_progress',
  'clear',
  'flagged',
  'dbs_pending',
  'dbs_clear',
] as const;
export type BackgroundCheckStatus = (typeof BACKGROUND_STATUSES)[number];

export type JobPosting = {
  id: string;
  title: string;
  department: string;
  salary_range_gbp: string | null;
  salary_min_gbp: number | null;
  salary_max_gbp: number | null;
  status: string;
  requirements: string;
  description: string;
  responsibilities?: string;
  ai_match_keywords?: string;
  location: string | null;
  employment_type: string;
  budget_approved: boolean;
  publish_to_careers?: boolean;
  headcount_requested: number;
  source_budget_gbp: number | null;
  created_at: string;
  is_intern_to_fulltime?: boolean;
  unpaid_months?: number | null;
  duration_months?: number | null;
  salary_min?: number | null;
  salary_max?: number | null;
  is_published?: boolean;
  compliance_responsibilities?: string;
  ai_keywords?: string;
  what_you_will_gain?: string | null;
};

export type JobApplicant = {
  id: string;
  job_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  resume_url: string | null;
  ai_match_score: number;
  stage: ApplicantStage;
  background_check_status: BackgroundCheckStatus;
  notes: string | null;
  source: string;
  interview_at: string | null;
  interview_notes: string | null;
  scorecard_json: Record<string, unknown>;
  offer_letter_html: string | null;
  offer_salary_gbp: number | null;
  in_talent_pool: boolean;
  duplicate_flag: boolean;
  created_at: string;
  job_title?: string;
};

export type EmployeeHrProfile = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  department: string;
  designation: string;
  employment_type: string;
  salary_basic_gbp: number;
  salary_hra_gbp: number;
  salary_pension_gbp: number;
  ni_contribution: number;
  kpi_score: number;
  probation_status: string;
  probation_start_date: string | null;
  probation_end_date: string | null;
  fca_compliance_trained: boolean;
  nda_signed: boolean;
  policy_ack_json: Record<string, unknown>;
  start_date: string | null;
  birthday: string | null;
  status: string;
};

export type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  reason: string | null;
  employee_name?: string;
  created_at: string;
};

export type ExpenseClaim = {
  id: string;
  employee_id: string;
  amount_gbp: number;
  category: string;
  receipt_url: string | null;
  description: string | null;
  status: string;
  requires_exec_signoff: boolean;
  employee_name?: string;
  created_at: string;
};

export type HrExecOverview = {
  monthlyPayrollBurnGbp: number;
  employeeCount: number;
  contractorCount: number;
  openVacancies: number;
  attritionRiskScore: number;
  departmentSpend: { department: string; spendGbp: number }[];
  topPerformers: { name: string; kpi: number; department: string }[];
  pendingCritical: { kind: string; label: string; amountGbp?: number }[];
  upcomingMilestones: { name: string; kind: 'birthday' | 'anniversary'; date: string }[];
  referralPendingGbp: number;
  headcountPending: number;
  atsPipeline: {
    total: number;
    newAndReviewing: number;
    interview: number;
    rejected: number;
  };
};

export function formatGbp(amount: number | null | undefined): string {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatGbpPrecise(amount: number | null | undefined): string {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function salaryNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'string' ? Number(value.trim()) : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function jobHasNumericSalary(job: {
  salary_min?: number | string | null;
  salary_max?: number | string | null;
  salary_min_gbp?: number | string | null;
  salary_max_gbp?: number | string | null;
}): boolean {
  return (
    salaryNumber(job.salary_min ?? job.salary_min_gbp) != null ||
    salaryNumber(job.salary_max ?? job.salary_max_gbp) != null
  );
}

export const DEFAULT_WHAT_YOU_WILL_GAIN = `1. Earn Recognition: Official Certificate of Recognition and Experience Letter to highlight on your resume and LinkedIn.

2. Job Opportunity: Outstanding performers who meet and exceed targets will have the opportunity to transition into full-time roles.

3. Hands-On Experience: Real ownership, direct mentorship, and portfolio-building work from day one.`;

export function resolveWhatYouWillGain(job: {
  what_you_will_gain?: string | null;
  is_intern_to_fulltime?: boolean | null;
  employment_type?: string | null;
}): string {
  const custom = String(job.what_you_will_gain ?? '').trim();
  if (custom) return custom;
  const type = String(job.employment_type ?? '').toLowerCase();
  if (job.is_intern_to_fulltime || type === 'intern' || type.includes('intern')) {
    return DEFAULT_WHAT_YOU_WILL_GAIN;
  }
  return '';
}

function formatSalaryAmount(value: number | null): string {
  if (value == null) return '£—';
  return `£${Math.round(value).toLocaleString('en-GB')}`;
}

function internshipDuration(job: {
  duration_months?: number | null;
  unpaid_months?: number | null;
}): number | null {
  const n = Number(job.duration_months ?? job.unpaid_months);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function isInternshipRole(job: {
  is_intern_to_fulltime?: boolean | null;
  employment_type?: string | null;
}): boolean {
  if (job.is_intern_to_fulltime) return true;
  const type = String(job.employment_type ?? '').toLowerCase();
  return type === 'intern' || type.includes('intern');
}

/** Public / ATS compensation line — never use the word "Unpaid". */
export function formatJobCompensation(job: {
  is_intern_to_fulltime?: boolean | null;
  employment_type?: string | null;
  duration_months?: number | null;
  unpaid_months?: number | null;
  salary_min?: number | string | null;
  salary_max?: number | string | null;
  salary_min_gbp?: number | string | null;
  salary_max_gbp?: number | string | null;
  salary_range_gbp?: string | null;
}): string {
  const min = salaryNumber(job.salary_min ?? job.salary_min_gbp);
  const max = salaryNumber(job.salary_max ?? job.salary_max_gbp);
  const months = internshipDuration(job);
  const internTrack = Boolean(job.is_intern_to_fulltime);
  const internship = isInternshipRole(job);
  const band = `${formatSalaryAmount(min)} - ${formatSalaryAmount(max)} Full-Time`;

  if (internTrack && (min != null || max != null)) {
    if (months != null) return `Internship for ${months} months, then ${band}`;
    return `Internship, then ${band}`;
  }

  if (min == null && max == null) {
    if (months != null) return `${months} months`;
    if (internship) return 'Internship';
    return 'Full-Time';
  }

  return band;
}

/** Green pill copy. Duration-only roles include the Duration: prefix. */
export function formatJobCompensationChip(job: Parameters<typeof formatJobCompensation>[0]): string {
  const min = salaryNumber(job.salary_min ?? job.salary_min_gbp);
  const max = salaryNumber(job.salary_max ?? job.salary_max_gbp);
  const months = internshipDuration(job);
  if (min == null && max == null && months != null) {
    return `Duration: ${months} months`;
  }
  return formatJobCompensation(job);
}

/** Simplified UK PAYE estimate (2025/26 standard personal allowance bands — illustrative). */
export function estimateUkPayeAnnual(grossGbp: number): {
  taxable: number;
  incomeTax: number;
  niEmployee: number;
  net: number;
} {
  const personalAllowance = 12570;
  const basicLimit = 50270;
  const higherLimit = 125140;
  const taxable = Math.max(0, grossGbp - personalAllowance);
  let incomeTax = 0;
  if (taxable > 0) {
    const basicBand = Math.min(taxable, basicLimit - personalAllowance);
    incomeTax += basicBand * 0.2;
    if (grossGbp > basicLimit) {
      const higherBand = Math.min(grossGbp, higherLimit) - basicLimit;
      incomeTax += Math.max(0, higherBand) * 0.4;
    }
    if (grossGbp > higherLimit) {
      incomeTax += (grossGbp - higherLimit) * 0.45;
    }
  }
  // Employee NI Class 1 (simplified primary threshold ~£12,570, 8% then 2%)
  const niPrimary = 12570;
  const niUpper = 50270;
  let niEmployee = 0;
  if (grossGbp > niPrimary) {
    niEmployee += Math.min(grossGbp, niUpper) - niPrimary;
    niEmployee *= 0.08;
    if (grossGbp > niUpper) niEmployee += (grossGbp - niUpper) * 0.02;
  }
  return {
    taxable,
    incomeTax: Math.round(incomeTax),
    niEmployee: Math.round(niEmployee),
    net: Math.round(grossGbp - incomeTax - niEmployee),
  };
}

export function scoreResumeAgainstRequirements(
  resumeText: string,
  requirements: string
): number {
  const reqTokens = requirements
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((t) => t.length > 3);
  const unique = [...new Set(reqTokens)].slice(0, 40);
  if (unique.length === 0) return 55;
  const hay = resumeText.toLowerCase();
  const hits = unique.filter((t) => hay.includes(t)).length;
  const base = Math.round((hits / unique.length) * 100);
  return Math.max(12, Math.min(98, base));
}

export function generateOfferLetterHtml(input: {
  candidateName: string;
  roleTitle: string;
  department: string;
  salaryGbp: number;
  startDate?: string;
}): string {
  const paye = estimateUkPayeAnnual(input.salaryGbp);
  return `
<div style="font-family:Georgia,serif;max-width:640px;margin:0 auto;color:#111">
  <h1 style="color:#ff5a1f">Oxyile — Conditional Offer of Employment</h1>
  <p>Dear ${input.candidateName},</p>
  <p>We are delighted to offer you the role of <strong>${input.roleTitle}</strong> in
  <strong>${input.department}</strong>, subject to satisfactory background/DBS checks and right-to-work verification.</p>
  <h2>Compensation (GBP)</h2>
  <ul>
    <li>Basic salary: ${formatGbp(input.salaryGbp)} per annum</li>
    <li>Illustrative net (PAYE estimate): ${formatGbp(paye.net)} per annum</li>
    <li>Estimated Income Tax: ${formatGbp(paye.incomeTax)}</li>
    <li>Estimated Employee NI: ${formatGbp(paye.niEmployee)}</li>
  </ul>
  <p>Proposed start date: ${input.startDate || 'To be confirmed'}.</p>
  <p>Please sign below to accept this offer.</p>
  <p style="margin-top:48px">Candidate signature: ______________________ Date: __________</p>
  <p>Hiring manager signature: ______________________ Date: __________</p>
  <p style="font-size:12px;color:#666">This letter is confidential. Oxyile Ltd — UK FinTech lender.</p>
</div>`.trim();
}

/** UK bank holidays 2026 (England & Wales) — static toggle data */
export const UK_BANK_HOLIDAYS_2026 = [
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-04-06', name: 'Easter Monday' },
  { date: '2026-05-04', name: 'Early May bank holiday' },
  { date: '2026-05-25', name: 'Spring bank holiday' },
  { date: '2026-08-31', name: 'Summer bank holiday' },
  { date: '2026-12-25', name: 'Christmas Day' },
  { date: '2026-12-28', name: 'Boxing Day (substitute)' },
];
