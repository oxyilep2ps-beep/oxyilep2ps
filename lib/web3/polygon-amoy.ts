/** Polygon Amoy testnet — chain ID 80002 */
export const POLYGON_AMOY_CHAIN_ID = 80002;
export const POLYGON_AMOY_CHAIN_ID_HEX = '0x13882';
export const POLYGON_AMOY_RPC_URL =
  process.env.NEXT_PUBLIC_POLYGON_RPC_URL ?? 'https://rpc-amoy.polygon.technology';
export const POLYGON_AMOY_EXPLORER = 'https://amoy.polygonscan.com';

export const POLYGON_AMOY_NETWORK = {
  chainId: POLYGON_AMOY_CHAIN_ID_HEX,
  chainName: 'Polygon Amoy Testnet',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrls: [POLYGON_AMOY_RPC_URL],
  blockExplorerUrls: [POLYGON_AMOY_EXPLORER],
} as const;

/** Default demo escrow deposit on Amoy (test MATIC). */
export const DEFAULT_ESCROW_MATIC_AMOUNT = '0.001';

export function getEscrowMaticAmount(): string {
  return process.env.NEXT_PUBLIC_ESCROW_MATIC_AMOUNT?.trim() || DEFAULT_ESCROW_MATIC_AMOUNT;
}

export function getPlatformEscrowWallet(): string | null {
  const wallet =
    process.env.NEXT_PUBLIC_PLATFORM_ESCROW_WALLET?.trim() ||
    process.env.PLATFORM_ESCROW_WALLET?.trim();
  return wallet && /^0x[a-fA-F0-9]{40}$/.test(wallet) ? wallet : null;
}

export function polygonAmoyTxUrl(txHash: string): string {
  return `${POLYGON_AMOY_EXPLORER}/tx/${txHash}`;
}

export function isValidTxHash(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}
