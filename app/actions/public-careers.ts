'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { scoreResumeAgainstRequirements, type JobPosting } from '@/lib/hr/types';

function mapPublicJob(row: Record<string, unknown>): JobPosting {
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
    location: (row.location as string | null) ?? 'United Kingdom',
    employment_type: String(row.employment_type ?? 'full_time'),
    budget_approved: Boolean(row.budget_approved),
    publish_to_careers: row.publish_to_careers !== false,
    headcount_requested: Number(row.headcount_requested ?? 1),
    source_budget_gbp: row.source_budget_gbp != null ? Number(row.source_budget_gbp) : null,
    created_at: String(row.created_at),
    is_intern_to_fulltime: Boolean(row.is_intern_to_fulltime),
    unpaid_months: row.unpaid_months != null ? Number(row.unpaid_months) : null,
    salary_min: row.salary_min != null ? Number(row.salary_min) : row.salary_min_gbp != null ? Number(row.salary_min_gbp) : null,
    salary_max: row.salary_max != null ? Number(row.salary_max) : row.salary_max_gbp != null ? Number(row.salary_max_gbp) : null,
    is_published: Boolean(row.is_published ?? (row.status === 'open' && row.publish_to_careers !== false)),
    compliance_responsibilities: String(row.compliance_responsibilities ?? row.responsibilities ?? ''),
    ai_keywords: String(row.ai_keywords ?? row.ai_match_keywords ?? ''),
    what_you_will_gain: (row.what_you_will_gain as string | null) ?? null,
  };
}

/** Public open roles for /careers — respects global sync toggle + per-job publish flag. */
export async function listPublicOpenJobs(): Promise<JobPosting[]> {
  const admin = createAdminClient();
  const { data: settings } = await admin
    .from('hr_portal_settings')
    .select('public_careers_sync')
    .eq('id', 'default')
    .maybeSingle();

  if (settings && settings.public_careers_sync === false) {
    return [];
  }

  const { data, error } = await admin
    .from('job_postings')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) {
    // Column missing until intern-track migration is applied — fall back to legacy flags.
    const { data: legacy, error: legacyError } = await admin
      .from('job_postings')
      .select('*')
      .eq('status', 'open')
      .eq('publish_to_careers', true)
      .order('created_at', { ascending: false });
    if (legacyError) {
      console.error('listPublicOpenJobs', error.message, legacyError.message);
      return [];
    }
    return (legacy ?? []).map((r) => mapPublicJob(r as Record<string, unknown>));
  }

  return (data ?? []).map((r) => mapPublicJob(r as Record<string, unknown>));
}

export async function getPublicJob(id: string): Promise<JobPosting | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('job_postings').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  const job = mapPublicJob(data as Record<string, unknown>);
  if (job.is_published) return job;
  if (job.status === 'open' && job.publish_to_careers !== false) return job;
  return null;
}

export async function scorePublicApplication(jobId: string, resumeHint: string) {
  const admin = createAdminClient();
  const { data: job } = await admin
    .from('job_postings')
    .select('requirements, ai_match_keywords, description, responsibilities')
    .eq('id', jobId)
    .maybeSingle();
  const blob = [
    job?.requirements,
    job?.ai_match_keywords,
    job?.description,
    job?.responsibilities,
  ]
    .filter(Boolean)
    .join(' ');
  return scoreResumeAgainstRequirements(resumeHint, blob || 'fintech uk fca lending');
}
