'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type BorrowerLoanHistoryRow = {
  id: string;
  amount: number;
  created_at: string;
  status: string;
  guarantor_attached: 'Yes' | 'No' | string;
};

export type InvestorPortfolioRow = {
  id: string;
  borrower_name: string;
  amount: number;
  created_at: string;
  emi_status: string;
  status: string;
};

export async function listBorrowerLoanHistory(): Promise<{ rows: BorrowerLoanHistoryRow[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [], error: 'Sign in required.' };

  const { data, error } = await supabase
    .from('handshakes')
    .select('id, amount, created_at, status, guarantor_email, guarantor_status')
    .eq('borrower_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return { rows: [], error: error.message };

  return {
    rows: (data ?? []).map((row) => {
      const gStatus = String(row.guarantor_status ?? 'none').toLowerCase();
      const email = (row.guarantor_email as string | null)?.trim();
      let guarantorAttached: string = 'No';
      if (gStatus === 'accepted') guarantorAttached = email ? `Yes (${email})` : 'Yes';
      else if (email) guarantorAttached = email;

      return {
        id: row.id as string,
        amount: Number(row.amount ?? 0),
        created_at: row.created_at as string,
        status: String(row.status ?? 'PENDING'),
        guarantor_attached: guarantorAttached,
      };
    }),
  };
}

export async function listInvestorPortfolio(): Promise<{ rows: InvestorPortfolioRow[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [], error: 'Sign in required.' };

  const { data, error } = await supabase
    .from('handshakes')
    .select(
      'id, amount, created_at, status, borrower_id, next_emi_date, auto_emi_active, payment_status, gocardless_subscription_id'
    )
    .eq('lender_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return { rows: [], error: error.message };

  const rows = data ?? [];
  const borrowerIds = [...new Set(rows.map((r) => r.borrower_id as string).filter(Boolean))];
  const nameMap: Record<string, string> = {};

  if (borrowerIds.length > 0) {
    const admin = createAdminClient();
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_legal_name')
      .in('id', borrowerIds);
    for (const p of profiles ?? []) {
      nameMap[p.id as string] = (p.full_legal_name as string) || 'Borrower';
    }
  }

  return {
    rows: rows.map((row) => {
      const paymentStatus = String(row.payment_status ?? '').toUpperCase();
      const status = String(row.status ?? '').toUpperCase();
      let emiStatus = 'Not started';
      if (row.auto_emi_active || row.gocardless_subscription_id) emiStatus = 'Active';
      if (paymentStatus === 'ACTIVE' || status === 'ACTIVE') emiStatus = 'Active';
      if (paymentStatus === 'FAILED' || paymentStatus === 'DEFAULTED') emiStatus = 'Failed';
      if (status === 'COMPLETED' || status === 'PAID') emiStatus = 'Completed';
      if (row.next_emi_date && emiStatus === 'Active') {
        emiStatus = `Active · next ${new Date(row.next_emi_date as string).toLocaleDateString('en-GB')}`;
      }

      return {
        id: row.id as string,
        borrower_name: nameMap[row.borrower_id as string] ?? 'Borrower',
        amount: Number(row.amount ?? 0),
        created_at: row.created_at as string,
        emi_status: emiStatus,
        status: String(row.status ?? 'PENDING'),
      };
    }),
  };
}
