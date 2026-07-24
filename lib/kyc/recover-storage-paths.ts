import type { SupabaseClient } from '@supabase/supabase-js';
import { KYC_BUCKET, KYC_BUCKET_ALIAS } from '@/lib/kyc/upload';
import type { KycDocumentPaths } from '@/lib/types/profile';

const SLUG_TO_KEY: Record<string, keyof KycDocumentPaths> = {
  'proof-of-identity': 'proofOfIdentity',
  'liveness-video': 'livenessVideo',
  'proof-of-address': 'proofOfAddress',
  'income-verification': 'incomeVerification',
};

function pathFromName(userId: string, name: string): string {
  return `${userId}/${name}`;
}

/**
 * Recover KYC object paths from storage when profile URL columns / kyc_data
 * were wiped by a stub trigger but the files still exist in the bucket.
 */
export async function recoverKycPathsFromStorage(
  admin: SupabaseClient,
  userId: string
): Promise<KycDocumentPaths> {
  const found: KycDocumentPaths = {};

  for (const bucket of [KYC_BUCKET, KYC_BUCKET_ALIAS]) {
    const { data, error } = await admin.storage.from(bucket).list(userId, {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error || !data?.length) continue;

    for (const entry of data) {
      const name = String(entry.name ?? '');
      if (!name || name.endsWith('/')) continue;
      const slug = name.replace(/\.[^.]+$/, '').toLowerCase();
      const key = SLUG_TO_KEY[slug];
      if (!key || found[key]) continue;
      found[key] = pathFromName(userId, name);
    }

    if (found.proofOfIdentity && found.livenessVideo && found.proofOfAddress) {
      break;
    }
  }

  return found;
}

/** Strip bucket prefixes / public URLs so createSignedUrl gets an object path. */
export function normalizeKycStoragePath(raw: string): string {
  let path = String(raw ?? '').trim();
  if (!path) return '';

  try {
    if (/^https?:\/\//i.test(path)) {
      const url = new URL(path);
      const marker = '/object/';
      const idx = url.pathname.indexOf(marker);
      if (idx >= 0) {
        const after = url.pathname.slice(idx + marker.length);
        // sign|public/<bucket>/<object path>
        const parts = after.split('/').filter(Boolean);
        if (parts.length >= 3) {
          path = decodeURIComponent(parts.slice(2).join('/'));
        }
      }
    }
  } catch {
    // keep raw
  }

  path = path.replace(/^\/+/, '');
  for (const bucket of [KYC_BUCKET, KYC_BUCKET_ALIAS]) {
    if (path.startsWith(`${bucket}/`)) {
      path = path.slice(bucket.length + 1);
      break;
    }
  }

  return path;
}
