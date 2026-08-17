'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { assertHrOrAdmin } from '@/lib/auth/assert-hr';

export type JobApplicationRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role_applied: string;
  resume_url: string | null;
  status: string;
  created_at: string;
  ai_match_score: number;
};

function mapRow(row: Record<string, unknown>): JobApplicationRow {
  const scoreRaw = Number(row.ai_match_score ?? 0);
  return {
    id: String(row.id),
    full_name: String(row.full_name ?? row.candidate_name ?? 'Unknown'),
    email: String(row.email ?? row.candidate_email ?? ''),
    phone: String(row.phone ?? ''),
    role_applied: String(row.role_applied ?? 'General'),
    resume_url: (row.resume_url as string | null) ?? null,
    status: String(row.status ?? ''),
    created_at: String(row.created_at),
    ai_match_score: Number.isFinite(scoreRaw) ? Math.max(0, Math.min(100, Math.round(scoreRaw))) : 0,
  };
}

export async function listJobApplications(): Promise<JobApplicationRow[]> {
  await assertHrOrAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('job_applications')
    .select('id, full_name, email, phone, role_applied, resume_url, status, created_at, candidate_name, candidate_email, ai_match_score')
    .order('created_at', { ascending: false });

  if (error) {
    const fallback = await admin
      .from('job_applications')
      .select('id, full_name, email, phone, role_applied, resume_url, status, created_at, candidate_name, candidate_email')
      .order('created_at', { ascending: false });
    if (fallback.error) throw new Error(error.message);
    return (fallback.data ?? []).map((r) => mapRow(r as Record<string, unknown>));
  }
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}
