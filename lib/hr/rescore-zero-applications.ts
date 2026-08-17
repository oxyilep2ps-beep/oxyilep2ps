import type { SupabaseClient } from '@supabase/supabase-js';
import { persistAtsScore, scoreResumeFromStorage } from '@/lib/hr/score-resume-from-storage';

type JobFields = {
  requirements?: string | null;
  ai_match_keywords?: string | null;
  ai_keywords?: string | null;
  description?: string | null;
  responsibilities?: string | null;
};

export async function rescoreZeroAtsApplications(
  admin: SupabaseClient,
  opts?: { limit?: number }
): Promise<{ scanned: number; updated: number; failed: number; errors: string[] }> {
  const limit = Math.max(1, Math.min(opts?.limit ?? 200, 500));
  const { data, error } = await admin
    .from('job_applications')
    .select(
      '*, job_postings(requirements, ai_match_keywords, ai_keywords, description, responsibilities)'
    )
    .not('resume_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  const listed = error
    ? await admin
        .from('job_applications')
        .select('*')
        .not('resume_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(limit)
    : { data, error: null };

  if (listed.error) {
    console.error('[ats] batch list failed', listed.error.message);
    throw new Error(listed.error.message);
  }

  const rows = (listed.data ?? []).filter((row) => {
    const score = Number(row.ats_score ?? row.ai_match_score ?? 0);
    const reason = String(row.ats_reason ?? '').trim();
    return Boolean(row.resume_url) && (score <= 0 || !reason);
  });

  console.log('[ats] batch rescore candidates', { found: rows.length });

  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const id = String(row.id);
    const joined = row.job_postings as JobFields | JobFields[] | null;
    let job: JobFields | null = Array.isArray(joined) ? joined[0] ?? null : joined;
    if (!job && row.job_id) {
      const { data: posting } = await admin
        .from('job_postings')
        .select('requirements, ai_match_keywords, ai_keywords, description, responsibilities')
        .eq('id', String(row.job_id))
        .maybeSingle();
      job = posting;
    }

    try {
      const { score, reason } = await scoreResumeFromStorage(admin, {
        resumeUrl: String(row.resume_url ?? ''),
        job: job ?? {},
      });
      await persistAtsScore(admin, 'job_applications', id, score, reason);

      const email = String(row.candidate_email || row.email || '').trim();
      if (email) {
        const { data: applicants } = await admin
          .from('job_applicants')
          .select('id')
          .ilike('email', email)
          .limit(20);
        for (const applicant of applicants ?? []) {
          await persistAtsScore(admin, 'job_applicants', String(applicant.id), score, reason);
        }
      }

      updated += 1;
      console.log('[ats] batch updated', { id, score, reason });
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : 'Unknown scoring error';
      errors.push(`${id}: ${message}`);
      console.error('[ats] batch row failed', id, err);
    }
  }

  return { scanned: rows.length, updated, failed, errors: errors.slice(0, 20) };
}
