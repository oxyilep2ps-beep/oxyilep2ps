'use server';

import { finalizeEscrowOnChain } from '@/app/actions/escrowChain';

export type RecordHandshakeOnChainResult =
  | { ok: true; txHash: string; agreementHash: string }
  | { ok: false; error: string };

/** @deprecated Prefer finalizeEscrowOnChain from escrowChain.ts */
export async function recordHandshakeOnChain(
  handshakeId: string
): Promise<RecordHandshakeOnChainResult> {
  const result = await finalizeEscrowOnChain(handshakeId);
  if (result.success) {
    return { ok: true, txHash: result.txHash, agreementHash: result.agreementHash };
  }
  return { ok: false, error: result.error };
}
