import { ethers, type Wallet } from 'ethers';
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
  const key = process.env.POLYGON_PRIVATE_KEY?.trim();
  if (!key) {
    throw new Error(POLYGON_RELAYER_MISCONFIG_ERROR);
  }
  return key;
}

/** Ethers wallet connected to Polygon Amoy for relayer / escrow transactions. */
export function createPolygonRelayerWallet(): Wallet {
  const provider = new ethers.JsonRpcProvider(getPolygonRpcUrl());
  return new ethers.Wallet(requirePolygonPrivateKey(), provider);
}
