'use server';

import { revalidatePath } from 'next/cache';
import { assertHrOrAdmin } from '@/lib/auth/assert-hr';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractResumeText } from '@/lib/hr/extract-resume-text';
import { removeResumeFiles, resumeStoragePathFromUrl } from '@/lib/hr/resume-storage';
import { matchesAtsTab } from '@/lib/hr/ats-application-status';
import { computeAtsMatchScore } from '@/lib/hr/ats-match-score';
import { normalizeWorkingModel } from '@/lib/hr/working-model';
import { parseJobPostingPayload } from '@/lib/hr/job-schema';
import {
  generateOfferLetterHtml,
  formatJobCompensation,
  type ApplicantStage,
  type BackgroundCheckStatus,
  type EmployeeHrProfile,
  type ExpenseClaim,
  type HrExecOverview,
  type JobApplicant,
  type JobPosting,
  type LeaveRequest,
} from '@/lib/hr/types';

async function audit(action: string, performedBy: string, details: Record<string, unknown>) {
  const admin = createAdminClient();
  await admin.from('hr_audit_logs').insert({
    action_type: action,
    performed_by: performedBy,
    details_json: details,
  });
}

function mapJob(row: Record<string, unknown>): JobPosting {
  return {
    id: String(row.id),
    title: String(row.title),
    department: String(row.department ?? 'Operations'),
    salary_range_gbp: (row.salary_range_gbp as string | null) ?? null,
    salary_min_gbp: row.salary_min_gbp != null ? Number(row.salary_min_gbp) : null,
    salary_max_gbp: row.salary_max_gbp != null ? Number(row.salary_max_gbp) : null,
    status: String(row.status),
    requirements: String(row.requirements ?? ''),
    description: String(row.description ?? ''),
    responsibilities: String(row.responsibilities ?? ''),
    ai_match_keywords: String(row.ai_match_keywords ?? ''),
    working_model: normalizeWorkingModel((row.working_model as string | null) ?? (row.location as string | null)),
    location: normalizeWorkingModel((row.working_model as string | null) ?? (row.location as string | null)),
    employment_type: String(row.employment_type ?? 'full_time'),
    budget_approved: Boolean(row.budget_approved),
    publish_to_careers: row.publish_to_careers !== false,
    headcount_requested: Number(row.headcount_requested ?? 1),
    source_budget_gbp: row.source_budget_gbp != null ? Number(row.source_budget_gbp) : null,
    created_at: String(row.created_at),
    is_intern_to_fulltime: Boolean(row.is_intern_to_fulltime),
    unpaid_months: row.unpaid_months != null ? Number(row.unpaid_months) : row.duration_months != null ? Number(row.duration_months) : null,
    duration_months: row.duration_months != null ? Number(row.duration_months) : row.unpaid_months != null ? Number(row.unpaid_months) : null,
    salary_min: row.salary_min != null ? Number(row.salary_min) : row.salary_min_gbp != null ? Number(row.salary_min_gbp) : null,
    salary_max: row.salary_max != null ? Number(row.salary_max) : row.salary_max_gbp != null ? Number(row.salary_max_gbp) : null,
    is_published: Boolean(row.is_published ?? (row.status === 'open' && row.publish_to_careers !== false)),
    compliance_responsibilities: String(row.compliance_responsibilities ?? row.responsibilities ?? ''),
    ai_keywords: String(row.ai_keywords ?? row.ai_match_keywords ?? ''),
    what_you_will_gain: (row.what_you_will_gain as string | null) ?? null,
  };
}

function mapApplicant(row: Record<string, unknown>, jobTitle?: string): JobApplicant {
  return {
    id: String(row.id),
    job_id: (row.job_id as string | null) ?? null,
    full_name: String(row.full_name),
    email: String(row.email),
    phone: (row.phone as string | null) ?? null,
    resume_url: (row.resume_url as string | null) ?? null,
    ai_match_score: Number(row.ai_match_score ?? 0),
    stage: String(row.stage) as ApplicantStage,
    background_check_status: String(row.background_check_status) as BackgroundCheckStatus,
    notes: (row.notes as string | null) ?? null,
    source: String(row.source ?? 'direct'),
    interview_at: (row.interview_at as string | null) ?? null,
    interview_notes: (row.interview_notes as string | null) ?? null,
    scorecard_json: (row.scorecard_json as Record<string, unknown>) ?? {},
    offer_letter_html: (row.offer_letter_html as string | null) ?? null,
    offer_salary_gbp: row.offer_salary_gbp != null ? Number(row.offer_salary_gbp) : null,
    in_talent_pool: Boolean(row.in_talent_pool),
    duplicate_flag: Boolean(row.duplicate_flag),
    created_at: String(row.created_at),
    job_title: jobTitle,
  };
}

