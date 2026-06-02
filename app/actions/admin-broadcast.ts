'use server';

import { assertAdmin } from '@/lib/auth/assert-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAdminAction } from '@/app/actions/admin-audit';

export type BroadcastCohort =
  | 'all_investors'
  | 'all_borrowers'
  | 'pending_waitlist'
  | 'defaulters';

const COHORT_LABELS: Record<BroadcastCohort, string> = {
  all_investors: 'All Investors',
  all_borrowers: 'All Borrowers',
  pending_waitlist: 'Pending Waitlist',
  defaulters: 'Defaulters',
};

export async function sendCohortBroadcast(payload: {
  cohort: BroadcastCohort;
  subject: string;
  body: string;
}): Promise<{ success: true; recipientCount: number; mock: true }> {
  const user = await assertAdmin();
  const admin = createAdminClient();

  const subject = payload.subject.trim();
  const body = payload.body.trim();
  if (!subject || !body) throw new Error('Subject and body are required');

  let recipientCount = 0;

  switch (payload.cohort) {
    case 'all_investors': {
      const { count } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'INVESTOR');
      recipientCount = count ?? 0;
      break;
    }
    case 'all_borrowers': {
      const { count } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'BORROWER');
      recipientCount = count ?? 0;
      break;
    }
    case 'pending_waitlist': {
      const { count } = await admin.from('waitlist').select('id', { count: 'exact', head: true });
      recipientCount = count ?? 0;
      break;
    }
    case 'defaulters': {
      const { data } = await admin
        .from('handshakes')
        .select('id')
        .eq('status', 'ACTIVE')
        .eq('payment_status', 'PENDING');
      recipientCount = (data ?? []).length;
      break;
    }
  }

  await logAdminAction(
    user.email ?? 'admin',
    `Mock email broadcast to "${COHORT_LABELS[payload.cohort]}" (${recipientCount} recipients): "${subject}"`
  );

  return { success: true, recipientCount, mock: true };
}
