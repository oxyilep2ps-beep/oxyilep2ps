'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { getCollateralProofSignedUrl } from '@/app/actions/admin-waitlist';
import {
  calculateMaxLtvAmount,
  type PendingCollateralVerification,
} from '@/lib/collateral/tracking';
import { createAdminClient } from '@/lib/supabase/admin';

function mapPendingRow(
  row: Record<string, unknown>,
  emailMap: Record<string, string>
): PendingCollateralVerification {
  const borrowerId = row.borrower_id as string;
  return {
    id: row.id as string,
    borrower_id: borrowerId,
    borrower_email: emailMap[borrowerId] ?? 'Unknown',
    loan_amount: Number(row.amount ?? 0),
    asset_declared_value: Number(row.asset_declared_value ?? row.collateral_value ?? 0),
    collateral_docs_url:
      (row.collateral_docs_url as string | null) ??
      (row.collateral_proof_url as string | null) ??
      null,
    collateral_type: (row.collateral_type as string | null) ?? null,
    collateral_status: (row.collateral_status as PendingCollateralVerification['collateral_status']) ?? 'pending',
    created_at: row.created_at as string,
  };
}

export async function listPendingCollateralVerifications(): Promise<PendingCollateralVerification[]> {
  await assertAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('handshakes')
    .select(
      'id, borrower_id, amount, asset_declared_value, collateral_value, collateral_docs_url, collateral_proof_url, collateral_type, collateral_status, created_at'
    )
    .eq('marketplace', true)
    .eq('collateral_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const borrowerIds = [...new Set(rows.map((r) => r.borrower_id as string))];
  const emailMap: Record<string, string> = {};

  if (borrowerIds.length > 0) {
    const { data: profiles } = await admin.from('profiles').select('id, email').in('id', borrowerIds);
    for (const p of profiles ?? []) {
      emailMap[p.id as string] = (p.email as string) ?? 'Unknown';
    }
  }

  return rows.map((row) => mapPendingRow(row as Record<string, unknown>, emailMap));
}

export async function resolveCollateralDocumentUrl(storagePath: string): Promise<string> {
  await assertAdmin();
  return getCollateralProofSignedUrl(storagePath);
}

export async function verifyCollateralAsset(
  handshakeId: string,
  assetApprovedValue: number
): Promise<{ ok: boolean; error?: string; max_ltv_amount?: number }> {
  await assertAdmin();

  const approved = Number(assetApprovedValue);
  if (!Number.isFinite(approved) || approved <= 0) {
    return { ok: false, error: 'Enter a valid approved asset value.' };
  }

  const maxLtv = calculateMaxLtvAmount(approved);
  const admin = createAdminClient();

  const { data: handshake, error: fetchError } = await admin
    .from('handshakes')
    .select('id, amount, collateral_status')
    .eq('id', handshakeId)
    .eq('marketplace', true)
    .maybeSingle();

  if (fetchError) return { ok: false, error: fetchError.message };
  if (!handshake) return { ok: false, error: 'Handshake not found.' };
  if (handshake.collateral_status === 'verified') {
    return { ok: false, error: 'Collateral is already verified.' };
  }

  const loanAmount = Number(handshake.amount ?? 0);
  if (loanAmount > maxLtv) {
    return {
      ok: false,
      error: `Loan amount (£${loanAmount.toLocaleString('en-GB')}) exceeds 70% LTV cap (£${maxLtv.toLocaleString('en-GB')}). Reject or ask borrower to lower the amount.`,
    };
  }

  const { error: updateError } = await admin
    .from('handshakes')
    .update({
      collateral_status: 'verified',
      asset_approved_value: approved,
      max_ltv_amount: maxLtv,
    })
    .eq('id', handshakeId);

  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath('/admin-dashboard/collateral');
  revalidatePath('/dashboard/marketplace');
  return { ok: true, max_ltv_amount: maxLtv };
}

export async function rejectCollateralAsset(
  handshakeId: string
): Promise<{ ok: boolean; error?: string }> {
  await assertAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from('handshakes')
    .update({
      collateral_status: 'rejected',
      asset_approved_value: 0,
      max_ltv_amount: 0,
    })
    .eq('id', handshakeId)
    .eq('marketplace', true);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin-dashboard/collateral');
  revalidatePath('/dashboard/marketplace');
  return { ok: true };
}