function mapEmployee(row: Record<string, unknown>): EmployeeHrProfile {
  return {
    id: String(row.id),
    user_id: (row.user_id as string | null) ?? null,
    full_name: String(row.full_name),
    email: String(row.email),
    department: String(row.department),
    designation: String(row.designation),
    employment_type: String(row.employment_type),
    salary_basic_gbp: Number(row.salary_basic_gbp ?? 0),
    salary_hra_gbp: Number(row.salary_hra_gbp ?? 0),
    salary_pension_gbp: Number(row.salary_pension_gbp ?? 0),
    ni_contribution: Number(row.ni_contribution ?? 0),
    kpi_score: Number(row.kpi_score ?? 0),
    probation_status: String(row.probation_status),
    probation_start_date: (row.probation_start_date as string | null) ?? null,
    probation_end_date: (row.probation_end_date as string | null) ?? null,
    fca_compliance_trained: Boolean(row.fca_compliance_trained),
    nda_signed: Boolean(row.nda_signed),
    policy_ack_json: (row.policy_ack_json as Record<string, unknown>) ?? {},
    start_date: (row.start_date as string | null) ?? null,
    birthday: (row.birthday as string | null) ?? null,
    status: String(row.status),
  };
}

function revalidateHr() {
  revalidatePath('/hr');
  revalidatePath('/hr/recruitment');
  revalidatePath('/hr/employees');
  revalidatePath('/hr/attendance');
  revalidatePath('/hr/payroll');
  revalidatePath('/hr/performance');
  revalidatePath('/admin-dashboard/hr-overview');
  revalidatePath('/portal/leave');
  revalidatePath('/portal/expenses');
  revalidatePath('/portal/employees/new');
}

// ─── Jobs ───────────────────────────────────────────────────────────────────

export async function listJobPostings() {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('job_postings').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapJob(r as Record<string, unknown>));
}

async function extractResumeFromStorage(
  admin: ReturnType<typeof createAdminClient>,
  resumeUrl: string | null | undefined
): Promise<string> {
  const path = resumeStoragePathFromUrl(resumeUrl);
  if (!path) return '';
  const { data } = await admin.storage.from('resumes').download(path);
  if (!data) return '';
  return extractResumeText(Buffer.from(await data.arrayBuffer()), { fileName: path });
}

