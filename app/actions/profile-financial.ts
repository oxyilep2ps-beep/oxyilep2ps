'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateHandshakeFigures } from '@/lib/handshake/calculations';
import type {
  ProfileFinancialPortfolio,
  ProfileFinancialRelationship,
  ProfileFinancialRole,
  ProfileGuarantorSecurity,
} from '@/lib/profile/financial';

type HandshakeFinancialRow = {
  id: string;
  borrower_id: string;
  lender_id: string | null;
  amount: number | string | null;
  rate: number | string | null;
  duration: number | string | null;
  emi_amount: number | string | null;
  total_return: number | string | null;
  status: string | null;
  guarantor_user_id: string | null;
  guarantor_email: string | null;
  guarantor_status: string | null;
  guarantor_mandate_id: string | null;
  created_at: string;
};

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeGuarantorStatus(
  value: string | null | undefined
): ProfileGuarantorSecurity['status'] {
  const status = String(value ?? 'none').toLowerCase();
  if (status === 'accepted' || status === 'invited' || status === 'pending' || status === 'rejected') {
    return status;
  }
  return 'none';
}

function buildGuarantorSecurity(
  statusRaw: string | null | undefined,
  mandateId: string | null | undefined,
  name: string | null,
  email: string | null
): ProfileGuarantorSecurity {
  const status = normalizeGuarantorStatus(statusRaw);
  const mandateActive = Boolean(mandateId) || status === 'accepted';
  let label = 'Guarantor: Pending';
  if (status === 'accepted') {
    label = `Guarantor: ${name || email || 'Linked'} · Verified / GoCardless Active`;
  } else if (status === 'invited' || status === 'pending') {
    label = `Guarantor: ${name || email || 'Invited'} · Awaiting mandate`;
  } else if (email || name) {
    label = `Guarantor: ${name || email}`;
  }
  return { name, email, status, mandateActive, label };
}

function mapRelationship(
  row: HandshakeFinancialRow,
  nameMap: Record<string, string>
): ProfileFinancialRelationship {
  const amount = asNumber(row.amount);
  const rate = asNumber(row.rate);
  const duration = Math.max(1, Math.round(asNumber(row.duration, 1)));
  const figures = calculateHandshakeFigures(amount, rate, duration);
  const emi = row.emi_amount != null ? asNumber(row.emi_amount) : figures.emi_amount;
  const totalReturn =
    row.total_return != null ? asNumber(row.total_return) : figures.total_return;
  const guarantorId = row.guarantor_user_id;
  const guarantorName = guarantorId ? nameMap[guarantorId] ?? null : null;

  return {
    id: row.id,
    status: String(row.status ?? 'PENDING').toUpperCase(),
    loanAmountGbp: amount,
    interestRatePct: rate,
    tenureMonths: duration,
    emiAmountGbp: emi,
    totalReturnGbp: totalReturn,
    interestEarnedGbp: Math.max(0, totalReturn - amount),
    borrower: {
      id: row.borrower_id,
      name: nameMap[row.borrower_id] ?? 'Borrower',
    },
    investor: {
      id: row.lender_id,
      name: row.lender_id ? nameMap[row.lender_id] ?? 'Investor' : null,
    },
    guarantor: buildGuarantorSecurity(
      row.guarantor_status,
      row.guarantor_mandate_id,
      guarantorName,
      row.guarantor_email
    ),
    mandateActive:
      Boolean(row.guarantor_mandate_id) ||
      normalizeGuarantorStatus(row.guarantor_status) === 'accepted',
  };
}

function emptyPortfolio(role: string): ProfileFinancialPortfolio {
  return {
    primaryRole: role,
    viewerRoles: [],
    relationships: [],
    borrowerRelationships: [],
    investorRelationships: [],
    guarantorRelationships: [],
    investorMetrics: {
      totalDeployedGbp: 0,
      expectedReturnsGbp: 0,
      averageYieldPct: 0,
    },
  };
}

function orFilter(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(',');
}

function emailClause(email: string): string | null {
  if (!email) return null;
  // Quote values so `@` and `.` are safe in PostgREST `.or()` filters.
  return `guarantor_email.eq."${email.replace(/"/g, '')}"`;
}

/**
 * Loads the authenticated user's live P2P financial relationships for the Profile hub.
 * Role detection: profile.role for borrower/investor; guarantor via guarantor_user_id / email.
 */
