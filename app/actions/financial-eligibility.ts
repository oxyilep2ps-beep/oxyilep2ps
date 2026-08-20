'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const BLOCKING_MESSAGE =
  'You currently have an active loan. You must clear all outstanding dues before registering as an Investor.';

/** In-flight / outstanding borrower handshake statuses (anti-arbitrage). */
const BLOCKING_LOAN_STATUSES = ['ACTIVE', 'PENDING', 'FUNDED', 'MATCHED'] as const;

export type InvestorEligibilityResult =
  | { allowed: true }
  | { allowed: false; message: string; blockingHandshakeIds?: string[] };

/**
 * Anti-arbitrage gate: a borrower with outstanding / in-flight loans
 * cannot upgrade into (or act as) an Investor until dues are cleared.
 */
export async function checkEligibilityForInvestorUpgrade(): Promise<InvestorEligibilityResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { allowed: false, message: 'Sign in required to continue.' };
    }

    const admin = createAdminClient();

    const [{ data: byStatus, error: statusError }, { data: byPayment, error: paymentError }] =
      await Promise.all([
        admin
          .from('handshakes')
          .select('id, status, payment_status')
          .eq('borrower_id', user.id)
          .in('status', [...BLOCKING_LOAN_STATUSES]),
        admin
          .from('handshakes')
          .select('id, status, payment_status')
          .eq('borrower_id', user.id)
          .or('payment_status.eq.UNPAID,payment_status.ilike.unpaid'),
      ]);

    if (statusError || paymentError) {
      console.error(
        '[checkEligibilityForInvestorUpgrade]',
        statusError?.message ?? paymentError?.message
      );
      return {
        allowed: false,
        message: 'Unable to verify loan status. Please try again shortly.',
      };
    }

    const ids = new Set<string>();
    for (const row of [...(byStatus ?? []), ...(byPayment ?? [])]) {
      ids.add(String(row.id));
    }

    if (ids.size > 0) {
      return {
        allowed: false,
        message: BLOCKING_MESSAGE,
        blockingHandshakeIds: [...ids],
      };
    }

    return { allowed: true };
  } catch (e) {
    console.error('[checkEligibilityForInvestorUpgrade]', e);
    return {
      allowed: false,
      message: 'Unable to verify loan status. Please try again shortly.',
    };
  }
}
