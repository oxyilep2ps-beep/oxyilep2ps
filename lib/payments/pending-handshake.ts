const STORAGE_KEY = 'oxyile_pending_handshake_id';

export function stashPendingHandshakeId(handshakeId: string): void {
  if (typeof window === 'undefined' || !handshakeId) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, handshakeId);
  } catch {
    // ignore quota / private mode
  }
}

export function readPendingHandshakeId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingHandshakeId(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Normalise handshake id from URL search params (supports legacy aliases). */
export function resolveHandshakeIdFromParams(
  params: Pick<URLSearchParams, 'get'>
): string | null {
  const candidates = [
    params.get('handshakeId'),
    params.get('handshake_id'),
    params.get('hid'),
    params.get('handshake'),
  ];

  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }

  return readPendingHandshakeId();
}
