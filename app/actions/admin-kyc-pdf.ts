'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { normalizeKycStoragePath } from '@/lib/kyc/recover-storage-paths';

const KYC_BUCKETS = ['kyc-documents', 'documents'] as const;

function detectKind(path: string, contentType: string): 'image' | 'pdf' | 'video' | 'other' {
  const lower = `${path} ${contentType}`.toLowerCase();
  if (/image\/|\.(png|jpe?g|webp|gif)/.test(lower)) return 'image';
  if (/application\/pdf|\.pdf/.test(lower)) return 'pdf';
  if (/video\/|\.(mp4|webm|mov)/.test(lower)) return 'video';
  return 'other';
}

/**
 * Server-side fetch of a private KYC object for PDF embedding.
 * Returns a data URL for images, and a signed URL for PDF/other (link-only in PDF).
 */
export async function fetchKycDocumentForPdf(storagePath: string): Promise<{
  kind: 'image' | 'pdf' | 'video' | 'other';
  dataUrl: string | null;
  signedUrl: string;
  contentType: string;
}> {
  await assertAdmin();
  const admin = createAdminClient();
  const path = normalizeKycStoragePath(storagePath);
  if (!path) {
    throw new Error('storagePath is required');
  }

  let signedUrl: string | null = null;
  let lastError: string | null = null;

  for (const bucket of KYC_BUCKETS) {
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 3600);
    if (!error && data?.signedUrl) {
      signedUrl = data.signedUrl;
      break;
    }
    lastError = error?.message ?? lastError;
  }

  if (!signedUrl) {
    throw new Error(lastError ?? 'Could not create signed URL for KYC document');
  }

  const response = await fetch(signedUrl);
  if (!response.ok) {
    throw new Error(`Failed to download KYC document (${response.status})`);
  }

  const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
  const kind = detectKind(path, contentType);
  const buffer = Buffer.from(await response.arrayBuffer());
  const base64 = buffer.toString('base64');
  const dataUrl = kind === 'image' ? `data:${contentType};base64,${base64}` : null;

  return { kind, dataUrl, signedUrl, contentType };
}
