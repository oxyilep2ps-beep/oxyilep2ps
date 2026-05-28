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
};

export async function listJobApplications(): Promise<JobApplicationRow[]> {
  await assertHrOrAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('job_applications')
    .select('id, full_name, email, phone, role_applied, resume_url, status, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as JobApplicationRow[];
}
