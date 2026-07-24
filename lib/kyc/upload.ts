import type { SupabaseClient } from '@supabase/supabase-js';
import type { KycDocumentPaths } from '@/lib/types/profile';

/** Primary private KYC bucket (admin signed URLs). */
export const KYC_BUCKET = 'kyc-documents';
/** Public documents bucket — required upload target (must not fail silently). */
export const KYC_BUCKET_ALIAS = 'documents';

export type UploadableFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

export type UploadedKycDocument = {
  /** Object path stored in profiles.*_url columns (signed-URL compatible). */
  path: string;
  /** Public URL from the `documents` bucket after a successful upload. */
  publicUrl: string;
};

/**
 * Convert a multipart File/Blob into a Node Buffer for Supabase Storage.
 * On Vercel serverless, `Buffer.from(await file.arrayBuffer())` is the reliable
 * path — passing the raw File/Blob to supabase-js can upload a 0-byte object.
 */
export async function fileToUploadBuffer(file: UploadableFile): Promise<{
  buffer: Buffer;
  contentType: string;
  ext: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (!buffer.byteLength) {
    throw new Error(`Empty file upload: ${file.name || 'unknown'} (0 bytes after buffer conversion)`);
  }

  const ext =
    (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const contentType = file.type || 'application/octet-stream';

  return { buffer, contentType, ext };
}

/**
 * Upload one KYC file. Supabase returns `{ error }` — we ALWAYS throw on failure
 * so registration cannot succeed with null document columns.
 */
export async function uploadKycFile(
  supabase: SupabaseClient,
  userId: string,
  file: UploadableFile,
  slug: string,
  label: string
): Promise<UploadedKycDocument> {
  const { buffer, contentType, ext } = await fileToUploadBuffer(file);
  const path = `${userId}/${slug}.${ext}`;

  console.log(`📤 Uploading ${label} → documents/${path} (${buffer.byteLength} bytes, ${contentType})`);

  // EPIC 3: primary upload to public `documents` bucket — Supabase returns an
  // error object rather than throwing, so we explicitly throw on it.
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(KYC_BUCKET_ALIAS)
    .upload(path, buffer, {
      upsert: true,
      contentType,
    });

  if (uploadError) {
    console.error(`🚨 SUPABASE UPLOAD FAILED (${label}):`, uploadError);
    throw new Error(`Supabase Storage Error (${label}): ${uploadError.message}`);
  }

  if (!uploadData?.path) {
    console.error(`🚨 SUPABASE UPLOAD FAILED (${label}): missing uploadData.path`, uploadData);
    throw new Error(`Supabase Storage Error (${label}): storage returned no path.`);
  }

  const publicUrl = supabase.storage.from(KYC_BUCKET_ALIAS).getPublicUrl(uploadData.path).data
    .publicUrl;

  if (!publicUrl) {
    throw new Error(`Supabase Storage Error (${label}): could not resolve public URL.`);
  }

  console.log(`✅ Uploaded ${label}: path=${uploadData.path} publicUrl=${publicUrl}`);

  // Best-effort private mirror for admin signed-URL tooling (non-fatal AFTER public success).
  const { error: privateError } = await supabase.storage.from(KYC_BUCKET).upload(path, buffer, {
    upsert: true,
    contentType,
  });
  if (privateError) {
    console.warn(
      `⚠️ Private bucket mirror failed for ${label} (public upload OK):`,
      privateError.message
    );
  }

  // Store object path in DB (admin signed URLs + public URL recovery both work).
  return { path: uploadData.path, publicUrl };
}

export interface WizardUploadFiles {
  proofOfIdentity: UploadableFile | null;
  livenessVideo: UploadableFile | null;
  proofOfAddress: UploadableFile | null;
  incomeVerification: UploadableFile | null;
}

/**
 * Upload all KYC files. Required files throw if missing/failed.
 * Optional income verification returns null when not provided.
 */
export async function uploadAllKycDocuments(
  supabase: SupabaseClient,
  userId: string,
  files: WizardUploadFiles
): Promise<KycDocumentPaths> {
  if (!files.proofOfIdentity) {
    throw new Error('Proof of identity file is missing before upload.');
  }
  if (!files.livenessVideo) {
    throw new Error('Liveness selfie/video file is missing before upload.');
  }
  if (!files.proofOfAddress) {
    throw new Error('Proof of address file is missing before upload.');
  }

  const id = await uploadKycFile(
    supabase,
    userId,
    files.proofOfIdentity,
    'proof-of-identity',
    'ID Proof'
  );
  const liveness = await uploadKycFile(
    supabase,
    userId,
    files.livenessVideo,
    'liveness-video',
    'Liveness selfie'
  );
  const address = await uploadKycFile(
    supabase,
    userId,
    files.proofOfAddress,
    'proof-of-address',
    'Address Proof'
  );

  let incomePath: string | null = null;
  if (files.incomeVerification) {
    const income = await uploadKycFile(
      supabase,
      userId,
      files.incomeVerification,
      'income-verification',
      'Income verification'
    );
    incomePath = income.path;
  }

  return {
    proofOfIdentity: id.path,
    livenessVideo: liveness.path,
    proofOfAddress: address.path,
    incomeVerification: incomePath,
  };
}
