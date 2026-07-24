'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { logAdminAction } from '@/app/actions/admin-audit';
import type { KycDocumentPaths } from '@/lib/types/profile';

const KYC_BUCKET = 'kyc-documents';
const KYC_BUCKET_ALIAS = 'documents';

function collectStoragePaths(
  kyc: {
    identity?: { documents?: KycDocumentPaths };
    identityMeta?: Record<string, unknown>;
  } | null,
  profile?: {
    proof_of_identity_url?: string | null;
    liveness_video_url?: string | null;
    proof_of_address_url?: string | null;
    income_verification_url?: string | null;
  } | null
): string[] {
  const meta = kyc?.identityMeta ?? {};
  const docs = kyc?.identity?.documents;
  const fromMeta = [
    meta.idProofPath,
    meta.livenessPath,
    meta.addressProofPath,
    meta.incomeVerificationPath,
    meta.proofOfIdentity,
    meta.livenessVideo,
    meta.proofOfAddress,
    meta.incomeVerification,
  ].filter((p): p is string => typeof p === 'string' && Boolean(p));
  const fromKyc = docs ? Object.values(docs).filter((p): p is string => Boolean(p)) : [];
  const fromProfile = [
    profile?.proof_of_identity_url,
    profile?.liveness_video_url,
    profile?.proof_of_address_url,
    profile?.income_verification_url,
  ].filter((p): p is string => Boolean(p));
  return [...new Set([...fromMeta, ...fromKyc, ...fromProfile])];
}

export async function approveUserAction(userId: string) {
  const adminUser = await assertAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({
      status: 'APPROVED',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUser.email,
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  const { data: approved } = await supabase.from('profiles').select('full_legal_name').eq('id', userId).maybeSingle();
  await logAdminAction(adminUser.email ?? 'admin', `Approved user ${approved?.full_legal_name ?? userId}`);

  revalidatePath('/admin-dashboard');
  return { success: true };
}

/** Hard delete: storage files, profile row, and auth user. */
export async function rejectUserAction(userId: string) {
  await assertAdmin();

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select(
      'kyc_data, proof_of_identity_url, liveness_video_url, proof_of_address_url, income_verification_url'
    )
    .eq('id', userId)
    .maybeSingle();

  const paths = collectStoragePaths(
    profile?.kyc_data as {
      identity?: { documents?: KycDocumentPaths };
      identityMeta?: Record<string, unknown>;
    },
    profile
  );
  if (paths.length) {
    await admin.storage.from(KYC_BUCKET).remove(paths);
    await admin.storage.from(KYC_BUCKET_ALIAS).remove(paths);
  }

  for (const bucket of [KYC_BUCKET, KYC_BUCKET_ALIAS]) {
    const { data: folderFiles } = await admin.storage.from(bucket).list(userId);
    if (folderFiles?.length) {
      await admin.storage.from(bucket).remove(folderFiles.map((f) => `${userId}/${f.name}`));
    }
  }

  await admin.from('profiles').delete().eq('id', userId);

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) throw new Error(authError.message);

  revalidatePath('/admin-dashboard');
  return { success: true };
}

export async function getKycSignedUrlAction(storagePath: string) {
  await assertAdmin();
  const admin = createAdminClient();
  const path = storagePath.trim();

  for (const bucket of [KYC_BUCKET, KYC_BUCKET_ALIAS]) {
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 3600);
    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  throw new Error('Could not create a signed URL for this KYC document');
}