function durationMonthsFromInput(input: {
  duration_months?: number | null;
  unpaid_months?: number | null;
}): number | null {
  const raw = input.duration_months ?? input.unpaid_months;
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

export async function createJobPosting(input: {
  title: string;
  department: string;
  salary_range_gbp?: string;
  salary_min_gbp?: number;
  salary_max_gbp?: number;
  salary_min?: number;
  salary_max?: number;
  requirements: string;
  description?: string;
  responsibilities?: string;
  compliance_responsibilities?: string;
  ai_match_keywords?: string;
  ai_keywords?: string;
  working_model?: string;
  location?: string;
  employment_type?: string;
  source_budget_gbp?: number;
  publish_to_careers?: boolean;
  is_published?: boolean;
  is_intern_to_fulltime?: boolean;
  unpaid_months?: number | null;
  duration_months?: number | null;
  what_you_will_gain?: string | null;
  status?: 'draft' | 'open';
}) {
  const user = await assertHrOrAdmin();
  const parsed = parseJobPostingPayload({
    ...input,
    working_model: input.working_model ?? input.location ?? 'Hybrid',
    employment_type: input.employment_type ?? 'full_time',
  });
  if (!parsed.success) {
    throw new Error(Object.values(parsed.fieldErrors)[0] ?? 'Invalid job posting.');
  }
  const admin = createAdminClient();
  const min = parsed.data.salary_min ?? parsed.data.salary_min_gbp ?? input.salary_min ?? input.salary_min_gbp ?? null;
  const max = parsed.data.salary_max ?? parsed.data.salary_max_gbp ?? input.salary_max ?? input.salary_max_gbp ?? null;
  const internTrack = Boolean(parsed.data.is_intern_to_fulltime);
  const durationMonths = durationMonthsFromInput(parsed.data);
  const published = Boolean(parsed.data.is_published ?? parsed.data.publish_to_careers);
  const range = formatJobCompensation({
    is_intern_to_fulltime: internTrack,
    employment_type: parsed.data.employment_type,
    duration_months: durationMonths,
    unpaid_months: durationMonths,
    salary_min: min,
    salary_max: max,
  });

  const compliance = parsed.data.compliance_responsibilities ?? parsed.data.responsibilities ?? '';
  const keywords = parsed.data.ai_keywords ?? parsed.data.ai_match_keywords ?? '';
  const status = parsed.data.status ?? (published ? 'open' : 'draft');
  const working_model = parsed.data.working_model;
  const { data, error } = await admin
    .from('job_postings')
    .insert({
      title: parsed.data.title.trim(),
      department: parsed.data.department.trim() || 'Operations',
      salary_range_gbp: range,
      salary_min_gbp: min,
      salary_max_gbp: max,
      salary_min: min,
      salary_max: max,
      requirements: parsed.data.requirements,
      description: parsed.data.description ?? '',
      responsibilities: compliance,
      compliance_responsibilities: compliance,
      ai_match_keywords: keywords,
      ai_keywords: keywords,
      working_model,
      location: working_model,
      employment_type: parsed.data.employment_type ?? 'full_time',
      source_budget_gbp: input.source_budget_gbp ?? max ?? min ?? null,
      status,
      budget_approved: status === 'open',
      publish_to_careers: published,
      is_published: published,
      is_intern_to_fulltime: internTrack,
      unpaid_months: durationMonths,
      duration_months: durationMonths,
      what_you_will_gain: parsed.data.what_you_will_gain?.trim() || null,
      created_by: user.id,
    })
    .select('*')
    .single();
  if (error) {
    throw new Error(
      /column|schema cache|is_intern_to_fulltime|is_published|unpaid_months|duration_months|what_you_will_gain|working_model/i.test(error.message)
        ? `Could not save job — apply supabase/migrations/20260817140000_job_working_model_and_ats_score.sql (and prior ATS job migrations) in the Supabase SQL editor, then retry. (${error.message})`
        : error.message
    );
  }

  const { error: headcountError } = await admin.from('hr_headcount_requests').insert({
    job_posting_id: data.id,
    title: input.title.trim(),
    department: input.department.trim() || 'Operations',
    salary_budget_gbp: input.source_budget_gbp ?? max ?? min ?? 0,
    justification: internTrack
      ? `Intern-to-full-time track (${durationMonths ?? 0} months) from Enterprise Job Editor`
      : 'New requisition from Enterprise Job Editor',
    requested_by: user.id,
    status: status === 'open' ? 'approved' : 'pending',
  });
  if (headcountError) {
    console.error('hr_headcount_requests insert skipped', headcountError.message);
  }

  await audit('job_posting.create', user.id, {
    jobId: data.id,
    title: input.title,
    status,
    is_intern_to_fulltime: internTrack,
  });
  revalidateHr();
  revalidatePath('/careers');
  return mapJob(data as Record<string, unknown>);
}

export async function updateJobPosting(
  id: string,
  input: Partial<{
    title: string;
    department: string;
    salary_min_gbp: number;
    salary_max_gbp: number;
    salary_min: number;
    salary_max: number;
    salary_range_gbp: string;
    requirements: string;
    description: string;
    responsibilities: string;
    compliance_responsibilities: string;
    ai_match_keywords: string;
    ai_keywords: string;
    working_model: string;
    location: string;
    employment_type: string;
    publish_to_careers: boolean;
    is_published: boolean;
    is_intern_to_fulltime: boolean;
    unpaid_months: number | null;
    duration_months?: number | null;
    what_you_will_gain?: string | null;
    status: string;
    source_budget_gbp: number;
  }>
) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const internTrack = Boolean(input.is_intern_to_fulltime);
  const min = input.salary_min ?? input.salary_min_gbp ?? null;
  const max = input.salary_max ?? input.salary_max_gbp ?? null;
  const durationMonths = durationMonthsFromInput(input);
  const published = Boolean(input.is_published ?? input.publish_to_careers);
  const compliance = input.compliance_responsibilities ?? input.responsibilities ?? '';
  const keywords = input.ai_keywords ?? input.ai_match_keywords ?? '';
  const working_model =
    input.working_model != null || input.location != null
      ? normalizeWorkingModel(input.working_model ?? input.location)
      : undefined;
  const range = formatJobCompensation({
    is_intern_to_fulltime: internTrack,
    employment_type: input.employment_type,
    duration_months: durationMonths,
    unpaid_months: durationMonths,
    salary_min: min,
    salary_max: max,
  });
  const status = input.status ?? (published ? 'open' : 'draft');

  const { data, error } = await admin
    .from('job_postings')
    .update({
      title: input.title?.trim(),
      department: input.department?.trim(),
      salary_range_gbp: range,
      salary_min_gbp: min,
      salary_max_gbp: max,
      salary_min: min,
      salary_max: max,
      requirements: input.requirements,
      description: input.description,
      responsibilities: compliance,
      compliance_responsibilities: compliance,
      ai_match_keywords: keywords,
      ai_keywords: keywords,
      working_model,
      location: working_model,
      employment_type: input.employment_type,
      publish_to_careers: published,
      is_published: published,
      is_intern_to_fulltime: internTrack,
      unpaid_months: durationMonths,
      duration_months: durationMonths,
      what_you_will_gain: input.what_you_will_gain !== undefined ? input.what_you_will_gain?.trim() || null : undefined,
      status,
      budget_approved: status === 'open',
      source_budget_gbp: input.source_budget_gbp ?? max ?? min ?? undefined,
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  await audit('job_posting.update', user.id, { id, is_intern_to_fulltime: internTrack });
  revalidateHr();
  revalidatePath('/careers');
  return mapJob(data as Record<string, unknown>);
}

export async function deleteJobPosting(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const user = await assertHrOrAdmin();
    const admin = createAdminClient();

    const { data: apps } = await admin.from('job_applications').select('resume_url').eq('job_id', id);
    try {
      await removeResumeFiles(
        admin,
        (apps ?? []).map((row) => (row.resume_url as string | null) ?? null)
      );
    } catch {
      // Storage cleanup is best-effort; still delete the posting.
    }

    const { error } = await admin.from('job_postings').delete().eq('id', id);
    if (error) return { success: false, message: error.message };

    await audit('job_posting.delete', user.id, { id });
    revalidateHr();
    revalidatePath('/careers');
    return { success: true, message: 'Job posting deleted' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete job posting.';
    return { success: false, message };
  }
}

export type HrPortalSettings = {
  company_legal_entity: string;
  default_currency: string;
  public_careers_sync: boolean;
  ats_email_notifications: boolean;
  default_dbs_level: string;
};

export async function getHrPortalSettings(): Promise<HrPortalSettings> {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('hr_portal_settings').select('*').eq('id', 'default').maybeSingle();
  if (error) throw new Error(error.message);
  return {
    company_legal_entity: String(data?.company_legal_entity ?? 'Oxyile Ltd (UK FinTech Lender)'),
    default_currency: String(data?.default_currency ?? 'GBP'),
    public_careers_sync: data?.public_careers_sync !== false,
    ats_email_notifications: data?.ats_email_notifications !== false,
    default_dbs_level: String(data?.default_dbs_level ?? 'standard'),
  };
}

export async function updateHrPortalSettings(patch: Partial<HrPortalSettings>) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('hr_portal_settings')
    .upsert({
      id: 'default',
      ...patch,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    });
  if (error) throw new Error(error.message);
  await audit('settings.update', user.id, patch as Record<string, unknown>);
  revalidateHr();
  revalidatePath('/careers');
}

// ─── Applicants / ATS ───────────────────────────────────────────────────────

export async function listJobApplicants(opts?: { talentPoolOnly?: boolean }) {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  let q = admin.from('job_applicants').select('*, job_postings(title)').order('updated_at', { ascending: false });
  if (opts?.talentPoolOnly) q = q.eq('in_talent_pool', true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const job = row.job_postings as { title?: string } | null;
    return mapApplicant(row, job?.title);
  });
}

