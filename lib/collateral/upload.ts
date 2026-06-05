import type { SupabaseClient } from '@supabase/supabase-js';

export const COLLATERAL_BUCKET = 'collateral_documents';

const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadCollateralProof(
  supabase: SupabaseClient,
  file: File,
  folder: string
): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error('Collateral proof must be 10MB or smaller.');
  }

  const ext = file.name.split('.').pop() ?? 'bin';
  const safeBase = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
  const path = `${folder}/collateral-proof-${Date.now()}-${safeBase || `proof.${ext}`}`;

  const { error } = await supabase.storage.from(COLLATERAL_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) throw new Error(error.message);
  return path;
}
