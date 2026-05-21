'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { assertAdmin } from '@/lib/auth/assert-admin';

export type AdminHandshakeRow = {
  id: string;
  lender_id: string;
  borrower_id: string;
  lender_name: string;
  borrower_name: string;
  amount: number;
  rate: number;
  duration: number;
  status: string;
  polygon_tx_hash: string | null;
  created_at: string;
};

export async function listAdminHandshakes(): Promise<AdminHandshakeRow[]> {
  await assertAdmin();
  const admin = createAdminClient();

  const { data: handshakes, error } = await admin
    .from('handshakes')
    .select('id, lender_id, borrower_id, amount, rate, duration, status, polygon_tx_hash, created_at')
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

  return rows.map((h) => ({
    id: h.id as string,
    lender_id: h.lender_id as string,
    borrower_id: h.borrower_id as string,
    lender_name: nameMap[h.lender_id as string] ?? 'Unknown',
    borrower_name: nameMap[h.borrower_id as string] ?? 'Unknown',
    amount: Number(h.amount),
    rate: Number(h.rate),
    duration: Number(h.duration),
    status: h.status as string,
    polygon_tx_hash: (h.polygon_tx_hash as string | null) ?? null,
    created_at: h.created_at as string,
  }));
}
