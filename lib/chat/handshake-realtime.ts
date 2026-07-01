import type { HandshakeRow } from '@/lib/chat/types';

/** Merge a realtime or fetched handshake row with mandate-link hints for the chat card. */
export function normalizeHandshakeRow(
  row: Record<string, unknown>,
  previous?: HandshakeRow
): HandshakeRow {
  const paymentStatus = row.payment_status as HandshakeRow['payment_status'];
  const mandateLinked =
    Boolean(row.gocardless_subscription_id) ||
    paymentStatus === 'ACTIVE' ||
    paymentStatus === 'PAID' ||
    Boolean(row.auto_emi_active) ||
    previous?.mandate_linked;

  return {
    id: row.id as string,
    txn_id: (row.txn_id as string | null) ?? null,
    lender_id: row.lender_id as string,
    borrower_id: row.borrower_id as string,
    amount: Number(row.amount ?? 0),
    rate: Number(row.rate ?? 0),
    duration: Number(row.duration ?? 0),
    emi_amount: row.emi_amount != null ? Number(row.emi_amount) : null,
    total_return: row.total_return != null ? Number(row.total_return) : null,
    payment_status: paymentStatus ?? 'PENDING',
    polygon_tx_hash: (row.polygon_tx_hash as string | null) ?? null,
    gocardless_subscription_id: (row.gocardless_subscription_id as string | null) ?? null,
    auto_emi_active: Boolean(row.auto_emi_active),
    mandate_linked: mandateLinked,
    status: (row.status as HandshakeRow['status']) ?? 'PENDING',
    lender_approved_at: (row.lender_approved_at as string | null) ?? null,
    borrower_approved_at: (row.borrower_approved_at as string | null) ?? null,
    funded_at: (row.funded_at as string | null) ?? null,
    created_at: row.created_at as string,
  };
}
