import type { SupabaseClient } from '@supabase/supabase-js';
import type { AtsJobMatchSource } from '@/lib/hr/ats-match-score';
import { persistAtsScore, scoreResumeFromStorage } from '@/lib/hr/score-resume-from-storage';

export const JOB_MATCH_SELECT =
  'id, title, requirements, ai_match_keywords, ai_keywords, description, responsibilities';

type JobFields = AtsJobMatchSource & { id?: string; title?: string | null };

function asJob(value: unknown): JobFields | null {
  if (!value || typeof value !== 'object') return null;
  return (Array.isArray(value) ? value[0] : value) as JobFields | null;
}

function sanitizeLike(value: string): string {
  return value.replace(/[%_]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function readAtsReason(row: Record<string, unknown>): string {
  return String(row.ats_reasoning ?? row.ats_reason ?? '').trim();
}

export function needsAtsRescore(row: Record<string, unknown>): boolean {
  const score = Number(row.ats_score ?? row.ai_match_score ?? 0);
  const reason = readAtsReason(row).toLowerCase();
  if (!row.resume_url) return false;
  if (!Number.isFinite(score) || score <= 0) return true;
  if (!reason) return true;
  return reason.includes('could not extract') || reason.includes('no job keywords');
}

export async function resolveJobMatchSource(
  admin: SupabaseClient,
  row: Record<string, unknown>
): Promise<AtsJobMatchSource> {
  const joined = asJob(row.job_postings);
  const roleApplied = String(row.role_applied || joined?.title || '').trim();
  let job = joined;

  if (!job && row.job_id) {
    const { data } = await admin
      .from('job_postings')
      .select(JOB_MATCH_SELECT)
      .eq('id', String(row.job_id))
      .maybeSingle();
    job = data;
  }

  if (!job && roleApplied && roleApplied.toLowerCase() !== 'general') {
    const exact = await admin
      .from('job_postings')
      .select(JOB_MATCH_SELECT)
      .ilike('title', sanitizeLike(roleApplied))
      .limit(1);
    job = exact.data?.[0] ?? null;
  }

  if (!job && roleApplied && roleApplied.toLowerCase() !== 'general') {
    const fuzzy = await admin
      .from('job_postings')
      .select(JOB_MATCH_SELECT)
      .ilike('title', `%${sanitizeLike(roleApplied)}%`)
      .limit(1);
    job = fuzzy.data?.[0] ?? null;
  }

  return {
    title: job?.title || roleApplied,
    role_applied: roleApplied,
    keywords: job?.ai_match_keywords,
    ai_match_keywords: job?.ai_match_keywords,
    ai_keywords: job?.ai_keywords,
    requirements: job?.requirements,
    description: job?.description,
    responsibilities: job?.responsibilities,
  };
}

async function persistLinkedApplicants(
  admin: SupabaseClient,
  row: Record<string, unknown>,
  score: number,
  reason: string
) {
  const email = String(row.candidate_email || row.email || '').trim();
  if (!email) return;
  const { data: applicants } = await admin.from('job_applicants').select('id').ilike('email', email).limit(20);
  for (const applicant of applicants ?? []) {
    await persistAtsScore(admin, 'job_applicants', String(applicant.id), score, reason);
  }
}

/** Score one application resume vs its job keywords and persist. */
export async function calculateAtsScore(
  admin: SupabaseClient,
  row: Record<string, unknown>
): Promise<{ score: number; reason: string }> {
  const job = await resolveJobMatchSource(admin, row);
  const { score, reason } = await scoreResumeFromStorage(admin, {
    resumeUrl: String(row.resume_url ?? ''),
    job,
  });
  row.ai_match_score = score;
  row.ats_score = score;
  row.ats_reason = reason;
  row.ats_reasoning = reason;

  const id = String(row.id ?? '');
  if (id) {
    await persistAtsScore(admin, 'job_applications', id, score, reason);
    await persistLinkedApplicants(admin, row, score, reason);
  }
  return { score, reason };
}

export const scoreAndPersistApplicationRow = calculateAtsScore;

async function fetchAllApplicationsWithResumes(
  admin: SupabaseClient
): Promise<Record<string, unknown>[]> {
  const pageSize = 200;
  const rows: Record<string, unknown>[] = [];

  for (let from = 0; from < 5000; from += pageSize) {
    const joined = await admin
      .from('job_applications')
      .select(`*, job_postings(${JOB_MATCH_SELECT})`)
      .not('resume_url', 'is', null)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    const page =
      joined.error
        ? await admin
            .from('job_applications')
            .select('*')
            .not('resume_url', 'is', null)
            .order('created_at', { ascending: false })
            .range(from, from + pageSize - 1)
        : joined;

    if (page.error) {
      console.error('[ats] global list failed', page.error.message);
      throw new Error(page.error.message);
    }

    const batch = (page.data ?? []) as Record<string, unknown>[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  return rows;
}

export async function rescoreZeroAtsApplications(
  admin: SupabaseClient
): Promise<{ scanned: number; updated: number; failed: number; errors: string[] }> {
  const listed = await fetchAllApplicationsWithResumes(admin);
  const rows = listed.filter(needsAtsRescore);

  console.log('[ats] global rescore candidates', {
    withResume: listed.length,
    needingScore: rows.length,
  });

  let updated = 0;
  let failed = 0;
  const errors: string[] = [];
  const concurrency = 2;

  for (let i = 0; i < rows.length; i += concurrency) {
    const chunk = rows.slice(i, i + concurrency);
    const results = await Promise.allSettled(chunk.map((row) => calculateAtsScore(admin, row)));
    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      const id = String(chunk[index]?.id ?? '');
      if (result.status === 'fulfilled') {
        updated += 1;
        console.log('[ats] global updated', { id, score: result.value.score, reason: result.value.reason });
      } else {
        failed += 1;
        const message = result.reason instanceof Error ? result.reason.message : 'Unknown scoring error';
        errors.push(`${id}: ${message}`);
        console.error('[ats] global row failed', id, result.reason);
      }
    }
  }

  return { scanned: rows.length, updated, failed, errors: errors.slice(0, 20) };
}
