'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertAdmin } from '@/lib/auth/assert-admin';
import { logAdminAction } from '@/app/actions/admin-audit';
import { sendReviewEmail } from '@/lib/email/send-review-email';
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

  const { data: approved } = await supabase
    .from('profiles')
    .select('full_legal_name, email')
    .eq('id', userId)
    .maybeSingle();

  if (approved?.email) {
    await sendReviewEmail({
      to: approved.email,
      fullLegalName: approved.full_legal_name ?? 'Applicant',
      status: 'APPROVED',
    });
  }

  await logAdminAction(adminUser.email ?? 'admin', `Approved user ${approved?.full_legal_name ?? userId}`);

  revalidatePath('/admin-dashboard');
  return { success: true };
}

/**
 * Reject applicant: archive reason, email via Resend with the custom reason,
 * then permanently remove profile + auth + KYC files.
 */
export async function rejectUserAction(
  userId: string,
  reason: string
): Promise<{ success: true }> {
  const adminUser = await assertAdmin();
  const trimmedReason = reason?.trim() ?? '';

  if (!userId) {
    throw new Error('userId is required');
  }
  if (!trimmedReason) {
    throw new Error('A rejection reason is required');
  }

  const admin = createAdminClient();

  try {
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select(
        'id, email, full_legal_name, role, kyc_data, proof_of_identity_url, liveness_video_url, proof_of_address_url, income_verification_url'
      )
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      throw new Error(profileError.message);
    }
    if (!profile) {
      throw new Error('Applicant not found');
    }
    if (!profile.email) {
      throw new Error('Applicant email address is missing');
    }

    // Step A — archive rejection (status trail before hard delete)
    const { error: archiveError } = await admin.from('application_rejections').insert({
      user_id: profile.id,
      email: profile.email,
      full_legal_name: profile.full_legal_name,
      role: profile.role ?? null,
      rejection_reason: trimmedReason,
      kyc_data: profile.kyc_data,
      rejected_by: adminUser.email,
    });

    if (archiveError) {
      throw new Error(archiveError.message);
    }

    // Step B + C — email must succeed before destructive cleanup
    await sendReviewEmail({
      to: profile.email,
      fullLegalName: profile.full_legal_name ?? 'Applicant',
      status: 'REJECTED',
      reason: trimmedReason,
    });

    const paths = collectStoragePaths(
      profile.kyc_data as {
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

    const { error: profileDeleteError } = await admin.from('profiles').delete().eq('id', userId);
    if (profileDeleteError) {
      throw new Error(profileDeleteError.message);
    }

    const { error: authError } = await admin.auth.admin.deleteUser(userId);
    if (authError) {
      throw new Error(authError.message);
    }

    await logAdminAction(
      adminUser.email ?? 'admin',
      `Rejected and notified ${profile.full_legal_name ?? profile.email}`
    );

    revalidatePath('/admin-dashboard');
    revalidatePath('/admin-dashboard/applications');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reject applicant';
    if (/resend|email|RESEND_API_KEY/i.test(message)) {
      throw new Error('Failed to send email. Please check API logs.');
    }
    throw new Error(message);
  }
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
