import type { SupabaseClient } from '@supabase/supabase-js';
import type { KycDocumentPaths } from '@/lib/types/profile';

/** Primary private KYC bucket used by the app. */
export const KYC_BUCKET = 'kyc-documents';
/** Alias / public documents bucket for tooling that expects `documents`. */
export const KYC_BUCKET_ALIAS = 'documents';

export type UploadableFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

/**
 * Convert a Next.js Server Action File/Blob into a Node Buffer.
 * Passing File objects directly to supabase-js in Server Actions is unreliable.
 */
export async function fileToUploadBuffer(file: UploadableFile): Promise<{
  buffer: Buffer;
  contentType: string;
  ext: string;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (!buffer.length) {
    throw new Error(`Empty file upload: ${file.name || 'unknown'}`);
  }

  const ext =
    (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const contentType = file.type || 'application/octet-stream';

  return { buffer, contentType, ext };
}

export async function uploadKycFile(
  supabase: SupabaseClient,
  userId: string,
  file: UploadableFile,
  slug: string
): Promise<string> {
  const { buffer, contentType, ext } = await fileToUploadBuffer(file);
  const path = `${userId}/${slug}.${ext}`;

  const { error } = await supabase.storage.from(KYC_BUCKET).upload(path, buffer, {
    upsert: true,
    contentType,
  });

  if (error) {
    throw new Error(`KYC upload failed (${slug}): ${error.message}`);
  }

  // Best-effort mirror into documents bucket (non-fatal).
  try {
    await supabase.storage.from(KYC_BUCKET_ALIAS).upload(path, buffer, {
      upsert: true,
      contentType,
    });
  } catch {
    // ignore alias failures
  }

  return path;
}

export interface WizardUploadFiles {
  proofOfIdentity: UploadableFile | null;
  livenessVideo: UploadableFile | null;
  proofOfAddress: UploadableFile | null;
  incomeVerification: UploadableFile | null;
}

export async function uploadAllKycDocuments(
  supabase: SupabaseClient,
  userId: string,
  files: WizardUploadFiles
): Promise<KycDocumentPaths> {
  const documents: KycDocumentPaths = {};

  if (files.proofOfIdentity) {
    documents.proofOfIdentity = await uploadKycFile(
      supabase,
      userId,
      files.proofOfIdentity,
      'proof-of-identity'
    );
  }
  if (files.livenessVideo) {
    documents.livenessVideo = await uploadKycFile(
      supabase,
      userId,
      files.livenessVideo,
      'liveness-video'
    );
  }
  if (files.proofOfAddress) {
    documents.proofOfAddress = await uploadKycFile(
      supabase,
      userId,
      files.proofOfAddress,
      'proof-of-address'
    );
  }
  if (files.incomeVerification) {
    documents.incomeVerification = await uploadKycFile(
      supabase,
      userId,
      files.incomeVerification,
      'income-verification'
    );
  }

  return documents;
}