export async function createJobApplicant(input: {
  job_id?: string;
  full_name: string;
  email: string;
  phone?: string;
  resume_url?: string;
  resume_text?: string;
  source?: string;
}) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const email = input.email.trim().toLowerCase();

  const { data: existing } = await admin
    .from('job_applicants')
    .select('id')
    .ilike('email', email)
    .limit(1);
  const duplicate = (existing?.length ?? 0) > 0;

  const { data: job } = input.job_id
    ? await admin
        .from('job_postings')
        .select('requirements, ai_match_keywords, ai_keywords, description, responsibilities')
        .eq('id', input.job_id)
        .maybeSingle()
    : { data: null };

  let resumeText = String(input.resume_text ?? '').trim();
  if (resumeText.length < 40 && input.resume_url) {
    try {
      resumeText = (await extractResumeFromStorage(admin, input.resume_url)) || resumeText;
    } catch {
      // Score 0 if the stored file cannot be read.
    }
  }

  const score = computeAtsMatchScore(resumeText, {
    ai_match_keywords: job?.ai_match_keywords,
    ai_keywords: job?.ai_keywords,
    requirements: job?.requirements,
    description: job?.description,
    responsibilities: job?.responsibilities,
  });

  const { data, error } = await admin
    .from('job_applicants')
    .insert({
      job_id: input.job_id || null,
      full_name: input.full_name.trim(),
      email,
      phone: input.phone ?? null,
      resume_url: input.resume_url ?? null,
      ai_match_score: score,
      stage: 'applied',
      source: input.source ?? 'direct',
      duplicate_flag: duplicate,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  await audit('applicant.create', user.id, { id: data.id, email, duplicate });
  revalidateHr();
  return mapApplicant(data as Record<string, unknown>);
}

export async function updateApplicantStage(id: string, stage: ApplicantStage) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('job_applicants').update({ stage }).eq('id', id);
  if (error) throw new Error(error.message);
  await audit('applicant.stage', user.id, { id, stage });
  revalidateHr();
}

export async function updateBackgroundCheck(id: string, status: BackgroundCheckStatus) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('job_applicants').update({ background_check_status: status }).eq('id', id);
  if (error) throw new Error(error.message);
  await audit('applicant.background', user.id, { id, status });
  revalidateHr();
}

export async function scheduleInterview(id: string, interviewAt: string, notes?: string) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('job_applicants')
    .update({
      interview_at: interviewAt,
      interview_notes: notes ?? null,
      stage: 'interview',
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
  await audit('applicant.interview', user.id, { id, interviewAt });
  revalidateHr();
}

export async function saveScorecard(
  id: string,
  scorecard: { technical: number; culture: number; notes: string }
) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('job_applicants').update({ scorecard_json: scorecard }).eq('id', id);
  if (error) throw new Error(error.message);
  await audit('applicant.scorecard', user.id, { id, scorecard });
  revalidateHr();
}

