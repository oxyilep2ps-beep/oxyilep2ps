/**
 * Server-only environment contract for Oxyile.
 * No zod/t3 env schema in this project — secrets are read at runtime via lib/env/server-secrets.ts.
 * Do NOT prefix server secrets with NEXT_PUBLIC_.
 */
export const SERVER_ENV_KEYS = [
  'POLYGON_PRIVATE_KEY',
  'POLYGON_RPC_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOCARDLESS_ACCESS_TOKEN',
] as const;

export type ServerEnvKey = (typeof SERVER_ENV_KEYS)[number];
