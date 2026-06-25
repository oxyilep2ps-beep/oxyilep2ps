/**
 * Server-only environment contract for Oxyile.
 * Validated at runtime via root `env.ts` (Zod). Do NOT prefix server secrets with NEXT_PUBLIC_.
 */
export const SERVER_ENV_KEYS = [
  'POLYGON_PRIVATE_KEY',
  'POLYGON_RPC_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOCARDLESS_ACCESS_TOKEN',
] as const;

export type ServerEnvKey = (typeof SERVER_ENV_KEYS)[number];
