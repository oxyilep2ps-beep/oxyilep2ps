'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertHrOrAdmin } from '@/lib/auth/assert-hr';
import { ATS_APPLICATION_STATUSES, type AtsApplicationStatus } from '@/lib/hr/ats-application-status';
import { removeResumeFiles } from '@/lib/hr/resume-storage';

export type AtsApplication = {
  id: string;
  job_id: string | null;
  candidate_name: string;
  candidate_email: string;
  resume_url: string | null;
  role_applied: string | null;
  status: string;
  created_at: string;
  ai_match_score: number;
};

function mapApplication(row: Record<string, unknown>): AtsApplication {
  const name = String(row.candidate_name || row.full_name || 'Unknown');
  const email = String(row.candidate_email || row.email || '');
  const job = row.job_postings as { title?: string } | { title?: string }[] | null;
  const jobTitle = Array.isArray(job) ? job[0]?.title : job?.title;
  const scoreRaw = Number(row.ai_match_score ?? 0);
  return {
    id: String(row.id),
    job_id: (row.job_id as string | null) ?? null,
    candidate_name: name,
    candidate_email: email,
    resume_url: (row.resume_url as string | null) ?? null,
    role_applied: String(jobTitle || row.role_applied || 'General'),
    status: String(row.status ?? 'New'),
    created_at: String(row.created_at),
    ai_match_score: Number.isFinite(scoreRaw) ? Math.max(0, Math.min(100, Math.round(scoreRaw))) : 0,
  };
}

export async function listAtsApplications(): Promise<AtsApplication[]> {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('job_applications')
    .select('*, job_postings(title)')
    .order('created_at', { ascending: false });
  if (error) {
    const fallback = await admin.from('job_applications').select('*').order('created_at', { ascending: false });
    if (fallback.error) throw new Error(fallback.error.message);
    return (fallback.data ?? []).map((r) => mapApplication(r as Record<string, unknown>));
  }
  return (data ?? []).map((r) => mapApplication(r as Record<string, unknown>));
}

export async function listRecentAtsApplications(limit = 20): Promise<AtsApplication[]> {
  const rows = await listAtsApplications();
  return rows.slice(0, Math.max(1, Math.min(limit, 100)));
}

function revalidateAts() {
  revalidatePath('/hr/recruitment');
  revalidatePath('/hr');
  revalidatePath('/admin-dashboard/hr-overview');
}

export async function updateJobApplicationStatus(id: string, status: AtsApplicationStatus) {
  await assertHrOrAdmin();
  if (!ATS_APPLICATION_STATUSES.includes(status)) {
    throw new Error('Invalid application status.');
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('job_applications')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    throw new Error(
      /check|constraint|status/i.test(error.message)
        ? `Could not update status — apply supabase/migrations/20260815190000_ats_consider_status_pipeline.sql. (${error.message})`
        : error.message
    );
  }
  revalidateAts();
  return mapApplication(data as Record<string, unknown>);
}

export async function deleteJobApplication(id: string): Promise<{ success: boolean; message: string }> {
  try {
    await assertHrOrAdmin();
    const admin = createAdminClient();
    const { data: row, error: fetchError } = await admin
      .from('job_applications')
      .select('id, resume_url')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) return { success: false, message: fetchError.message };
    if (!row) return { success: false, message: 'Application not found.' };

    try {
      await removeResumeFiles(admin, [row.resume_url as string | null]);
    } catch {
      // Continue so the ATS row is still removed.
    }

    const { error } = await admin.from('job_applications').delete().eq('id', id);
    if (error) return { success: false, message: error.message };

    revalidateAts();
    return { success: true, message: 'Candidate deleted' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete candidate.';
    return { success: false, message };
  }
}
