'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { getCollateralProofSignedUrl } from '@/app/actions/admin-waitlist';
import type { AdminLiveHandshakeRow } from '@/lib/types/marketplace-handshake';

function mapAdminRow(row: Record<string, unknown>, emailMap: Record<string, string>): AdminLiveHandshakeRow {
  const borrowerId = row.borrower_id as string;
  const investorId = (row.lender_id as string | null) ?? null;

  return {
    id: row.id as string,
    borrower_id: borrowerId,
    investor_id: investorId,
    loan_amount: Number(row.amount),
    tenure_months: Number(row.duration),
    interest_rate: Number(row.rate ?? 10),
    emi_amount: Number(row.emi_amount ?? 0),
    collateral_type: String(row.collateral_type ?? '—'),
    collateral_value: Number(row.collateral_value ?? 0),
    collateral_description: String(row.collateral_description ?? ''),
    collateral_proof_url: String(row.collateral_proof_url ?? ''),
    status: row.status as AdminLiveHandshakeRow['status'],
    gocardless_mandate_id: (row.gocardless_mandate_id as string | null) ?? null,
    smart_contract_address: (row.smart_contract_address as string | null) ?? null,
    next_emi_date: (row.next_emi_date as string | null) ?? null,
    created_at: row.created_at as string,
    borrower_email: emailMap[borrowerId] ?? 'Unknown',
    investor_email: investorId ? emailMap[investorId] ?? 'Unknown' : null,
  };
}

export async function listLiveMarketplaceHandshakes(): Promise<AdminLiveHandshakeRow[]> {
  await assertAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('handshakes')
    .select(
      'id, borrower_id, lender_id, amount, duration, rate, emi_amount, collateral_type, collateral_value, collateral_description, collateral_proof_url, status, gocardless_mandate_id, smart_contract_address, next_emi_date, created_at'
    )
    .eq('marketplace', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const ids = [...new Set(rows.flatMap((r) => [r.borrower_id as string, r.lender_id as string].filter(Boolean)))];
  const emailMap: Record<string, string> = {};

  if (ids.length > 0) {
    const { data: profiles } = await admin.from('profiles').select('id, email').in('id', ids);
    for (const p of profiles ?? []) {
      emailMap[p.id as string] = (p.email as string) ?? 'Unknown';
    }
  }

  return rows.map((row) => mapAdminRow(row as Record<string, unknown>, emailMap));
}

export async function resolveLiveHandshakeProofUrl(storagePath: string): Promise<string> {
  await assertAdmin();
  return getCollateralProofSignedUrl(storagePath);
}
