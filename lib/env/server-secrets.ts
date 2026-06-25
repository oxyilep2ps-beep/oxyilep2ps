import 'server-only';

import {
  POLYGON_RELAYER_MISCONFIG_MESSAGE,
  resolvePolygonPrivateKey,
} from '@/env';

export function getPolygonPrivateKeyOrError(): string | { error: string } {
  const key = resolvePolygonPrivateKey();
  if (!key) {
    return {
      error: `${POLYGON_RELAYER_MISCONFIG_MESSAGE} Set POLYGON_PRIVATE_KEY in .env.local (local) or Vercel Environment Variables (production), then restart the dev server or redeploy.`,
    };
  }
  return key;
}

/** @deprecated Use resolvePolygonPrivateKey from @/env */
export function readPolygonPrivateKey(): string | null {
  return resolvePolygonPrivateKey();
}

/** @deprecated Env files are bootstrapped via @/env */
export function ensureServerEnvLoaded(): void {
  resolvePolygonPrivateKey();
}
