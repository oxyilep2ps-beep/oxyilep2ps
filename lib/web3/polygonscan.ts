const POLYGONSCAN_AMOY_BASE = 'https://amoy.polygonscan.com/tx';

export function polygonscanTxUrl(txHash: string): string {
  return `${POLYGONSCAN_AMOY_BASE}/${txHash}`;
}

/** Prefer Phase 21 `tx_hash`, fall back to legacy `polygon_tx_hash`. */
export function resolveHandshakeTxHash(row: {
  tx_hash?: string | null;
  polygon_tx_hash?: string | null;
}): string | null {
  const hash = row.tx_hash?.trim() || row.polygon_tx_hash?.trim() || null;
  if (!hash || hash.startsWith('sandbox_')) return null;
  return /^0x[a-fA-F0-9]{64}$/.test(hash) ? hash : null;
}
