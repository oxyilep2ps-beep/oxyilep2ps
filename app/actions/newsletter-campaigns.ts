'use server';

import { assertAdmin } from '@/lib/auth/assert-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export type NewsletterCampaignRow = {
  id: string;
  subject: string;
  recipient_count: number;
  status: string;
  created_at: string;
  sent_by: string | null;
  sent_by_email: string | null;
};

export async function listNewsletterCampaigns(): Promise<NewsletterCampaignRow[]> {
  await assertAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('newsletter_campaigns')
    .select('id, subject, recipient_count, status, created_at, sent_by')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const adminIds = [...new Set(rows.map((r) => r.sent_by as string).filter(Boolean))];
  const emailMap: Record<string, string> = {};

  if (adminIds.length > 0) {
    const { data: profiles } = await admin.from('profiles').select('id, email').in('id', adminIds);
    for (const p of profiles ?? []) {
      emailMap[p.id as string] = (p.email as string) ?? 'Unknown';
    }
  }

  return rows.map((row) => ({
    id: row.id as string,
    subject: row.subject as string,
    recipient_count: Number(row.recipient_count ?? 0),
    status: row.status as string,
    created_at: row.created_at as string,
    sent_by: (row.sent_by as string | null) ?? null,
    sent_by_email: row.sent_by ? emailMap[row.sent_by as string] ?? null : null,
  }));
}
