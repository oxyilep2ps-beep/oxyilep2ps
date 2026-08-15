'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertHrOrAdmin } from '@/lib/auth/assert-hr';
import { ATS_APPLICATION_STATUSES, type AtsApplicationStatus } from '@/lib/hr/ats-application-status';

export type AtsApplication = {
  id: string;
  job_id: string | null;
  candidate_name: string;
  candidate_email: string;
  resume_url: string | null;
  role_applied: string | null;
  status: string;
  created_at: string;
};

function mapApplication(row: Record<string, unknown>): AtsApplication {
  const name = String(row.candidate_name || row.full_name || 'Unknown');
  const email = String(row.candidate_email || row.email || '');
  return {
    id: String(row.id),
    job_id: (row.job_id as string | null) ?? null,
    candidate_name: name,
    candidate_email: email,
    resume_url: (row.resume_url as string | null) ?? null,
    role_applied: (row.role_applied as string | null) ?? null,
    status: String(row.status ?? 'New'),
    created_at: String(row.created_at),
  };
}

export async function listAtsApplications(): Promise<AtsApplication[]> {
  await assertHrOrAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('job_applications').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapApplication(r as Record<string, unknown>));
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
  revalidatePath('/hr/recruitment');
  return mapApplication(data as Record<string, unknown>);
}
