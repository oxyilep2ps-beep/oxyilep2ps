'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { formatContractLabel } from '@/lib/handshake/calculations';

export type AdminHandshakeRow = {
  id: string;
  lender_id: string;
  borrower_id: string;
  lender_name: string;
  borrower_name: string;
  amount: number;
  rate: number;
  duration: number;
  emi_amount: number | null;
  total_return: number | null;
  status: string;
  payment_status: string;
  contract_label: string;
  polygon_tx_hash: string | null;
  created_at: string;
};

export async function listAdminHandshakes(): Promise<AdminHandshakeRow[]> {
  await assertAdmin();
  const admin = createAdminClient();

  const { data: handshakes, error } = await admin
    .from('handshakes')
    .select(
      'id, lender_id, borrower_id, amount, rate, duration, emi_amount, total_return, status, payment_status, polygon_tx_hash, created_at'
    )
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const rows = handshakes ?? [];
  const ids = [...new Set(rows.flatMap((h) => [h.lender_id as string, h.borrower_id as string]))];

  const nameMap: Record<string, string> = {};
  if (ids.length > 0) {
    const { data: profiles } = await admin.from('profiles').select('id, full_legal_name').in('id', ids);
    for (const p of profiles ?? []) {
      nameMap[p.id as string] = p.full_legal_name as string;
    }
  }

  return rows.map((h) => {
    const status = h.status as string;
    const paymentStatus = (h.payment_status as string) ?? 'PENDING';
    return {
      id: h.id as string,
      lender_id: h.lender_id as string,
      borrower_id: h.borrower_id as string,
      lender_name: nameMap[h.lender_id as string] ?? 'Unknown',
      borrower_name: nameMap[h.borrower_id as string] ?? 'Unknown',
      amount: Number(h.amount),
      rate: Number(h.rate),
      duration: Number(h.duration),
      emi_amount: h.emi_amount != null ? Number(h.emi_amount) : null,
      total_return: h.total_return != null ? Number(h.total_return) : null,
      status,
      payment_status: paymentStatus,
      contract_label: formatContractLabel(status, paymentStatus),
      polygon_tx_hash: (h.polygon_tx_hash as string | null) ?? null,
      created_at: h.created_at as string,
    };
  });
}

export async function markHandshakePaid(handshakeId: string) {
  await assertAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from('handshakes')
    .update({ payment_status: 'PAID' })
    .eq('id', handshakeId)
    .eq('status', 'ACTIVE');

  if (error) throw new Error(error.message);

  revalidatePath('/admin-dashboard/contracts');
  return { success: true };
}