export async function toggleTalentPool(id: string, inPool: boolean) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('job_applicants').update({ in_talent_pool: inPool }).eq('id', id);
  if (error) throw new Error(error.message);
  await audit('applicant.talent_pool', user.id, { id, inPool });
  revalidateHr();
}

export async function generateOffer(id: string, salaryGbp: number) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data: app, error: fetchErr } = await admin
    .from('job_applicants')
    .select('*, job_postings(title, department)')
    .eq('id', id)
    .single();
  if (fetchErr) throw new Error(fetchErr.message);
  const job = app.job_postings as { title?: string; department?: string } | null;
  const html = generateOfferLetterHtml({
    candidateName: String(app.full_name),
    roleTitle: job?.title || 'Team Member',
    department: job?.department || 'Operations',
    salaryGbp,
  });
  const { error } = await admin
    .from('job_applicants')
    .update({
      offer_letter_html: html,
      offer_salary_gbp: salaryGbp,
      stage: 'offer',
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
  await audit('applicant.offer', user.id, { id, salaryGbp });
  revalidateHr();
  return html;
}

export async function getEmailTemplate(
  id: string,
  kind: 'interview_invite' | 'rejection'
): Promise<{ subject: string; body: string; mailto: string }> {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('job_applicants').select('full_name, email').eq('id', id).single();
  if (error) throw new Error(error.message);
  const name = data.full_name;
  const email = data.email;
  if (kind === 'interview_invite') {
    const subject = `Interview invitation — Oxyile`;
    const body = `Dear ${name},\n\nThank you for applying to Oxyile. We would like to invite you to an interview.\n\nPlease reply with your availability over the next 5 working days.\n\nKind regards,\nOxyile People Team`;
    return {
      subject,
      body,
      mailto: `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    };
  }
  const subject = `Update on your application — Oxyile`;
  const body = `Dear ${name},\n\nThank you for your interest in Oxyile and the time you invested in the process. After careful consideration, we will not be progressing your application at this time.\n\nWe wish you every success.\n\nKind regards,\nOxyile People Team`;
  return {
    subject,
    body,
    mailto: `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  };
}

// ─── Employees ──────────────────────────────────────────────────────────────

export async function listEmployees() {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('employee_hr_profiles').select('*').order('full_name');
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapEmployee(r as Record<string, unknown>));
}

export async function upsertEmployee(input: {
  id?: string;
  full_name: string;
  email: string;
  department: string;
  designation: string;
  employment_type?: string;
  salary_basic_gbp: number;
  salary_hra_gbp?: number;
  salary_pension_gbp?: number;
  ni_contribution?: number;
  start_date?: string;
  birthday?: string;
  probation_start_date?: string;
  probation_end_date?: string;
}) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const payload = {
    full_name: input.full_name.trim(),
    email: input.email.trim().toLowerCase(),
    department: input.department,
    designation: input.designation,
    employment_type: input.employment_type ?? 'full_time',
    salary_basic_gbp: input.salary_basic_gbp,
    salary_hra_gbp: input.salary_hra_gbp ?? 0,
    salary_pension_gbp: input.salary_pension_gbp ?? 0,
    ni_contribution: input.ni_contribution ?? Math.round(input.salary_basic_gbp * 0.08),
    start_date: input.start_date || null,
    birthday: input.birthday || null,
    probation_start_date: input.probation_start_date || null,
    probation_end_date: input.probation_end_date || null,
    probation_status: input.probation_end_date ? 'active' : 'not_started',
  };
  if (input.id) {
    const { data, error } = await admin.from('employee_hr_profiles').update(payload).eq('id', input.id).select('*').single();
    if (error) throw new Error(error.message);
    await audit('employee.update', user.id, { id: input.id });
    revalidateHr();
    return mapEmployee(data as Record<string, unknown>);
  }
  const { data, error } = await admin.from('employee_hr_profiles').insert(payload).select('*').single();
  if (error) throw new Error(error.message);
  await audit('employee.create', user.id, { id: data.id });
  revalidateHr();
  return mapEmployee(data as Record<string, unknown>);
}

export async function setEmployeeCompliance(
  id: string,
  patch: { fca_compliance_trained?: boolean; nda_signed?: boolean; kpi_score?: number }
) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const updates: Record<string, unknown> = { ...patch };
  if (patch.fca_compliance_trained) updates.fca_trained_at = new Date().toISOString();
  if (patch.nda_signed) updates.nda_signed_at = new Date().toISOString();
  const { error } = await admin.from('employee_hr_profiles').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
  await audit('employee.compliance', user.id, { id, patch });
  revalidateHr();
}

// ─── Leave / Expenses ───────────────────────────────────────────────────────

