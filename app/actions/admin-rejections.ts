'use server';

import { assertAdmin } from '@/lib/auth/assert-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export type RejectionRow = {
  id: string;
  email: string;
  full_legal_name: string | null;
  role: string | null;
  rejection_reason: string | null;
  rejected_at: string;
  rejected_by: string | null;
};

export async function listApplicationRejections(): Promise<RejectionRow[]> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('application_rejections')
    .select('id, email, full_legal_name, role, rejection_reason, rejected_at, rejected_by')
    .order('rejected_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as RejectionRow[];
}
