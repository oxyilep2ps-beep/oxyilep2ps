import 'server-only';

import { loadEnvConfig } from '@next/env';

let envLoaded = false;

/** Ensures .env / .env.local are loaded before reading server secrets (dev + serverless). */
export function ensureServerEnvLoaded(): void {
  if (envLoaded) return;
  loadEnvConfig(process.cwd());
  envLoaded = true;
}

const MISCONFIG_ERROR =
  'Server Misconfiguration: Polygon Relayer Key is missing in the server environment.';

/**
 * Reads the relayer key using exactly `process.env.POLYGON_PRIVATE_KEY`.
 * Must only be called from Server Actions / Route Handlers / server modules.
 */
export function readPolygonPrivateKey(): string | null {
  ensureServerEnvLoaded();

  const raw = process.env.POLYGON_PRIVATE_KEY;
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim().replace(/^["']|["']$/g, '');
  if (!trimmed) return null;

  if (trimmed.startsWith('0x')) return trimmed;
  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) return `0x${trimmed}`;

  return trimmed;
}

export function getPolygonPrivateKeyOrError(): string | { error: string } {
  const key = readPolygonPrivateKey();
  if (!key) {
    return {
      error: `${MISCONFIG_ERROR} Set POLYGON_PRIVATE_KEY in .env.local (local dev) or Vercel Project → Settings → Environment Variables (production), then restart the server.`,
    };
  }
  return key;
}