export async function listLeaveRequests() {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('leave_requests')
    .select('*, employee_hr_profiles(full_name)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const emp = row.employee_hr_profiles as { full_name?: string } | null;
    return {
      id: String(row.id),
      employee_id: String(row.employee_id),
      leave_type: String(row.leave_type),
      start_date: String(row.start_date),
      end_date: String(row.end_date),
      status: String(row.status),
      reason: (row.reason as string | null) ?? null,
      employee_name: emp?.full_name,
      created_at: String(row.created_at),
    } satisfies LeaveRequest;
  });
}

export async function createLeaveRequest(input: {
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason?: string;
}) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('leave_requests')
    .insert({
      employee_id: input.employee_id,
      leave_type: input.leave_type,
      start_date: input.start_date,
      end_date: input.end_date,
      reason: input.reason ?? null,
      status: 'pending',
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  await audit('leave.create', user.id, { id: data.id });
  revalidateHr();
  return data;
}

export async function reviewLeaveRequest(id: string, status: 'approved' | 'rejected') {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('leave_requests')
    .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  await audit('leave.review', user.id, { id, status });
  revalidateHr();
}

export async function listExpenseClaims() {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('expense_claims')
    .select('*, employee_hr_profiles(full_name)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const emp = row.employee_hr_profiles as { full_name?: string } | null;
    return {
      id: String(row.id),
      employee_id: String(row.employee_id),
      amount_gbp: Number(row.amount_gbp),
      category: String(row.category),
      receipt_url: (row.receipt_url as string | null) ?? null,
      description: (row.description as string | null) ?? null,
      status: String(row.status),
      requires_exec_signoff: Boolean(row.requires_exec_signoff),
      employee_name: emp?.full_name,
      created_at: String(row.created_at),
    } satisfies ExpenseClaim;
  });
}

export async function createExpenseClaim(input: {
  employee_id: string;
  amount_gbp: number;
  category: string;
  description?: string;
  receipt_url?: string;
}) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const requires = input.amount_gbp > 500;
  const { data, error } = await admin
    .from('expense_claims')
    .insert({
      employee_id: input.employee_id,
      amount_gbp: input.amount_gbp,
      category: input.category,
      description: input.description ?? null,
      receipt_url: input.receipt_url ?? null,
      status: 'pending',
      requires_exec_signoff: requires,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  await audit('expense.create', user.id, { id: data.id, amount_gbp: input.amount_gbp, requires });
  revalidateHr();
  return data;
}

export async function reviewExpenseClaim(id: string, status: 'approved' | 'rejected' | 'paid') {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('expense_claims')
    .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  await audit('expense.review', user.id, { id, status });
  revalidateHr();
}

// ─── Attendance / Overtime / Assets / Access ────────────────────────────────

export async function listAttendance(limit = 50) {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('hr_attendance_logs')
    .select('*, employee_hr_profiles(full_name)')
    .order('check_in_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function logAttendance(input: {
  employee_id: string;
  action: 'check_in' | 'check_out';
  ip_address?: string;
  location_tag?: string;
}) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  if (input.action === 'check_in') {
    const { error } = await admin.from('hr_attendance_logs').insert({
      employee_id: input.employee_id,
      ip_address: input.ip_address ?? null,
      location_tag: input.location_tag ?? 'Remote UK',
    });
    if (error) throw new Error(error.message);
  } else {
    const { data: open } = await admin
      .from('hr_attendance_logs')
      .select('id')
      .eq('employee_id', input.employee_id)
      .is('check_out_at', null)
      .order('check_in_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (open?.id) {
      await admin
        .from('hr_attendance_logs')
        .update({ check_out_at: new Date().toISOString() })
        .eq('id', open.id);
    }
  }
  await audit('attendance.log', user.id, input);
  revalidateHr();
}

export async function listOvertime() {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('hr_overtime_logs')
    .select('*, employee_hr_profiles(full_name)')
    .order('work_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function logOvertime(input: {
  employee_id: string;
  work_date: string;
  hours: number;
  notes?: string;
}) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('hr_overtime_logs').insert({
    employee_id: input.employee_id,
    work_date: input.work_date,
    hours: input.hours,
    notes: input.notes ?? null,
  });
  if (error) throw new Error(error.message);
  await audit('overtime.log', user.id, input);
  revalidateHr();
}

export async function signOffOvertime(id: string) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('hr_overtime_logs')
    .update({ manager_signed_off: true, signed_off_by: user.id })
    .eq('id', id);
  if (error) throw new Error(error.message);
  await audit('overtime.signoff', user.id, { id });
  revalidateHr();
}

export async function listAssets() {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('hr_asset_allocations')
    .select('*, employee_hr_profiles(full_name)')
    .order('allocated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function allocateAsset(input: {
  employee_id: string;
  asset_type: string;
  asset_label: string;
  serial_number?: string;
}) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('hr_asset_allocations').insert(input);
  if (error) throw new Error(error.message);
  await audit('asset.allocate', user.id, input);
  revalidateHr();
}

