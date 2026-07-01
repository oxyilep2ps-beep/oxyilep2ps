import type { HandshakeRow } from '@/lib/chat/types';

export type HandshakeUiPhase = 'PENDING' | 'FUNDED' | 'ACTIVE';

/** Derives JIT handshake UI phase from persisted row fields. */
export function getHandshakeUiPhase(row: HandshakeRow): HandshakeUiPhase {
  const status = row.status?.toUpperCase?.() ?? row.status;
  if (status === 'ACTIVE' || Boolean(row.polygon_tx_hash)) return 'ACTIVE';
  if (status === 'FUNDED' || Boolean(row.funded_at)) return 'FUNDED';
  return 'PENDING';
}

export function hasValidPolygonTx(row: HandshakeRow): boolean {
  const hash = row.polygon_tx_hash?.trim() ?? '';
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}
