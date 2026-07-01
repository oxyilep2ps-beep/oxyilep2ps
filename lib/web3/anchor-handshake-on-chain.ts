import 'server-only';

import {
  env,
  normalizePrivateKey,
  POLYGON_RELAYER_MISCONFIG_MESSAGE,
  resolvePolygonPrivateKey,
} from '@/env';
import {
  buildHandshakeOnChainData,
  hashJITHandshakeLedger,
} from '@/lib/web3/handshake-hash';
import { isValidTxHash, POLYGON_AMOY_RPC_URL } from '@/lib/web3/polygon-amoy';

export type AnchorHandshakeResult =
  | { success: true; txHash: string; agreementHash: string }
  | { success: false; error: string };

function getPolygonRpcUrl(): string {
  return (
    env.POLYGON_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_POLYGON_RPC_URL?.trim() ||
    POLYGON_AMOY_RPC_URL
  );
}

function requirePolygonPrivateKey(): string {
  try {
    const fromEnv = env.POLYGON_PRIVATE_KEY;
    if (fromEnv?.trim()) return normalizePrivateKey(fromEnv);
  } catch {
    // fall through
  }

  const direct =
    process.env.POLYGON_PRIVATE_KEY ??
    process.env['POLYGON_PRIVATE_KEY'] ??
    resolvePolygonPrivateKey();

  const privateKey = direct ? normalizePrivateKey(String(direct)) : '';
  if (!privateKey) throw new Error(POLYGON_RELAYER_MISCONFIG_MESSAGE);
  return privateKey;
}

/** Anchors handshake agreement on Polygon Amoy via the platform relayer wallet. */
export async function anchorHandshakeOnPolygon(params: {
  handshakeId: string;
  borrowerId: string;
  lenderId: string;
  amount: number;
  durationMonths: number;
  timestamp: string;
}): Promise<AnchorHandshakeResult> {
  let privateKey: string;
  try {
    privateKey = requirePolygonPrivateKey();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : POLYGON_RELAYER_MISCONFIG_MESSAGE,
    };
  }

  try {
    const agreementHash = hashJITHandshakeLedger({
      handshakeId: params.handshakeId,
      borrowerId: params.borrowerId,
      lenderId: params.lenderId,
      amount: params.amount,
      durationMonths: params.durationMonths,
      timestamp: params.timestamp,
    });

    const txData = buildHandshakeOnChainData({
      handshakeId: params.handshakeId,
      borrowerId: params.borrowerId,
      lenderId: params.lenderId,
      amount: params.amount,
      timestamp: params.timestamp,
    });

    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(getPolygonRpcUrl());
    const wallet = new ethers.Wallet(privateKey, provider);

    const tx = await wallet.sendTransaction({
      to: wallet.address,
      value: 0n,
      data: txData,
    });

    const receipt = await tx.wait();
    const txHash = receipt?.hash ?? tx.hash;

    if (!isValidTxHash(txHash)) {
      return { success: false, error: 'Polygon relayer returned an invalid transaction hash' };
    }

    return { success: true, txHash, agreementHash };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Could not anchor handshake on Polygon',
    };
  }
}