export async function createAccessRequest(input: {
  employee_id?: string;
  request_type: 'grant' | 'revoke';
  platform_role: string;
  reason?: string;
}) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('hr_access_requests').insert({
    ...input,
    created_by: user.id,
    status: 'pending',
  });
  if (error) throw new Error(error.message);
  await audit('access.request', user.id, input);
  revalidateHr();
}

export async function listAccessRequests() {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('hr_access_requests').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── Performance / Grievance / Offboarding ──────────────────────────────────

export async function listKpiGoals() {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('hr_kpi_goals')
    .select('*, employee_hr_profiles(full_name)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createKpiGoal(input: {
  employee_id: string;
  quarter: string;
  title: string;
  description?: string;
}) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('hr_kpi_goals').insert(input);
  if (error) throw new Error(error.message);
  await audit('kpi.create', user.id, input);
  revalidateHr();
}

export async function updateKpiProgress(id: string, progress_pct: number) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('hr_kpi_goals')
    .update({ progress_pct, status: progress_pct >= 100 ? 'completed' : 'active' })
    .eq('id', id);
  if (error) throw new Error(error.message);
  await audit('kpi.progress', user.id, { id, progress_pct });
  revalidateHr();
}

export async function addPeerFeedback(input: {
  employee_id: string;
  from_name: string;
  rating: number;
  feedback: string;
}) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('hr_peer_feedback').insert(input);
  if (error) throw new Error(error.message);
  await audit('feedback.add', user.id, { employee_id: input.employee_id });
  revalidateHr();
}

export async function listPeerFeedback() {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('hr_peer_feedback')
    .select('*, employee_hr_profiles(full_name)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function submitGrievance(input: { subject: string; body: string }) {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('hr_grievances').insert({
    subject: input.subject,
    body: input.body,
    is_anonymous: true,
  });
  if (error) throw new Error(error.message);
  revalidateHr();
}

export async function listGrievances() {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('hr_grievances').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function startOffboarding(employee_id: string, last_working_day?: string) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('hr_offboarding').insert({
    employee_id,
    last_working_day: last_working_day || null,
  });
  if (error) throw new Error(error.message);
  await admin.from('employee_hr_profiles').update({ status: 'offboarding' }).eq('id', employee_id);
  await audit('offboarding.start', user.id, { employee_id });
  revalidateHr();
}

export async function updateOffboarding(
  id: string,
  patch: { access_revoked?: boolean; assets_collected?: boolean; exit_interview_notes?: string; status?: string }
) {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('hr_offboarding').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
  await audit('offboarding.update', user.id, { id, patch });
  revalidateHr();
}

