'use server';

import { assertAdmin } from '@/lib/auth/assert-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export type AdminAuditLogRow = {
  id: string;
  admin_email: string;
  action_description: string;
  created_at: string;
};

export async function logAdminAction(adminEmail: string, actionDescription: string): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('admin_audit_logs').insert({
      admin_email: adminEmail,
      action_description: actionDescription,
    });
  } catch {
    // Audit logging must not block primary operations
  }
}

export async function listAdminAuditLogs(limit = 100): Promise<AdminAuditLogRow[]> {
  await assertAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('admin_audit_logs')
    .select('id, admin_email, action_description, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as AdminAuditLogRow[];
}
