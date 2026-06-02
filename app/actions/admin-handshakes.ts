'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { formatContractLabel } from '@/lib/handshake/calculations';
import { logAdminAction } from '@/app/actions/admin-audit';

export type AdminHandshakeRow = {
  id: string;
  txn_id: string | null;
  lender_id: string;
  borrower_id: string;
  lender_name: string;
  borrower_name: string;
  borrower_email: string | null;
  amount: number;
  rate: number;
  duration: number;
  emi_amount: number | null;
  total_return: number | null;
  status: string;
  payment_status: string;
  contract_label: string;
  polygon_tx_hash: string | null;
  mandate_id: string | null;
  mandate_status: string | null;
  gocardless_subscription_id: string | null;
  auto_emi_active: boolean;
  created_at: string;
};

export async function listAdminHandshakes(): Promise<AdminHandshakeRow[]> {
  await assertAdmin();
  const admin = createAdminClient();

  const { data: handshakes, error } = await admin
    .from('handshakes')
    .select(
      'id, txn_id, lender_id, borrower_id, amount, rate, duration, emi_amount, total_return, status, payment_status, polygon_tx_hash, gocardless_subscription_id, auto_emi_active, created_at'
    )
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const rows = handshakes ?? [];
  const ids = [...new Set(rows.flatMap((h) => [h.lender_id as string, h.borrower_id as string]))];

  const nameMap: Record<string, string> = {};
  const emailMap: Record<string, string> = {};
  const mandateMap: Record<string, { mandate_id: string | null; status: string | null }> = {};
  if (ids.length > 0) {
    const { data: profiles } = await admin.from('profiles').select('id, full_legal_name, email').in('id', ids);
    for (const p of profiles ?? []) {
      nameMap[p.id as string] = p.full_legal_name as string;
      emailMap[p.id as string] = (p.email as string | null) ?? '';
    }
  }

  const borrowerIds = [...new Set(rows.map((h) => h.borrower_id as string))];
  if (borrowerIds.length > 0) {
    const { data: mandates } = await admin
      .from('gocardless_mandates')
      .select('user_id, mandate_id, status')
      .in('user_id', borrowerIds);

    for (const mandate of mandates ?? []) {
      mandateMap[mandate.user_id as string] = {
        mandate_id: (mandate.mandate_id as string | null) ?? null,
        status: (mandate.status as string | null) ?? null,
      };
    }
  }

  return rows.map((h) => {
    const status = h.status as string;
    const paymentStatus = (h.payment_status as string) ?? 'PENDING';
    const mandate = mandateMap[h.borrower_id as string];

    return {
      id: h.id as string,
      txn_id: (h.txn_id as string | null) ?? null,
      lender_id: h.lender_id as string,
      borrower_id: h.borrower_id as string,
      lender_name: nameMap[h.lender_id as string] ?? 'Unknown',
      borrower_name: nameMap[h.borrower_id as string] ?? 'Unknown',
      borrower_email: emailMap[h.borrower_id as string] || null,
      amount: Number(h.amount),
      rate: Number(h.rate),
      duration: Number(h.duration),
      emi_amount: h.emi_amount != null ? Number(h.emi_amount) : null,
      total_return: h.total_return != null ? Number(h.total_return) : null,
      status,
      payment_status: paymentStatus,
      contract_label: formatContractLabel(status, paymentStatus),
      polygon_tx_hash: (h.polygon_tx_hash as string | null) ?? null,
      mandate_id: mandate?.mandate_id ?? null,
      mandate_status: mandate?.status ?? null,
      gocardless_subscription_id: (h.gocardless_subscription_id as string | null) ?? null,
      auto_emi_active: Boolean(h.auto_emi_active),
      created_at: h.created_at as string,
    };
  });
}

export async function markHandshakePaid(handshakeId: string) {
  const user = await assertAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from('handshakes')
    .update({ payment_status: 'PAID' })
    .eq('id', handshakeId)
    .eq('status', 'ACTIVE');

  if (error) throw new Error(error.message);

  await logAdminAction(user.email ?? 'admin', `Marked handshake ${handshakeId} as PAID`);
  revalidatePath('/admin-dashboard/contracts');
  return { success: true };
}