export async function listOffboarding() {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('hr_offboarding')
    .select('*, employee_hr_profiles(full_name)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function exportAuditCsv(): Promise<string> {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('hr_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const header = 'id,action_type,performed_by,details_json,created_at';
  const lines = rows.map((r) =>
    [r.id, r.action_type, r.performed_by, JSON.stringify(r.details_json).replace(/"/g, '""'), r.created_at]
      .map((c) => `"${c ?? ''}"`)
      .join(',')
  );
  return [header, ...lines].join('\n');
}

// ─── Admin executive overview ───────────────────────────────────────────────

export type HeadcountRequestRow = {
  id: string;
  title: string;
  department: string;
  salary_budget_gbp: number;
  status: string;
  job_posting_id: string | null;
  job: JobPosting | null;
};

export async function listHeadcountRequests(): Promise<HeadcountRequestRow[]> {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('hr_headcount_requests')
    .select('*, job_postings(*)')
    .order('created_at', { ascending: false });
  if (error) {
    const fallback = await admin.from('hr_headcount_requests').select('*').order('created_at', { ascending: false });
    if (fallback.error) throw new Error(fallback.error.message);
    return (fallback.data ?? []).map((row) => mapHeadcount(row as Record<string, unknown>));
  }
  return (data ?? []).map((row) => mapHeadcount(row as Record<string, unknown>));
}

function mapHeadcount(row: Record<string, unknown>): HeadcountRequestRow {
  const joined = row.job_postings as Record<string, unknown> | Record<string, unknown>[] | null;
  const jobRow = Array.isArray(joined) ? joined[0] : joined;
  return {
    id: String(row.id),
    title: String(row.title ?? jobRow?.title ?? 'Role'),
    department: String(row.department ?? ''),
    salary_budget_gbp: Number(row.salary_budget_gbp ?? 0),
    status: String(row.status ?? 'pending'),
    job_posting_id: (row.job_posting_id as string | null) ?? (jobRow?.id as string | null) ?? null,
    job: jobRow?.id ? mapJob(jobRow) : null,
  };
}

export async function reviewHeadcountRequest(id: string, status: 'approved' | 'rejected') {
  const user = await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data: req, error: fetchErr } = await admin.from('hr_headcount_requests').select('*').eq('id', id).single();
  if (fetchErr) throw new Error(fetchErr.message);
  const { error } = await admin
    .from('hr_headcount_requests')
    .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  if (status === 'approved' && req.job_posting_id) {
    await admin
      .from('job_postings')
      .update({ budget_approved: true, status: 'open' })
      .eq('id', req.job_posting_id);
  }
  await audit('headcount.review', user.id, { id, status });
  revalidateHr();
}

export async function listReferralBonuses() {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('hr_referral_bonuses').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getHrExecOverview(): Promise<HrExecOverview> {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const [emps, jobs, expenses, leaves, headcount, referrals, applications] = await Promise.all([
    admin.from('employee_hr_profiles').select('*').eq('status', 'active'),
    admin.from('job_postings').select('*').in('status', ['open', 'draft', 'paused']),
    admin.from('expense_claims').select('*').eq('status', 'pending'),
    admin.from('leave_requests').select('employee_id, start_date').eq('status', 'approved'),
    admin.from('hr_headcount_requests').select('*').eq('status', 'pending'),
    admin.from('hr_referral_bonuses').select('amount_gbp').in('status', ['pending', 'payable']),
    admin.from('job_applications').select('status'),
  ]);

  const employees = (emps.data ?? []).map((r) => mapEmployee(r as Record<string, unknown>));
  const monthlyPayrollBurnGbp = Math.round(
    employees.reduce((s, e) => s + e.salary_basic_gbp + e.salary_hra_gbp + e.salary_pension_gbp, 0) / 12
  );
  const employeeCount = employees.filter((e) => e.employment_type === 'full_time').length;
  const contractorCount = employees.filter((e) => e.employment_type === 'contractor').length;
  const openVacancies = (jobs.data ?? []).filter((j) => j.status === 'open').length;

  const deptMap = new Map<string, number>();
  for (const e of employees) {
    deptMap.set(e.department, (deptMap.get(e.department) ?? 0) + e.salary_basic_gbp);
  }
  const departmentSpend = [...deptMap.entries()].map(([department, spendGbp]) => ({ department, spendGbp }));

  const topPerformers = [...employees]
    .sort((a, b) => b.kpi_score - a.kpi_score)
    .slice(0, 5)
    .map((e) => ({ name: e.full_name, kpi: e.kpi_score, department: e.department }));

  const pendingCritical: HrExecOverview['pendingCritical'] = [];
  for (const ex of expenses.data ?? []) {
    if (Number(ex.amount_gbp) > 500 || ex.requires_exec_signoff) {
      pendingCritical.push({
        kind: 'expense',
        label: `Expense ${ex.category}`,
        amountGbp: Number(ex.amount_gbp),
      });
    }
  }
  for (const hc of headcount.data ?? []) {
    pendingCritical.push({
      kind: 'headcount',
      label: `Headcount: ${hc.title}`,
      amountGbp: Number(hc.salary_budget_gbp),
    });
  }

  const now = new Date();
  const upcomingMilestones: HrExecOverview['upcomingMilestones'] = [];
  for (const e of employees) {
    if (e.birthday) {
      const b = new Date(e.birthday);
      b.setFullYear(now.getFullYear());
      const diff = (b.getTime() - now.getTime()) / 86400000;
      if (diff >= 0 && diff <= 45) {
        upcomingMilestones.push({ name: e.full_name, kind: 'birthday', date: e.birthday });
      }
    }
    if (e.start_date) {
      const s = new Date(e.start_date);
      s.setFullYear(now.getFullYear());
      const diff = (s.getTime() - now.getTime()) / 86400000;
      if (diff >= 0 && diff <= 45) {
        upcomingMilestones.push({ name: e.full_name, kind: 'anniversary', date: e.start_date });
      }
    }
  }

  // Simple attrition risk: low leave usage + high OT proxy via kpi variance
  const leaveEmpIds = new Set((leaves.data ?? []).map((l) => l.employee_id));
  const noLeaveRatio = employees.length
    ? employees.filter((e) => !leaveEmpIds.has(e.id)).length / employees.length
    : 0;
  const attritionRiskScore = Math.round(Math.min(95, noLeaveRatio * 70 + (contractorCount > employeeCount ? 15 : 5)));

  const referralPendingGbp = (referrals.data ?? []).reduce((s, r) => s + Number(r.amount_gbp), 0);

  const atsPipeline = {
    total: 0,
    newAndReviewing: 0,
    interview: 0,
    rejected: 0,
  };
  for (const row of applications.data ?? []) {
    const status = String(row.status ?? '');
    atsPipeline.total += 1;
    if (matchesAtsTab(status, 'new') || matchesAtsTab(status, 'consider')) atsPipeline.newAndReviewing += 1;
    if (matchesAtsTab(status, 'interview')) atsPipeline.interview += 1;
    if (matchesAtsTab(status, 'rejected')) atsPipeline.rejected += 1;
  }

  return {
    monthlyPayrollBurnGbp,
    employeeCount,
    contractorCount,
    openVacancies,
    attritionRiskScore,
    departmentSpend,
    topPerformers,
    pendingCritical,
    upcomingMilestones,
    referralPendingGbp,
    headcountPending: (headcount.data ?? []).length,
    atsPipeline,
  };
}
