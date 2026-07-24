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
  try {
    await assertAdmin();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('application_rejections')
      .select('id, email, full_legal_name, role, rejection_reason, rejected_at, rejected_by')
      .order('rejected_at', { ascending: false });

    if (error) {
      console.error('[listApplicationRejections]', error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: String(row.id),
      email: String(row.email ?? ''),
      full_legal_name: row.full_legal_name == null ? null : String(row.full_legal_name),
      role: row.role == null ? null : String(row.role),
      rejection_reason: row.rejection_reason == null ? null : String(row.rejection_reason),
      rejected_at: row.rejected_at ? String(row.rejected_at) : '',
      rejected_by: row.rejected_by == null ? null : String(row.rejected_by),
    }));
  } catch (error) {
    console.error('[listApplicationRejections]', error);
    return [];
  }
}