export async function getProfileFinancialPortfolio(): Promise<{
  portfolio: ProfileFinancialPortfolio;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { portfolio: emptyPortfolio('GUEST'), error: 'Sign in required.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle();

  const primaryRole = String(profile?.role ?? 'BORROWER').toUpperCase();
  const email = String(profile?.email ?? user.email ?? '')
    .trim()
    .toLowerCase();

  let rows: HandshakeFinancialRow[] = [];

  const viewOr = orFilter([
    `borrower_id.eq.${user.id}`,
    `investor_id.eq.${user.id}`,
    `guarantor_user_id.eq.${user.id}`,
    emailClause(email),
  ]);

  const viewQuery = await supabase
    .from('profile_financial_handshakes_v')
    .select(
      'id, borrower_id, investor_id, loan_amount_gbp, interest_rate_pct, tenure_months, emi_amount_gbp, total_return_gbp, status, guarantor_user_id, guarantor_email, guarantor_status, guarantor_mandate_id, created_at'
    )
    .or(viewOr)
    .order('created_at', { ascending: false });

  if (!viewQuery.error && viewQuery.data) {
    rows = viewQuery.data.map((row) => ({
      id: row.id as string,
      borrower_id: row.borrower_id as string,
      lender_id: (row.investor_id as string | null) ?? null,
      amount: row.loan_amount_gbp as number,
      rate: row.interest_rate_pct as number,
      duration: row.tenure_months as number,
      emi_amount: row.emi_amount_gbp as number | null,
      total_return: row.total_return_gbp as number | null,
      status: row.status as string,
      guarantor_user_id: (row.guarantor_user_id as string | null) ?? null,
      guarantor_email: (row.guarantor_email as string | null) ?? null,
      guarantor_status: (row.guarantor_status as string | null) ?? null,
      guarantor_mandate_id: (row.guarantor_mandate_id as string | null) ?? null,
      created_at: row.created_at as string,
    }));
  } else {
    const fallbackOr = orFilter([
      `borrower_id.eq.${user.id}`,
      `lender_id.eq.${user.id}`,
      `guarantor_user_id.eq.${user.id}`,
      emailClause(email),
    ]);

    const fallback = await supabase
      .from('handshakes')
      .select(
        'id, borrower_id, lender_id, amount, rate, duration, emi_amount, total_return, status, guarantor_user_id, guarantor_email, guarantor_status, guarantor_mandate_id, created_at'
      )
      .in('status', ['PENDING', 'MATCHED', 'FUNDED', 'ACTIVE'])
      .or(fallbackOr)
      .order('created_at', { ascending: false });

    if (fallback.error) {
      return {
        portfolio: emptyPortfolio(primaryRole),
        error: fallback.error.message,
      };
    }
    rows = (fallback.data ?? []) as HandshakeFinancialRow[];
  }

  const partyIds = [
    ...new Set(
      rows
        .flatMap((row) => [row.borrower_id, row.lender_id, row.guarantor_user_id])
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const nameMap: Record<string, string> = {};
  if (partyIds.length > 0) {
    const admin = createAdminClient();
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_legal_name')
      .in('id', partyIds);
    for (const p of profiles ?? []) {
      nameMap[p.id as string] = (p.full_legal_name as string) || 'Member';
    }
  }

  const relationships = rows.map((row) => mapRelationship(row, nameMap));

  const isGuarantorOf = (row: HandshakeFinancialRow) =>
    row.guarantor_user_id === user.id ||
    (Boolean(email) && row.guarantor_email?.toLowerCase() === email);

  const borrowerRelationships = relationships.filter((_, i) => rows[i].borrower_id === user.id);
  const investorRelationships = relationships.filter((_, i) => rows[i].lender_id === user.id);
  const guarantorRelationships = relationships.filter((_, i) => isGuarantorOf(rows[i]));

  const viewerRoles = new Set<ProfileFinancialRole>();
  if (primaryRole === 'BORROWER' || borrowerRelationships.length > 0) viewerRoles.add('borrower');
  if (primaryRole === 'INVESTOR' || investorRelationships.length > 0) viewerRoles.add('investor');
  if (guarantorRelationships.length > 0) viewerRoles.add('guarantor');

  const totalDeployedGbp = investorRelationships.reduce((sum, row) => sum + row.loanAmountGbp, 0);
  const expectedReturnsGbp = investorRelationships.reduce(
    (sum, row) => sum + row.totalReturnGbp,
    0
  );
  const averageYieldPct =
    investorRelationships.length > 0
      ? investorRelationships.reduce((sum, row) => sum + row.interestRatePct, 0) /
        investorRelationships.length
      : 0;

  return {
    portfolio: {
      primaryRole,
      viewerRoles: Array.from(viewerRoles),
      relationships,
      borrowerRelationships,
      investorRelationships,
      guarantorRelationships,
      investorMetrics: {
        totalDeployedGbp,
        expectedReturnsGbp,
        averageYieldPct,
      },
    },
  };
}
