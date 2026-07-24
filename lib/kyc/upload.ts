import type { SupabaseClient } from '@supabase/supabase-js';
import type { KycDocumentPaths } from '@/lib/types/profile';

/** Primary private KYC bucket used by the app. */
export const KYC_BUCKET = 'kyc-documents';
/** Optional alias bucket kept in sync for tooling that expects `documents`. */
export const KYC_BUCKET_ALIAS = 'documents';

export async function uploadKycFile(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  slug: string
): Promise<string> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const path = `${userId}/${slug}.${ext}`;
  const contentType = file.type || undefined;

  const { error } = await supabase.storage.from(KYC_BUCKET).upload(path, file, {
    upsert: true,
    contentType,
  });

  if (error) {
    throw new Error(`KYC upload failed (${slug}): ${error.message}`);
  }

  // Best-effort mirror into alias bucket (non-fatal).
  try {
    await supabase.storage.from(KYC_BUCKET_ALIAS).upload(path, file, {
      upsert: true,
      contentType,
    });
  } catch {
    // ignore alias failures
  }

  return path;
}

export interface WizardUploadFiles {
  proofOfIdentity: File | null;
  livenessVideo: File | null;
  proofOfAddress: File | null;
  incomeVerification: File | null;
}

export async function uploadAllKycDocuments(
  supabase: SupabaseClient,
  userId: string,
  files: WizardUploadFiles
): Promise<KycDocumentPaths> {
  const documents: KycDocumentPaths = {};

  if (files.proofOfIdentity) {
    documents.proofOfIdentity = await uploadKycFile(supabase, userId, files.proofOfIdentity, 'proof-of-identity');
  }
  if (files.livenessVideo) {
    documents.livenessVideo = await uploadKycFile(supabase, userId, files.livenessVideo, 'liveness-video');
  }
  if (files.proofOfAddress) {
    documents.proofOfAddress = await uploadKycFile(supabase, userId, files.proofOfAddress, 'proof-of-address');
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
