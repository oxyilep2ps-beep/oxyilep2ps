export type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

export function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === 'undefined') return null;
  const eth = (window as Window & { ethereum?: EthereumProvider }).ethereum;
  return eth ?? null;
}

export function isUserRejectedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: number; message?: string };
  return err.code === 4001 || /user rejected|user denied/i.test(err.message ?? '');
}
