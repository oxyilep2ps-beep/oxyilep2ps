import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client — SERVER ONLY.
 * Never import this module from client components or shared browser code.
 */
let cachedAdmin: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (server-only).'
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Cached admin client for repeated server-action use within a process. */
export function getSupabaseAdmin(): SupabaseClient {
  if (!cachedAdmin) {
    cachedAdmin = createAdminClient();
  }
  return cachedAdmin;
}
