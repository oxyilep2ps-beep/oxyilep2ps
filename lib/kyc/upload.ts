import type { SupabaseClient } from '@supabase/supabase-js';
import type { KycDocumentPaths } from '@/lib/types/profile';

const BUCKET = 'kyc-documents';

export async function uploadKycFile(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  slug: string
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${userId}/${slug}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) throw new Error(error.message);
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
    documents.incomeVerification = await uploadKycFile(supabase, userId, files.incomeVerification, 'income-verification');
  }

  return documents;
}
