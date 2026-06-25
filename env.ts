import 'server-only';

import { loadEnvConfig } from '@next/env';
import { z } from 'zod';

let envBootstrapped = false;

function bootstrapEnvFiles(): void {
  if (envBootstrapped) return;
  loadEnvConfig(process.cwd());
  envBootstrapped = true;
}

/** Server-side environment schema — secrets must NOT use NEXT_PUBLIC_ prefix. */
const serverEnvSchema = z.object({
  POLYGON_PRIVATE_KEY: z.string().min(1),
  POLYGON_RPC_URL: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  GOCARDLESS_ACCESS_TOKEN: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function readRawPolygonPrivateKey(): string {
  bootstrapEnvFiles();

  // Bracket + dot access: avoids Next.js build-time inlining when unset at build.
  const raw =
    process.env.POLYGON_PRIVATE_KEY ??
    process.env['POLYGON_PRIVATE_KEY'] ??
    '';

  return raw.trim().replace(/^["']|["']$/g, '');
}

function parseServerEnv(): ServerEnv {
  bootstrapEnvFiles();

  return serverEnvSchema.parse({
    POLYGON_PRIVATE_KEY: readRawPolygonPrivateKey(),
    POLYGON_RPC_URL: process.env.POLYGON_RPC_URL?.trim() || undefined,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined,
    GOCARDLESS_ACCESS_TOKEN: process.env.GOCARDLESS_ACCESS_TOKEN?.trim() || undefined,
  });
}

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (!cachedEnv) {
    cachedEnv = parseServerEnv();
  }
  return cachedEnv;
}

/** Validated server env — use in Server Actions / Route Handlers only. */
export const env: ServerEnv = {
  get POLYGON_PRIVATE_KEY() {
    return getServerEnv().POLYGON_PRIVATE_KEY;
  },
  get POLYGON_RPC_URL() {
    return getServerEnv().POLYGON_RPC_URL;
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return getServerEnv().SUPABASE_SERVICE_ROLE_KEY;
  },
  get GOCARDLESS_ACCESS_TOKEN() {
    return getServerEnv().GOCARDLESS_ACCESS_TOKEN;
  },
};

/**
 * Demo-safe resolver: validated env first, then direct process.env fallback.
 * Normalizes hex private keys (optional 0x prefix).
 */
export function resolvePolygonPrivateKey(): string | null {
  bootstrapEnvFiles();

  try {
    const validated = env.POLYGON_PRIVATE_KEY;
    if (validated) return normalizePrivateKey(validated);
  } catch {
    // Schema validation failed — try direct read below.
  }

  const direct = readRawPolygonPrivateKey();
  if (!direct) return null;

  return normalizePrivateKey(direct);
}

export function normalizePrivateKey(raw: string): string {
  const trimmed = raw.trim().replace(/^["']|["']$/g, '');
  if (trimmed.startsWith('0x')) return trimmed;
  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) return `0x${trimmed}`;
  return trimmed;
}

export const POLYGON_RELAYER_MISCONFIG_MESSAGE =
  'Server Misconfiguration: Polygon Relayer Key is missing in the server environment.';
