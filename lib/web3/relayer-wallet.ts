import { readPolygonPrivateKey, ensureServerEnvLoaded } from '@/lib/env/server-secrets';
import { POLYGON_AMOY_RPC_URL } from '@/lib/web3/polygon-amoy';

export const POLYGON_RELAYER_MISCONFIG_ERROR =
  'Server Misconfiguration: Polygon Relayer Key is missing.';

/** Polygon Amoy JSON-RPC endpoint for all server-side relayer transactions. */
export function getPolygonRpcUrl(): string {
  return (
    process.env.POLYGON_RPC_URL?.trim() ||
    process.env.NEXT_PUBLIC_POLYGON_RPC_URL?.trim() ||
    POLYGON_AMOY_RPC_URL
  );
}

/**
 * Returns the platform relayer private key. Server-side signing must use POLYGON_PRIVATE_KEY only.
 */
export function requirePolygonPrivateKey(): string {
  ensureServerEnvLoaded();
  const key = readPolygonPrivateKey();
  if (!key) {
    throw new Error(
      'Server Misconfiguration: Polygon Relayer Key is missing in the server environment.'
    );
  }
  return key;
}

/** Ethers wallet connected to Polygon Amoy for relayer / escrow transactions. */
export async function createPolygonRelayerWallet() {
  const { ethers } = await import('ethers');
  const provider = new ethers.JsonRpcProvider(getPolygonRpcUrl());
  return new ethers.Wallet(requirePolygonPrivateKey(), provider);
}
